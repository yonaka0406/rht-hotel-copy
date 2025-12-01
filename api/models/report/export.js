const { getPool } = require('../../config/database');

const selectExportReservationList = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);
  const query = `
    SELECT
      reservations.hotel_id
      ,hotels.formal_name
      ,reservations.id
      ,reservations.status
      ,reservations.reservation_client_id AS booker_id
      ,COALESCE(booker.name_kanji, booker.name_kana, booker.name) AS booker_name
      ,booker.name_kana AS booker_name_kana
      ,booker.name_kanji AS booker_name_kanji
      ,reservations.check_in
      ,reservations.check_out
      ,reservations.check_out - reservations.check_in AS number_of_nights
      ,reservations.number_of_people
      ,COALESCE(details.plan_price, 0) AS plan_price
      ,COALESCE(details.addon_price, 0) AS addon_price
      ,(COALESCE(details.plan_price, 0) + COALESCE(details.addon_price, 0)) AS price
      ,COALESCE(details.payment, 0) AS payment
      ,details.clients_json
      ,details.payers_json
      ,reservations.comment
      ,reservations.payment_timing
    FROM
      reservations	
      ,hotels
      ,clients AS booker
      ,(
        SELECT 
          reservation_details.hotel_id
          ,reservation_details.reservation_id
          ,rc.clients_json::TEXT AS clients_json
          ,rpc.clients_json::TEXT AS payers_json
          ,COALESCE(rp.payment,0) as payment
          ,SUM(
              CASE 
                WHEN reservation_details.billable = TRUE THEN 
                  CASE 
                    WHEN reservation_details.plan_type = 'per_room' 
                    THEN reservation_details.price
                    ELSE reservation_details.price * reservation_details.number_of_people 
                  END
                ELSE 0 
              END
          ) AS plan_price
          ,SUM(
              CASE 
                WHEN reservation_details.billable = TRUE 
                THEN reservation_addons.price 
                ELSE 0 
              END
          ) AS addon_price
        FROM
          reservation_details 
            LEFT JOIN
          (
            SELECT
              reservation_addons.hotel_id
              ,reservation_addons.reservation_detail_id
              ,SUM(COALESCE(reservation_addons.quantity,0) * COALESCE(reservation_addons.price,0)) AS price
            FROM reservation_addons
            GROUP BY
              reservation_addons.hotel_id
              ,reservation_addons.reservation_detail_id
          ) reservation_addons
            ON reservation_details.hotel_id = reservation_addons.hotel_id 
           AND reservation_details.id = reservation_addons.reservation_detail_id
            LEFT JOIN 
          (
            SELECT 
              rc.reservation_id,
                              JSON_AGG(
                                JSON_BUILD_OBJECT(
                                  'client_id', rc.client_id,
                                  'name', c.name,
                                  'name_kana', c.name_kana,
                                  'name_kanji', c.name_kanji,
                                  'email', c.email,
                                  'phone', c.phone,
                                  'gender', c.gender
                                )
                              ) AS clients_json            FROM 
              (SELECT DISTINCT reservation_id, client_id 
                 FROM reservation_clients rc 
                 JOIN reservation_details rd ON rc.reservation_details_id = rd.id) rc
              JOIN clients c ON rc.client_id = c.id
            GROUP BY rc.reservation_id
          ) rc ON rc.reservation_id = reservation_details.reservation_id
           LEFT JOIN
          (
            SELECT
              reservation_id
              ,SUM(value) as payment
            FROM reservation_payments
            GROUP BY reservation_id
          ) rp ON rp.reservation_id = reservation_details.reservation_id
            LEFT JOIN
          (
            SELECT 
              rpc.reservation_id,
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'client_id', c.id,
                  'name', c.name,
                  'name_kana', c.name_kana,
                  'name_kanji', c.name_kanji,
                  'email', c.email,
                  'phone', c.phone
                )
              ) AS clients_json
            FROM 
              (SELECT DISTINCT reservation_id, client_id 
                 FROM reservation_payments rp 
                 JOIN reservations r ON rp.reservation_id = r.id) rpc
              JOIN clients c ON rpc.client_id = c.id
            GROUP BY rpc.reservation_id
          ) rpc ON rpc.reservation_id = reservation_details.reservation_id
        WHERE
          reservation_details.hotel_id = $1
        GROUP BY
          reservation_details.hotel_id
          ,reservation_details.reservation_id
          ,rc.clients_json::TEXT
          ,rpc.clients_json::TEXT
          ,rp.payment
      ) AS details
    WHERE
      reservations.hotel_id = $1
      AND reservations.check_out > $2
      AND reservations.check_in <= $3
      AND reservations.status <> 'block'
      AND reservations.reservation_client_id = booker.id
      AND reservations.id = details.reservation_id
      AND reservations.hotel_id = details.hotel_id
      AND reservations.hotel_id = hotels.id
    ORDER BY 5, 7;
  `;

  const values = [hotelId, dateStart, dateEnd]

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};

