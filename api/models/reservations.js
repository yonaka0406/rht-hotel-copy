const { getPool } = require('../config/database');
const format = require('pg-format');
const { addClientByName } = require('../models/clients');
const { getPlanByKey } = require('../models/plan');
const { getAllPlanAddons } = require('../models/planAddon');
const { getPriceForReservation, getRatesForTheDay } = require('../models/planRate');
const { selectTLRoomMaster } = require('../ota/xmlModel');



// Helper
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Function to Select

const selectAvailableRooms = async (requestId, hotelId, checkIn, checkOut) => {
  const pool = getPool(requestId);
  const query = `
    WITH occupied_rooms AS (
      SELECT
        room_id
      FROM
        reservation_details
      WHERE
        date >= $1 AND date < $2
        AND room_id IS NOT NULL
        AND cancelled IS NULL 
    )
    SELECT
      r.id AS room_id,
      r.room_type_id,
      rt.name AS room_type_name,
      r.room_number,
      r.floor,
      r.capacity,
      r.smoking,
      r.for_sale
    FROM
      rooms r, room_types rt
    WHERE
      r.hotel_id = $3
      AND r.id NOT IN (SELECT room_id FROM occupied_rooms)
      AND r.for_sale = TRUE
      AND r.hotel_id = rt.hotel_id
	    AND r.room_type_id = rt.id
    ORDER BY room_type_id, capacity DESC;
  `;

  const values = [checkIn, checkOut, hotelId];

  try {
    const result = await pool.query(query, values);
    return result.rows; // Return available rooms
  } catch (err) {
    console.error('Error fetching available rooms:', err);
    throw new Error('Database error');
  }
};
const selectReservedRooms = async (requestId, hotel_id, start_date, end_date) => {
  const pool = getPool(requestId);
  const query = `
    SELECT
      reservation_details.id
      ,reservation_details.hotel_id
      ,reservation_details.reservation_id
      ,COALESCE(clients.name_kanji, clients.name) as client_name
      ,reservations.check_in
      ,reservations.check_out
      ,reservations.number_of_people
      ,reservations.status
      ,reservations.type
      ,reservation_details.date
      ,rooms.room_type_id
      ,room_types.name AS room_type_name
      ,reservation_details.room_id
      ,rooms.room_number
      ,reservation_details.plans_global_id
      ,reservation_details.plans_hotel_id
      ,COALESCE(plans_hotel.name, plans_global.name) AS plan_name
	    ,COALESCE(plans_hotel.color, plans_global.color) AS plan_color
      ,reservation_details.number_of_people
      ,reservation_details.price

    FROM
      rooms
      ,room_types
      ,reservations
      ,clients
      ,reservation_details
        LEFT JOIN
      plans_global
        ON reservation_details.plans_global_id = plans_global.id
        LEFT JOIN
      plans_hotel
        ON reservation_details.hotel_id = plans_hotel.hotel_id AND reservation_details.plans_hotel_id = plans_hotel.id
      
    WHERE
      reservation_details.hotel_id = $1
      AND reservation_details.date >= $2 AND reservation_details.date <= $3
      AND reservation_details.cancelled IS NULL      
      AND reservation_details.room_id = rooms.id
      AND reservation_details.hotel_id = rooms.hotel_id
      AND room_types.id = rooms.room_type_id
      AND room_types.hotel_id = rooms.hotel_id
      AND reservations.id = reservation_details.reservation_id
      AND reservations.hotel_id = reservation_details.hotel_id
      AND clients.id = reservations.reservation_client_id
    ORDER BY
      reservation_details.room_id
      ,reservation_details.date
  `;

  const values = [hotel_id, start_date, end_date];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error fetching reserved rooms:', err);
    throw new Error('Database error');
  }
};
const selectReservation = async (requestId, id) => {
  const pool = getPool(requestId);
  const query = `
    SELECT
      reservation_details.id
      ,reservation_details.hotel_id
      ,reservation_details.reservation_id
      ,reservation_details.cancelled
      ,reservation_details.billable
      ,clients.id as client_id
      ,COALESCE(clients.name_kanji, clients.name) as client_name
      ,reservations.check_in
      ,reservations.check_in_time
      ,reservations.check_out      
      ,reservations.check_out_time
      ,reservations.number_of_people as reservation_number_of_people
      ,reservations.status   
      ,reservations.type  
      ,reservations.comment 
      ,reservation_details.date
      ,rooms.room_type_id
      ,room_types.name AS room_type_name
      ,reservation_details.room_id
      ,rooms.room_number
      ,rooms.smoking
      ,rooms.capacity
      ,rooms.floor
      ,reservation_details.plans_global_id
      ,reservation_details.plans_hotel_id
      ,reservation_details.plan_type
      ,reservation_details.plan_name
      ,reservation_details.number_of_people
      ,reservation_details.price AS plan_total_price
	    ,COALESCE(ra.total_price, 0) AS addon_total_price      
      ,CASE 
        WHEN reservation_details.plan_type = 'per_room' THEN reservation_details.price 
        ELSE reservation_details.price * reservation_details.number_of_people
        END + COALESCE(ra.total_price, 0)
      AS price
      ,COALESCE(rc.clients_json, '[]'::json) AS reservation_clients
      ,COALESCE(ra.addons_json, '[]'::json) AS reservation_addons
      ,COALESCE(rr.rates_json, '[]'::json) AS reservation_rates

    FROM
      rooms
        JOIN 
      room_types 
        ON room_types.id = rooms.room_type_id AND room_types.hotel_id = rooms.hotel_id
        JOIN 
      reservation_details 
        ON reservation_details.room_id = rooms.id AND reservation_details.hotel_id = rooms.hotel_id
		JOIN 
      reservations 
        ON reservations.id = reservation_details.reservation_id AND reservations.hotel_id = reservation_details.hotel_id
        JOIN 
      clients 
        ON clients.id = reservations.reservation_client_id        
        LEFT JOIN 
      (
        SELECT
          ra.reservation_detail_id,
          SUM(ra.price * ra.quantity) AS total_price,
          JSON_AGG(
              JSON_BUILD_OBJECT(
                  'addon_id', ra.id,
                  'addons_global_id', ra.addons_global_id,
                  'addons_hotel_id', ra.addons_hotel_id,
                  'addon_name', ra.addon_name,
                  'quantity', ra.quantity,
                  'price', ra.price
              )
          ) AS addons_json
        FROM reservation_addons ra          
        GROUP BY
          reservation_detail_id
      ) ra ON reservation_details.id = ra.reservation_detail_id
        LEFT JOIN 
      (
        SELECT 
          rc.reservation_details_id,
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
        FROM reservation_clients rc
        JOIN clients c ON rc.client_id = c.id
        GROUP BY rc.reservation_details_id
      ) rc ON rc.reservation_details_id = reservation_details.id
        LEFT JOIN 
      (
        SELECT 
          rr.reservation_details_id,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'adjustment_type', rr.adjustment_type,
              'adjustment_value', rr.adjustment_value,
              'tax_type_id', rr.tax_type_id,
              'tax_rate', rr.tax_rate,
              'price', rr.price              
            )
          ) AS rates_json
        FROM reservation_rates rr        
        GROUP BY rr.reservation_details_id
      ) rr ON rr.reservation_details_id = reservation_details.id

    WHERE
      reservations.id = $1

    ORDER BY
      rooms.room_number
      ,reservation_details.date  
  `;

  const values = [id];

  /*
    // Removed because of performance

    ,logs_reservation.log_time as reservation_log_time
    ,logs_reservation_details.log_time as reservation_detail_log_time
          LEFT JOIN 
	    (
	      SELECT * 
	      FROM logs_reservation 
	      WHERE record_id = $1 
	      ORDER BY logs_reservation.log_time DESC 
	      LIMIT 1
	    ) AS logs_reservation
		    ON logs_reservation.record_id = reservation_details.reservation_id
        LEFT JOIN 
      (
          SELECT *
          FROM logs_reservation 
          WHERE record_id IN((SELECT id from reservation_details where reservation_id = $1))
          ORDER BY logs_reservation.log_time DESC 
          LIMIT 1
      ) AS logs_reservation_details
	  	  ON logs_reservation.record_id = reservation_details.id
  */

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error fetching reservation:', err);
    throw new Error('Database error');
  }
};
const selectReservationDetail = async (requestId, id) => {
  const pool = getPool(requestId);
  const query = `
    SELECT
      reservation_details.id,
      reservation_details.hotel_id,
      reservation_details.reservation_id,
      clients.id AS client_id,
      COALESCE(clients.name_kanji, clients.name) AS client_name,
      reservations.check_in,
      reservations.check_out,
      reservations.number_of_people AS reservation_number_of_people,
      reservations.status,  
      reservation_details.date,
      rooms.room_type_id,
      room_types.name AS room_type_name,
      reservation_details.room_id,
      rooms.room_number,
      rooms.smoking,
      rooms.capacity,
      rooms.floor,
      reservation_details.plans_global_id,
      reservation_details.plans_hotel_id,
      reservation_details.plan_type,
      reservation_details.plan_name,
      reservation_details.number_of_people,
      reservation_details.price AS plan_total_price,
      COALESCE(ra.total_price, 0) AS addon_total_price, 
      CASE 
        WHEN reservation_details.plan_type = 'per_room' 
        THEN reservation_details.price 
        ELSE reservation_details.price * reservation_details.number_of_people
      END + COALESCE(ra.total_price, 0) AS price,
      COALESCE(rc.clients_json, '[]'::json) AS reservation_clients,
      COALESCE(ra.addons_json, '[]'::json) AS reservation_addons,
      COALESCE(rr.rates_json, '[]'::json) AS reservation_rates
    FROM
      reservation_details
      JOIN reservations 
        ON reservations.id = reservation_details.reservation_id 
        AND reservations.hotel_id = reservation_details.hotel_id
      JOIN clients 
        ON clients.id = reservations.reservation_client_id
      JOIN rooms 
        ON rooms.id = reservation_details.room_id 
        AND rooms.hotel_id = reservation_details.hotel_id
      JOIN room_types 
        ON room_types.id = rooms.room_type_id 
        AND room_types.hotel_id = rooms.hotel_id      
      LEFT JOIN (
          SELECT
            ra.reservation_detail_id,
            SUM(ra.price * ra.quantity) AS total_price,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'addon_id', ra.id,
                    'addons_global_id', ra.addons_global_id,
                    'addons_hotel_id', ra.addons_hotel_id,
                    'addon_name', ra.addon_name,
                    'quantity', ra.quantity,
                    'price', ra.price
                )
            ) AS addons_json
          FROM reservation_addons ra		
          GROUP BY ra.reservation_detail_id
        ) ra ON reservation_details.id = ra.reservation_detail_id
      LEFT JOIN (
          SELECT 
            rc.reservation_details_id,
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
          FROM reservation_clients rc
          JOIN clients c ON rc.client_id = c.id
          GROUP BY rc.reservation_details_id
        ) rc ON rc.reservation_details_id = reservation_details.id
      LEFT JOIN (
          SELECT 
            rr.reservation_details_id,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'adjustment_type', rr.adjustment_type,
                'adjustment_value', rr.adjustment_value,
                'tax_type_id', rr.tax_type_id,
                'tax_rate', rr.tax_rate,
                'price', rr.price              
              )
            ) AS rates_json
          FROM reservation_rates rr        
          GROUP BY rr.reservation_details_id
        ) rr ON rr.reservation_details_id = reservation_details.id
    WHERE reservation_details.id = $1
  `;

  const values = [id];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error fetching reservation detail:', err);
    throw new Error('Database error');
  }
};
const selectRoomReservationDetails = async (requestId, hotelId, roomId, reservationId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      reservation_details.id,
      reservation_details.hotel_id,
      reservation_details.room_id,
      reservation_details.reservation_id,
      reservation_details.date,
      reservation_details.number_of_people
    FROM
      reservation_details
    WHERE
      reservation_details.hotel_id = $1
      AND reservation_details.room_id = $2
      AND reservation_details.reservation_id = $3
  `;
  const values = [hotelId, roomId, reservationId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error fetching room reservation details:', err);
    throw new Error('Database error');  
  }
};
const selectReservationAddons = async (requestId, id) => {
  const pool = getPool(requestId);
  const query = `
    SELECT * FROM reservation_addons
    WHERE reservation_detail_id = $1
  `;

  const values = [id];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error fetching reservation addons:', err);
    throw new Error('Database error');
  }
};
const selectMyHoldReservations = async (requestId, user_id) => {
  const pool = getPool(requestId);
  const query = `
    SELECT      
      reservation_details.hotel_id
      ,hotels.name
      ,reservation_details.reservation_id
      ,COALESCE(clients.name_kanji, clients.name) as client_name
      ,reservations.check_in
      ,reservations.check_out
      ,reservations.number_of_people
      ,reservations.status      
    FROM
      hotels
      ,rooms
      ,room_types
      ,reservations
      ,reservation_details
      ,clients
    WHERE
      reservations.created_by = $1
      AND reservations.status = 'hold'
      AND reservations.hotel_id = hotels.id
      AND reservation_details.room_id = rooms.id
      AND reservation_details.hotel_id = rooms.hotel_id
      AND room_types.id = rooms.room_type_id
      AND room_types.hotel_id = rooms.hotel_id
      AND reservations.id = reservation_details.reservation_id
      AND reservations.hotel_id = reservation_details.hotel_id
      AND clients.id = reservations.reservation_client_id
    GROUP BY
      hotels.name
      ,reservation_details.hotel_id
      ,reservation_details.reservation_id
      ,COALESCE(clients.name_kanji, clients.name)
      ,reservations.check_in
      ,reservations.check_out
      ,reservations.number_of_people
      ,reservations.status
    ORDER BY
      reservations.check_in
      ,reservation_details.reservation_id      
  `;

  const values = [user_id];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error fetching reservations:', err);
    throw new Error('Database error');
  }
};
const selectReservationsToday = async (requestId, hotelId, date) => {
  const pool = getPool(requestId);
  const query = `
    SELECT DISTINCT
      reservations.hotel_id
      ,reservations.id
      ,reservations.reservation_client_id
      ,COALESCE(r_client.name_kanji, r_client.name) as client_name
      ,reservations.check_in
      ,reservations.check_in_time
      ,reservations.check_out
      ,reservations.check_out_time
      ,reservations.number_of_people as reservation_number_of_people
      ,reservations.status	  
      --,reservation_details.id as reservation_details_id
      --,reservation_details.date
      ,reservation_details.room_id      
      ,rooms.room_number
      ,rooms.floor
      ,rooms.capacity
      ,rooms.for_sale
      ,rooms.smoking
      ,room_types.name as room_type_name
      ,reservation_details.number_of_people
      ,reservation_details.price
      ,reservation_details.plans_global_id
      ,reservation_details.plans_hotel_id
      ,reservation_details.plan_name
      ,reservation_details.plan_type
      ,COALESCE(plans_hotel.color, plans_global.color) as plan_color
      ,rc.clients_json::TEXT
      ,reservation_details.cancelled
    
    FROM
      hotels
      ,rooms
      ,room_types
      ,reservations
      ,clients r_client
      ,reservation_details
      LEFT JOIN (
          SELECT 
            rc.reservation_details_id,
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
          FROM reservation_clients rc
          JOIN clients c ON rc.client_id = c.id
          GROUP BY rc.reservation_details_id
        ) rc ON rc.reservation_details_id = reservation_details.id
      LEFT JOIN plans_hotel 
      ON plans_hotel.hotel_id = reservation_details.hotel_id AND plans_hotel.id = reservation_details.plans_hotel_id
      LEFT JOIN plans_global 
      ON plans_global.id = reservation_details.plans_global_id
      
    WHERE
	    reservations.hotel_id = $1 
      AND (reservation_details.date = $2 OR reservations.check_out = $2)	    
      AND reservations.hotel_id = hotels.id
      AND reservation_details.room_id = rooms.id
      AND reservation_details.hotel_id = rooms.hotel_id
      AND room_types.id = rooms.room_type_id
      AND room_types.hotel_id = rooms.hotel_id
      AND reservations.id = reservation_details.reservation_id
      AND reservations.hotel_id = reservation_details.hotel_id
      AND r_client.id = reservations.reservation_client_id
    ORDER BY 
      rooms.floor
      ,rooms.room_number
      ,reservation_details.room_id
  `;

  const values = [hotelId, date];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error fetching reservations:', err);
    throw new Error('Database error');
  }
};
const selectAvailableDatesForChange = async (requestId, hotelId, roomId, checkIn, checkOut) => {
  const pool = getPool(requestId);
  try {
    const maxDateQuery = `
      SELECT TO_CHAR(MAX(date) + INTERVAL '1 day', 'YYYY-MM-DD') AS max_date
      FROM reservation_details
      WHERE hotel_id = $1 AND room_id = $2 AND date < $3
        AND cancelled IS NULL
    `;
    const valuesMax = [hotelId, roomId, checkIn];
    const minDateQuery = `
      SELECT TO_CHAR(MIN(date), 'YYYY-MM-DD') AS min_date
      FROM reservation_details
      WHERE hotel_id = $1 AND room_id = $2 AND date >= $3
        AND cancelled IS NULL
    `;
    const valuesMin = [hotelId, roomId, checkOut];

    const resultMax = await pool.query(maxDateQuery, valuesMax);
    const resultMin = await pool.query(minDateQuery, valuesMin);

    const earliestCheckIn = resultMax.rows[0]?.max_date || null;
    const latestCheckOut = resultMin.rows[0]?.min_date || null;

    return { earliestCheckIn, latestCheckOut };
  } catch (error) {
    console.error('Error getting available dates:', error);
    throw error;
  }
};
const selectReservationClientIds = async(requestId, hotelId, reservationId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT DISTINCT
      id, name, name_kana, name_kanji, COALESCE(name_kanji, name) AS display_name, legal_or_natural_person, gender, date_of_birth, email, phone, fax
    FROM
    (
      SELECT clients.*
      FROM clients, reservations
      WHERE
        reservations.id = $1
        AND reservations.hotel_id = $2
        AND clients.id = reservations.reservation_client_id

      UNION ALL

      SELECT clients.*
      FROM clients, reservation_details, reservation_clients
      WHERE
        reservation_details.reservation_id = $1
        AND reservation_details.hotel_id = $2
        AND reservation_details.id = reservation_clients.reservation_details_id
        AND clients.id = reservation_clients.client_id
    ) AS ALL_CLIENTS
  `;

  const values = [reservationId, hotelId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error fetching reservations:', err);
    throw new Error('Database error');
  }
};
const selectReservationPayments = async(requestId, hotelId, reservationId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      reservation_payments.*
      ,payment_types.name as payment_type_name
      ,payment_types.transaction as transaction_type
      ,rooms.room_number
      ,COALESCE(clients.name_kanji, clients.name) AS payer_name
    FROM 
      reservation_payments
      ,payment_types
      ,rooms
      ,clients
    WHERE
      reservation_payments.hotel_id = $1
      AND reservation_payments.reservation_id = $2
      AND reservation_payments.payment_type_id = payment_types.id
      AND reservation_payments.room_id = rooms.id
      AND reservation_payments.client_id = clients.id
    ORDER BY
      reservation_payments.date, reservation_payments.client_id, reservation_payments.value
  `;

  const values = [hotelId, reservationId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error fetching reservations:', err);
    throw new Error('Database error');
  }
};

// Function to Add

const addReservationHold = async (requestId, reservation) => {
  const pool = getPool(requestId);
  const query = `
    INSERT INTO reservations (
      hotel_id, reservation_client_id, check_in, check_out, number_of_people, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [
    reservation.hotel_id,    
    reservation.reservation_client_id,
    reservation.check_in,
    reservation.check_out,
    reservation.number_of_people,
    reservation.created_by,
    reservation.updated_by
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the inserted client
  } catch (err) {
    console.error('Error adding reservation hold:', err);
    throw new Error('Database error');
  }
};

const addReservationDetail = async (requestId, reservationDetail) => {
  const pool = getPool(requestId);
  const query = `
    INSERT INTO reservation_details (
      hotel_id, reservation_id, date, room_id, plans_global_id, plans_hotel_id, plan_name, plan_type, number_of_people, price, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `;

  const values = [
    reservationDetail.hotel_id,
    reservationDetail.reservation_id,    
    reservationDetail.date,
    reservationDetail.room_id,
    reservationDetail.plans_global_id,
    reservationDetail.plans_hotel_id,
    reservationDetail.plan_name,
    reservationDetail.plan_type,
    reservationDetail.number_of_people,
    reservationDetail.price,
    reservationDetail.created_by,
    reservationDetail.updated_by
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the inserted reservation detail
  } catch (err) {
    console.error('Error adding reservation detail:', err);
    throw new Error('Database error');
  }
};

const addReservationAddon = async (requestId, reservationAddon) => {
  // console.log('addReservationAddon:',reservationAddon)
  const pool = getPool(requestId);  
  const query = `
    INSERT INTO reservation_addons (
      hotel_id, reservation_detail_id, addons_global_id, addons_hotel_id, addon_name, quantity, price, tax_type_id, tax_rate, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;

  const values = [
    reservationAddon.hotel_id,
    reservationAddon.reservation_detail_id,
    reservationAddon.addons_global_id,
    reservationAddon.addons_hotel_id,
    reservationAddon.addon_name,
    reservationAddon.quantity,
    reservationAddon.price,
    reservationAddon.tax_type_id,
    reservationAddon.tax_rate,
    reservationAddon.created_by,
    reservationAddon.updated_by
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the inserted reservation addon
  } catch (err) {
    console.error('Error adding reservation addon:', err);
    throw new Error('Database error');
  }
};

const addReservationClient = async (requestId, reservationClient) => {
  const pool = getPool(requestId);
  const query = `
    INSERT INTO reservation_clients (
      hotel_id, reservation_details_id, client_id, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [
    reservationClient.hotel_id,
    reservationClient.reservation_details_id,
    reservationClient.client_id,
    reservationClient.created_by,
    reservationClient.updated_by
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the inserted reservation client
  } catch (err) {
    console.error('Error adding reservation client:', err);
    throw new Error('Database error');
  }
};

const addRoomToReservation = async (requestId, reservationId, numberOfPeople, roomId, userId) => {
  const pool = getPool(requestId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update the number_of_people in the reservations table
    const updateReservationQuery = `
      UPDATE reservations
      SET number_of_people = number_of_people + $1,
          updated_by = $2
      WHERE id = $3::UUID;
    `;
    await pool.query(updateReservationQuery, [numberOfPeople, userId, reservationId]);

    // Copy one existing room_id in the reservation_details table
    const copyRoomQuery = `
      INSERT INTO reservation_details (hotel_id, reservation_id, date, room_id, plans_global_id, plans_hotel_id, number_of_people, price, created_by, updated_by)
      SELECT hotel_id, reservation_id, date, $1, NULL, NULL, $2, 0, created_by, $3
      FROM reservation_details
      WHERE (hotel_id, reservation_id, room_id) IN (
        SELECT hotel_id, reservation_id, room_id
        FROM reservation_details
        WHERE reservation_id = $4::UUID
        LIMIT 1
      )
      RETURNING *;
    `;
    const result = await pool.query(copyRoomQuery, [roomId, numberOfPeople, userId, reservationId]);

    await client.query('COMMIT');
    return result.rows[0];

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding room to reservation:', err);
    throw new Error('Database error');
  } finally {
    client.release();
    console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
  }
};

const insertReservationPayment = async (requestId, hotelId, reservationId, date, roomId, clientId, paymentTypeId, value, comment, userId) => {
  const pool = getPool(requestId);
  const query = `
    INSERT INTO reservation_payments (
      hotel_id, reservation_id, date, room_id, client_id, payment_type_id, value, comment, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
    RETURNING *;
  `;

  const values = [hotelId, reservationId, date, roomId, clientId, paymentTypeId, value, comment, userId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the inserted reservation client
  } catch (err) {
    console.error('Error adding payment to reservation:', err);
    throw new Error('Database error');
  }
};

// Update entry
const updateReservationDetail = async (requestId, reservationData) => {
  const pool = getPool(requestId);
  const { id, hotel_id, room_id, plans_global_id, plans_hotel_id, plan_name, plan_type, number_of_people, price, updated_by } = reservationData;

  const query = `
      UPDATE reservation_details
      SET 
          room_id = $1,
          plans_global_id = $2,
          plans_hotel_id = $3,
          plan_name = $4,
          plan_type = $5,
          number_of_people = $6,
          price = $7,
          updated_by = $8
      WHERE id = $9::UUID AND hotel_id = $10
      RETURNING *;
  `;
  const values = [
    room_id,
    plans_global_id,
    plans_hotel_id,
    plan_name,
    plan_type,
    number_of_people,
    price,
    updated_by,
    id,
    hotel_id,
  ];
  //console.log('Query:', query);
  //console.log('Values:', values);

  try {
      const result = await pool.query(query, values);
      return result.rows[0];
  } catch (err) {
      console.error('Error updating reservation detail:', err);
      throw new Error('Database error');
  }
};

const updateReservationStatus = async (requestId, reservationData) => {
  const pool = getPool(requestId);
  const { id, hotel_id, status, updated_by } = reservationData;

  let resStatus = status;
  let type = '';
  if (status === 'full-fee') {
    resStatus = 'cancelled';
    type = 'full-fee';
  }

  try {
    let query = '';
    let values = '';
    // Update status
    query = `
        UPDATE reservations
        SET
          status = $1,          
          updated_by = $2          
        WHERE id = $3::UUID AND hotel_id = $4
        RETURNING *;
    `;
    values = [
      resStatus,    
      updated_by,
      id,
      hotel_id,
    ];
    const result = await pool.query(query, values);
    
    // Fill cancelled
    if(resStatus==='cancelled' && type !== 'full-fee'){
      console.log('Cancelled with billable false');
      query = `
          UPDATE reservation_details
          SET
            cancelled = gen_random_uuid()
            ,billable = FALSE
            ,updated_by = $1          
          WHERE reservation_id = $2::UUID AND hotel_id = $3
          RETURNING *;
      `;
      values = [            
        updated_by,
        id,
        hotel_id,
      ];
    }
    if(resStatus==='cancelled' && type === 'full-fee'){
      console.log('Cancelled with billable true');
      query = `
          UPDATE reservation_details
          SET
            cancelled = gen_random_uuid()
            ,billable = TRUE
            ,updated_by = $1          
          WHERE reservation_id = $2::UUID AND hotel_id = $3
          RETURNING *;
      `;
      values = [            
        updated_by,
        id,
        hotel_id,
      ];
    }
    // Set billable true
    if(resStatus==='confirmed'){
      query = `
          UPDATE reservation_details
          SET
            cancelled = NULL
            ,billable = TRUE
            ,updated_by = $1          
          WHERE reservation_id = $2::UUID AND hotel_id = $3
          RETURNING *;
      `;
      values = [            
        updated_by,
        id,
        hotel_id,
      ];
    }
    // Set billable false
    if(resStatus==='provisory'){
      query = `
          UPDATE reservation_details
          SET            
            billable = FALSE
            ,updated_by = $1          
          WHERE reservation_id = $2::UUID AND hotel_id = $3
          RETURNING *;
      `;
      values = [            
        updated_by,
        id,
        hotel_id,
      ];
    }

    await pool.query(query, values);

    return result.rows[0];
  } catch (err) {
      console.error('Error updating reservation detail:', err);
      throw new Error('Database error');
  }
};
const updateReservationDetailStatus = async (requestId, reservationData) => {
  const pool = getPool(requestId);
  const { id, hotel_id, status, updated_by } = reservationData;

  try {
    let query = '';
    const values = [            
      updated_by,
      id,
      hotel_id,
    ];
    // Fill cancelled
    if(status==='cancelled'){
      query = `
          UPDATE reservation_details
          SET
            cancelled = gen_random_uuid()
            ,billable = TRUE
            ,updated_by = $1          
          WHERE id = $2::UUID AND hotel_id = $3
          RETURNING *;
      `;
    }
    if(status==='recovered'){
      query = `
          UPDATE reservation_details
          SET
            cancelled = NULL
            ,billable = TRUE
            ,updated_by = $1          
          WHERE id = $2::UUID AND hotel_id = $3
          RETURNING *;
      `;
    }

    const result = await pool.query(query, values);

    return result.rows[0];
  } catch (err) {
      console.error('Error updating reservation detail:', err);
      throw new Error('Database error');
  }
};

const updateReservationComment = async (requestId, reservationData) => {
  const pool = getPool(requestId);
  const { id, hotelId, comment, updated_by } = reservationData;
  
  try {
    // Update status
    const query = `
        UPDATE reservations
        SET
          comment = $1,          
          updated_by = $2          
        WHERE id = $3::UUID AND hotel_id = $4
        RETURNING *;
    `;
    const values = [
      comment,    
      updated_by,
      id,
      hotelId,
    ];
    const result = await pool.query(query, values);    
    return result.rows[0];

  } catch (error) {
    console.error('Error updating reservation detail:', err);
    throw new Error('Database error');
  }
};
const updateReservationTime = async (requestId, reservationData) => {
  const pool = getPool(requestId);
  const { id, hotelId, indicator, time, updated_by } = reservationData;
  
  
  try {
    let query = '';
    if(indicator === 'in'){
      query = `
        UPDATE reservations
        SET
          check_in_time = $1,          
          updated_by = $2          
        WHERE id = $3::UUID AND hotel_id = $4
        RETURNING *;
      `;
    }else if(indicator === 'out'){
      query = `
        UPDATE reservations
        SET
          check_out_time = $1,          
          updated_by = $2          
        WHERE id = $3::UUID AND hotel_id = $4
        RETURNING *;
      `;
    }    
    
    const values = [
      time,    
      updated_by,
      id,
      hotelId,
    ];
    const result = await pool.query(query, values);    
    return result.rows[0];

  } catch (error) {
    console.error('Error updating reservation detail:', err);
    throw new Error('Database error');
  }
};

const updateReservationType = async (requestId, reservationData) => {
  const pool = getPool(requestId);
  const { id, hotel_id, type, updated_by } = reservationData;

  try {

    const query = `
        UPDATE reservations
        SET
          type = $1,          
          updated_by = $2          
        WHERE id = $3::UUID AND hotel_id = $4
        RETURNING *;
    `;
    const values = [
      type,    
      updated_by,
      id,
      hotel_id,
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
  } catch (err) {
      console.error('Error updating reservation detail:', err);
      throw new Error('Database error');
  }
}

const updateReservationResponsible = async (requestId, id, updatedFields, user_id) => {  
  const pool = getPool(requestId);
  const query = `
      UPDATE reservations
      SET
        reservation_client_id = $1,          
        updated_by = $2          
      WHERE id = $3::UUID AND hotel_id = $4
      RETURNING *;
  `;
  const values = [
    updatedFields.client_id,    
    user_id,
    id,
    updatedFields.hotel_id,
  ];  

  try {
      const result = await pool.query(query, values);
      return result.rows[0];
  } catch (err) {
      console.error('Error updating reservation:', err);
      throw new Error('Database error');
  }
};

const updateRoomByCalendar = async (requestId, roomData) => {
  const pool = getPool(requestId);
  const { id, hotel_id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people, mode, updated_by } = roomData;

  // console.log('roomData',roomData);

  // Calculate the shift direction in JavaScript
  const shiftDirection = new_check_in >= old_check_in? 'DESC': 'ASC'; 

  const client = await pool.connect();
  // console.log("Before release:", pool.totalCount, pool.idleCount, pool.waitingCount);

  try {
    // console.log('Starting transaction for room ',old_room_id,'check-in:',new_check_in,'check out:', new_check_out);

    await client.query('BEGIN');
    
    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, updated_by);
    await client.query(setSessionQuery);

    // Check if the provided reservation_id has more than one distinct room_id
    const checkQuery = `
      SELECT COUNT(DISTINCT room_id) AS room_count
      FROM reservation_details
      WHERE reservation_id = $1 AND hotel_id = $2
    `;
    const checkValues = [id, hotel_id];
    const checkResult = await pool.query(checkQuery, checkValues);
    const roomCount = checkResult.rows[0].room_count;
    // console.log('Room count:', roomCount);

    let newReservationId = id;

    // If room_count > 1 and check_in/check_out dates change, create a new reservation_id
    if (roomCount > 1 && mode === 'solo' && (new_check_in !== old_check_in || new_check_out !== old_check_out)) {
      
      // console.log('Check-in or check-out dates changed, creating a new reservation_id...');
        
      const insertReservationQuery = `
        INSERT INTO reservations (hotel_id, reservation_client_id, check_in, check_out, number_of_people, status, created_at, created_by, updated_by)
        SELECT hotel_id, reservation_client_id, $1, $2, $6, status, created_at, created_by, $3
        FROM reservations
        WHERE id = $4 AND hotel_id = $5
        RETURNING id
      `;
      const insertReservationValues = [new_check_out, new_check_out, updated_by, id, hotel_id, number_of_people];
      const insertResult = await pool.query(insertReservationQuery, insertReservationValues);
      newReservationId = insertResult.rows[0].id;
      // console.log('New reservation_id:', newReservationId);

      // Adjust number_of_people in the original reservation
      const updateQuery = `
        UPDATE reservations
        SET number_of_people = number_of_people - $1
        WHERE id = $2 AND hotel_id = $3
      `;
      const updateValues = [number_of_people, id, hotel_id];
      await pool.query(updateQuery, updateValues);
      // console.log('Updated number_of_people in reservations table.');

      // Commit the first transaction
      await client.query('COMMIT');
      
      // Start a new transaction for updating reservation details
      await client.query('BEGIN');      

      // Set session
      const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, updated_by);
      await client.query(setSessionQuery);
    }

    // Calculate the difference in days
    const oldDuration = (new Date(old_check_out) - new Date(old_check_in)) / (1000 * 60 * 60 * 24);
    const newDuration = (new Date(new_check_out) - new Date(new_check_in)) / (1000 * 60 * 60 * 24);
    const extraDays = newDuration - oldDuration;
    console.log(`Old duration: ${oldDuration}, New duration: ${newDuration}, Days difference: ${extraDays}`);
    
    // If the duration is the same, update the dates. Else, add dates and delete the fat
    if(oldDuration === newDuration){
      const updateDatesQuery = `
        WITH date_diff AS (
          SELECT
            reservations.check_in AS old_check_in,
            reservations.check_out AS old_check_out,
            $1::DATE - reservations.check_in AS date_diff
          FROM reservations
          WHERE
            reservations.id = $2
            AND reservations.hotel_id = $3
        ),
        ordered_details AS (
            SELECT *, (SELECT date_diff FROM date_diff) AS shift_days
            FROM reservation_details
            WHERE reservation_id = $2
            AND hotel_id = $3
            AND room_id = $7
            ORDER BY date ${shiftDirection} NULLS LAST
        ),
        updated_dates AS (
          UPDATE reservation_details
          SET
            reservation_id = $4,
            room_id = $5,
            updated_by = $6,
            date = reservation_details.date + (SELECT date_diff FROM date_diff)
          FROM
            ordered_details
          WHERE reservation_details.id = ordered_details.id
          RETURNING reservation_details.*
        )
        SELECT * FROM updated_dates;
      `;
      const values = [
        new_check_in,
        id,
        hotel_id,
        newReservationId,
        new_room_id,
        updated_by,
        old_room_id
      ];
      // console.log('Executing updateDatesQuery update query with values:', values);    
      const result = await pool.query(updateDatesQuery, values);
    }else{
      // generate_series from new_check_in and new_check_out and add dates
      const insertDetailsQuery = `
          INSERT INTO reservation_details (hotel_id, reservation_id, date, room_id, plans_global_id, plans_hotel_id, plan_name, plan_type, number_of_people, price, billable, created_by, updated_by)
          
          SELECT datesList.*
          FROM
            (SELECT DISTINCT hotel_id, $1::uuid as reservation_id, 
              generate_series(($3::DATE)::DATE, ($4::DATE - INTERVAL '1 day')::DATE, '1 day'::INTERVAL)::DATE as series, 
              $2::integer as room_id, plans_global_id, plans_hotel_id, plan_name, plan_type, number_of_people, price, billable, $5::integer as created_by, $5::integer as updated_by
              FROM reservation_details
              WHERE reservation_id = $1::uuid AND hotel_id = $6::integer AND room_id = $2::integer
            ) as datesList
          WHERE NOT EXISTS (
              SELECT 1 FROM reservation_details rd WHERE datesList.hotel_id = rd.hotel_id AND datesList.reservation_id = rd.reservation_id AND datesList.room_id = rd.room_id
              AND datesList.series = rd.date 
            )
          ORDER BY datesList.series
          RETURNING hotel_id, id, plans_global_id, plans_hotel_id
        ;
      `;  
      const insertDetailsValues = [
        newReservationId, // New or existing reservation ID
        new_room_id,
        new_check_in,
        new_check_out,        
        updated_by,
        hotel_id
      ];      
      const insertedDetails = await pool.query(insertDetailsQuery, insertDetailsValues);
      const newReservationDetails = insertedDetails.rows;
      
      // Insert into reservation_clients using the returned details
      const insertClientsQuery = `
        INSERT INTO reservation_clients (hotel_id, reservation_details_id, client_id, created_by, updated_by)
        SELECT $1, $2, client_id, $3, $3
        FROM reservation_clients 
        WHERE reservation_details_id = (
            SELECT id FROM reservation_details 
            WHERE reservation_id = $4 
              AND hotel_id = $5 
              AND room_id = $6 
            LIMIT 1
      );`;
      const insertAddonsQuery = `
        INSERT INTO reservation_addons (hotel_id, reservation_detail_id, addons_global_id, addons_hotel_id, addon_name, addon_type, quantity, price, tax_type_id, tax_rate, created_by, updated_by)
        SELECT $1, $2, addons_global_id, addons_hotel_id, addon_name, addon_type, quantity, price, tax_type_id, tax_rate, $3, $3
        FROM reservation_addons 
        WHERE reservation_detail_id = (
            SELECT id FROM reservation_details 
            WHERE reservation_id = $4 
              AND hotel_id = $5 
              AND room_id = $6               
              AND (plans_global_id IS NOT DISTINCT FROM $7)
              AND (plans_hotel_id IS NOT DISTINCT FROM $8)
            LIMIT 1
          )        
      ;`;
      const insertPromises = newReservationDetails.map(detail => {        
        return Promise.all([
            pool.query(insertClientsQuery, [detail.hotel_id, detail.id, updated_by, newReservationId, hotel_id, new_room_id]),
            pool.query(insertAddonsQuery, [detail.hotel_id, detail.id, updated_by, newReservationId, hotel_id, new_room_id, detail.plans_global_id, detail.plans_hotel_id])
        ]);
      });
      // Execute all insertions in parallel
      await Promise.all(insertPromises);

      // Delete old dates beyond new_check_out
      const deleteOutdatedCheckOut = `
        DELETE FROM reservation_details 
        WHERE reservation_id = $1 
        AND hotel_id = $2 
        AND room_id = $3
        AND date >= $4;
      `;
      await pool.query(deleteOutdatedCheckOut, [newReservationId, hotel_id, new_room_id, new_check_out]);
      // console.log('Deleting >= ', new_check_out);

      // Delete old dates before new_check_in
      const deleteOutdatedCheckIn = `
        DELETE FROM reservation_details 
        WHERE reservation_id = $1 
        AND hotel_id = $2 
        AND room_id = $3
        AND date < $4;
      `;
      await pool.query(deleteOutdatedCheckIn, [newReservationId, hotel_id, new_room_id, new_check_in]);
      // console.log('Deleting < ', new_check_in);
    }

    // Update reservations table with new check_in and check_out
    const updateReservationQuery = `
      UPDATE reservations
      SET check_in = $1, check_out = $2, updated_by = $3
      WHERE id = $4 AND hotel_id = $5
    `;
    const updateReservationValues = [new_check_in, new_check_out, updated_by, newReservationId, hotel_id];
    await pool.query(updateReservationQuery, updateReservationValues);
    // console.log('Updated reservations table with new check_in and check_out.');

    await recalculatePlanPrice(requestId, newReservationId, hotel_id, new_room_id, updated_by);

    /* recalculate addons as well!? */

    await client.query('COMMIT');
    // console.log('Transaction updateRoomByCalendar committed successfully.');    
  }catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating reservation detail:', err);
    throw new Error('Database error');
  } finally {
    client.release();    
    console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
  }  
};

