const { getPool } = require('../../config/database');

const getTopBookers = async (requestId, dateStart, dateEnd, includeTemp = false) => {
  const pool = getPool(requestId);
  
  // We always fetch all relevant statuses (excluding block) to calculate separate columns
  // The sorting logic handles the 'includeTemp' behavior
  
  const query = `
    SELECT
      c.id AS client_id,
      c.customer_id,
      COALESCE(c.name_kanji, c.name_kana, c.name) AS client_name,
      c.name_kana AS client_name_kana,
      c.phone AS client_phone,
      
      -- Total Sales (Confirmed Only)
      SUM(
        CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN
          COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0)
        ELSE 0 END
      ) AS total_sales,

      -- Provisory Sales (Hold/Provisory Only)
      SUM(
        CASE WHEN r.status IN ('hold', 'provisory') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN
          COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0)
        ELSE 0 END
      ) AS provisory_sales,
      
      -- Provisory Nights (Hold/Provisory Only)
      COUNT(DISTINCT 
        CASE WHEN r.status IN ('hold', 'provisory') AND rd.cancelled IS NULL AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 
          rd.id 
        END
      ) AS provisory_nights,

      JSON_AGG(DISTINCT h.name) AS used_hotels
    FROM
      reservations r
      JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id
      JOIN clients c ON r.reservation_client_id = c.id
      JOIN hotels h ON r.hotel_id = h.id
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
      c.id, c.customer_id, c.name_kanji, c.name_kana, c.name, c.phone
    ORDER BY
      (
        SUM(
            CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN
              COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0)
            ELSE 0 END
        ) 
        + 
        CASE WHEN $3::boolean IS TRUE THEN
            SUM(
                CASE WHEN r.status IN ('hold', 'provisory') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN
                COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0)
                ELSE 0 END
            )
        ELSE 0 END
      ) DESC
    LIMIT 200;
  `;

  const values = [dateStart, dateEnd, includeTemp];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving top bookers:', err);
    throw new Error('Database error');
  }
};

const getSalesByClientByMonth = async (requestId, dateStart, dateEnd, includeTemp = false) => {
  const pool = getPool(requestId);

  // We ignore includeTemp for filtering here because we want to output all columns for the CSV
  // The frontend requested "includeTemp should affect only the order displayed in the frontend"
  // So for the CSV export, we provide full data breakdown.

  const query = `
    SELECT
      h.id AS hotel_id,
      h.name AS hotel_name,
      c.id AS client_id,
      c.customer_id,
      COALESCE(c.name_kanji, c.name_kana, c.name) AS client_name,
      c.name_kana AS client_name_kana,
      c.phone AS client_phone,
      TO_CHAR(DATE_TRUNC('month', rd.date), 'YYYY-MM') AS month,
      
      -- Total Sales (Confirmed)
      SUM(
        CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN
          COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0)
        ELSE 0 END
      ) AS total_sales,
      
      -- Total Nights (Confirmed, Accommodation Only)
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

      -- Provisory Sales (Hold/Provisory)
      SUM(
        CASE WHEN r.status IN ('hold', 'provisory') AND rd.cancelled IS NULL AND rd.billable = TRUE THEN
          COALESCE(rd.price, 0) + COALESCE(ra_sum.price, 0)
        ELSE 0 END
      ) AS provisory_sales,

      -- Provisory Nights (Hold/Provisory)
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
      ) AS cancelled_non_billable_nights,
      
      STRING_AGG(DISTINCT r.type, ', ') AS reservation_types,
      STRING_AGG(DISTINCT pt.name, ', ') AS payment_methods,
      STRING_AGG(DISTINCT COALESCE(pc.name_kanji, pc.name_kana, pc.name), ', ') AS payer_names

    FROM
      reservations r
      JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id
      JOIN clients c ON r.reservation_client_id = c.id
      JOIN hotels h ON r.hotel_id = h.id
      LEFT JOIN reservation_payments rp ON r.id = rp.reservation_id AND r.hotel_id = rp.hotel_id
      LEFT JOIN payment_types pt ON rp.payment_type_id = pt.id
      LEFT JOIN clients pc ON rp.client_id = pc.id
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
      h.id, h.name, c.id, c.customer_id, c.name_kanji, c.name_kana, c.name, c.phone, TO_CHAR(DATE_TRUNC('month', rd.date), 'YYYY-MM')
    ORDER BY
      month DESC, total_sales DESC;
  `;

  const values = [dateStart, dateEnd];

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
