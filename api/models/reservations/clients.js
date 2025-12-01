let getPool = require('../../config/database').getPool;
const logger = require('../../config/logger');

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
    logger.error('Error adding reservation client:', err);
    throw new Error('Database error');
  }
};

module.exports = {  
  addReservationClient
}