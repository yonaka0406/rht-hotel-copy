const pool = require('../../config/database');

const getReservationLogsByDate = async (requestId, date, limit = 100, offset = 0) => {
  const client = await pool.get(requestId).connect();
  try {
    // Validate and normalize limit and offset
    limit = Math.max(0, Math.min(parseInt(limit, 10) || 100, 1000)); // Cap limit at 1000
    offset = Math.max(0, parseInt(offset, 10) || 0);

    const startDate = new Date(date);
    const nextDate = new Date(startDate);
    nextDate.setDate(startDate.getDate() + 1);

    const query = {
      text: 'SELECT * FROM logs_reservation WHERE log_time >= $1 AND log_time < $2 ORDER BY log_time DESC LIMIT $3 OFFSET $4',
      values: [startDate.toISOString(), nextDate.toISOString(), limit, offset],
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
