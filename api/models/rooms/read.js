// api/models/rooms/read.js
const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const selectRoomTypeById = async (requestId, roomTypeId, hotelId, client = null) => {
  const pool = getPool(requestId);
  const dbClient = client || await pool.connect();
  try {
    const query = `
      SELECT * FROM room_types
      WHERE id = $1 AND hotel_id = $2
    `;
    const result = await dbClient.query(query, [roomTypeId, hotelId]);
    return result.rows[0];
  } catch (err) {
    logger.error(`[${requestId}] Error retrieving room type by ID and hotel ID:`, err);
    throw new Error('Database error');
  } finally {
    if (!client) {
      dbClient.release();
    }
  }
};

const selectRoomTypeByName = async (requestId, roomTypeName, hotelId, client = null) => {
  const pool = getPool(requestId);
  const dbClient = client || await pool.connect();
  try {
    const query = `
      SELECT id FROM room_types
      WHERE name = $1 AND hotel_id = $2
    `;
    const result = await dbClient.query(query, [roomTypeName, hotelId]);
    return result.rows[0]?.id;
  } catch (err) {
    logger.error(`[${requestId}] Error retrieving room type by name and hotel ID:`, err);
    throw new Error('Database error');
  } finally {
    if (!client) {
      dbClient.release();
    }
  }
};

const selectAllHotelRoomTypes = async (requestId, hotelId) => {
  const pool = getPool(requestId);
  try {
    const query = `
      SELECT id, name, description, created_at, updated_at
      FROM room_types
      WHERE hotel_id = $1
    `;
    const result = await pool.query(query, [hotelId]);
    return result.rows;
  } catch (err) {
    logger.error(`[${requestId}] Error retrieving all room types by hotel ID:`, err);
    throw new Error('Database error');
  }
};

const selectAllRoomsByHotel = async (requestId, id) => {
  const pool = getPool(requestId);
  try {
    const query = `
      SELECT 
        hotels.id as hotel_id,
        room_types.id as room_type_id,
        room_types.name as room_type_name,
        room_types.description as room_type_description,
        rooms.id as room_id,
        rooms.floor,
        rooms.room_number,
        rooms.capacity as room_capacity,
        rooms.for_sale as room_for_sale_idc,
        rooms.smoking as room_smoking_idc,
        rooms.has_wet_area as room_has_wet_area_idc,
        rooms.is_staff_room
      FROM
        hotels JOIN room_types ON hotels.id = room_types.hotel_id
        LEFT JOIN rooms ON room_types.id = rooms.room_type_id
      WHERE 
        hotels.id = $1
      ORDER BY 
        room_types.name, rooms.room_number;
    `;
    const result = await pool.query(query, [id]);
    return result.rows;
  } catch (err) {
    logger.error(`[${requestId}] Error retrieving all rooms by hotel ID:`, err);
    throw new Error('Database error');
  }
};

const selectRoomIdsByHotel = async (requestId, hotelId, client = null) => {
  const pool = getPool(requestId);
  const dbClient = client || await pool.connect();
  try {
    const query = `
      SELECT id FROM rooms WHERE hotel_id = $1
    `;
    const result = await dbClient.query(query, [hotelId]);
    return result.rows.map(row => row.id);
  } catch (err) {
    logger.error(`[${requestId}] Error retrieving room IDs by hotel ID:`, err);
    throw new Error('Database error');
  } finally {
    if (!client) {
      dbClient.release();
    }
  }
};

const selectRoomAssignmentOrder = async (requestId, hotelId) => {
  const pool = getPool(requestId);
  try {
    const query = `
      SELECT room_id, sort_order
      FROM room_assignment_order
      WHERE hotel_id = $1
      ORDER BY sort_order;
    `;
    const result = await pool.query(query, [hotelId]);
    return result.rows;
  } catch (err) {
    logger.error(`[${requestId}] Error getting room assignment order:`, err);
    throw new Error('Database error');
  }
};

module.exports = {
  selectRoomTypeById,
  selectRoomTypeByName,
  selectAllHotelRoomTypes,
  selectAllRoomsByHotel,
  selectRoomIdsByHotel,
  selectRoomAssignmentOrder
};
