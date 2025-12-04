let getPool = require('../../config/database').getPool;

const selectRatesByDetailsId = async (requestId, reservationDetailsId, hotelId, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  try {
    const query = `
      SELECT * FROM reservation_rates 
      WHERE reservation_details_id = $1 AND hotel_id = $2
    `;
    const values = [reservationDetailsId, hotelId];
    const result = await client.query(query, values);
    return result.rows;
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

module.exports = {
  selectRatesByDetailsId,
};
