const { getPool } = require('../config/database');

// Diagnostic note: If you encounter partition errors related to hotel_id being null in reservation_details inserts, add a log in addReservationDetail (models/reservations.js) to print the SQL values array before the insert. Example:
// console.error('[addReservationDetail] Inserting with values:', values);
// This helps ensure hotel_id is always set and not null.

// GET
const selectCountReservation = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);
  const query = `
    WITH
    -- 0. Dates that actually appear in reservation_details
    dates AS (
      SELECT DISTINCT hotel_id, date
      FROM reservation_details
      WHERE hotel_id = $1
        AND date BETWEEN $2 AND $3
    ),

    -- 1. Blocked rooms count per date
    blocked_rooms AS (
      SELECT
        rd.hotel_id,
        rd.date,
        COUNT(CASE WHEN r.status = 'block' THEN rd.room_id ELSE NULL END) AS blocked_count
      FROM reservations r
      JOIN reservation_details rd
        ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
      JOIN rooms
        ON rd.room_id = rooms.id
      WHERE
        r.hotel_id = $1
        AND rd.date BETWEEN $2 AND $3
        AND r.status = 'block'
        AND rooms.for_sale = TRUE
      GROUP BY rd.hotel_id, rd.date
    ),

    -- 2. Room inventory
    room_inventory AS (
      SELECT
        hotel_id,
        COUNT(*) AS total_rooms
      FROM rooms
      WHERE hotel_id = $1 AND for_sale = TRUE
      GROUP BY hotel_id
    ),

    -- 3. Rooms left per date (only reservation dates)
    room_total AS (
      SELECT
        d.hotel_id,
        d.date,
        ri.total_rooms,
        ri.total_rooms - COALESCE(br.blocked_count, 0) AS total_rooms_real
      FROM dates d
      CROSS JOIN room_inventory ri
      LEFT JOIN blocked_rooms br
        ON br.date = d.date AND br.hotel_id = ri.hotel_id
    ),

    -- New CTE to calculate net prices for each reservation_detail
    reservation_details_net_price AS (
        SELECT
            rd.hotel_id,
            rd.date,
            rd.reservation_id,
            rd.id AS reservation_detail_id,
            rd.number_of_people,
            CASE WHEN rd.cancelled IS NULL THEN FALSE ELSE TRUE END AS cancelled,
            -- Calculate net plan price
            COALESCE(
                CASE
                    WHEN rd.plan_type = 'per_room' THEN rr.net_price
                    ELSE rr.net_price * rd.number_of_people
                END, 0
            ) AS net_plan_price,
            -- Calculate net addon price
            COALESCE(ra.net_price_sum, 0) AS net_addon_price,
            COALESCE(gender_counts.male_count, 0) AS male_count,
            COALESCE(gender_counts.female_count, 0) AS female_count
        FROM
            reservations res
		    JOIN
            reservation_details rd ON res.hotel_id = rd.hotel_id AND res.id = rd.reservation_id
        LEFT JOIN (
            -- Aggregate net prices from reservation_rates for each reservation_detail
            SELECT
                hotel_id,
                reservation_details_id,
                SUM(net_price) AS net_price
            FROM
                reservation_rates
            WHERE hotel_id = $1
            GROUP BY
                hotel_id, reservation_details_id
        ) rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
        LEFT JOIN (
            -- Aggregate net prices from reservation_addons for each reservation_detail
            SELECT
                hotel_id,
                reservation_detail_id,
                SUM(net_price * quantity) AS net_price_sum
            FROM
                reservation_addons
            WHERE hotel_id = $1
            GROUP BY
                hotel_id, reservation_detail_id
        ) ra ON rd.id = ra.reservation_detail_id AND rd.hotel_id = ra.hotel_id
        LEFT JOIN (
            -- Count male, female, and unspecified clients for each reservation_detail
            SELECT
                rc.hotel_id,
                rc.reservation_details_id,
                COUNT(CASE WHEN c.gender = 'male' THEN 1 ELSE NULL END) AS male_count,
                COUNT(CASE WHEN c.gender = 'female' THEN 1 ELSE NULL END) AS female_count
            FROM
                reservation_clients rc
            JOIN
                clients c ON rc.client_id = c.id
            WHERE rc.hotel_id = $1
            GROUP BY
                rc.hotel_id, rc.reservation_details_id
        ) gender_counts ON rd.id = gender_counts.reservation_details_id AND rd.hotel_id = gender_counts.hotel_id
        WHERE
            rd.billable = TRUE 
            AND rd.hotel_id = $1 AND rd.date BETWEEN $2 AND $3
			      AND res.status NOT IN('hold','block')
			      AND res.type <> 'employee'           
    )

    -- 4. Main Query (using calculated net prices)
    SELECT
      rt.date,
      rt.total_rooms,
      rt.total_rooms_real,
      COUNT(CASE WHEN rdn.cancelled = TRUE THEN NULL ELSE rdn.reservation_detail_id END) AS room_count, -- Adjusted room_count
      SUM(CASE WHEN rdn.cancelled = TRUE THEN NULL ELSE rdn.number_of_people END) AS people_sum, -- Adjusted people_sum      
      SUM(CASE WHEN rdn.cancelled = TRUE THEN NULL ELSE rdn.male_count END) AS male_count,
      SUM(CASE WHEN rdn.cancelled = TRUE THEN NULL ELSE rdn.female_count END) AS female_count,
      (SUM(CASE WHEN rdn.cancelled = TRUE THEN NULL ELSE rdn.number_of_people END) - SUM(CASE WHEN rdn.cancelled = TRUE THEN NULL ELSE rdn.male_count END) - SUM(CASE WHEN rdn.cancelled = TRUE THEN NULL ELSE rdn.female_count END)) AS unspecified_count,
      SUM(rdn.net_plan_price + rdn.net_addon_price) AS price -- This will be the pre-tax total revenue
    FROM room_total rt
    LEFT JOIN reservation_details_net_price rdn
      ON rdn.hotel_id = rt.hotel_id AND rdn.date = rt.date
    WHERE
      rt.hotel_id = $1
    GROUP BY
      rt.date, rt.total_rooms, rt.total_rooms_real
    ORDER BY rt.date;
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

const selectCountReservationDetailsPlans = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      reservation_details.date
      ,COALESCE(reservation_details.plans_global_id::TEXT, '') || 'h' || COALESCE(reservation_details.plans_hotel_id::TEXT, '') AS key
      ,COALESCE(plans_global.name, plans_hotel.name, '未設定') AS name
      ,reservation_details.plan_type
      ,SUM(CASE WHEN reservation_details.plan_type = 'per_room' THEN 1
        ELSE reservation_details.number_of_people END) AS quantity
    FROM
      reservations
      ,reservation_details        
      LEFT JOIN plans_global
        ON plans_global.id = reservation_details.plans_global_id
      LEFT JOIN plans_hotel
        ON plans_hotel.hotel_id = reservation_details.hotel_id AND plans_hotel.id = reservation_details.plans_hotel_id
    WHERE
      reservation_details.hotel_id = $1
      AND reservation_details.date BETWEEN $2 AND $3
      AND reservation_details.cancelled IS NULL
      AND reservations.type <> 'employee'
      AND reservations.status NOT IN ('hold', 'block')
      AND reservation_details.reservation_id = reservations.id
      AND reservation_details.hotel_id = reservations.hotel_id
    GROUP BY
      reservation_details.date
      ,reservation_details.plans_global_id
      ,reservation_details.plans_hotel_id
      ,plans_global.name
      ,plans_hotel.name
      ,reservation_details.plan_type
    ORDER BY 1, 2  
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
const selectCountReservationDetailsAddons = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      rd.date
      ,COALESCE(ra.addons_global_id::TEXT, '') || 'h' || COALESCE(ra.addons_hotel_id::TEXT, '') AS key
      ,ra.addon_name
      ,COALESCE(ah.addon_type, ag.addon_type) AS addon_type
      ,SUM(ra.quantity) AS quantity
    FROM  
      reservations res
      JOIN reservation_details rd ON res.hotel_id = rd.hotel_id AND res.id = rd.reservation_id
      JOIN reservation_addons ra ON rd.hotel_id = ra.hotel_id AND rd.id = ra.reservation_detail_id
      LEFT JOIN addons_global ag ON ra.addons_global_id = ag.id
      LEFT JOIN addons_hotel ah ON ra.hotel_id = ah.hotel_id AND ra.addons_hotel_id = ah.id
    WHERE
      rd.hotel_id = $1
      AND rd.date BETWEEN $2 AND $3
      AND rd.cancelled IS NULL
      AND res.type <> 'employee'
      AND res.status NOT IN ('hold', 'block')
    GROUP BY
      rd.date
      ,ra.addons_global_id
      ,ra.addons_hotel_id
      ,ra.addon_name
      ,ah.addon_type, ag.addon_type
    ORDER BY 1, 2
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
const selectOccupationByPeriod = async (requestId, period, hotelId, refDate) => {
  const pool = getPool(requestId);
  const date = new Date(refDate);

  if (period === 'month_0') {
    date.setDate(1); // First day of current month
  } else if (period === 'month_1') {
    date.setMonth(date.getMonth() + 1, 1); // First day of next month
  } else if (period === 'month_2') {
    date.setMonth(date.getMonth() + 2, 1); // First day of the month after next
  } else {
    throw new Error("Invalid period. Use 'month_0', 'month_1', or 'month_2'.");
  }

  const formattedDate = date.toISOString().split('T')[0];

  const query = `
    WITH roomTotal AS (
      SELECT 
        hotel_id,
        EXTRACT(DAY FROM (DATE_TRUNC('month', $1::DATE) + INTERVAL '1 month' - INTERVAL '1 day')) AS last_day,
        COUNT(*) as total_rooms
      FROM rooms
      WHERE for_sale = true AND hotel_id = $2
      GROUP BY hotel_id
    )
    SELECT
      COUNT(CASE WHEN reservations.status = 'block' THEN NULL ELSE reservation_details.room_id END) as room_count,
      (roomTotal.total_rooms * roomTotal.last_day) - COUNT(CASE WHEN reservations.status = 'block' AND rooms.for_sale = TRUE then 1 ELSE NULL END) as available_rooms,  
      COUNT(CASE WHEN reservations.status = 'block' AND rooms.for_sale = TRUE then 1 ELSE NULL END) as blocked_rooms,
      (roomTotal.total_rooms * roomTotal.last_day) as total_rooms
    FROM 
      reservations
      JOIN reservation_details ON reservation_details.hotel_id = reservations.hotel_id AND reservation_details.reservation_id = reservations.id 
      JOIN rooms ON reservation_details.room_id = rooms.id
      JOIN roomTotal ON reservation_details.hotel_id = roomTotal.hotel_id
    WHERE
      reservation_details.hotel_id = $2
      AND DATE_TRUNC('month', reservation_details.date) = DATE_TRUNC('month', $1::DATE)
      AND reservation_details.cancelled IS NULL
      AND reservations.type <> 'employee'
      AND reservations.status NOT IN ('hold')      
    GROUP BY roomTotal.total_rooms, roomTotal.last_day;
  `;

  const values = [formattedDate, hotelId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};
const selectReservationListView = async (requestId, hotelId, dateStart, dateEnd, searchType = 'stay_period') => {

  try {
    const pool = getPool(requestId);

    // Base query parts
    const selectClause = `
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
        ,details.plan_price
        ,details.addon_price
        ,(details.plan_price + details.addon_price) AS price
        ,details.payment
        ,details.clients_json
        ,details.payers_json
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
                  WHEN reservation_details.billable = TRUE AND reservation_details.cancelled IS NULL THEN
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
                  WHEN reservation_details.billable = TRUE AND reservation_details.cancelled IS NULL 
                  THEN COALESCE(ra.addon_sum,0) 
                  ELSE 0 
                END
            ) AS addon_price
          FROM
            reservation_details 
              LEFT JOIN
            (
              SELECT 
                ra.hotel_id
                ,ra.reservation_detail_id
                ,SUM(COALESCE(ra.quantity,0) * COALESCE(ra.price,0)) as addon_sum
              FROM reservation_addons ra
              GROUP BY ra.hotel_id, ra.reservation_detail_id
            ) ra
              ON reservation_details.hotel_id = ra.hotel_id 
             AND reservation_details.id = ra.reservation_detail_id
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
                ) AS clients_json
              FROM 
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
        AND reservations.status <> 'block'  
        AND reservations.reservation_client_id = booker.id
        AND reservations.id = details.reservation_id
        AND reservations.hotel_id = details.hotel_id
        AND reservations.hotel_id = hotels.id
    `;

    // Add date filtering based on search type
    let dateFilterClause = '';
    switch (searchType) {
      case 'check_in':
        dateFilterClause = `
          AND reservations.check_in >= $2::date 
          AND reservations.check_in <= $3::date
        `;
        break;
      case 'created_at':
        dateFilterClause = `
          AND reservations.created_at >= $2::date 
          AND reservations.created_at <= ($3::date + interval '1 day' - interval '1 second')
        `;
        break;
      case 'stay_period':
      default:
        dateFilterClause = `
          AND reservations.check_out > $2
          AND reservations.check_in <= $3
        `;
    }

    const orderClause = `
      ORDER BY check_in, id;
    `;

    const query = selectClause + dateFilterClause + orderClause;
    const values = [hotelId, dateStart, dateEnd];

    const result = await pool.query(query, values);

    return result.rows;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [Request ${requestId}] Error in selectReservationListView:`, {
      error: err.message,
      stack: err.stack,
      parameters: { hotelId, dateStart, dateEnd, searchType }
    });
    throw new Error('Database error');
  }
};
const selectForecastData = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);
  const query = `
    SELECT * 
    FROM du_forecast
    WHERE hotel_id = $1 
      AND forecast_month BETWEEN date_trunc('month', $2::date) AND date_trunc('month', $3::date)
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
const selectAccountingData = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);
  const query = `
    SELECT * 
    FROM du_accounting
    WHERE hotel_id = $1 
      AND accounting_month BETWEEN date_trunc('month', $2::date) AND date_trunc('month', $3::date)
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
      reservation_details.hotel_id
      ,hotels.formal_name
      ,reservation_details.reservation_id
      ,reservations.booker_name
      ,reservations.booker_kana
      ,reservations.booker_kanji
      ,reservations.check_in
      ,reservations.check_out
      ,reservations.check_out - reservations.check_in AS number_of_nights
      ,reservations.number_of_people AS reservation_number_of_people
      ,reservations.status AS reservation_status
      ,reservations.type AS reservation_type
      ,reservations.agent
      ,reservations.ota_reservation_id
      ,reservations.payment_timing
      ,reservation_details.id
      ,reservation_details.date
      ,rooms.floor
      ,rooms.room_number
      ,rooms.capacity
      ,rooms.smoking
      ,rooms.for_sale
      ,room_types.name AS room_type_name
      ,reservation_details.number_of_people
      ,reservation_details.plan_type
      ,COALESCE(plans_hotel.name, plans_global.name) AS plan_name
      ,(CASE 
          WHEN reservation_details.plan_type = 'per_room' 
          THEN reservation_details.price
          ELSE reservation_details.price * reservation_details.number_of_people 
        END
       ) AS plan_price
      ,reservation_addons.addon_name
      ,COALESCE(reservation_addons.quantity,0) AS addon_quantity
      ,COALESCE(reservation_addons.price,0) AS addon_price
      ,(COALESCE(reservation_addons.quantity,0) * COALESCE(reservation_addons.price,0)) AS addon_value
      ,COALESCE(reservations.payments,0) AS payments
      ,reservation_details.billable
      ,reservation_details.cancelled
    FROM
      hotels
      ,rooms
      ,room_types
      ,(
        SELECT 
          reservations.hotel_id
          ,reservations.id          
          ,reservations.check_in
          ,reservations.check_out
          ,reservations.number_of_people
          ,reservations.status
          ,reservations.type
          ,reservations.agent
          ,reservations.ota_reservation_id
          ,reservations.payment_timing
          ,COALESCE(clients.name_kanji, clients.name_kana, clients.name) AS booker_name
          ,clients.name_kana AS booker_kana
          ,clients.name_kanji AS booker_kanji
          ,SUM(reservation_payments.value) as payments
        FROM
          clients
          ,reservations
            LEFT JOIN reservation_payments
              ON reservations.hotel_id = reservation_payments.hotel_id 
             AND reservations.id = reservation_payments.reservation_id
        WHERE
          reservations.reservation_client_id = clients.id
          AND reservations.status <> 'block'
        GROUP BY
          reservations.hotel_id
          ,reservations.id
          ,reservations.check_in
          ,reservations.check_out
          ,reservations.number_of_people
          ,reservations.status
          ,reservations.type
          ,reservations.agent
          ,reservations.ota_reservation_id
          ,reservations.payment_timing
          ,clients.name_kanji, clients.name, clients.name_kana
      ) AS reservations
      ,reservation_details
        LEFT JOIN reservation_addons
          ON reservation_details.hotel_id = reservation_addons.hotel_id 
         AND reservation_details.id = reservation_addons.reservation_detail_id
      LEFT JOIN plans_hotel 
        ON plans_hotel.hotel_id = reservation_details.hotel_id 
       AND plans_hotel.id = reservation_details.plans_hotel_id
      LEFT JOIN plans_global 
        ON plans_global.id = reservation_details.plans_global_id
        
    WHERE      
      reservations.hotel_id = $1
      AND reservation_details.date BETWEEN $2 AND $3      
      AND reservation_details.hotel_id = reservations.hotel_id
      AND reservation_details.reservation_id = reservations.id
      AND reservation_details.hotel_id = hotels.id
      AND reservation_details.hotel_id = rooms.hotel_id
      AND reservation_details.room_id = rooms.id
      AND rooms.hotel_id = room_types.hotel_id
      AND rooms.room_type_id = room_types.id
    ORDER BY 
      reservations.check_in, reservation_details.reservation_id, rooms.room_number, 
      reservation_details.date, reservation_addons.addon_name, reservation_addons.price DESC
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
const selectReservationsInventory = async (requestId, hotelId, startDate, endDate) => {
  const pool = getPool(requestId);
  const query = `
      WITH date_range AS (
          SELECT generate_series($2::date, $3::date, '1 day'::interval)::date AS date
      ),
      active_room_types AS (
          -- Get only room types that have at least one reservation in the date range
          SELECT DISTINCT room_type_id
          FROM vw_room_inventory
          WHERE hotel_id = $1
          AND date BETWEEN $2 AND $3
          AND netrmtypegroupcode IS NOT NULL
      ),
      fallback_room_types AS (
          -- Get all room types for this hotel as fallback (excluding NULL netrmtypegroupcode)
          SELECT DISTINCT room_type_id
          FROM vw_room_inventory
          WHERE hotel_id = $1
          AND netrmtypegroupcode IS NOT NULL
      ),
      final_room_types AS (
          -- Use active room types if they exist, otherwise all room types
          SELECT room_type_id FROM active_room_types
          UNION ALL
          SELECT room_type_id FROM fallback_room_types
          WHERE NOT EXISTS (SELECT 1 FROM active_room_types)
      ),
      room_type_details AS (
          -- Get the most recent details for these room types
          SELECT DISTINCT ON (room_type_id) 
              room_type_id, 
              netrmtypegroupcode, 
              room_type_name, 
              total_rooms
          FROM vw_room_inventory
          WHERE hotel_id = $1
          AND room_type_id IN (SELECT room_type_id FROM final_room_types)
          AND netrmtypegroupcode IS NOT NULL
          ORDER BY room_type_id, date DESC
      )
      SELECT 
          3 AS hotel_id,
          d.date,
          rt.room_type_id,
          rt.netrmtypegroupcode,
          rt.room_type_name,
          rt.total_rooms,
          COALESCE(inv.room_count, 0) AS room_count
      FROM 
          date_range d
      CROSS JOIN room_type_details rt
      LEFT JOIN vw_room_inventory inv ON 
          inv.hotel_id = $1
          AND inv.date = d.date 
          AND inv.room_type_id = rt.room_type_id
      ORDER BY 
          d.date, 
          rt.room_type_id;
  `;
  const values = [hotelId, startDate, endDate];
  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving logs:', err);
    throw new Error('Database error');
  }
};
const selectAllRoomTypesInventory = async (requestId, hotelId, startDate, endDate) => {
  const pool = getPool(requestId);
  const query = `
      WITH date_range AS (
          SELECT generate_series($2::date, $3::date, '1 day'::interval)::date AS date
      ),
      room_type_details AS (
          -- Get the most recent details for all room types with valid group codes
          SELECT DISTINCT ON (room_type_id) 
              room_type_id, 
              netrmtypegroupcode, 
              room_type_name, 
              total_rooms
          FROM vw_room_inventory
          WHERE hotel_id = $1
          AND netrmtypegroupcode IS NOT NULL
          ORDER BY room_type_id, date DESC
      )
      SELECT 
          $1 AS hotel_id,
          d.date,
          rt.room_type_id,
          rt.netrmtypegroupcode,
          rt.room_type_name,
          rt.total_rooms,
          COALESCE(inv.room_count, 0) AS room_count
      FROM 
          date_range d
      CROSS JOIN room_type_details rt
      LEFT JOIN vw_room_inventory inv ON 
          inv.hotel_id = $1
          AND inv.date = d.date 
          AND inv.room_type_id = rt.room_type_id
      ORDER BY 
          d.date, 
          rt.room_type_id;
  `;
  const values = [hotelId, startDate, endDate];
  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving inventory:', err);
    throw new Error('Database error');
  }
};
const selectReservationsForGoogle = async (requestId, hotelId, startDate, endDate) => {
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development') {
    // Skip querying the view in local/test environments
    return [];
  }

  const formatClientName = (name) => {
    if (!name) return null;

    const replacements = {
      '株式会社': '㈱',
      '合同会社': '(同)',
      '有限会社': '(有)',
      '合名会社': '(名)',
      '合資会社': '(資)',
      '一般社団法人': '(一社)',
      '一般財団法人': '(一財)',
      '公益社団法人': '(公社)',
      '公益財団法人': '(公財)',
      '学校法人': '(学)',
      '医療法人': '(医)',
      '社会福祉法人': '(福)',
      '特定非営利活動法人': '(特非)',
      'NPO法人': '(NPO)',
      '宗教法人': '(宗)'
    };

    let result = name;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }
    return result;
  };

  const pool = getPool(requestId);
  const query = `
      SELECT
          r.hotel_id,
          h.formal_name AS hotel_name,
          COALESCE(v.reservation_detail_id, NULL) AS reservation_detail_id,
          series::date AS date,
          COALESCE(v.room_type_name, NULL) AS room_type_name,
          r.room_number,
          COALESCE(v.client_name, NULL) AS client_name,
          COALESCE(v.plan_name, NULL) AS plan_name,
          COALESCE(v.status, NULL) AS status,
          COALESCE(v.type, NULL) AS type,
          COALESCE(v.agent, NULL) AS agent
      FROM
          rooms r
      JOIN
          hotels h ON r.hotel_id = h.id
      CROSS JOIN
          generate_series($2::date, $3::date, '1 day'::interval) AS series
      LEFT JOIN
          vw_booking_for_google v
          ON r.hotel_id = v.hotel_id
          AND r.id = v.room_id
          AND series::date = v.date
      WHERE
          r.hotel_id = $1
      ORDER BY
          series::date, r.room_number;
  `;
  const values = [hotelId, startDate, endDate];
  try {
    const result = await pool.query(query, values);
    // Apply client name formatting to each row
    return result.rows.map(row => ({
      ...row,
      client_name: formatClientName(row.client_name)
    }));
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};

