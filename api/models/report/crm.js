const { getPool } = require('../../config/database');

/**
 * Fetches the top bookers summed across the entire period for the UI table.
 */
const getTopBookers = async (requestId, dateStart, dateEnd, includeTemp = false, minSales = 0, limit = 200) => {
  const pool = getPool(requestId);
  
  const query = `
    WITH reservation_metrics AS (
      SELECT
        rd.hotel_id,
        rd.reservation_id,
        -- Confirmed Sales
        SUM(
          CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN
            COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0)
          ELSE 0 END
        ) AS total_sales,
        -- Provisory Sales
        SUM(
          CASE WHEN r.status IN ('hold', 'provisory') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN
            COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0)
          ELSE 0 END
        ) AS provisory_sales
      FROM
        reservation_details rd
        JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
        LEFT JOIN (
          SELECT
            reservation_detail_id,
            hotel_id,
            SUM(COALESCE(price, 0) * COALESCE(quantity, 0)) as price
          FROM reservation_addons
          GROUP BY reservation_detail_id, hotel_id
        ) ra_sum ON rd.id = ra_sum.reservation_detail_id AND rd.hotel_id = ra_sum.hotel_id
      WHERE
        rd.date BETWEEN $1 AND $2
        AND r.status <> 'block'
      GROUP BY
        rd.hotel_id, rd.reservation_id
    )
    SELECT
      c.id AS client_id,
      c.customer_id,
      COALESCE(c.name_kanji, c.name_kana, c.name) AS client_name,
      c.name_kana AS client_name_kana,
      c.phone AS client_phone,
      SUM(rm.total_sales) AS total_sales,
      SUM(rm.provisory_sales) AS provisory_sales,
      JSON_AGG(DISTINCT h.name) AS used_hotels
    FROM
      reservation_metrics rm
      JOIN reservations r ON rm.reservation_id = r.id AND rm.hotel_id = r.hotel_id
      JOIN clients c ON r.reservation_client_id = c.id
      JOIN hotels h ON r.hotel_id = h.id
    GROUP BY
      c.id, c.customer_id, c.name_kanji, c.name_kana, c.name, c.phone
    HAVING (SUM(rm.total_sales) + (CASE WHEN $3::boolean THEN SUM(rm.provisory_sales) ELSE 0 END)) >= $4
    ORDER BY (SUM(rm.total_sales) + (CASE WHEN $3::boolean THEN SUM(rm.provisory_sales) ELSE 0 END)) DESC
    LIMIT $5;
  `;

  const values = [dateStart, dateEnd, includeTemp, minSales, limit];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving top bookers:', err);
    throw new Error('Database error');
  }
};

/**
 * Fetches granular sales data grouped by hotel, client, month, and payment method for CSV export.
 */
