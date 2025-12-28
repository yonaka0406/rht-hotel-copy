const { getPool } = require('../../config/database');

const getTopBookers = async (requestId, dateStart, dateEnd, includeTemp = false, minSales = 0, limit = 200) => {
  const pool = getPool(requestId);
  
  // Base sum for sorting and filtering
  const sortSum = `(
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
  )`;

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
    HAVING ${sortSum} >= $4
    ORDER BY ${sortSum} DESC
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

const getSalesByClientByMonth = async (requestId, dateStart, dateEnd, includeTemp = false, minSales = 0, limit = 10000) => {
  const pool = getPool(requestId);

  // Note: For CSV export, minSales and limit usually apply to the aggregated totals per client,
  // but since this query is grouped by month AND hotel, we apply the filter to the client's overall total
  // by using a subquery or a CTE if we want precise "Top X clients" behavior.
  // However, simple HAVING on the row is easier for now if the user just wants to filter small rows.
  // Given the complexity of "Total sales across period" vs "rows in CSV", let's use a simple HAVING on the monthly row sum for now,
  // or just pass 0 and high limit for "Download All".

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
    -- No HAVING here to ensure CSV is complete by default, but we could add one if needed.
    ORDER BY
      month DESC, total_sales DESC
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