const selectExportReservationDetails = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);
  const query = `
    SELECT
      head.hotel_id
      ,head.formal_name
      ,head.id AS reservation_id
      ,head.booker_name
      ,head.booker_kana
      ,head.booker_kanji
      ,head.check_in
      ,head.check_out
      ,head.check_out - head.check_in AS number_of_nights
      ,head.number_of_people AS reservation_number_of_people
      ,head.status AS reservation_status
      ,head.type AS reservation_type
      ,head.agent
      ,head.ota_reservation_id
      ,head.payment_timing
      ,head.payments
      ,body.id
      ,body.date
      ,body.floor
      ,body.room_number
      ,body.capacity
      ,body.smoking
      ,body.has_wet_area
      ,body.for_sale
      ,body.room_type_name
      ,body.number_of_people
      ,body.plan_type
      ,body.plan_name
      ,body.plan_price
	    ,rates.plan_net_price
      ,body.addon_name
      ,body.addon_quantity
      ,body.addon_price      
      ,body.addon_value    
      ,body.addon_net_value
      ,body.billable
      ,body.cancelled
      
    FROM
      (
        SELECT 
          r.hotel_id
          ,h.formal_name
          ,r.id
          ,r.check_in
            ,r.check_out
            ,r.number_of_people
            ,r.status
            ,r.type
            ,r.agent
            ,r.ota_reservation_id
            ,r.payment_timing
            ,COALESCE(c.name_kanji, c.name_kana, c.name) AS booker_name
            ,c.name_kana AS booker_kana
            ,COALESCE(c.name_kanji,'') AS booker_kanji
            ,SUM(COALESCE(rp.value,0)) as payments
        FROM
          reservations r 
          JOIN reservation_details rd ON r.hotel_id = rd.hotel_id AND r.id = rd.reservation_id
          JOIN clients c ON r.reservation_client_id = c.id
          JOIN hotels h ON r.hotel_id = h.id
          LEFT JOIN reservation_payments rp ON r.hotel_id = rp.hotel_id AND r.id = rp.reservation_id
        WHERE
          r.hotel_id = $1
          AND rd.date BETWEEN $2 AND $3
          AND r.status <> 'block'
        GROUP BY
          r.hotel_id
          ,h.formal_name
          ,r.id
          ,r.check_in
          ,r.check_out
          ,r.number_of_people
          ,r.status
          ,r.type
          ,r.agent
          ,r.ota_reservation_id
          ,r.payment_timing
          ,c.name_kanji, c.name, c.name_kana
      ) head 
      JOIN
      (
        SELECT 
          rd.hotel_id
          ,rd.reservation_id
          ,rd.id
          ,rd.date
          ,rooms.floor
            ,rooms.room_number
            ,rooms.capacity
            ,rooms.smoking
            ,rooms.has_wet_area
            ,rooms.for_sale
            ,room_types.name AS room_type_name
          ,rd.number_of_people
            ,rd.plan_type
          ,COALESCE(ph.name, pg.name) AS plan_name
          ,(CASE 
            WHEN rd.plan_type = 'per_room' 
            THEN rd.price
            ELSE rd.price * rd.number_of_people 
            END
            ) AS plan_price
          ,ra.addon_name
          ,COALESCE(ra.quantity,0) AS addon_quantity
            ,COALESCE(ra.price,0) AS addon_price
          ,(COALESCE(ra.quantity,0) * COALESCE(ra.price,0)) AS addon_value
          ,(COALESCE(ra.quantity,0) * COALESCE(ra.net_price,0)) AS addon_net_value
          ,rd.billable
            ,rd.cancelled
        FROM
          reservation_details rd	
          JOIN rooms ON rd.hotel_id = rooms.hotel_id AND rd.room_id = rooms.id
          JOIN room_types  ON rooms.hotel_id = room_types.hotel_id AND rooms.room_type_id = room_types.id
          LEFT JOIN plans_hotel ph ON ph.hotel_id = rd.hotel_id AND ph.id = rd.plans_hotel_id
            LEFT JOIN plans_global pg ON pg.id = rd.plans_global_id
          LEFT JOIN reservation_addons ra ON rd.hotel_id = ra.hotel_id AND rd.id = ra.reservation_detail_id
        WHERE 
          rd.hotel_id = $1
          AND rd.date BETWEEN $2 AND $3
      ) body 
      ON head.hotel_id = body.hotel_id AND head.id = body.reservation_id
      LEFT JOIN
      (
          SELECT
              rr.hotel_id,
              rr.reservation_details_id AS id,
        SUM(rr.price) AS plan_price,
              SUM(rr.net_price) AS plan_net_price
          FROM
              reservation_rates rr JOIN reservation_details rd ON rr.hotel_id = rd.hotel_id AND rr.reservation_details_id = rd.id
      WHERE 
            rd.hotel_id = $1
            AND rd.date BETWEEN $2 AND $3
          GROUP BY
              rr.hotel_id, rr.reservation_details_id    
      ) rates
      ON body.hotel_id = rates.hotel_id AND body.id = rates.id

    ORDER BY 
      head.check_in, head.id, body.room_number, body.date, body.id, body.addon_name
  `;

  const values = [hotelId, dateStart, dateEnd]

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};

