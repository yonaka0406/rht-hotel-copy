const pool = require('../config/database');

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
      ,reservation_details.date
      ,rooms.room_type_id
      ,room_types.name AS room_type_name
      ,reservation_details.room_id
      ,rooms.room_number
      ,reservation_details.plans_global_id
      ,reservation_details.plans_hotel_id
      ,reservation_details.number_of_people
      ,reservation_details.price

    FROM
      rooms
      ,room_types
      ,reservations
      ,reservation_details
      ,clients
    WHERE
      reservation_details.hotel_id = $1
      AND reservation_details.date >= $2 AND reservation_details.date < $3
      AND rooms.for_sale = TRUE
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
      ,reservation_details.price

    FROM
      rooms
        JOIN 
      room_types 
        ON room_types.id = rooms.room_type_id        
        JOIN 
      reservation_details 
        ON reservation_details.room_id = rooms.id AND reservation_details.hotel_id = rooms.hotel_id
		JOIN 
      reservations 
        ON reservations.id = reservation_details.reservation_id
        JOIN 
      clients 
        ON clients.id = reservations.reservation_client_id
        LEFT JOIN 
      plans_hotel 
        ON plans_hotel.hotel_id = reservation_details.hotel_id AND plans_hotel.id = reservation_details.plans_hotel_id
        LEFT JOIN 
      plans_global 
        ON plans_global.id = reservation_details.plans_global_id

    WHERE
      reservations.id = $1

    ORDER BY
      rooms.room_number
      ,reservation_details.date  
  `;

  const values = [id];

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
    SELECT * FROM reservation_details
    WHERE id = $1
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
      ,reservation_details.reservation_id
      ,COALESCE(clients.name_kanji, clients.name) as client_name
      ,reservations.check_in
      ,reservations.check_out
      ,reservations.number_of_people
      ,reservations.status      
    FROM
      rooms
      ,room_types
      ,reservations
      ,reservation_details
      ,clients
    WHERE
      reservations.created_by = $1
      AND reservations.status = 'hold'     
      AND reservation_details.room_id = rooms.id
      AND reservation_details.hotel_id = rooms.hotel_id
      AND room_types.id = rooms.room_type_id
      AND room_types.hotel_id = rooms.hotel_id
      AND reservations.id = reservation_details.reservation_id
      AND reservations.hotel_id = reservation_details.hotel_id
      AND clients.id = reservations.reservation_client_id
    GROUP BY
      reservation_details.hotel_id
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

// Function to Add

const addReservationHold = async (reservation) => {

  const query = `
    INSERT INTO reservations (
      hotel_id, room_type_id, reservation_client_id, check_in, check_out, number_of_people, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const values = [
    reservation.hotel_id,
    reservation.room_type_id,
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

  try {
      const result = await pool.query(query, values);
      return result.rows[0];
  } catch (err) {
      console.error('Error updating reservation detail:', err);
      throw new Error('Database error');
  }
};

const updateRoomByCalendar = async (roomData) => {
  const { id, hotel_id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, updated_by } = roomData;

  // Calculate the shift direction in JavaScript
  const shiftDirection = new_check_in >= old_check_in? 'DESC': 'ASC'; 

  const client = await pool.connect();
  try {
    console.log('Starting transaction...');
    await client.query('BEGIN');

    // Check if the provided reservation_id has more than one distinct room_id
    const checkQuery = `
      SELECT COUNT(DISTINCT room_id) AS room_count
      FROM reservation_details
      WHERE reservation_id = $1 AND hotel_id = $2
    `;
    const checkValues = [id, hotel_id];
    const checkResult = await client.query(checkQuery, checkValues);
    const roomCount = checkResult.rows[0].room_count;
    console.log('Room count:', roomCount);

    let newReservationId = id;

    // If room_count > 1 and check_in/check_out dates change, create a new reservation_id
    if (roomCount > 1) {
      
      console.log('Old check-in:', old_check_in, 'Old check-out:', old_check_out);

      if (new_check_in !== old_check_in || new_check_out !== old_check_out) {
        console.log('Check-in or check-out dates have changed. Creating new reservation_id...');
        const insertReservationQuery = `
          INSERT INTO reservations (hotel_id, reservation_client_id, check_in, check_out, number_of_people, status, created_at, created_by, updated_by)
          SELECT hotel_id, room_type_id, reservation_client_id, $1, $2, number_of_people, status, created_at, created_by, $3
          FROM reservations
          WHERE id = $4 AND hotel_id = $5
          RETURNING id
        `;
        const insertReservationValues = [new_check_out, new_check_out, updated_by, id, hotel_id];
        const insertResult = await client.query(insertReservationQuery, insertReservationValues);
        newReservationId = insertResult.rows[0].id;
        console.log('New reservation_id:', newReservationId);
      }
    }

    const query = `
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
    console.log('Executing update query with values:', values);
    const result = await pool.query(query, values);

    // Update reservations table with new check_in and check_out
    const updateReservationQuery = `
      UPDATE reservations
      SET check_in = $1, check_out = $2, updated_by = $3
      WHERE id = $4 AND hotel_id = $5
    `;
    const updateReservationValues = [new_check_in, new_check_out, updated_by, newReservationId, hotel_id];
    await client.query(updateReservationQuery, updateReservationValues);
    console.log('Updated reservations table with new check_in and check_out.');

    await client.query('COMMIT');
    console.log('Transaction committed successfully.');
    return result.rows;
  }catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating reservation detail:', err);
    throw new Error('Database error');
  } finally {
    client.release();
    console.log('Client released.');
  }
  
};

// Delete

const deleteReservationAddonsByDetailId = async (reservation_detail_id) => {  
  const query = `
      DELETE FROM reservation_addons
      WHERE reservation_detail_id = $1
      RETURNING *;
  `;
  const values = [reservation_detail_id];
  
  try{
    const result = await pool.query(query, values);
    return result.rowCount;
  } catch (err) {
    console.error('Error deleting reservation addon:', err);
    throw new Error('Database error');
  }
   
};

module.exports = {    
    selectAvailableRooms,
    selectReservedRooms,
    selectReservation,
    selectReservationDetail,
    selectReservationAddons,
    selectMyHoldReservations,
    addReservationHold,
    addReservationDetail,
    addReservationAddon,
    addReservationClient,
    updateReservationDetail,
    updateReservationStatus,
    updateRoomByCalendar,
    deleteReservationAddonsByDetailId,
};

