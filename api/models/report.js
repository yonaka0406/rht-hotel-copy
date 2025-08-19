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
    )

    -- 4. Main Query (using reservation_details.price directly)
    SELECT 
      rt.date,
      rt.total_rooms,
      rt.total_rooms_real,
      COUNT(CASE WHEN rd.cancelled IS NULL THEN rd.room_id ELSE NULL END) AS room_count,
      SUM(CASE WHEN rd.cancelled IS NULL THEN rd.number_of_people ELSE 0 END) AS people_sum,
      SUM(CASE WHEN rd.cancelled IS NULL THEN rd.price ELSE 0 END) AS price
    FROM room_total rt
    LEFT JOIN reservation_details rd 
      ON rd.hotel_id = rt.hotel_id AND rd.date = rt.date
    LEFT JOIN reservations rsv 
      ON rd.reservation_id = rsv.id AND rd.hotel_id = rsv.hotel_id
    WHERE 
      rt.hotel_id = $1
      AND (rd.id IS NULL OR (
        rd.billable = TRUE
        AND rsv.type <> 'employee'
        AND rsv.status NOT IN ('hold', 'block')
      ))
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
      reservation_details.date
      ,COALESCE(reservation_addons.addons_global_id::TEXT, '') || 'h' || COALESCE(reservation_addons.addons_hotel_id::TEXT, '') AS key
      ,reservation_addons.addon_name
      ,SUM(reservation_addons.quantity) AS quantity
    FROM  
      reservations
      ,reservation_details
      ,reservation_addons
    WHERE
      reservation_details.hotel_id = $1
      AND reservation_details.date BETWEEN $2 AND $3
      AND reservation_details.cancelled IS NULL
      AND reservations.type <> 'employee'
      AND reservations.status NOT IN ('hold', 'block')
      AND reservation_details.reservation_id = reservations.id
      AND reservation_details.hotel_id = reservations.hotel_id
      AND reservation_details.hotel_id = reservation_addons.hotel_id
      AND reservation_details.id = reservation_addons.reservation_detail_id
    GROUP BY
      reservation_details.date
      ,reservation_addons.addons_global_id
      ,reservation_addons.addons_hotel_id
      ,reservation_addons.addon_name
      
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
const selectReservationListView = async (requestId, hotelId, dateStart, dateEnd) => {
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
                  'phone', c.phone
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
    FROM
      reservations	
      ,hotels
      ,clients AS booker
      ,(
        SELECT 
          reservation_details.hotel_id
          ,reservation_details.reservation_id
          ,rc.clients_json::TEXT
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
                  'phone', c.phone
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
  
  // First query for the summary data (existing functionality)
  const summaryQuery = `
    SELECT 
      hotels.name as hotel_name
      ,CASE 
        WHEN COALESCE(addons_hotel.addon_type, addons_global.addon_type) = 'breakfast' 
        THEN reservation_details.date + INTERVAL '1 day'
        ELSE reservation_details.date
      END AS meal_date,
      SUM(CASE WHEN COALESCE(addons_hotel.addon_type, addons_global.addon_type) = 'breakfast' THEN reservation_addons.quantity ELSE 0 END) AS breakfast,
      SUM(CASE WHEN COALESCE(addons_hotel.addon_type, addons_global.addon_type) = 'lunch' THEN reservation_addons.quantity ELSE 0 END) AS lunch,
      SUM(CASE WHEN COALESCE(addons_hotel.addon_type, addons_global.addon_type) = 'dinner' THEN reservation_addons.quantity ELSE 0 END) AS dinner
    FROM 
      hotels
        JOIN
      reservations
        ON hotels.id = reservations.hotel_id
        JOIN
      reservation_details
        ON reservations.hotel_id = reservation_details.hotel_id AND reservations.id = reservation_details.reservation_id
        JOIN reservation_addons
        ON reservation_details.hotel_id = reservation_addons.hotel_id 
      AND reservation_details.id = reservation_addons.reservation_detail_id	
        LEFT JOIN addons_global
      ON reservation_addons.addons_global_id = addons_global.id
        LEFT JOIN addons_hotel
        ON reservation_addons.hotel_id = addons_hotel.hotel_id 
      AND reservation_addons.addons_hotel_id = addons_hotel.id
    WHERE
      COALESCE(addons_hotel.addon_type, addons_global.addon_type) IN ('breakfast', 'lunch', 'dinner')
      AND reservations.status NOT In ('hold', 'provisory', 'cancelled', 'block')
      AND reservation_details.cancelled IS NULL
      AND reservation_details.hotel_id = $1
      AND reservation_details.date BETWEEN $2 AND $3 
    GROUP BY 
      hotels.name    
      ,meal_date
    ORDER BY meal_date;
  `;

  // New query for detailed meal count data
  const detailQuery = `
    SELECT 
      COALESCE(booker.name_kanji, booker.name_kana, booker.name) AS booker_name,
      rooms.room_number,
      CASE 
        WHEN COALESCE(addons_hotel.addon_type, addons_global.addon_type) = 'breakfast' 
        THEN reservation_details.date + INTERVAL '1 day'
        ELSE reservation_details.date
      END AS meal_date,
      COALESCE(addons_hotel.addon_type, addons_global.addon_type) AS meal_type,
      reservation_addons.quantity      
    FROM 
      hotels
        JOIN
      reservations
        ON hotels.id = reservations.hotel_id
        JOIN
      clients booker
        ON reservations.reservation_client_id = booker.id
        JOIN
      reservation_details
        ON reservations.hotel_id = reservation_details.hotel_id 
        AND reservations.id = reservation_details.reservation_id
        LEFT JOIN rooms
        ON reservation_details.room_id = rooms.id
        JOIN reservation_addons
        ON reservation_details.hotel_id = reservation_addons.hotel_id 
        AND reservation_details.id = reservation_addons.reservation_detail_id	
        LEFT JOIN addons_global
        ON reservation_addons.addons_global_id = addons_global.id
        LEFT JOIN addons_hotel
        ON reservation_addons.hotel_id = addons_hotel.hotel_id 
        AND reservation_addons.addons_hotel_id = addons_hotel.id
    WHERE
      COALESCE(addons_hotel.addon_type, addons_global.addon_type) IN ('breakfast', 'lunch', 'dinner')
      AND reservations.status NOT IN ('hold', 'provisory', 'cancelled', 'block')
      AND reservation_details.cancelled IS NULL
      AND reservation_details.hotel_id = $1
      AND reservation_details.date BETWEEN $2 AND $3
    ORDER BY 
      meal_date,
      booker_name,
      rooms.room_number;
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
      return result.rows;
  } catch (err) {
      console.error('Error retrieving data:', err);
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
  selectActiveReservationsChange,
  selectMonthlyReservationEvolution,
};
