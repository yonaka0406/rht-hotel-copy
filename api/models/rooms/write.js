// api/models/rooms/write.js
const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const createRoomType = async (requestId, { name, description, hotel_id, created_by, updated_by }, client = null) => {
  const pool = getPool(requestId);
  const dbClient = client || await pool.connect();
  try {
    const query = `
      INSERT INTO room_types (name, description, hotel_id, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const values = [name, description, hotel_id, created_by, updated_by];
    const result = await dbClient.query(query, values);
    return result.rows[0].id;
  } catch (err) {
    logger.error(`[${requestId}] Error creating room type:`, err);
    throw new Error('Database error');
  } finally {
    if (!client) {
      dbClient.release();
    }
  }
};

const createRoom = async (requestId, { room_type_id, floor, room_number, capacity, smoking, for_sale, has_wet_area, hotel_id, created_by, updated_by }, client) => {
  const pool = getPool(requestId);
  const dbClient = client || await pool.connect();
  try {
    if (!client) { // Only start a transaction if no client is passed in (i.e., not part of an external transaction)
      await dbClient.query('BEGIN');
    }
    const query = `
      INSERT INTO rooms (room_type_id, floor, room_number, capacity, smoking, for_sale, has_wet_area, hotel_id, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;
    const values = [room_type_id, floor, room_number, capacity, smoking, for_sale, has_wet_area, hotel_id, created_by, updated_by];
    const result = await dbClient.query(query, values);
    if (!client) { // Only commit if no client is passed in
      await dbClient.query('COMMIT');
    }
    return result.rows[0].id;
  } catch (err) {
    if (!client) { // Only rollback if no client is passed in
      await dbClient.query('ROLLBACK');
    }
    logger.error(`[${requestId}] Error creating room:`, err);
    throw new Error('Database error');
  } finally {
    if (!client) {
      dbClient.release();
    }
  }
};

const updateRoom = async (requestId, id, room_type_id, floor, room_number, capacity, smoking, for_sale, has_wet_area, updated_by, hotelId) => {
  const pool = getPool(requestId);
  const query = 'UPDATE rooms SET room_type_id = $1, floor = $2, room_number = $3, capacity = $4, smoking = $5, for_sale = $6, has_wet_area = $7, updated_by = $8 WHERE id = $9 AND hotel_id = $10 RETURNING *';
  const values = [room_type_id, floor, room_number, capacity, smoking, for_sale, has_wet_area, updated_by, id, hotelId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    logger.error(`[${requestId}] Error updating room:`, err);
    throw new Error('Database error');
  }
};

const updateRoomAssignmentOrder = async (requestId, hotelId, rooms, userId) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      const query = `
        UPDATE rooms
        SET assignment_priority = $1, updated_by = $2
        WHERE id = $3 AND hotel_id = $4;
      `;
      const values = [i + 1, userId, room.id, hotelId];
      await client.query(query, values);
    }

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`[${requestId}] Error updating room assignment order:`, err);
    throw new Error('Database error');
  } finally {
    client.release();
  }
};

const updateRoomType = async (requestId, id, name, description, updated_by, hotelId, client = null) => {
  const pool = getPool(requestId);
  const dbClient = client || await pool.connect();
  const query = 'UPDATE room_types SET name = $1, description = $2, updated_by = $3 WHERE id = $4 AND hotel_id = $5 RETURNING *';
  const values = [name, description, updated_by, id, hotelId];

  try {
    const result = await dbClient.query(query, values);
    return result.rows[0];
  } catch (err) {
    logger.error(`[${requestId}] Error updating room type:`, err);
    throw new Error('Database error');
  } finally {
    if (!client) {
      dbClient.release();
    }
  }
};


module.exports = {
  createRoomType,
  createRoom,
  updateRoom,
  updateRoomAssignmentOrder,
  updateRoomType
};