const selectExportMealCount = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);

  const summaryQuery = `
    WITH all_meals AS (
      SELECT
        h.name AS hotel_name,
        ra.quantity,
        CASE
          WHEN TRIM(COALESCE(ah.addon_type, ag.addon_type)) IN ('breakfast', 'lunch')
          THEN rd.date + INTERVAL '1 day'
          ELSE rd.date
        END AS meal_date,
        TRIM(COALESCE(ah.addon_type, ag.addon_type)) AS meal_type
      FROM
        hotels h
      JOIN reservations r ON h.id = r.hotel_id
      JOIN reservation_details rd ON r.hotel_id = rd.hotel_id AND r.id = rd.reservation_id
      JOIN reservation_addons ra ON rd.hotel_id = ra.hotel_id AND rd.id = ra.reservation_detail_id
      LEFT JOIN addons_global ag ON ra.addons_global_id = ag.id
      LEFT JOIN addons_hotel ah ON ra.hotel_id = ah.hotel_id AND ra.addons_hotel_id = ah.id
      WHERE
        r.hotel_id = $1
        AND rd.date BETWEEN ($2::date - INTERVAL '1 day') AND $3::date
        AND TRIM(COALESCE(ah.addon_type, ag.addon_type)) IN ('breakfast', 'lunch', 'dinner')
        AND r.status NOT IN ('hold', 'provisory', 'cancelled', 'block')
        AND rd.cancelled IS NULL
    )
    SELECT
      hotel_name,
      meal_date,
      SUM(CASE WHEN meal_type = 'breakfast' THEN quantity ELSE 0 END) AS breakfast,
      SUM(CASE WHEN meal_type = 'lunch' THEN quantity ELSE 0 END) AS lunch,
      SUM(CASE WHEN meal_type = 'dinner' THEN quantity ELSE 0 END) AS dinner
    FROM all_meals
    WHERE meal_date BETWEEN $2::date AND $3::date
    GROUP BY hotel_name, meal_date
    ORDER BY meal_date;
  `;

  const detailQuery = `
    WITH all_meals AS (
      SELECT
        COALESCE(booker.name_kanji, booker.name_kana, booker.name) AS booker_name,
        rooms.room_number,
        reservation_addons.quantity,
        CASE
          WHEN TRIM(COALESCE(addons_hotel.addon_type, addons_global.addon_type)) IN ('breakfast', 'lunch')
          THEN reservation_details.date + INTERVAL '1 day'
          ELSE reservation_details.date
        END AS meal_date,
        TRIM(COALESCE(addons_hotel.addon_type, addons_global.addon_type)) AS meal_type
      FROM
        hotels
      JOIN reservations ON hotels.id = reservations.hotel_id
      JOIN clients booker ON reservations.reservation_client_id = booker.id
      JOIN reservation_details ON reservations.hotel_id = reservation_details.hotel_id AND reservations.id = reservation_details.reservation_id
      LEFT JOIN rooms ON reservation_details.room_id = rooms.id
      JOIN reservation_addons ON reservation_details.hotel_id = reservation_addons.hotel_id AND reservation_details.id = reservation_addons.reservation_detail_id
      LEFT JOIN addons_global ON reservation_addons.addons_global_id = addons_global.id
      LEFT JOIN addons_hotel ON reservation_addons.hotel_id = addons_hotel.hotel_id AND reservation_addons.addons_hotel_id = addons_hotel.id
      WHERE
        reservations.hotel_id = $1
        AND reservation_details.date BETWEEN ($2::date - INTERVAL '1 day') AND $3::date
        AND TRIM(COALESCE(addons_hotel.addon_type, addons_global.addon_type)) IN ('breakfast', 'lunch', 'dinner')
        AND reservations.status NOT IN ('hold', 'provisory', 'cancelled', 'block')
        AND reservation_details.cancelled IS NULL
    )
    SELECT
      booker_name,
      room_number,
      meal_date,
      meal_type,
      quantity
    FROM all_meals
    WHERE meal_date BETWEEN $2::date AND $3::date
    ORDER BY
      meal_date,
      booker_name,
      room_number;
  `;

  const values = [hotelId, dateStart, dateEnd];

  try {
    // Execute both queries in parallel
    const [summaryResult, detailResult] = await Promise.all([
      pool.query(summaryQuery, values),
      pool.query(detailQuery, values)
    ]);

    return {
      summary: summaryResult.rows,
      details: detailResult.rows
    };
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};

