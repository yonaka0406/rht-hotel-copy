const { getPool } = require('../config/database');

// GET
const selectCountReservation = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      reservation_details.date
      ,roomTotal.total_rooms
      ,COUNT(reservation_details.room_id) as room_count
      ,SUM(reservation_details.number_of_people) AS people_sum
      ,SUM(CASE 
        WHEN COALESCE(plans_hotel.plan_type, plans_global.plan_type) = 'per_room' 
        THEN reservation_details.price 
        ELSE reservation_details.price * reservation_details.number_of_people
      END + COALESCE(ra.total_price, 0)) AS price
    FROM
      reservations
      ,reservation_details
        LEFT JOIN 
      plans_hotel 
        ON plans_hotel.hotel_id = reservation_details.hotel_id AND plans_hotel.id = reservation_details.plans_hotel_id
        LEFT JOIN 
      plans_global 
        ON plans_global.id = reservation_details.plans_global_id
        LEFT JOIN 
      (
        SELECT
          ra.reservation_detail_id
          ,SUM(ra.price * ra.quantity) AS total_price
        FROM reservation_addons ra
        GROUP BY ra.reservation_detail_id
      ) ra 
        ON reservation_details.id = ra.reservation_detail_id
      ,(
        SELECT hotel_id, COUNT(*) as total_rooms
        FROM rooms
        WHERE for_sale = true AND hotel_id = $1
        GROUP BY hotel_id
      ) AS roomTotal
    WHERE
      reservation_details.hotel_id = $1
      AND reservation_details.date BETWEEN $2 AND $3
      AND reservation_details.cancelled IS NULL
      AND reservations.type <> 'employee'
      AND reservations.status NOT IN ('hold', 'block')
      AND reservation_details.hotel_id = roomTotal.hotel_id
      AND reservation_details.reservation_id = reservations.id
      AND reservation_details.hotel_id = reservations.hotel_id
    GROUP BY
      reservation_details.date
      ,roomTotal.total_rooms
    ORDER BY 1;
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
      ,COALESCE(reservation_details.plan_name, '未設定') AS name
      ,reservation_details.plan_type
      ,SUM(CASE WHEN reservation_details.plan_type = 'per_room' THEN 1
        ELSE reservation_details.number_of_people END) AS quantity
    FROM
      reservations
      ,reservation_details        
      
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
      ,reservation_details.plan_name
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
      ,COALESCE(booker.name_kanji, booker.name, booker.name_kana) AS booker_name
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
          ,rc.clients_json::TEXT
          ,rpc.clients_json::TEXT AS payers_json
          ,COALESCE(rp.payment,0) as payment
          ,SUM(CASE WHEN reservation_details.billable = TRUE THEN 
                CASE WHEN reservation_details.plan_type = 'per_room' THEN reservation_details.price
                ELSE reservation_details.price * reservation_details.number_of_people END
              ELSE 0 END
          ) AS plan_price
          ,SUM(CASE WHEN reservation_details.billable = TRUE THEN
                  COALESCE(reservation_addons.quantity,0) * COALESCE(reservation_addons.price,0)
              ELSE 0 END
          ) AS addon_price
        FROM
          reservation_details            
            LEFT JOIN
          reservation_addons
            ON reservation_details.hotel_id = reservation_addons.hotel_id AND reservation_details.id = reservation_addons.reservation_detail_id
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
              (SELECT DISTINCT reservation_id, client_id FROM reservation_clients rc JOIN reservation_details rd ON rc.reservation_details_id = rd.id) rc
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
              (SELECT DISTINCT reservation_id, client_id FROM reservation_payments rp JOIN reservations r ON rp.reservation_id = r.id) rpc
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

const selectExportReservationList = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);
  const query = `
    SELECT
      reservations.hotel_id
      ,hotels.formal_name
      ,reservations.id
      ,reservations.status
      ,reservations.reservation_client_id AS booker_id
      ,COALESCE(booker.name_kanji, booker.name, booker.name_kana) AS booker_name
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
          ,SUM(CASE WHEN reservation_details.billable = TRUE THEN 
              CASE WHEN reservation_details.plan_type = 'per_room' THEN reservation_details.price
              ELSE reservation_details.price * reservation_details.number_of_people END
              ELSE 0 END
          ) AS plan_price
          ,SUM(CASE WHEN reservation_details.billable = TRUE THEN reservation_addons.price ELSE 0 END) AS addon_price

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
            ON reservation_details.hotel_id = reservation_addons.hotel_id AND reservation_details.id = reservation_addons.reservation_detail_id
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
              (SELECT DISTINCT reservation_id, client_id FROM reservation_clients rc JOIN reservation_details rd ON rc.reservation_details_id = rd.id) rc
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
              (SELECT DISTINCT reservation_id, client_id FROM reservation_payments rp JOIN reservations r ON rp.reservation_id = r.id) rpc
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
      ,reservation_details.plan_name
      ,(CASE WHEN reservation_details.plan_type = 'per_room' THEN reservation_details.price
        ELSE reservation_details.price * reservation_details.number_of_people END
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
          ,COALESCE(clients.name_kanji, clients.name, clients.name_kana) AS booker_name
          ,clients.name_kana AS booker_kana
			    ,clients.name_kanji AS booker_kanji
          ,SUM(reservation_payments.value) as payments
        FROM
          clients
          ,reservations
            LEFT JOIN
          reservation_payments
            ON reservations.hotel_id = reservation_payments.hotel_id AND reservations.id = reservation_payments.reservation_id
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
          ,clients.name_kanji, clients.name, clients.name_kana
      ) AS reservations
      ,reservation_details        
        LEFT JOIN
      reservation_addons
        ON reservation_details.hotel_id = reservation_addons.hotel_id AND reservation_details.id = reservation_addons.reservation_detail_id
        
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
  const query = `
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
  const values = [hotelId, dateStart, dateEnd]

  try {
    const result = await pool.query(query, values);    
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};

module.exports = {
  selectCountReservation,
  selectCountReservationDetailsPlans,
  selectCountReservationDetailsAddons,
  selectOccupationByPeriod,
  selectReservationListView,
  selectExportReservationList,
  selectExportReservationDetails,
  selectExportMealCount,
};
