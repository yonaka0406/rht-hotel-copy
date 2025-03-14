const pool = require('../config/database');

// Return all hotels
const getAllHotels = async () => {
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
const findHotelById = async (id) => {
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
const updateHotel = async (id, formal_name, name, email, phone_number, latitude, longitude, updated_by) => {
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
const updateRoomType = async (id, name, description, updated_by) => {
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
const updateRoom = async (id, room_type_id, floor, room_number, capacity, smoking, for_sale, updated_by) => {
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

const updateHotelCalendar = async (hotelId, roomIds, startDate, endDate, updated_by) => {

  // TO DO: checar se o room ja tem alguma reserva para o dia selecionado, em caso positivo, interromper a transacao e enviar mensagem de erro.
  
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
        for (const date of dateArray) {
          const reservationIdResult = await client.query('SELECT gen_random_uuid() as id');
          const mockReservationId = reservationIdResult.rows[0].id;

          await client.query(
            `INSERT INTO reservations (id, hotel_id, reservation_client_id, check_in, check_out, number_of_people, status, created_by, updated_by)
             VALUES ($1, $2, '11111111-1111-1111-1111-111111111111', $3, $3, 0, 'block', $4, $5)
             ON CONFLICT (hotel_id, id) DO NOTHING`,
            [
              mockReservationId,
              currentHotelId,
              date,
              updated_by,
              updated_by,
            ]
          );

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

// Get rooms by hotel id
const getAllRoomsByHotelId = async (id) => {
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
  getAllRoomsByHotelId,
};
