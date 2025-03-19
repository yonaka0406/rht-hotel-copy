const { getPool } = require('../config/database');
const format = require('pg-format');

// Return all hotels
const getAllHotels = async (requestId) => {
  const pool = getPool(requestId);
  const query = 'SELECT hotels.* FROM hotels ORDER BY id ASC';

  try {
    const result = await pool.query(query);    
    return result.rows; // Return all
  } catch (err) {
    console.error('Error retrieving all hotels:', err);
    throw new Error('Database error');
  }
};

// Find a hotel by id
const findHotelById = async (requestId, id) => {
  const pool = getPool(requestId);
  const query = 'SELECT hotels.* FROM hotels WHERE hotels.id = $1';
  const values = [id];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the first user found (or null if none)
  } catch (err) {
    console.error('Error finding hotel by id:', err);
    throw new Error('Database error');
  }
};

// Update a hotel's basic info
const updateHotel = async (requestId, id, formal_name, name, email, phone_number, latitude, longitude, updated_by) => {
  const pool = getPool(requestId);
    const query = 'UPDATE hotels SET formal_name = $1, name = $2, email = $3, phone_number = $4, latitude = $5, longitude = $6, updated_by = $7 WHERE id = $8 RETURNING *';
    const values = [formal_name, name, email, phone_number, latitude, longitude, updated_by, id];
  
    try {
      const result = await pool.query(query, values);
      return result.rows[0]; // Return the updated user
    } catch (err) {
      console.error('Error updating hotel:', err);
      throw new Error('Database error');
    }
};

// Update a Room Type
const updateRoomType = async (requestId, id, name, description, updated_by) => {
  const pool = getPool(requestId);
  const query = 'UPDATE room_types SET name = $1, description = $2, updated_by = $3 WHERE id = $4 RETURNING *';
  const values = [name, description, updated_by, id];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the updated user
  } catch (err) {
    console.error('Error updating room type:', err);
    throw new Error('Database error');
  }
};

// Update a Room Type
const updateRoom = async (requestId, id, room_type_id, floor, room_number, capacity, smoking, for_sale, updated_by) => {
  const pool = getPool(requestId);
  const query = 'UPDATE rooms SET room_type_id = $1, floor = $2, room_number = $3, capacity = $4, smoking = $5, for_sale = $6, updated_by = $7 WHERE id = $8 RETURNING *';
  const values = [room_type_id, floor, room_number, capacity, smoking, for_sale, updated_by, id];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the updated user
  } catch (err) {
    console.error('Error updating room:', err);
    throw new Error('Database error');
  }
};