const selectParkingReservationsForGoogle = async (requestId, hotelId, startDate, endDate) => {
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development') {
    return [];
  }

  const formatClientName = (name) => {
    if (!name) return null;

    const replacements = {
      '株式会社': '㈱',
      '合同会社': '(同)',
      '有限会社': '(有)',
      '合名会社': '(名)',
      '合資会社': '(資)',
      '一般社団法人': '(一社)',
      '一般財団法人': '(一財)',
      '公益社団法人': '(公社)',
      '公益財団法人': '(公財)',
      '学校法人': '(学)',
      '医療法人': '(医)',
      '社会福祉法人': '(福)',
      '特定非営利活動法人': '(特非)',
      'NPO法人': '(NPO)',
      '宗教法人': '(宗)'
    };

    let result = name;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }
    return result;
  };

  const pool = getPool(requestId);
  const query = `
      SELECT
          pl.hotel_id,
          h.formal_name AS hotel_name,
          rp.reservation_details_id,
          series::date AS date,
          vc.name AS vehicle_category_name,
          pl.name AS parking_lot_name,
          ps.spot_number,
          COALESCE(c.name_kanji, c.name_kana, c.name)  AS client_name,
          r.status AS reservation_status,
          r.type AS reservation_type,
          r.agent AS agent,
          rp.status AS parking_status,
          ra.addon_name,
          rp.comment
      FROM
          parking_spots ps
      JOIN
          parking_lots pl ON ps.parking_lot_id = pl.id
      JOIN
          hotels h ON pl.hotel_id = h.id
      CROSS JOIN
          generate_series($2::date, $3::date, '1 day'::interval) AS series
      LEFT JOIN
          reservation_parking rp
          ON ps.id = rp.parking_spot_id
          AND pl.hotel_id = rp.hotel_id         -- FIXED: use pl.hotel_id
          AND series::date = rp.date
          AND rp.cancelled IS NULL
      LEFT JOIN
          reservation_details rd
          ON rd.id = rp.reservation_details_id
          AND rd.hotel_id = rp.hotel_id
      LEFT JOIN
          reservations r
          ON r.id = rd.reservation_id
          AND r.hotel_id = rd.hotel_id
      LEFT JOIN
          clients c
          ON c.id = r.reservation_client_id
      LEFT JOIN
          vehicle_categories vc
          ON rp.vehicle_category_id = vc.id
      LEFT JOIN
          reservation_addons ra
          ON ra.id = rp.reservation_addon_id
          AND ra.hotel_id = rp.hotel_id
      WHERE
          pl.hotel_id = $1
      ORDER BY
          series::date, ps.spot_number;
  `;

  const values = [hotelId, startDate, endDate];
  try {
    const result = await pool.query(query, values);
    return result.rows.map(row => ({
      ...row,
      client_name: formatClientName(row.client_name)
    }));
  } catch (err) {
    console.error('Error retrieving parking data:', err);
    throw new Error('Database error');
  }
};