const updateCalendarFreeChange = async (requestId, roomData, user_id) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Loop through roomData to update each reservation
    for (const data of roomData) {
      const { id, hotel_id, date, room_id } = data;

      // Perform the update query for each entry
      const updateQuery = `
          UPDATE reservation_details
          SET date = $1, room_id = $2, updated_by = $3
          WHERE id = $4 AND hotel_id = $5
          RETURNING *;
      `;

      const values = [date, room_id, user_id, id, hotel_id];

      // Execute the query
      const result = await client.query(updateQuery, values);

      await client.query('COMMIT');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error occurred during update:', err);
    throw err;
  } finally {
    client.release();
  }
  
  const { id, hotel_id, date, room_id } = roomData;
  // console.log('roomData:', id, hotel_id, date, room_id);
  
  
};

const updateReservationRoomGuestNumber = async (requestId, detailsArray, updated_by) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    // console.log('Starting transaction...');
    await client.query('BEGIN');  
    
    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, updated_by);
    await client.query(setSessionQuery);

    // Update the number_of_people field in the reservations table
    const updateQuery = `
      UPDATE reservations
      SET number_of_people = number_of_people + $1,
          updated_by = $4
      WHERE id = $2 and hotel_id = $3
      RETURNING number_of_people;
    `;
    const updateResult = await pool.query(updateQuery, [detailsArray[0].operation_mode, detailsArray[0].reservation_id, detailsArray[0].hotel_id, updated_by]);

    // Check if the number_of_people is now <= 0
    if (updateResult.rows.length === 0 || updateResult.rows[0].number_of_people <= 0) {
      await client.query('ROLLBACK');
      console.warn('Rollback: number_of_people is <= 0');
      return { success: false, message: 'Invalid operation: number_of_people would be zero or negative' };
    }

    // Update the reservation details with promise    
    const dtlUpdatePromises = detailsArray.map(async ({ id, operation_mode, plans_global_id, plans_hotel_id, hotel_id, date }) => {
      let newPrice = 0;
      newPrice = await getPriceForReservation(requestId, plans_global_id, plans_hotel_id, hotel_id, formatDate(new Date(date)));
      // console.log('newPrice calculated:',newPrice);
      
      const dtlUpdateQuery = `
        UPDATE reservation_details
        SET number_of_people = number_of_people + $1,
            price = $2
        WHERE id = $3
        RETURNING *;
      `;
      // console.log('dtlUpdateQuery', dtlUpdateQuery);
      return client.query(dtlUpdateQuery, [operation_mode, newPrice, id]);
    });

    const dtlUpdateResults = await Promise.all(dtlUpdatePromises);

    // Check if any of the reservation_details updates resulted in number_of_people <= 0
    for (const result of dtlUpdateResults) {
      if (result.rows.length === 0 || result.rows[0].number_of_people <= 0) {
        await client.query('ROLLBACK');
        console.warn('Rollback: number_of_people in reservation_details is <= 0');
        return { success: false, message: 'Invalid operation: number_of_people in reservation_details would be zero or negative' };
      }

      // Check if number_of_people is less than the count of corresponding id in reservation_clients
      const { id, number_of_people } = result.rows[0];
      const clientCountQuery = `
        SELECT COUNT(*) as client_count
        FROM reservation_clients
        WHERE reservation_details_id = $1;
      `;
      const clientCountResult = await pool.query(clientCountQuery, [id]);
      const clientCount = parseInt(clientCountResult.rows[0].client_count, 10);

      if (number_of_people < clientCount) {
        const deleteClientQuery = `
          WITH deleted AS (
            SELECT id
            FROM reservation_clients
            WHERE reservation_details_id = $1
            LIMIT 1
          )
          DELETE FROM reservation_clients
          WHERE id IN (SELECT id FROM deleted);
        `;
        await pool.query(deleteClientQuery, [id]);
      }


    }

    await client.query('COMMIT');
    return { success: true, message: 'Reservation details updated successfully' };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating room:', err);
    throw new Error('Database error');
  } finally {
    client.release();
    console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
  }
};