const updateHotelCalendar = async (requestId, hotelId, roomIds, startDate, endDate, comment, updated_by) => {
  const pool = getPool(requestId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateArray = [];

    for (let dt = start; dt <= end; dt.setDate(dt.getDate() + 1)) {
      dateArray.push(new Date(dt));
    }

    let hotelsToUpdate = [];
    if (hotelId) {
      hotelsToUpdate.push(hotelId);
    } else {
      const hotelsResult = await client.query('SELECT id FROM hotels');
      hotelsToUpdate = hotelsResult.rows.map(hotel => hotel.id);
    }

    for (const currentHotelId of hotelsToUpdate) {
      let roomsToUpdate = [];
      if (roomIds && roomIds.length > 0) {
        roomsToUpdate = roomIds;
      } else {
        const roomsResult = await client.query('SELECT id FROM rooms WHERE hotel_id = $1', [currentHotelId]);
        roomsToUpdate = roomsResult.rows.map(room => room.id);
      }
      
      for (const roomId of roomsToUpdate) {
        // Make one reservation_id per room
        const reservationIdResult = await client.query('SELECT gen_random_uuid() as id');
        const mockReservationId = reservationIdResult.rows[0].id;
        const checkInDate = dateArray[0];
        const checkOutDate = dateArray[dateArray.length - 1];

        // Insert the reservation with check_in as the first date and check_out as the last date
        await client.query(
          `INSERT INTO reservations (id, hotel_id, reservation_client_id, check_in, check_out, number_of_people, status, comment, created_by, updated_by)
          VALUES ($1, $2, '11111111-1111-1111-1111-111111111111', $3, $4, 0, 'block', $5, $6, $7)
          ON CONFLICT (hotel_id, id) DO NOTHING`,
          [
              mockReservationId,
              currentHotelId,
              checkInDate,
              checkOutDate,
              comment,
              updated_by,
              updated_by,
          ]
      );

        for (const date of dateArray) {
          const existingReservation = await client.query(
            `SELECT 1 FROM reservation_details 
             WHERE hotel_id = $1 AND room_id = $2 AND date = $3 AND cancelled IS NULL`,
            [currentHotelId, roomId, date]
          );

          if (existingReservation.rowCount > 0) {
            await client.query('ROLLBACK');
            return { success: false, message: `${date.toISOString().split('T')[0]}に予約は既に登録されています。` };
          }          

          await client.query(
            `INSERT INTO reservation_details (hotel_id, reservation_id, date, room_id, number_of_people, created_by, updated_by)
             VALUES ($1, $2, $3, $4, 0, $5, $6)
             ON CONFLICT (hotel_id, reservation_id, room_id, date, cancelled) DO UPDATE SET updated_by = $6`,
            [
              currentHotelId,
              mockReservationId,
              date,
              roomId,              
              updated_by,
              updated_by,
            ]
          );          
        }
      }
    }
    await client.query('COMMIT');
    return { success: true, message: 'Calendar updated successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating hotel calendar:', error);
    return { success: false, message: 'Error updating calendar', error: error.message };
  } finally {
    client.release();
  }
};
const selectBlockedRooms = async (requestId, hotelId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT r.*, d.room_id, d.room_type_name, d.room_number, h.name
    FROM 
      hotels h,
      reservations r
      ,(
        SELECT 
          rd.hotel_id, rd.reservation_id, rd.room_id, room_types.name as room_type_name, rooms.room_number
        FROM reservation_details rd, rooms, room_types
        WHERE 
          rd.hotel_id = rooms.hotel_id AND rd.room_id = rooms.id AND rooms.hotel_id = room_types.hotel_id AND rooms.room_type_id = room_types.id          
        GROUP BY rd.hotel_id, rd.reservation_id, rd.room_id, room_types.name, rooms.room_number
      ) d
    WHERE 
      r.status = 'block'
      AND r.hotel_id = $1
      AND r.hotel_id = d.hotel_id
      AND r.id = d.reservation_id
      AND r.hotel_id = h.id
      ORDER BY 
        r.check_out DESC
        ,d.room_number ASC
  `;

  try {
    const result = await pool.query(query, [hotelId]);    
    return result.rows;
  } catch (err) {
    console.error('Error retrieving blocked rooms:', err);
    throw new Error('Database error');
  }
};
const deleteBlockedRooms = async (requestId, reservationId, userID) => {
  const pool = getPool(requestId);
  const query = format(`
    -- Set the updated_by value in a session variable
    SET SESSION "my_app.user_id" = %L;

    DELETE FROM reservations
    WHERE id = %L AND status = 'block'
    RETURNING *;
  `, userID, reservationId);

  try {
    const result = await pool.query(query);    
    return true;
  } catch (err) {
    console.error('Error deleting reservation:', err);
    throw new Error('Database error');
  }
};

// Get rooms by hotel id
const getAllRoomsByHotelId = async (requestId, id) => {
  const pool = getPool(requestId);
  const query = 'SELECT hotels.*, room_types.id as room_type_id, room_types.name as room_type_name, room_types.description as room_type_description, rooms.id as room_id, rooms.floor as room_floor, rooms.room_number, rooms.capacity as room_capacity, rooms.for_sale as room_for_sale_idc, rooms.smoking as room_smoking_idc FROM hotels JOIN room_types ON hotels.id = room_types.hotel_id LEFT JOIN rooms ON room_types.id = rooms.room_type_id WHERE hotels.id = $1 ORDER BY room_types.id, rooms.floor, rooms.room_number ASC';
  const values = [id];

  try {
    const result = await pool.query(query, values);
    return result.rows; // Return all
  } catch (err) {
    console.error('Error finding hotel by id:', err);
    throw new Error('Database error');
  }
};





module.exports = {
  getAllHotels,
  findHotelById,
  updateHotel,
  updateRoomType,
  updateRoom,
  updateHotelCalendar,
  selectBlockedRooms,
  deleteBlockedRooms,
  getAllRoomsByHotelId,
};
