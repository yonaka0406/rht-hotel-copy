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
        ) AS provisory_sales,
        -- Provisory Nights
        COUNT(DISTINCT 
          CASE WHEN r.status IN ('hold', 'provisory') AND rd.cancelled IS NULL AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 
            rd.id 
          END
        ) AS provisory_nights
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
      SUM(rm.provisory_nights) AS provisory_nights,
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
 * Fetches granular sales data grouped by hotel, client, and month for CSV export.
 */
const getSalesByClientByMonth = async (requestId, dateStart, dateEnd, includeTemp = false, minSales = 0, limit = 10000) => {
  const pool = getPool(requestId);

  const query = `
    WITH reservation_metrics AS (
      SELECT
        rd.hotel_id,
        rd.reservation_id,
        TO_CHAR(DATE_TRUNC('month', rd.date), 'YYYY-MM') AS month,
        
        -- Total Sales (Confirmed)
        SUM(
          CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN
            COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0)
          ELSE 0 END
        ) AS total_sales,
        
        -- Total Nights (Confirmed)
        COUNT(DISTINCT 
          CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND rd.cancelled IS NULL AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 
            rd.id 
          END
        ) AS total_nights,

        -- Total People (Confirmed)
        SUM(
          CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN
            rd.number_of_people
          ELSE 0 END
        ) AS total_people,

        -- Provisory Sales
        SUM(
          CASE WHEN r.status IN ('hold', 'provisory') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN
            COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0)
          ELSE 0 END
        ) AS provisory_sales,

        -- Provisory Nights
        COUNT(DISTINCT 
          CASE WHEN r.status IN ('hold', 'provisory') AND rd.cancelled IS NULL AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 
            rd.id 
          END
        ) AS provisory_nights,
        
        -- Cancelled Billable Sales
        SUM(
          CASE WHEN rd.cancelled IS NOT NULL AND rd.billable = TRUE THEN
            COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0)
          ELSE 0 END
        ) AS cancelled_billable,

        -- Cancelled Billable Nights
        COUNT(DISTINCT 
          CASE WHEN rd.cancelled IS NOT NULL AND rd.billable = TRUE AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 
            rd.id 
          END
        ) AS cancelled_billable_nights,

        -- Cancelled Non-Billable Sales
        SUM(
          CASE WHEN rd.cancelled IS NOT NULL AND rd.billable = FALSE THEN
            COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0)
          ELSE 0 END
        ) AS cancelled_non_billable,

        -- Cancelled Non-Billable Nights
        COUNT(DISTINCT 
          CASE WHEN rd.cancelled IS NOT NULL AND rd.billable = FALSE AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 
            rd.id 
          END
        ) AS cancelled_non_billable_nights

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
        rd.hotel_id, rd.reservation_id, TO_CHAR(DATE_TRUNC('month', rd.date), 'YYYY-MM')
    ),
    payment_metrics AS (
      SELECT
        rp.hotel_id,
        rp.reservation_id,
        STRING_AGG(DISTINCT pt.name, ', ') AS payment_methods,
        STRING_AGG(DISTINCT COALESCE(pc.name_kanji, pc.name_kana, pc.name), ', ') AS payer_names
      FROM
        reservation_payments rp
        JOIN payment_types pt ON rp.payment_type_id = pt.id
        JOIN clients pc ON rp.client_id = pc.id
      GROUP BY
        rp.hotel_id, rp.reservation_id
    )
    SELECT
      h.id AS hotel_id,
      h.name AS hotel_name,
      c.id AS client_id,
      c.customer_id,
      COALESCE(c.name_kanji, c.name_kana, c.name) AS client_name,
      c.name_kana AS client_name_kana,
      c.phone AS client_phone,
      rm.month,
      
      SUM(rm.total_sales) AS total_sales,
      SUM(rm.total_nights) AS total_nights,
      SUM(rm.total_people) AS total_people,
      SUM(rm.provisory_sales) AS provisory_sales,
      SUM(rm.provisory_nights) AS provisory_nights,
      SUM(rm.cancelled_billable) AS cancelled_billable,
      SUM(rm.cancelled_billable_nights) AS cancelled_billable_nights,
      SUM(rm.cancelled_non_billable) AS cancelled_non_billable,
      SUM(rm.cancelled_non_billable_nights) AS cancelled_non_billable_nights,
      
      STRING_AGG(DISTINCT r.type, ', ') AS reservation_types,
      STRING_AGG(DISTINCT r.payment_timing, ', ') AS payment_timings,
      STRING_AGG(DISTINCT pm.payment_methods, ', ') AS payment_methods,
      STRING_AGG(DISTINCT pm.payer_names, ', ') AS payer_names

    FROM
      reservation_metrics rm
      JOIN reservations r ON rm.reservation_id = r.id AND rm.hotel_id = r.hotel_id
      JOIN clients c ON r.reservation_client_id = c.id
      JOIN hotels h ON r.hotel_id = h.id
      LEFT JOIN payment_metrics pm ON rm.reservation_id = pm.reservation_id AND rm.hotel_id = pm.hotel_id
    GROUP BY
      h.id, h.name, c.id, c.customer_id, c.name_kanji, c.name_kana, c.name, c.phone, rm.month
    ORDER BY
      rm.month DESC, total_sales DESC
    LIMIT $3;
  `;

  const values = [dateStart, dateEnd, limit];

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