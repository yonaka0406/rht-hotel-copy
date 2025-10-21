const database = require('../../config/database');

const getReservationLogsByDate = async (requestId, date) => { // Removed limit
  const pool = database.getPool(requestId);
  const client = await pool.connect();
  try {
    // Removed limit validation

    // Construct dates in UTC to avoid timezone issues with toISOString()
    const [year, month, day] = date.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day)); // month is 0-indexed
    const nextDate = new Date(Date.UTC(year, month - 1, day + 1));

    // Query for logs (removed limit)
    const logsQuery = {
      text: 'SELECT * FROM logs_reservation WHERE log_time >= $1 AND log_time < $2 ORDER BY log_time DESC',
      values: [startDate.toISOString(), nextDate.toISOString()], // Removed limit from values
    };
    const logsResult = await client.query(logsQuery);

    // Query for total count (no change here, as it doesn't use limit/offset)
    const countQuery = {
      text: 'SELECT COUNT(*) FROM logs_reservation WHERE log_time >= $1 AND log_time < $2',
      values: [startDate.toISOString(), nextDate.toISOString()],
    };
    const countResult = await client.query(countQuery);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    return { logs: logsResult.rows, totalRecords };
  } finally {
    client.release();
  }
};

module.exports = {
  getReservationLogsByDate,
};