const updateReservationGuest = async (requestId, oldValue, newValue) => {  
  const pool = getPool(requestId);
  const query = `
    UPDATE reservation_clients
    SET reservation_details_id = $1    
    WHERE id IN 
      (
        SELECT id 
        FROM reservation_clients 
        WHERE reservation_details_id = $2 
        LIMIT 1
      );
  `;

  try {
    await pool.query(query, [newValue, oldValue]);
    // console.log('Reservation guest updated successfully');
  } catch (err) {
    console.error('Error updating reservation guest:', err);
  } 
};

const updateClientInReservation = async (requestId, oldValue, newValue) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Start transaction

    await client.query(
      `UPDATE reservations
       SET reservation_client_id = $1
       WHERE reservation_client_id = $2`,
      [newValue, oldValue]
    );

    await client.query(
      `UPDATE reservation_clients
       SET client_id = $1
       WHERE client_id = $2`,
      [newValue, oldValue]
    );

    await client.query(
      `UPDATE reservation_payments
       SET client_id = $1
       WHERE client_id = $2`,
      [newValue, oldValue]
    );

    await client.query('COMMIT'); // Commit transaction
    // console.log('updateClientInReservation commit');
  } catch (err) {
    await client.query('ROLLBACK'); // Rollback transaction on error    
  } finally {
    client.release(); // Release the client back to the pool
  }
  
};