const calculateAndSaveDailyMetrics = async (requestId) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const metricDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });

    await client.query('DELETE FROM daily_plan_metrics WHERE metric_date = $1', [metricDate]);
    await client.query("SELECT setval('daily_plan_metrics_id_seq', COALESCE((SELECT MAX(id) + 1 FROM daily_plan_metrics), 1), false);");

    const hotelsWithReservationsResult = await client.query(`
            SELECT r.hotel_id, MAX(r.check_out) as last_date
            FROM reservations r
            JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id
            WHERE rd.date >= $1 AND r.status <> 'block'
            GROUP BY r.hotel_id;
        `, [metricDate]);

    const hotelsWithReservations = hotelsWithReservationsResult.rows;

    for (const hotel of hotelsWithReservations) {
      const hotelId = hotel.hotel_id;
      const lastDate = hotel.last_date;

      const query = `

              INSERT INTO daily_plan_metrics (metric_date, month, hotel_id, plans_global_id, plans_hotel_id, plan_name, confirmed_stays, pending_stays, in_talks_stays, cancelled_stays, non_billable_cancelled_stays, employee_stays, normal_sales, cancellation_sales, accommodation_sales, other_sales, accommodation_sales_cancelled, other_sales_cancelled)

                WITH months AS (
                    SELECT generate_series(
                        date_trunc('month', $1::date),
                        date_trunc('month', $2::date),
                        '1 month'
                    )::date AS month
                ),

                addon_sums AS (
                    SELECT
                        ra.hotel_id,
                        ra.reservation_detail_id,
                        SUM(CASE WHEN ra.sales_category = 'accommodation' OR ra.sales_category IS NULL THEN ra.price * ra.quantity ELSE 0 END) AS accommodation_addon_price,
                        SUM(CASE WHEN ra.sales_category = 'other' THEN ra.price * ra.quantity ELSE 0 END) AS other_addon_price,
                        SUM(ra.price * ra.quantity) AS total_addon_price
                    FROM
                        reservation_addons ra
                    GROUP BY
                        ra.hotel_id, ra.reservation_detail_id
                ),

                rate_sums AS (
                    SELECT
                        rr.hotel_id,
                        rr.reservation_details_id,
                        SUM(CASE WHEN rr.sales_category = 'accommodation' OR rr.sales_category IS NULL THEN rr.price ELSE 0 END) AS accommodation_rate_price,
                        SUM(CASE WHEN rr.sales_category = 'other' THEN rr.price ELSE 0 END) AS other_rate_price,
                        SUM(rr.price) AS total_rate_price
                    FROM
                        reservation_rates rr
                    GROUP BY
                        rr.hotel_id, rr.reservation_details_id
                )

                SELECT                                
                    $1 AS metric_date,
                    m.month,
                    $3 AS hotel_id,
                    rd.plans_global_id,
                    rd.plans_hotel_id,
                    COALESCE(ph.name, pg.name, '未設定') AS plan_name,
                    COUNT(CASE WHEN r.status IN('confirmed', 'checked_in', 'checked_out') AND rd.cancelled IS NULL AND rd.billable IS TRUE AND r.type <> 'employee' THEN rd.id END) AS confirmed_stays,
                    COUNT(CASE WHEN r.status = 'provisory' AND rd.cancelled IS NULL AND r.type <> 'employee' THEN rd.id END) AS pending_stays,
                    COUNT(CASE WHEN r.status = 'hold' AND rd.cancelled IS NULL AND r.type <> 'employee' THEN rd.id END) AS in_talks_stays,
                    COUNT(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable IS TRUE AND r.type <> 'employee' THEN rd.id END) AS cancelled_stays,
                    COUNT(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable IS FALSE AND r.type <> 'employee' THEN rd.id END) AS non_billable_cancelled_stays,
                    COUNT(CASE WHEN r.type = 'employee' THEN rd.id END) AS employee_stays,
                    COALESCE(SUM(CASE WHEN rd.cancelled IS NULL AND rd.billable IS TRUE THEN (rd.price + COALESCE(ads.total_addon_price, 0)) ELSE 0 END), 0)::BIGINT AS normal_sales,
                    COALESCE(SUM(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable IS TRUE THEN (rd.price + COALESCE(ads.total_addon_price, 0)) ELSE 0 END), 0)::BIGINT AS cancellation_sales,
                    COALESCE(SUM(CASE WHEN rd.cancelled IS NULL AND rd.billable IS TRUE THEN (COALESCE(rs.accommodation_rate_price, 0) + COALESCE(ads.accommodation_addon_price, 0)) ELSE 0 END), 0)::BIGINT AS accommodation_sales,
                    COALESCE(SUM(CASE WHEN rd.cancelled IS NULL AND rd.billable IS TRUE THEN (COALESCE(rs.other_rate_price, 0) + COALESCE(ads.other_addon_price, 0)) ELSE 0 END), 0)::BIGINT AS other_sales,
                    COALESCE(SUM(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable IS TRUE THEN (COALESCE(rs.accommodation_rate_price, 0) + COALESCE(ads.accommodation_addon_price, 0)) ELSE 0 END), 0)::BIGINT AS accommodation_sales_cancelled,
                    COALESCE(SUM(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable IS TRUE THEN (COALESCE(rs.other_rate_price, 0) + COALESCE(ads.other_addon_price, 0)) ELSE 0 END), 0)::BIGINT AS other_sales_cancelled

                FROM
                    months m
                CROSS JOIN
                    reservation_details rd
                JOIN
                    reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                LEFT JOIN
                    plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
                LEFT JOIN
                    plans_global pg ON rd.plans_global_id = pg.id
                LEFT JOIN
                    addon_sums ads ON rd.hotel_id = ads.hotel_id AND rd.id = ads.reservation_detail_id
                LEFT JOIN
                    rate_sums rs ON rd.hotel_id = rs.hotel_id AND rd.id = rs.reservation_details_id
                WHERE
                    rd.hotel_id = $3
                    AND r.status <> 'block'
                    AND date_trunc('month', rd.date) = m.month
                GROUP BY
                    m.month, rd.plans_global_id, rd.plans_hotel_id, ph.name, pg.name;                        
            `;

      await client.query(query, [metricDate, lastDate, hotelId]);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error calculating and saving daily metrics:', err);
    throw new Error('Database error');
  } finally {
    client.release();
  }
};