const selectActiveReservationsChange = async (requestId, hotel_id, dateString) => {
  const pool = getPool(requestId);

  let p_hotel_id;
  // Handle 'all' or '0' for hotel_id by setting it to null for the SQL query
  if (hotel_id === 'all' || String(hotel_id) === '0' || hotel_id === 0) {
    p_hotel_id = null;
  } else {
    p_hotel_id = parseInt(hotel_id, 10);
    if (isNaN(p_hotel_id) || p_hotel_id <= 0) {
      return { error: 'Invalid hotel_id. Must be a positive integer, "all", or "0".' };
    }
  }
  // Basic validation for dateString format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return { error: 'Invalid dateString format. Expected YYYY-MM-DD.' };
  }

  const query = `
    SELECT * FROM get_room_inventory_comparison_for_date_range($1, $2);
  `;
  const values = [p_hotel_id, dateString];
  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return { message: 'No inventory data found for the given parameters.', data: [] };
    }
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data from get_room_inventory_comparison_for_date_range:', err);
    return { error: 'Database error occurred while fetching room inventory.' };
  }
};

const selectMonthlyReservationEvolution = async (requestId, hotel_id, target_month) => {
  const pool = getPool(requestId);

  const p_hotel_id = parseInt(hotel_id, 10);
  if (isNaN(p_hotel_id)) {
    throw new Error('Invalid hotel_id format.');
  }
  // Validate target_month format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(target_month)) {
    throw new Error('Invalid target_month format. Expected YYYY-MM-DD.');
  }
  const p_target_month_start_date = target_month;

  const query = `
    WITH
    target_month_days AS (
        SELECT generate_series(
                    $2::DATE,
                    ($2::DATE + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
                    INTERVAL '1 day'
                )::DATE AS stay_date
    ),
    lead_day_series AS (
        SELECT generate_series(0, 180) AS lead_days
    ),
    matrix_base AS (
        SELECT
            tmd.stay_date,
            lds.lead_days
        FROM
            target_month_days tmd
        CROSS JOIN
            lead_day_series lds
    ),
    RelevantReservations AS (
        SELECT
            rd.id AS room_night_id,
            rd.date AS stay_date,
            r.hotel_id,
            (r.check_in::DATE - r.created_at::DATE) AS calculated_lead_time_days
        FROM
            reservation_details rd
        JOIN
            reservations r ON rd.reservation_id = r.id
                           AND rd.hotel_id = r.hotel_id
        WHERE
            r.hotel_id = $1
            AND r.status IN ('confirmed', 'checked_in', 'checked_out')
            AND rd.cancelled IS NULL
    )
    SELECT
        mb.stay_date,
        mb.lead_days,
        COUNT(rr.room_night_id) AS booked_room_nights_count
    FROM
      matrix_base mb
    LEFT JOIN
      RelevantReservations rr
    ON rr.stay_date = mb.stay_date
      AND rr.calculated_lead_time_days >= mb.lead_days
      AND rr.hotel_id = $1
    GROUP BY
        mb.stay_date,
        mb.lead_days
    ORDER BY
        mb.stay_date,
        mb.lead_days;
  `;
  const values = [p_hotel_id, p_target_month_start_date];
  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return [];
    }
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
}

