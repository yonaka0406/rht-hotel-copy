const { getPool } = require('../config/database');

/**
 * Get all active hotels for booking engine
 * Returns all hotels that are not deleted
 */
const getAllHotelsForBookingEngine = async (requestId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      id,
      formal_name,
      name,
      facility_type,
      open_date,
      total_rooms,
      postal_code,
      address,
      email,
      phone_number,
      created_at,
      updated_at
    FROM hotels 
    WHERE deleted_at IS NULL
    ORDER BY id
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving all hotels for booking engine:', err);
    throw new Error('Database error');
  }
};

/**
 * Get a specific hotel by ID for booking engine
 * Returns hotel information in the format expected by the booking engine
 */
const getHotelForBookingEngine = async (requestId, hotelId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      id,
      formal_name,
      name,
      facility_type,
      open_date,
      total_rooms,
      postal_code,
      address,
      email,
      phone_number,
      created_at,
      updated_at
    FROM hotels 
    WHERE id = $1 AND deleted_at IS NULL
  `;
  const values = [hotelId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the first hotel found (or null if none)
  } catch (err) {
    console.error('Error finding hotel for booking engine:', err);
    throw new Error('Database error');
  }
};

/**
 * Get all room types for a specific hotel for booking engine
 * Returns room types in the format expected by the booking engine
 */
const getRoomTypesForBookingEngine = async (requestId, hotelId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      rt.id,
      rt.name,
      rt.description,
      rt.hotel_id,
      rt.created_at,
      rt.updated_at
    FROM room_types rt
    INNER JOIN hotels h ON rt.hotel_id = h.id
    WHERE rt.hotel_id = $1 
      AND h.deleted_at IS NULL 
      AND rt.deleted_at IS NULL
    ORDER BY rt.name
  `;
  const values = [hotelId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving room types for booking engine:', err);
    throw new Error('Database error');
  }
};

module.exports = {
  getAllHotelsForBookingEngine,
  getHotelForBookingEngine,
  getRoomTypesForBookingEngine
}; 