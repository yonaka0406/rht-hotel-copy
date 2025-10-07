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

module.exports = {
  selectExportReservationList,
  selectExportReservationDetails,
  selectExportMealCount,
};