const updateReservationDetailPlan = async (requestId, id, hotel_id, plan, rates, price, user_id) => {
  const pool = getPool(requestId);
  const client = await pool.connect();
       
  const plans_global_id = plan.plans_global_id === 0 ? null : plan.plans_global_id;
  const plans_hotel_id = plan.plans_hotel_id === 0 ? null : plan.plans_hotel_id;
  const plan_name = plan.name;
  const plan_type = plan.plan_type;

  const updateReservationDetailsQuery = `
    UPDATE reservation_details
    SET plans_global_id = $1
      ,plans_hotel_id = $2
      ,plan_name = $3
      ,plan_type = $4
      ,price = $5
      ,updated_by = $6
    WHERE hotel_id = $7 AND id = $8::uuid
    RETURNING *;
  `;  

  try {
    await client.query('BEGIN');

    // Set session user_id
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, user_id);
    await client.query(setSessionQuery);

    // Update reservation_details
    await client.query(updateReservationDetailsQuery, [
      plans_global_id,
      plans_hotel_id,
      plan_name,
      plan_type,
      price,
      user_id,
      hotel_id,
      id,
    ]);

    if (rates && rates.length > 0) {
      // Delete existing rates
      const deleteRatesQuery = `
        DELETE FROM reservation_rates WHERE reservation_details_id = $1;
      `;
      await client.query(deleteRatesQuery, [id]);

      const aggregatedRates = {};
      let baseRate = 0;

      // Aggregate rates by adjustment_type and tax_type_id
      rates.forEach((rate) => {
        const key = `${rate.adjustment_type}-${rate.tax_type_id}`;
        if (!aggregatedRates[key]) {
          aggregatedRates[key] = {
            adjustment_type: rate.adjustment_type,
            tax_type_id: rate.tax_type_id,
            tax_rate: rate.tax_rate,
            adjustment_value: 0,
          };
        }
        aggregatedRates[key].adjustment_value += parseFloat(rate.adjustment_value);
        if (rate.adjustment_type === 'base_rate') {
          baseRate += parseFloat(rate.adjustment_value);
        }
      });

      // Insert aggregated rates
      for (const key in aggregatedRates) {
        const rate = aggregatedRates[key];
        let price = 0;

        if (rate.adjustment_type === 'base_rate') {
          price = rate.adjustment_value;
        } else if (rate.adjustment_type === 'percentage') {
          price = Math.round((baseRate * (rate.adjustment_value / 100)) * 100) / 100;
        } else if (rate.adjustment_type === 'flat_fee') {
          price = rate.adjustment_value;
        }

        const insertRateQuery = `
          INSERT INTO reservation_rates (
            hotel_id, reservation_details_id, adjustment_type, adjustment_value, 
            tax_type_id, tax_rate, price, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;
        `;

        await client.query(
          insertRateQuery, 
          [hotel_id, id, rate.adjustment_type, rate.adjustment_value,
          rate.tax_type_id, rate.tax_rate, price, user_id]
        );
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating reservation detail plan:', err);
    throw err;
  } finally {
    client.release();
  }
};

const updateReservationDetailAddon = async (requestId, id, addons, user_id) => {
  
  await deleteReservationAddonsByDetailId(requestId, id, user_id);
  const reservationDetail = await selectReservationDetail(requestId, id);  
  
  const addOnPromises = addons.map(addon =>
      addReservationAddon(requestId, {
          hotel_id: reservationDetail[0].hotel_id,
          reservation_detail_id: id,
          addons_global_id: addon.addons_global_id,
          addons_hotel_id: addon.addons_hotel_id,
          addon_name: addon.addon_name,
          quantity: addon.quantity,
          price: addon.price,
          tax_type_id: addon.tax_type_id,
          tax_rate: addon.tax_rate,
          created_by: user_id, 
          updated_by: user_id, 
      })
  );  
  await Promise.all(addOnPromises);
  
};

const updateReservationDetailRoom = async (requestId, id, room_id, user_id) => {  
  const pool = getPool(requestId);
  const query = `
    UPDATE reservation_details
    SET room_id = $1      
      ,updated_by = $2
    WHERE id = $3::uuid
    RETURNING *;
  `;  

  try {
    await pool.query(query, [room_id, user_id, id]);    
  } catch (err) {
    console.error('Error updating reservation guest:', err);
  } 
};

const updateReservationRoom = async (requestId, reservation_id, room_id_old, room_id_new, user_id) => {  
  const pool = getPool(requestId);
  const query = `
    UPDATE reservation_details
    SET room_id = $1
      ,updated_by = $2
    WHERE 
      reservation_id = $3::uuid
      AND room_id = $4 
    RETURNING *;
  `;  

  try {
    await pool.query(query, [room_id_new, user_id, reservation_id, room_id_old]);    
  } catch (err) {
    console.error('Error updating reservation guest:', err);
  } 
};

const updateReservationRoomWithCreate = async (requestId, reservation_id, room_id_old, room_id_new, numberOfPeople, user_id) => {  
  const pool = getPool(requestId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Step 1: Copy reservation to new room
    const insertQuery = `
      INSERT INTO reservation_details (hotel_id, reservation_id, date, room_id, plans_global_id, plans_hotel_id, plan_name, plan_type, number_of_people, price, cancelled, billable, created_by, updated_by)
      SELECT hotel_id, reservation_id, date, $1, plans_global_id, plans_hotel_id, plan_name, plan_type, $2, price, cancelled, billable, $3, $3
      FROM reservation_details
      WHERE reservation_id = $4::uuid AND room_id = $5
      RETURNING *;
    `;
    await client.query(insertQuery, [room_id_new, numberOfPeople, user_id, reservation_id, room_id_old]);

    // Step 2: Subtract numberOfPeople from the old room
    const updateQuery = `
      UPDATE reservation_details
      SET number_of_people = number_of_people - $1,
          updated_by = $2
      WHERE reservation_id = $3::uuid
        AND room_id = $4 
      RETURNING *;
    `;
    await client.query(updateQuery, [numberOfPeople, user_id, reservation_id, room_id_old]);
/*
    // Step 3: Move `numberOfPeople` clients from old room to new room
    const moveClientQuery = `
      UPDATE reservation_clients
      SET reservation_details_id = $1    
      WHERE client_id IN 
        (
          SELECT DISTINCT client_id 
          FROM reservation_clients rc, reservation_details rd
          WHERE rc.reservation_details_id = rd.id
          AND rd.reservation_id = $3::uuid AND rd.room_id = $4 
          LIMIT $5
        )
      RETURNING *;
    `;
    await client.query(moveClientQuery, [reservation_id, room_id_old, numberOfPeople]);
*/  

    await client.query("COMMIT");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error in transaction:", err);
  } finally{
    client.release();
  } 
};

const updateReservationRoomPlan = async (requestId, reservationId, hotelId, roomId, plan, addons, daysOfTheWeek, user_id) => {
  const pool = getPool(requestId);
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, user_id);
    await client.query(setSessionQuery);

    let detailsArray = await selectRoomReservationDetails(requestId, hotelId, roomId, reservationId);    
    const validDays = daysOfTheWeek.map(d => d.value);    
    // Filter detailsArray to keep only dates that match daysOfTheWeek
    detailsArray = detailsArray.filter(detail => {
      const detailDate = detail.date; // Convert string date to Date object      
      const dayOfWeek = detailDate.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();      
      return validDays.includes(dayOfWeek);
    });

    // Update the reservation details with promise
    const updatePromises = detailsArray.map(async (detail) => {
      const { id } = detail;

      // 1. Update Plan      
      await updateReservationDetailPlan(requestId, id, hotelId, plan, [], 0, user_id);

      // 2. Update Addons
      await updateReservationDetailAddon(requestId, id, addons, user_id);

    });

    await Promise.all(updatePromises);

    // 3. Recalculate Price after updating plans and addons
    await recalculatePlanPrice(requestId, reservationId, hotelId, roomId, user_id);

    await client.query('COMMIT');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating room plan:', error);
    throw error;
  } finally {
    client.release();
    console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
  }
};
const updateReservationRoomPattern = async (requestId, reservationId, hotelId, roomId, pattern, user_id) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, user_id);
    await client.query(setSessionQuery);

    const detailsArray = await selectRoomReservationDetails(requestId, hotelId, roomId, reservationId);

    // Update the reservation details with promise
    const updatePromises = detailsArray.map(async (detail) => {
      const { id, date, number_of_people } = detail;

      const detailDate = new Date(date);
      const dayOfWeek = detailDate.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
      
      const plan = await getPlanByKey(requestId, hotelId, pattern[dayOfWeek]);
      const addons = await getAllPlanAddons(requestId, plan.plans_global_id, plan.plans_hotel_id, hotelId);
      if (addons && Array.isArray(addons)) {
        addons.forEach(addon => {
            addon.quantity = plan.plan_type === 'per_person' ? number_of_people : 1;
        });
      }

      // 1. Update Plan
      await updateReservationDetailPlan(requestId, id, hotelId, plan, [], 0, user_id);

      // 2. Update Addons
      await updateReservationDetailAddon(requestId, id, addons, user_id);

    });

    await Promise.all(updatePromises);

    // 3. Recalculate Price after updating plans and addons
    await recalculatePlanPrice(requestId, reservationId, hotelId, roomId, user_id);

    await client.query('COMMIT');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating room plan:', error);
    throw error;
  } finally {
    client.release();
    console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
  }
};

