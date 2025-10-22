const database = require('../../config/database');

const formatLocalDateTime = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const seconds = dateObj.getSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const getReservationDigestByDate = async (requestId, date) => {
  console.log('Date passed to getReservationDigestByDate:', date);

  const pool = database.getPool(requestId);
  const client = await pool.connect();
  try {
    // Removed limit validation

    // Construct dates in UTC to avoid timezone issues with toISOString()
    const [year, month, day] = date.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day)); // month is 0-indexed
    const nextDate = new Date(Date.UTC(year, month - 1, day + 1));

    console.log('Transformed Start Date:', startDate);
    console.log('Transformed Next Date:', nextDate);

    // Query for logs (removed limit)
    const logsQuery = {
      text: `WITH RankedLogs AS (
        SELECT
          *,
          ROW_NUMBER() OVER (PARTITION BY record_id, action ORDER BY log_time DESC) as rn
        FROM
          logs_reservation
        WHERE
          log_time >= $1 AND log_time < $2
          AND (table_name LIKE 'reservations_%' OR table_name LIKE 'reservation_payments_%')
      )
      SELECT
        *
      FROM
        RankedLogs
      WHERE
        rn = 1
      ORDER BY
        log_time DESC`,
      values: [startDate, nextDate],
    };
    const logsResult = await client.query(logsQuery);

    // Query for total count (no change here, as it doesn't use limit/offset)
    const countQuery = {
      text: `SELECT COUNT(*) FROM logs_reservation WHERE log_time >= $1 AND log_time < $2 AND (table_name LIKE 'reservations_%' OR table_name LIKE 'reservation_payments_%')`,
      values: [startDate, nextDate],
    };
    const countResult = await client.query(countQuery);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    return { logs: logsResult.rows, totalRecords };
  } finally {
    client.release();
  }
};

module.exports = {
  getReservationDigestByDate,
};