const selectSalesByPlan = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);
  const query = `
    SELECT
      COALESCE(ph.name, pg.name, 'プラン未設定') AS plan_name,
      rd.cancelled IS NOT NULL AND rd.billable = TRUE AS is_cancelled_billable,
      SUM(
        CASE
          WHEN rd.plan_type = 'per_room' THEN rd.price
          ELSE rd.price * rd.number_of_people
        END
      ) AS total_sales
    FROM reservation_details rd
    JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
    LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
    LEFT JOIN plans_global pg ON rd.plans_global_id = pg.id
    WHERE rd.hotel_id = $1
      AND rd.date BETWEEN $2 AND $3
      AND rd.billable = TRUE
      AND r.status NOT IN ('hold', 'block')
      AND r.type <> 'employee'
    GROUP BY
      1, 2
    ORDER BY
      1, 2;
  `;
  const values = [hotelId, dateStart, dateEnd];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error in selectSalesByPlan:', err);
    throw new Error('Database error');
  }
};

const selectOccupationBreakdown = async (requestId, hotelId, startDate, endDate) => {
  const pool = getPool(requestId);
  const query = `
    WITH date_range AS (
      SELECT 
        ($3::DATE - $2::DATE + 1) AS total_days
    ),
    hotel_rooms AS (
      SELECT 
        COUNT(*) as total_rooms
      FROM rooms
      WHERE hotel_id = $1 AND for_sale = true
    ),
    total_bookable_nights AS (
      SELECT 
        (hotel_rooms.total_rooms * date_range.total_days) AS total_bookable_room_nights
      FROM date_range, hotel_rooms
    ),
    plan_data AS (
      SELECT
          COALESCE(ph.name, pg.name, 'プラン未設定') AS plan_name,
          COUNT(CASE WHEN r.status IN ('hold', 'provisory') AND r.type <> 'employee' THEN 1 END) AS undecided_nights,
          COUNT(CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND r.type <> 'employee' THEN 1 END) AS confirmed_nights,
          COUNT(CASE WHEN r.type = 'employee' THEN 1 END) AS employee_nights,
          COUNT(CASE WHEN r.status = 'block' THEN 1 END) AS blocked_nights,
          (COUNT(CASE WHEN r.status IN ('hold', 'provisory') AND r.type <> 'employee' THEN 1 END) +
           COUNT(CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND r.type <> 'employee' THEN 1 END) +
           COUNT(CASE WHEN r.type = 'employee' THEN 1 END) +
           COUNT(CASE WHEN r.status = 'block' THEN 1 END)) AS total_occupied_nights,
          COUNT(rd.id) AS total_reservation_details_nights
      FROM reservation_details rd
      JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
      LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
      LEFT JOIN plans_global pg ON rd.plans_global_id = pg.id
      WHERE rd.hotel_id = $1
        AND rd.date BETWEEN $2 AND $3
        AND rd.cancelled IS NULL
      GROUP BY
          COALESCE(ph.name, pg.name, 'プラン未設定')
    )
    SELECT * FROM (
        SELECT 
            plan_name,
            undecided_nights,
            confirmed_nights,
            employee_nights,
            blocked_nights,
            total_occupied_nights,
            total_reservation_details_nights,
            (SELECT total_bookable_room_nights FROM total_bookable_nights) AS total_bookable_room_nights
        FROM plan_data
        
        UNION ALL
        
        SELECT
            'Total Available' AS plan_name,
            0::bigint AS undecided_nights,
            0::bigint AS confirmed_nights,
            0::bigint AS employee_nights,
            0::bigint AS blocked_nights,
            0::bigint AS total_occupied_nights,
            0::bigint AS total_reservation_details_nights,
            total_bookable_room_nights
        FROM total_bookable_nights
    ) AS union_result
    ORDER BY
        CASE WHEN plan_name = 'Total Available' THEN 'zzz' ELSE plan_name END;
  `;
  const values = [hotelId, startDate, endDate];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error in selectOccupationBreakdown:', err);
    throw new Error('Database error');
  }
};