const recalculatePlanPrice = async (requestId, reservation_id, hotel_id, room_id, user_id) => {
  const pool = getPool(requestId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, user_id);
    await client.query(setSessionQuery);

    // Fetch the reservation details based on reservation_id, hotel_id, and room_id
    const detailsQuery = `
      SELECT id, plans_global_id, plans_hotel_id, hotel_id, date
      FROM reservation_details
      WHERE reservation_id = $1 AND hotel_id = $2 AND room_id = $3;
    `;
    const detailsResult = await pool.query(detailsQuery, [reservation_id, hotel_id, room_id]);
    const detailsArray = detailsResult.rows;

    // Update the reservation details with promise
    const dtlUpdatePromises = detailsArray.map(async ({ id, plans_global_id, plans_hotel_id, hotel_id, date }) => {
      const formattedDate = formatDate(new Date(date));
      // Fetch new price
      const newPrice = await getPriceForReservation(requestId, plans_global_id, plans_hotel_id, hotel_id, formattedDate);   
      
      // Update reservation_details
      const dtlUpdateQuery = `
        UPDATE reservation_details
        SET price = $1
        WHERE id = $2
        RETURNING *;
      `;      
      await pool.query(dtlUpdateQuery, [newPrice, id]);

      // Delete existing rates for this reservation_details_id
      const deleteRatesQuery = `
        DELETE FROM reservation_rates WHERE reservation_details_id = $1;
      `;
      await pool.query(deleteRatesQuery, [id]);

      // Fetch new rates
      const newrates = await getRatesForTheDay(requestId, plans_global_id, plans_hotel_id, hotel_id, formattedDate);

      // Insert new rates into reservation_rates
      let baseRate = 0;
      const rateInsertPromises = newrates.map(async (rate) => {
        let price = 0;
        if (rate.adjustment_type === 'base_rate') {
          price = rate.adjustment_value;
          baseRate += parseFloat(rate.adjustment_value);
        }
        if (rate.adjustment_type === 'percentage') {
          price = Math.round((baseRate * (rate.adjustment_value / 100)) * 100) / 100;
        }
        if (rate.adjustment_type === 'flat_fee') {
          price = rate.adjustment_value;          
        }
        const rateInsertQuery = `
          INSERT INTO reservation_rates (
            hotel_id, reservation_details_id, adjustment_type, adjustment_value, 
            tax_type_id, tax_rate, price, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;
        `;
        return pool.query(rateInsertQuery, [
          hotel_id, id, rate.adjustment_type, rate.adjustment_value,
          rate.tax_type_id, rate.tax_rate, price, user_id
        ]);               
      });
      await Promise.all(rateInsertPromises);
    });

    // Wait for all updates to complete
    await Promise.all(dtlUpdatePromises);
    await client.query('COMMIT');

    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recalculating plan price:', error);
    throw error;
  } finally {
    client.release();    
    console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
  }
};