const getAvailableMetricDates = async (requestId) => {
  const pool = getPool(requestId);
  const query = `
        SELECT DISTINCT metric_date
        FROM daily_plan_metrics
        ORDER BY metric_date DESC;
    `;
  try {
    const result = await pool.query(query);
    return result.rows.map(row => row.metric_date);
  } catch (err) {
    console.error('Error retrieving available metric dates:', err);
    throw new Error('Database error');
  }
};

const selectDailyReportData = async (requestId, metricDate) => {
  const pool = getPool(requestId);
  const query = `
        SELECT
            dpm.metric_date,
            dpm.month,
            dpm.hotel_id,
            dpm.plans_global_id,  -- Added plans_global_id here
            dpm.plans_hotel_id,   -- Added plans_hotel_id here
            h.name as hotel_name,
            dpm.plan_name,
            SUM(dpm.confirmed_stays) as confirmed_stays,
            SUM(dpm.pending_stays) as pending_stays,
            SUM(dpm.in_talks_stays) as in_talks_stays,
            SUM(dpm.cancelled_stays) as cancelled_stays,
            SUM(dpm.non_billable_cancelled_stays) as non_billable_cancelled_stays,
            SUM(dpm.employee_stays) as employee_stays,
            SUM(dpm.normal_sales) as normal_sales,
            SUM(dpm.cancellation_sales) as cancellation_sales,
            SUM(dpm.accommodation_sales) as accommodation_sales,
            SUM(dpm.other_sales) as other_sales,
            SUM(dpm.accommodation_sales_cancelled) as accommodation_sales_cancelled,
            SUM(dpm.other_sales_cancelled) as other_sales_cancelled,
            MAX(dpm.created_at) as created_at

        FROM
            daily_plan_metrics dpm
        JOIN
            hotels h ON dpm.hotel_id = h.id
        WHERE
            dpm.metric_date = $1
        GROUP BY
            dpm.metric_date, dpm.month, dpm.hotel_id, dpm.plans_global_id, dpm.plans_hotel_id, h.name, dpm.plan_name, dpm.created_at
        ORDER BY
            dpm.hotel_id, dpm.month, h.name, dpm.plan_name;
    `;

  const values = [metricDate];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving daily report data:', err);
    throw new Error('Database error');
  }
};

module.exports = {
  selectExportReservationList,
  selectExportReservationDetails,
  selectExportMealCount,
  calculateAndSaveDailyMetrics,
  selectDailyReportData,
  getAvailableMetricDates,
};