const selectChannelSummary = async (requestId, hotelIds, startDate, endDate) => {
  const pool = getPool(requestId);
  const values = [hotelIds];
  let dateFilterClause = '';
  let dateFilterClauseSubquery = '';
  let dateParamIndex = 2;

  if (startDate && endDate) {
    dateFilterClause = ` AND rd.date BETWEEN $${dateParamIndex}::date AND $${dateParamIndex + 1}::date`;
    dateFilterClauseSubquery = ` AND rd_pt.date BETWEEN $${dateParamIndex}::date AND $${dateParamIndex + 1}::date`;
    values.push(startDate, endDate);
  } else if (startDate) {
    // Explicitly cast to TEXT to avoid type casting issues when startDate is a year
    dateFilterClause = ` AND TO_CHAR(rd.date, 'YYYY') = $${dateParamIndex}::text`;
    dateFilterClauseSubquery = ` AND TO_CHAR(rd_pt.date, 'YYYY') = $${dateParamIndex}::text`;
    values.push(startDate);
  }

  const query = `
    WITH hotel_reserved_dates AS (
      SELECT
        r.hotel_id,
        COUNT(rd.id) AS total_reserved_dates,
        COUNT(CASE WHEN r.type IN ('web', 'ota') THEN 1 END) AS web_count,
        COUNT(CASE WHEN r.type = 'default' THEN 1 END) AS direct_count
      FROM reservations r
      JOIN reservation_details rd ON r.hotel_id = rd.hotel_id AND r.id = rd.reservation_id
      WHERE r.hotel_id = ANY($1::int[])
      AND r.type <> 'employee' AND r.status NOT IN('hold','block') AND rd.cancelled IS NULL
      ${dateFilterClause}
      GROUP BY r.hotel_id
    )
    SELECT
      h.id AS hotel_id,
      h.name AS hotel_name,
      hrd.total_reserved_dates AS reserved_dates,
      (hrd.web_count * 100.0 / hrd.total_reserved_dates) AS web_percentage,
      (hrd.direct_count * 100.0 / hrd.total_reserved_dates) AS direct_percentage,
      COALESCE(
        json_object_agg(
          pt.payment_timing,
          pt.payment_timing_reserved_dates
        ) FILTER (WHERE pt.payment_timing IS NOT NULL),
        '{}'::json
      ) AS payment_timing
    FROM hotels h
    JOIN hotel_reserved_dates hrd ON h.id = hrd.hotel_id
    LEFT JOIN (
      SELECT
        r_pt.hotel_id,
        COALESCE(r_pt.payment_timing, 'not_set') AS payment_timing,
        COUNT(rd_pt.id) AS payment_timing_reserved_dates
      FROM reservations r_pt
      JOIN reservation_details rd_pt ON r_pt.hotel_id = rd_pt.hotel_id AND r_pt.id = rd_pt.reservation_id
      WHERE r_pt.hotel_id = ANY($1::int[])
      AND r_pt.type <> 'employee' AND r_pt.status NOT IN('hold','block') AND rd_pt.cancelled IS NULL
      ${dateFilterClauseSubquery}
      GROUP BY r_pt.hotel_id, COALESCE(r_pt.payment_timing, 'not_set')
    ) AS pt ON h.id = pt.hotel_id
    WHERE h.id = ANY($1::int[]) -- Ensure hotels are filtered by selected hotelIds
    GROUP BY h.id, h.name, hrd.total_reserved_dates, hrd.web_count, hrd.direct_count;
  `;

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error in selectChannelSummary:', err);
    throw new Error('Database error');
  }
};