// Delete
const deleteHoldReservationById = async (requestId, reservation_id, updated_by) => {
  const pool = getPool(requestId);
  const query = format(`
    -- Set the updated_by value in a session variable
    SET SESSION "my_app.user_id" = %L;

    DELETE FROM reservations
    WHERE id = %L AND status = 'hold'
    RETURNING *;
  `, updated_by, reservation_id);

  try {
    const result = await pool.query(query);
    return result.rowCount;
  } catch (err) {
    console.error('Error deleting reservation:', err);
    throw new Error('Database error');
  }
};

const deleteReservationAddonsByDetailId = async (requestId, reservation_detail_id, updated_by) => {
  const pool = getPool(requestId);
  const query = format(`
    -- Set the updated_by value in a session variable
    SET SESSION "my_app.user_id" = %L;

    DELETE FROM reservation_addons
    WHERE reservation_detail_id = %L
    RETURNING *;
  `, updated_by, reservation_detail_id);
  
  try{
    const result = await pool.query(query);
    return result.rowCount;
  } catch (err) {
    console.error('Error deleting reservation addon:', err);
    throw new Error('Database error');
  }   
};

const deleteReservationClientsByDetailId = async (requestId, reservation_detail_id, updated_by) => {
  const pool = getPool(requestId);
  const query = format(`
    -- Set the updated_by value in a session variable
    SET SESSION "my_app.user_id" = %L;

    DELETE FROM reservation_clients
    WHERE reservation_details_id = %L
    RETURNING *;
  `, updated_by, reservation_detail_id);
  
  try{
    const result = await pool.query(query);
    return result.rowCount;
  } catch (err) {
    console.error('Error deleting reservation clients:', err);
    throw new Error('Database error');
  }   
};

