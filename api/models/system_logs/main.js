const pool = require('../../../config/database');

const getReservationLogsByDate = async (requestId, date) => {
  const client = await pool.get(requestId).connect();
  try {
    const query = {
      text: 'SELECT * FROM logs_reservation WHERE DATE(log_time) = $1 ORDER BY log_time DESC',
      values: [date],
    };
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
};

module.exports = {
  getReservationLogsByDate,
};
