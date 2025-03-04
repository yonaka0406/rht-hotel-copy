const pool = require('../config/database');
const format = require('pg-format');

const { getPriceForReservation } = require('../models/planRate');

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Function to Select

const selectAvailableRooms = async (hotelId, checkIn, checkOut) => {
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

const selectReservedRooms = async (hotel_id, start_date, end_date) => {
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

const selectReservation = async (id) => {
  const query = `
    SELECT
      reservation_details.id
      ,reservation_details.hotel_id
      ,reservation_details.reservation_id
      ,clients.id as client_id
      ,COALESCE(clients.name_kanji, clients.name) as client_name
      ,reservations.check_in
      ,reservations.check_out
      ,reservations.number_of_people as reservation_number_of_people
      ,reservations.status   
      ,reservations.type   
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
      ,COALESCE(plans_hotel.plan_type, plans_global.plan_type) AS plan_type
      ,COALESCE(plans_hotel.name, plans_global.name) AS plan_name
      ,reservation_details.number_of_people
      ,reservation_details.price AS plan_total_price
	    ,COALESCE(ra.price, 0) AS addon_total_price      
      ,CASE 
        WHEN COALESCE(plans_hotel.plan_type, plans_global.plan_type) = 'per_room' THEN reservation_details.price 
        ELSE reservation_details.price * reservation_details.number_of_people
        END + COALESCE(ra.price, 0) 
      AS price      
      ,COALESCE(rc.clients_json, '[]'::json) AS reservation_clients

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
      plans_hotel 
        ON plans_hotel.hotel_id = reservation_details.hotel_id AND plans_hotel.id = reservation_details.plans_hotel_id
        LEFT JOIN 
      plans_global 
        ON plans_global.id = reservation_details.plans_global_id
        LEFT JOIN 
      (
        SELECT
          reservation_detail_id,
          SUM(price * quantity) AS price
        FROM
          reservation_addons		
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

const selectReservationDetail = async (id) => {
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
      COALESCE(plans_hotel.plan_type, plans_global.plan_type) AS plan_type,
      COALESCE(plans_hotel.name, plans_global.name) AS plan_name,
      reservation_details.number_of_people,
      reservation_details.price AS plan_total_price,
      COALESCE(ra.total_price, 0) AS addon_total_price, 
      CASE 
        WHEN COALESCE(plans_hotel.plan_type, plans_global.plan_type) = 'per_room' 
        THEN reservation_details.price 
        ELSE reservation_details.price * reservation_details.number_of_people
      END + COALESCE(ra.total_price, 0) AS price,
      COALESCE(rc.clients_json, '[]'::json) AS reservation_clients,
      COALESCE(ra.addons_json, '[]'::json) AS reservation_addons
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
      LEFT JOIN plans_hotel 
        ON plans_hotel.hotel_id = reservation_details.hotel_id 
        AND plans_hotel.id = reservation_details.plans_hotel_id
      LEFT JOIN plans_global 
        ON plans_global.id = reservation_details.plans_global_id
      LEFT JOIN (
        SELECT
		    ra.reservation_detail_id,
		    SUM(ra.price * ra.quantity) AS total_price,
		    JSON_AGG(
		        JSON_BUILD_OBJECT(
		            'addon_id', ra.id,
                'addons_global_id', ra.addons_global_id,
					      'addons_hotel_id', ra.addons_hotel_id,
		            'name', COALESCE(ah.name, ag.name), -- Prefer hotel-specific name, fallback to global
		            'quantity', ra.quantity,
		            'price', ra.price
		        )
		    ) AS addons_json
		FROM reservation_addons ra
		LEFT JOIN addons_hotel ah 
		    ON ra.addons_hotel_id = ah.id 
		    AND ra.hotel_id = ah.hotel_id
		LEFT JOIN addons_global ag 
		    ON ra.addons_global_id = ag.id
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

const selectRoomReservationDetails = async (hotelId, roomId, reservationId) => {
  const query = `
    SELECT 
      reservation_details.id,
      reservation_details.hotel_id,
      reservation_details.room_id,
      reservation_details.reservation_id      
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

const selectReservationAddons = async (id) => {
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

const selectMyHoldReservations = async (user_id) => {
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

const selectReservationsToday = async (hotelId, date) => {
  const query = `
    SELECT DISTINCT
      reservations.hotel_id
      ,reservations.id
      ,reservations.reservation_client_id
      ,COALESCE(r_client.name_kanji, r_client.name) as client_name
      ,reservations.check_in
      ,reservations.check_out
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
      ,COALESCE(plans_hotel.name, plans_global.name) as plan_name
      ,COALESCE(plans_hotel.plan_type, plans_global.plan_type) as plan_type
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
}

const selectAvailableDatesForChange = async (hotelId, roomId, checkIn, checkOut) => {
  try {
    const maxDateQuery = `
      SELECT TO_CHAR(MAX(date) + INTERVAL '1 day', 'YYYY-MM-DD') AS max_date
      FROM reservation_details
      WHERE hotel_id = $1 AND room_id = $2 AND date < $3
    `;
    const valuesMax = [hotelId, roomId, checkIn];
    const minDateQuery = `
      SELECT TO_CHAR(MIN(date), 'YYYY-MM-DD') AS min_date
      FROM reservation_details
      WHERE hotel_id = $1 AND room_id = $2 AND date >= $3
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

// Function to Add

const addReservationHold = async (reservation) => {

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
    console.error('Error adding client:', err);
    throw new Error('Database error');
  }
}

const addReservationDetail = async (reservationDetail) => {
  const query = `
    INSERT INTO reservation_details (
      hotel_id, reservation_id, payer_client_id, date, room_id, plans_global_id, plans_hotel_id, number_of_people, price, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;

  const values = [
    reservationDetail.hotel_id,
    reservationDetail.reservation_id,
    reservationDetail.payer_client_id,
    reservationDetail.date,
    reservationDetail.room_id,
    reservationDetail.plans_global_id,
    reservationDetail.plans_hotel_id,
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

const addReservationAddon = async (reservationAddon) => {
  
  const query = `
    INSERT INTO reservation_addons (
      hotel_id, reservation_detail_id, addons_global_id, addons_hotel_id, quantity, price, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const values = [
    reservationAddon.hotel_id,
    reservationAddon.reservation_detail_id,
    reservationAddon.addons_global_id,
    reservationAddon.addons_hotel_id,
    reservationAddon.quantity,
    reservationAddon.price,
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

const addReservationClient = async (reservationClient) => {
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

const addRoomToReservation = async (reservationId, numberOfPeople, roomId, userId) => {
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

// Update entry
const updateReservationDetail = async (reservationData) => {
  
  const { id, hotel_id, room_id, plans_global_id, plans_hotel_id, number_of_people, price, updated_by } = reservationData;

  const query = `
      UPDATE reservation_details
      SET 
          room_id = $1,
          plans_global_id = $2,
          plans_hotel_id = $3,
          number_of_people = $4,
          price = $5,
          updated_by = $6          
      WHERE id = $7::UUID AND hotel_id = $8
      RETURNING *;
  `;
  const values = [
    room_id,
    plans_global_id,
    plans_hotel_id,
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

const updateReservationStatus = async (reservationData) => {
  const { id, hotel_id, status, updated_by } = reservationData;

  try {

    const query = `
        UPDATE reservations
        SET
          status = $1,          
          updated_by = $2          
        WHERE id = $3::UUID AND hotel_id = $4
        RETURNING *;
    `;
    const values = [
      status,    
      updated_by,
      id,
      hotel_id,
    ];

    const result = await pool.query(query, values);

    if(status==='cancelled'){
      const queryTwo = `
          UPDATE reservation_details
          SET
            cancelled = gen_random_uuid()
            ,billable = FALSE
            ,updated_by = $1          
          WHERE reservation_id = $2::UUID AND hotel_id = $3
          RETURNING *;
      `;
      const valuesTwo = [            
        updated_by,
        id,
        hotel_id,
      ];

      await pool.query(queryTwo, valuesTwo);
    }

    return result.rows[0];
  } catch (err) {
      console.error('Error updating reservation detail:', err);
      throw new Error('Database error');
  }
};

const updateReservationType = async (reservationData) => {
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

const updateReservationResponsible = async (id, updatedFields, user_id) => {  

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

const updateRoomByCalendar = async (roomData) => {
  const { id, hotel_id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people, mode, updated_by } = roomData;

  // console.log('roomData',roomData);

  // Calculate the shift direction in JavaScript
  const shiftDirection = new_check_in >= old_check_in? 'DESC': 'ASC'; 

  const client = await pool.connect();
  console.log("Before release:", pool.totalCount, pool.idleCount, pool.waitingCount);

  try {
    console.log('Starting transaction for room ',old_room_id,'check-in:',new_check_in,'check out:', new_check_out);

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
          INSERT INTO reservation_details (hotel_id, reservation_id, payer_client_id, date, room_id, plans_global_id, plans_hotel_id, number_of_people, price, created_by, updated_by)
          
          SELECT datesList.*
          FROM
            (SELECT DISTINCT hotel_id, $1::uuid as reservation_id, payer_client_id, 
              generate_series(($3::DATE)::DATE, ($4::DATE - INTERVAL '1 day')::DATE, '1 day'::INTERVAL)::DATE as series, 
              $2::integer as room_id, plans_global_id, plans_hotel_id, number_of_people, price, $5::integer as created_by, $5::integer as updated_by
              FROM reservation_details
              WHERE reservation_id = $1::uuid AND hotel_id = $6::integer AND room_id = $2::integer) as datesList
          WHERE NOT EXISTS (
            SELECT 1 FROM reservation_details rd WHERE datesList.hotel_id = rd.hotel_id AND datesList.reservation_id = rd.reservation_id AND datesList.room_id = rd.room_id
            AND datesList.series = rd.date )

          ORDER BY datesList.series          
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
      // console.log('Executing Query insertDetailsValues:', insertDetailsQuery);
      // console.log('With Values:', insertDetailsValues);
      
      await pool.query(insertDetailsQuery, insertDetailsValues);
      // console.log('Inserted new reservation_details rows for extra days.');

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

    await recalculatePlanPrice(newReservationId, hotel_id, new_room_id);

    await client.query('COMMIT');
    console.log('Transaction updateRoomByCalendar committed successfully.');    
  }catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating reservation detail:', err);
    throw new Error('Database error');
  } finally {
    client.release();    
    console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
  }  
};

const updateReservationRoomGuestNumber = async (detailsArray, updated_by) => {

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
      newPrice = await getPriceForReservation(plans_global_id, plans_hotel_id, hotel_id, formatDate(new Date(date)));
      // console.log('newPrice calculated:',newPrice);
      
      const dtlUpdateQuery = `
        UPDATE reservation_details
        SET number_of_people = number_of_people + $1,
            price = $2
        WHERE id = $3
        RETURNING *;
      `;
      console.log('dtlUpdateQuery', dtlUpdateQuery);
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

const updateReservationGuest = async (oldValue, newValue) => {  
  
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

const updateClientInReservation = async (oldValue, newValue) => {
  
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
      `UPDATE reservation_details
       SET payer_client_id = $1
       WHERE payer_client_id = $2`,
      [newValue, oldValue]
    );

    await client.query(
      `UPDATE reservation_clients
       SET client_id = $1
       WHERE client_id = $2`,
      [newValue, oldValue]
    );

    await client.query('COMMIT'); // Commit transaction
    console.log('updateClientInReservation commit');
  } catch (err) {
    await client.query('ROLLBACK'); // Rollback transaction on error    
  } finally {
    client.release(); // Release the client back to the pool
  }
  
};

const updateReservationDetailPlan = async (id, hotel_id, gid, hid, price, user_id) => {
  const plans_global_id = gid === 0 ? null : gid;
  const plans_hotel_id = hid === 0 ? null : hid;
  const query = `
    UPDATE reservation_details
    SET plans_global_id = $1
      ,plans_hotel_id = $2
      ,price = $3
      ,updated_by = $4
    WHERE hotel_id = $5 AND id = $6::uuid
    RETURNING *;
  `;  

  try {
    await pool.query(query, [plans_global_id, plans_hotel_id, price, user_id, hotel_id, id]);    
  } catch (err) {
    console.error('Error updating reservation guest:', err);
  } 
};

const updateReservationDetailAddon = async (id, addons, user_id) => {
  
  await deleteReservationAddonsByDetailId(id, user_id);
  const reservationDetail = await selectReservationDetail(id);  
  
  const addOnPromises = addons.map(addon =>
      addReservationAddon({
          hotel_id: reservationDetail[0].hotel_id,
          reservation_detail_id: id,
          addons_global_id: addon.addons_global_id,
          addons_hotel_id: addon.addons_hotel_id,
          quantity: addon.quantity,
          price: addon.price,
          created_by: user_id, 
          updated_by: user_id, 
      })
  );  
  await Promise.all(addOnPromises);
  
};

const updateReservationDetailRoom = async (id, room_id, user_id) => {  
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

const updateReservationRoomPlan = async (reservationId, hotelId, roomId, plan, addons, user_id) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, user_id);
    await client.query(setSessionQuery);

    const detailsArray = await selectRoomReservationDetails(hotelId, roomId, reservationId);

    // Update the reservation details with promise
    const updatePromises = detailsArray.map(async (detail) => {
      const { id } = detail;

      // 1. Update Plan
      await updateReservationDetailPlan(id, hotelId, plan.plans_global_id, plan.plans_hotel_id, plan.price, user_id);

      // 2. Update Addons
      await updateReservationDetailAddon(id, addons, user_id);

    });

    await Promise.all(updatePromises);

    // 3. Recalculate Price after updating plans and addons
    await recalculatePlanPrice(reservationId, hotelId, roomId);

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

const recalculatePlanPrice = async (reservation_id, hotel_id, room_id) => {
  const client = await pool.connect();
  try {
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
      const newPrice = await getPriceForReservation(plans_global_id, plans_hotel_id, hotel_id, formatDate(new Date(date)));
      // console.log('newPrice calculated:', newPrice);

      const dtlUpdateQuery = `
        UPDATE reservation_details
        SET price = $1
        WHERE id = $2
        RETURNING *;
      `;
      return pool.query(dtlUpdateQuery, [newPrice, id]);
    });

    // Wait for all promises to resolve
    const updatedDetails = await Promise.all(dtlUpdatePromises);
    return updatedDetails;
  } catch (error) {
    console.error('Error recalculating plan price:', error);
    throw error;
  } finally {
    client.release();    
    console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
  }
};

// Delete
const deleteHoldReservationById = async (reservation_id, updated_by) => {
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

const deleteReservationAddonsByDetailId = async (reservation_detail_id, updated_by) => {
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

const deleteReservationClientsByDetailId = async (reservation_detail_id, updated_by) => {
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

const deleteReservationRoom = async (hotelId, roomId, reservationId, numberOfPeople, updated_by) => {

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

module.exports = {    
    selectAvailableRooms,
    selectReservedRooms,
    selectReservation,
    selectReservationDetail,
    selectReservationAddons,
    selectMyHoldReservations,
    selectReservationsToday,
    selectAvailableDatesForChange,
    addReservationHold,
    addReservationDetail,
    addReservationAddon,
    addReservationClient,
    addRoomToReservation,
    updateReservationDetail,
    updateReservationStatus,
    updateReservationType,
    updateReservationResponsible,
    updateRoomByCalendar,
    updateReservationRoomGuestNumber,
    updateReservationGuest,
    updateClientInReservation,
    updateReservationDetailPlan,
    updateReservationDetailAddon,
    updateReservationDetailRoom,
    updateReservationRoomPlan,
    deleteHoldReservationById,
    deleteReservationAddonsByDetailId,
    deleteReservationClientsByDetailId,
    deleteReservationRoom,
};