const deleteReservationRoom = async (requestId, hotelId, roomId, reservationId, numberOfPeople, updated_by) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    // console.log('Starting transaction...');
    await client.query('BEGIN');

    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, updated_by);
    await client.query(setSessionQuery);

    // Update the number_of_people field in the reservations table
    const updateQuery = `
      UPDATE reservations
      SET number_of_people = number_of_people - $1
      WHERE id = $2 and hotel_id = $3
      RETURNING number_of_people;
    `;
    const updateResult = await pool.query(updateQuery, [numberOfPeople, reservationId, hotelId]);

    // Check if the number_of_people is now <= 0
    if (updateResult.rows.length === 0 || updateResult.rows[0].number_of_people <= 0) {
      await client.query('ROLLBACK');
      console.warn('Rollback: number_of_people is <= 0');
      return { success: false, message: 'Invalid operation: number_of_people would be zero or negative' };
    }

    // Delete the reservation details
    
    const deleteQuery = `
      DELETE FROM reservation_details
      WHERE reservation_id = $1 and room_id = $2
      RETURNING *;
    `;
    const deleteResults = await pool.query(deleteQuery, [reservationId, roomId]);

    // Commit the transaction
    await client.query('COMMIT');

    return { success: true };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting room:', err);
    throw new Error('Database error');
  } finally {
    client.release();
    console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
  }
};

const deleteReservationPayment = async (requestId, id, userId) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, userId);
    await client.query(setSessionQuery);

    const deleteQuery = `
      DELETE FROM reservation_payments
      WHERE id = $1
      RETURNING *;
    `;
    const deleteResults = await pool.query(deleteQuery, [id]);

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err);
  } finally {
    client.release();
  }
};

