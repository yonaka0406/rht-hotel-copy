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

  const pool = requestId ? database.getPool(requestId) : database.getProdPool();
  const client = await pool.connect();
  try {
    // Removed limit validation

    // Construct dates in UTC to avoid timezone issues with toISOString()
    const [year, month, day] = date.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day)); // month is 0-indexed
    const nextDate = new Date(Date.UTC(year, month - 1, day + 1));

    //console.log('Transformed Start Date:', startDate);
    //console.log('Transformed Next Date:', nextDate);

    // Query for logs (removed limit)
    const queryText = `WITH RankedLogs AS (
        SELECT
          lr.*,
          CASE
            WHEN lr.action IN ('INSERT', 'DELETE') THEN (lr.changes->>'hotel_id')::integer
            WHEN lr.action = 'UPDATE' THEN (lr.changes->'new'->>'hotel_id')::integer
            ELSE r.hotel_id
          END AS hotel_id,
          CASE
            WHEN lr.action IN ('INSERT', 'DELETE') THEN (SELECT h_log.name FROM hotels h_log WHERE h_log.id = (lr.changes->>'hotel_id')::integer)
            WHEN lr.action = 'UPDATE' THEN (SELECT h_log.name FROM hotels h_log WHERE h_log.id = (lr.changes->'new'->>'hotel_id')::integer)
            ELSE h.name
          END AS hotel_name,
          CASE -- Derive effective_reservation_client_id
            WHEN lr.action IN ('INSERT', 'DELETE') THEN (lr.changes->>'reservation_client_id')::uuid
            WHEN lr.action = 'UPDATE' THEN (lr.changes->'new'->>'reservation_client_id')::uuid
            ELSE r.reservation_client_id
          END AS effective_reservation_client_id,
          ROW_NUMBER() OVER (PARTITION BY lr.record_id, lr.action ORDER BY lr.log_time DESC) as rn
        FROM
          logs_reservation lr
        LEFT JOIN
          reservations r ON lr.record_id = r.id
        LEFT JOIN
          hotels h ON r.hotel_id = h.id
        WHERE
          lr.log_time >= $1 AND lr.log_time < $2
          AND lr.table_name LIKE 'reservations_%'
    ),
    RankedLogsWithClient AS (
        SELECT
            rl.*,
            COALESCE(c_log.name_kanji, c_log.name_kana, c_log.name) AS client_name
        FROM
            RankedLogs rl
        LEFT JOIN
            clients c_log ON rl.effective_reservation_client_id = c_log.id
    )
    SELECT
      RankedLogsWithClient.*
    FROM
      RankedLogsWithClient
    WHERE
      rn = 1
    ORDER BY
      log_time DESC`;
    const queryValues = [startDate, nextDate];

    const logsResult = await client.query({ text: queryText, values: queryValues });

    const countQuery = {
      text: `SELECT COUNT(*) FROM logs_reservation WHERE log_time >= $1 AND log_time < $2 AND table_name LIKE 'reservations_%'`,
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
