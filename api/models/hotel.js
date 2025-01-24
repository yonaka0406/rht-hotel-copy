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
  getAllRoomsByHotelId,
};