const getSalesByClientByMonth = async (requestId, dateStart, dateEnd, includeTemp = false, minSales = 0, limit = 10000) => {
  const pool = getPool(requestId);

  const query = `
    WITH reservation_base AS (
      -- Get base metrics per reservation and month
      SELECT
        rd.hotel_id,
        rd.reservation_id,
        TO_CHAR(DATE_TRUNC('month', rd.date), 'YYYY-MM') AS month,
        MAX(r.number_of_people) AS res_people,
        r.type as res_type,
        r.payment_timing,
        
        -- Sales and Nights
        SUM(CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0) ELSE 0 END) AS total_sales,
        COUNT(CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND rd.cancelled IS NULL AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 1 END) AS total_nights,
        
        SUM(CASE WHEN r.status IN ('hold', 'provisory') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0) ELSE 0 END) AS provisory_sales,
        COUNT(CASE WHEN r.status IN ('hold', 'provisory') AND rd.cancelled IS NULL AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 1 END) AS provisory_nights,
        
        SUM(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable = TRUE THEN COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0) ELSE 0 END) AS cancelled_billable,
        COUNT(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable = TRUE AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 1 END) AS cancelled_billable_nights,
        
        SUM(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable = FALSE THEN COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0) ELSE 0 END) AS cancelled_non_billable,
        COUNT(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable = FALSE AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 1 END) AS cancelled_non_billable_nights,

        BOOL_OR(CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND rd.cancelled IS NULL THEN TRUE ELSE FALSE END) as has_confirmed,
        BOOL_OR(CASE WHEN r.status IN ('hold', 'provisory') AND rd.cancelled IS NULL THEN TRUE ELSE FALSE END) as has_provisory

      FROM
        reservation_details rd
        JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
        LEFT JOIN (
          SELECT
            reservation_detail_id,
            hotel_id,
            SUM(COALESCE(price, 0) * COALESCE(quantity, 0)) as price
          FROM reservation_addons
          GROUP BY reservation_detail_id, hotel_id
        ) ra_sum ON rd.id = ra_sum.reservation_detail_id AND rd.hotel_id = ra_sum.hotel_id
      WHERE
        rd.date BETWEEN $1 AND $2
        AND r.status <> 'block'
      GROUP BY
        rd.hotel_id, rd.reservation_id, month, r.type, r.payment_timing
    ),
    client_filter AS (
      -- Identify which clients to include based on the UI table's criteria
      SELECT
        r.reservation_client_id as filter_client_id
      FROM
        reservation_details rd
        JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
        LEFT JOIN (
          SELECT reservation_detail_id, hotel_id, SUM(COALESCE(price, 0) * COALESCE(quantity, 0)) as price FROM reservation_addons GROUP BY reservation_detail_id, hotel_id
        ) ra_sum ON rd.id = ra_sum.reservation_detail_id AND rd.hotel_id = ra_sum.hotel_id
      WHERE
        rd.date BETWEEN $1 AND $2
        AND r.status <> 'block'
      GROUP BY
        r.reservation_client_id
      HAVING (
        SUM(CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0) ELSE 0 END)
        +
        CASE WHEN $3::boolean THEN
          SUM(CASE WHEN r.status IN ('hold', 'provisory') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0) ELSE 0 END)
        ELSE 0 END
      ) >= $4
      ORDER BY 1 DESC
      LIMIT $5
    ),
    payment_distribution AS (
      -- Split metrics by payment method proportion
      SELECT
        rp.reservation_id,
        rp.hotel_id,
        pt.name AS payment_method,
        COALESCE(pc.name_kanji, pc.name_kana, pc.name) AS payer_name,
        -- Calculate weight of this payment method relative to total payments for this reservation
        COALESCE(rp.value / NULLIF(SUM(rp.value) OVER(PARTITION BY rp.reservation_id, rp.hotel_id), 0), 1.0) AS weight
      FROM
        reservation_payments rp
        JOIN payment_types pt ON rp.payment_type_id = pt.id
        LEFT JOIN clients pc ON rp.client_id = pc.id
    )
    SELECT
      h.id AS hotel_id,
      h.name AS hotel_name,
      c.id AS client_id,
      c.customer_id,
      COALESCE(c.name_kanji, c.name_kana, c.name) AS client_name,
      c.name_kana AS client_name_kana,
      c.phone AS client_phone,
      rb.month,
      
      -- Fallback to payment_timing if no recorded payments exist
      COALESCE(pd.payment_method, rb.payment_timing) AS payment_method,
      COALESCE(pd.payer_name, '') AS payer_name,
      
      -- Apply weight to metrics to keep totals accurate across split rows
      SUM(rb.total_sales * COALESCE(pd.weight, 1.0)) AS total_sales,
      SUM(rb.total_nights * COALESCE(pd.weight, 1.0)) AS total_nights,
      SUM(CASE WHEN rb.has_confirmed THEN rb.res_people * COALESCE(pd.weight, 1.0) ELSE 0 END) AS total_people,
      
      SUM(rb.provisory_sales * COALESCE(pd.weight, 1.0)) AS provisory_sales,
      SUM(rb.provisory_nights * COALESCE(pd.weight, 1.0)) AS provisory_nights,
      SUM(CASE WHEN rb.has_provisory THEN rb.res_people * COALESCE(pd.weight, 1.0) ELSE 0 END) AS provisory_people,
      
      SUM(rb.cancelled_billable * COALESCE(pd.weight, 1.0)) AS cancelled_billable,
      SUM(rb.cancelled_billable_nights * COALESCE(pd.weight, 1.0)) AS cancelled_billable_nights,
      SUM(rb.cancelled_non_billable * COALESCE(pd.weight, 1.0)) AS cancelled_non_billable,
      SUM(rb.cancelled_non_billable_nights * COALESCE(pd.weight, 1.0)) AS cancelled_non_billable_nights,
      
      STRING_AGG(DISTINCT rb.res_type, ', ') AS reservation_types

    FROM
      reservation_base rb
      JOIN reservations r ON rb.reservation_id = r.id AND rb.hotel_id = r.hotel_id
      JOIN clients c ON r.reservation_client_id = c.id
      JOIN hotels h ON r.hotel_id = h.id
      JOIN client_filter cf ON c.id = cf.filter_client_id
      -- Left join to distribution. If no payments, pd columns are null.
      LEFT JOIN payment_distribution pd ON rb.reservation_id = pd.reservation_id AND rb.hotel_id = pd.hotel_id
    GROUP BY
      h.id, h.name, c.id, c.customer_id, c.name_kanji, c.name_kana, c.name, c.phone, rb.month, payment_method, payer_name
    ORDER BY
      rb.month DESC, total_sales DESC;
  `;

  const values = [dateStart, dateEnd, includeTemp, minSales, limit];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving sales by client by month:', err);
    throw new Error('Database error');
  }
};

module.exports = {
  getTopBookers,
  getSalesByClientByMonth,
};