// OTA
const addOTAReservation = async  (requestId, hotel_id, data) => {
  // XML
  const SalesOfficeInformation = data?.SalesOfficeInformation || {};
  // console.log('addOTAReservation SalesOfficeInformation:', SalesOfficeInformation);
  const BasicInformation = data?.BasicInformation || {};
  // console.log('addOTAReservation BasicInformation:', BasicInformation);
  const BasicRateInformation = data?.BasicRateInformation || {};
  // console.log('addOTAReservation BasicRateInformation:', BasicRateInformation);
  const RisaplsCommonInformation = data?.RisaplsInformation?.RisaplsCommonInformation || {};  
  // console.log('addOTAReservation RisaplsCommonInformation:', RisaplsCommonInformation);
  const Basic = data?.RisaplsInformation?.RisaplsCommonInformation?.Basic || {};  
  // console.log('addOTAReservation Basic:', Basic);
  const Member = data?.RisaplsInformation?.RisaplsCommonInformation?.Member || {};
  // console.log('addOTAReservation Member:', Member);
  const BasicRate = data?.RisaplsInformation?.RisaplsCommonInformation?.BasicRate || {};
  // console.log('addOTAReservation BasicRate:', BasicRate);
  const RoomAndGuestList = data?.RoomAndGuestInformation?.RoomAndGuestList || {};
  // console.log('addOTAReservation RoomAndGuestList:', RoomAndGuestList);

  // Query
  const pool = getPool(requestId);
  const client = await pool.connect();
  let query = '';
  let values = '';  

  // Fields
  const dateRange = [];
  let currentDate = new Date(BasicInformation.CheckInDate);
  while (currentDate < new Date(BasicInformation.CheckOutDate)) {
    dateRange.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  let reservationComment = "";  
  if (BasicInformation?.OtherServiceInformation) {
    reservationComment += `予約備考：${BasicInformation.OtherServiceInformation}；\n`;
  }
  if (BasicInformation?.SpecificMealCondition) {
    reservationComment += `食事備考：${BasicInformation.SpecificMealCondition}；\n`;
  }

  // Helper
  const selectNature = (code) => {
    // For RisaplsInformation.RisaplsCommonInformation.Member.UserGendar    
    if (code == 2){
      return 'legal';
    } else{
      return 'natural';
    }
  };
  const selectGender = (code) => {
    // For RisaplsInformation.RisaplsCommonInformation.Member.UserGendar    
    if (code === '0'){
      return 'male';
    }
    if (code === '1'){
      return 'female';
    }
    
    return 'other';    
  };
  const roomMaster = await selectTLRoomMaster(requestId, hotel_id);
  // console.log('selectTLRoomMaster:', roomMaster);
  const selectRoomTypeId = (code) => {
    const match = roomMaster.find(item => item.netagtrmtypecode === code);
    return match ? match.room_type_id : null;
  };
  const availableRooms = await selectAvailableRooms(requestId, hotel_id, BasicInformation.CheckInDate, BasicInformation.CheckOutDate);
  // console.log('selectAvailableRooms:', availableRooms);
  const isRoomAvailable = (room_type_id) => {
    return availableRooms.some(room => room.room_type_id === room_type_id);
  };
  const findFirstAvailableRoomId = (room_type_id) => {
    const availableRoom = availableRooms.find(room => room.room_type_id === room_type_id);
    return availableRoom?.room_id || null;
  };
  
  try {
    await client.query('BEGIN');  

    // Client info
    const clientData = {
      name: Member.UserName || BasicInformation.GuestOrGroupNameKanjiName || '',
      name_kana: BasicInformation.GuestOrGroupNameSingleByte || '',
      legal_or_natural_person: selectNature(Member.UserGendar || 1),
      gender: selectGender(Member.UserGendar || '2'),
      email: Basic.Email || '',
      phone: Basic.PhoneNumber || '',
      created_by: 1,
      updated_by: 1,
    };    
    //const newClient = await addClientByName(req.requestId, clientData);
    //const reservationClientId = newClient.id;
    const reservationClientId = 88;
    console.log('addOTAReservation client:', clientData);

    // Insert reservations
    query = `
      INSERT INTO reservations (
        hotel_id, reservation_client_id, check_in, check_in_time, check_out, check_out_time, number_of_people, status, type, agent, ota_reservation_id, comment, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', 'ota', $8, $9, $10, 1, 1)
      RETURNING *;
    `;
    values = [
      hotel_id,    
      reservationClientId,
      BasicInformation.CheckInDate,
      BasicInformation.CheckInTime,
      BasicInformation.CheckOutDate,
      BasicInformation.CheckOutTime,
      BasicInformation.GrandTotalPaxCount,
      SalesOfficeInformation.SalesOfficeCompanyName,
      BasicInformation.TravelAgencyBookingNumber,
      reservationComment,
    ];
    console.log('addOTAReservation reservations:', values);  
    //const reservation = await pool.query(query, values);
    const reservation = {id: 0};
    
    // Get available rooms for the reservation period
    let roomId = null;
    if (RoomAndGuestList.RoomInformation) {
      handleRoomItem(RoomAndGuestList);
    } else if (typeof RoomAndGuestList === 'object') {
      Object.values(RoomAndGuestList).forEach(roomItem => {
        handleRoomItem(roomItem);
      });
    }
    function handleRoomItem(item) {    
      const netAgtRmTypeCode = item?.RoomInformation?.RoomTypeCode;
      const roomTypeId = netAgtRmTypeCode ? selectRoomTypeId(netAgtRmTypeCode) : null;      
      roomId = roomTypeId ? findFirstAvailableRoomId(roomTypeId) : null;
      if (roomId === null) {
        console.error("Error: No available room ID found for room type:", roomTypeId);
        throw new Error("Transaction Error: No available room found for the selected room type.");
      }
      let roomDate;
      let totalPerRoomRate;
      if (item?.RoomRateInformation && typeof item.RoomRateInformation === 'object' && !item.RoomRateInformation.RoomDate) {
        // Handle the new RoomRateInformation pattern (object with date keys)
        const firstDateKey = Object.keys(item.RoomRateInformation)[0];
        if (firstDateKey) {
          roomDate = item.RoomRateInformation[firstDateKey]?.RoomDate;
          totalPerRoomRate = item.RoomRateInformation[firstDateKey]?.TotalPerRoomRate;
        }
      } else {
        // Handle the original RoomRateInformation pattern
        roomDate = item?.RoomRateInformation?.RoomDate;
        totalPerRoomRate = item?.RoomRateInformation?.TotalPerRoomRate;
      }

      
      
      query = `
        INSERT INTO reservation_details (
            hotel_id, reservation_id, date, room_id, plan_name, number_of_people, price, billable, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 1, 1)
          RETURNING *;
      `;
      values = [
        hotel_id,
        reservation.id,    
        roomDate,
        roomId,        
        data.BasicInformation.PackagePlanName,      
        item?.RoomInformation?.PerRoomPaxCount,
        totalPerRoomRate,
      ];  
      console.log('addOTAReservation reservation_details:', values);
      //const reservationDetails = await pool.query(query, values);
      const reservationDetails = {id: 99};

      query = `
        INSERT INTO reservation_rates (
            hotel_id, reservation_details_id, adjustment_value, tax_type_id, tax_rate, price, created_by
          ) VALUES ($1, $2, $3, 3, 0.1, $3, 1)
          RETURNING *;
      `;
      values = [
        hotel_id,
        reservationDetails.id,
        totalPerRoomRate,
      ]; 
      console.log('addOTAReservation reservation_rates:', values);
    };

    // Payment
    if(BasicRate.PointsDiscountList){
      console.log('BasicRate.PointsDiscountList', BasicRate.PointsDiscountList)
      //await insertReservationPayment(requestId, hotel_id, reservation.id, BasicInformation.TravelAgencyBookingDate, roomId, reservationClientId, 2, BasicRate?.PointsDiscountList?.PointsDiscount, BasicRate?.PointsDiscountList?.PointsDiscountName, 1)
      console.log('addOTAReservation reservation_payments:', hotel_id, reservation.id, BasicInformation.TravelAgencyBookingDate, roomId, reservationClientId, 2, BasicRate?.PointsDiscountList?.PointsDiscount, BasicRate?.PointsDiscountList?.PointsDiscountName, 1);
    }    

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err);
  } finally {
    client.release();
  }
};

module.exports = {    
    selectAvailableRooms,
    selectReservedRooms,
    selectReservation,
    selectReservationDetail,
    selectReservationAddons,
    selectMyHoldReservations,
    selectReservationsToday,
    selectAvailableDatesForChange,
    selectReservationClientIds,
    selectReservationPayments,
    addReservationHold,
    addReservationDetail,
    addReservationAddon,
    addReservationClient,
    addRoomToReservation,
    insertReservationPayment,
    updateReservationDetail,
    updateReservationStatus,
    updateReservationDetailStatus,
    updateReservationComment,
    updateReservationTime,
    updateReservationType,
    updateReservationResponsible,
    updateRoomByCalendar,
    updateCalendarFreeChange,
    updateReservationRoomGuestNumber,
    updateReservationGuest,
    updateClientInReservation,
    updateReservationDetailPlan,
    updateReservationDetailAddon,
    updateReservationDetailRoom,
    updateReservationRoom,
    updateReservationRoomWithCreate,
    updateReservationRoomPlan,
    updateReservationRoomPattern,
    deleteHoldReservationById,
    deleteReservationAddonsByDetailId,
    deleteReservationClientsByDetailId,
    deleteReservationRoom,
    deleteReservationPayment,
    addOTAReservation,
};