const selectCheckInOutReport = async (requestId, hotelId, startDate, endDate) => {
  const pool = getPool(requestId);
  const query = `
    WITH rd_join AS (
      -- reservation_details rows within the date range, joined to their reservation
      SELECT rd.*,
            r.check_in,
            r.check_out,
            r.status AS reservation_status
      FROM reservation_details rd
      JOIN reservations r
        ON rd.reservation_id = r.id
      AND rd.hotel_id = r.hotel_id
      WHERE rd.hotel_id = $1
        AND rd.date BETWEEN $2 AND $3
        AND rd.cancelled IS NULL
        AND r.status NOT IN ('cancelled','block','hold','provisory')
    ),

    -- per-reservation_detail counts of clients by gender (distinct client ids)
    clients_per_detail AS (
      SELECT
        rdj.id AS reservation_detail_id,
        rdj.date,
        rdj.check_in,
        rdj.check_out,
        rdj.hotel_id,
        COUNT(DISTINCT CASE WHEN c.gender = 'male'   THEN rc.client_id END)    AS male_per_detail,
        COUNT(DISTINCT CASE WHEN c.gender = 'female' THEN rc.client_id END)    AS female_per_detail,
        COUNT(DISTINCT CASE WHEN COALESCE(c.gender,'') = '' THEN rc.client_id END) AS unspecified_per_detail
      FROM rd_join rdj
      LEFT JOIN reservation_clients rc
        ON rc.reservation_details_id = rdj.id
      AND rc.hotel_id = rdj.hotel_id
      LEFT JOIN clients c ON c.id = rc.client_id
      GROUP BY rdj.id, rdj.date, rdj.check_in, rdj.check_out, rdj.hotel_id
    ),

    -- include both stay dates and actual checkout dates in the date list
    dates AS (
      SELECT DISTINCT date::date AS date, hotel_id
      FROM rd_join
    
      UNION
    
      SELECT DISTINCT check_out::date AS date, hotel_id
      FROM rd_join
    ),

    -- aggregate room / people counts per date (rooms are reservation_detail rows)
    date_agg AS (
      SELECT
        d.date,
        d.hotel_id,
        -- checkins: when reservation's check_in date equals the target date
        SUM(CASE WHEN rdj.check_in::date = d.date THEN 1 ELSE 0 END)                           AS checkin_room_count,
        SUM(CASE WHEN rdj.check_in::date = d.date THEN rdj.number_of_people ELSE 0 END)         AS total_checkins,
        -- checkouts: count rows that are the last-night (rdj.date = check_out::date - 1)
        -- but *attribute* them to the actual checkout date (rdj.check_out::date = d.date)
        SUM(CASE WHEN rdj.date = (rdj.check_out::date - 1) AND rdj.check_out::date = d.date THEN 1 ELSE 0 END) AS checkout_room_count,
        SUM(CASE WHEN rdj.date = (rdj.check_out::date - 1) AND rdj.check_out::date = d.date THEN rdj.number_of_people ELSE 0 END) AS total_checkouts
      FROM dates d
      LEFT JOIN rd_join rdj
        ON rdj.hotel_id = d.hotel_id
      GROUP BY d.date, d.hotel_id
    ),

    -- aggregate gender counts for arrivals and departures (using clients_per_detail)
    gender_agg AS (
      SELECT
        d.date,
        d.hotel_id,
        SUM(CASE WHEN cpd.check_in::date = d.date THEN cpd.male_per_detail ELSE 0 END)        AS male_checkins,
        SUM(CASE WHEN cpd.check_in::date = d.date THEN cpd.female_per_detail ELSE 0 END)      AS female_checkins,
        SUM(CASE WHEN cpd.check_in::date = d.date THEN cpd.unspecified_per_detail ELSE 0 END) AS unspecified_checkins,
        SUM(CASE WHEN cpd.date = (cpd.check_out::date - 1) AND cpd.check_out::date = d.date THEN cpd.male_per_detail ELSE 0 END)        AS male_checkouts,
        SUM(CASE WHEN cpd.date = (cpd.check_out::date - 1) AND cpd.check_out::date = d.date THEN cpd.female_per_detail ELSE 0 END)      AS female_checkouts,
        SUM(CASE WHEN cpd.date = (cpd.check_out::date - 1) AND cpd.check_out::date = d.date THEN cpd.unspecified_per_detail ELSE 0 END) AS unspecified_checkouts
      FROM dates d
      LEFT JOIN clients_per_detail cpd
        ON cpd.hotel_id = d.hotel_id
      GROUP BY d.date, d.hotel_id
    )

    -- final join: one row per (date, hotel)
    SELECT
      d.date,
      h.name AS hotel_name,
      COALESCE(da.total_checkins, 0)        AS total_checkins,
      COALESCE(da.checkin_room_count, 0)    AS checkin_room_count,
      COALESCE(ga.male_checkins, 0)         AS male_checkins,
      COALESCE(ga.female_checkins, 0)       AS female_checkins,
      COALESCE(ga.unspecified_checkins, 0)  AS unspecified_checkins,
      COALESCE(da.total_checkouts, 0)       AS total_checkouts,
      COALESCE(da.checkout_room_count, 0)   AS checkout_room_count,
      COALESCE(ga.male_checkouts, 0)        AS male_checkouts,
      COALESCE(ga.female_checkouts, 0)      AS female_checkouts,
      COALESCE(ga.unspecified_checkouts, 0) AS unspecified_checkouts
    FROM dates d
    LEFT JOIN date_agg da   ON d.date = da.date   AND d.hotel_id = da.hotel_id
    LEFT JOIN gender_agg ga ON d.date = ga.date   AND d.hotel_id = ga.hotel_id
    LEFT JOIN hotels h      ON d.hotel_id = h.id
    ORDER BY d.date;

  `;
  const values = [hotelId, startDate, endDate];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving check-in/out report data:', err);
    throw new Error('Database error');
  }
};

module.exports = {
  selectCountReservation,
  selectCountReservationDetailsPlans,
  selectCountReservationDetailsAddons,
  selectOccupationByPeriod,
  selectReservationListView,
  selectForecastData,
  selectAccountingData,
  selectExportReservationList,
  selectExportReservationDetails,
  selectExportMealCount,
  selectReservationsInventory,
  selectAllRoomTypesInventory,
  selectReservationsForGoogle,
  selectParkingReservationsForGoogle,
  selectActiveReservationsChange,
  selectMonthlyReservationEvolution,
  selectSalesByPlan,
  selectOccupationBreakdown,
  selectChannelSummary,
  selectCheckInOutReport,  
};
