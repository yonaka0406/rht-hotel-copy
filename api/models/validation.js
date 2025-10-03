let getPool = require('../config/database').getPool;

const getDoubleBookings = async (requestId) => {
  const pool = getPool(requestId);
  const query = `
    WITH dup_groups AS (
        SELECT 
            hotel_id,
            room_id,
            date
        FROM reservation_details
        WHERE cancelled IS NULL
        GROUP BY hotel_id, room_id, date
        HAVING COUNT(*) > 1
    ),
    conflicting_reservations AS (
        SELECT
            rd.id AS reservation_detail_id,
            rd.hotel_id,
            rd.room_id,
            rd.date,
            res.id AS reservation_id,
            res.check_in,
            (res.check_out - res.check_in) AS number_of_nights,
            COALESCE(c.name_kanji, c.name_kana, c.name) AS client_name
        FROM reservation_details rd
        JOIN reservations res ON rd.reservation_id = res.id AND rd.hotel_id = res.hotel_id
        LEFT JOIN clients c ON res.reservation_client_id = c.id
        WHERE rd.cancelled IS NULL
    )
    SELECT 
        dg.hotel_id,
        h.formal_name AS hotel_name,
        r.room_number,
        dg.date,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'reservation_id', cr.reservation_id,
                'check_in', cr.check_in,
                'number_of_nights', cr.number_of_nights,
                'client_name', cr.client_name
            ) ORDER BY cr.check_in, cr.reservation_id
        ) AS conflicting_reservations
    FROM dup_groups dg
    JOIN hotels h ON dg.hotel_id = h.id
    JOIN rooms r ON dg.room_id = r.id AND dg.hotel_id = r.hotel_id
    JOIN conflicting_reservations cr
      ON dg.hotel_id = cr.hotel_id
     AND dg.room_id = cr.room_id
     AND dg.date = cr.date
    GROUP BY dg.hotel_id, h.formal_name, r.room_number, dg.date
    ORDER BY dg.date, r.room_number, h.formal_name;
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving potential double bookings:', err);
    throw new Error('Database error');
  }
};

const getEmptyReservations = async (requestId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT
        r.id AS reservation_id,
        h.formal_name AS hotel_name,
        COALESCE(c.name_kanji, c.name_kana, c.name) AS client_name,
        r.check_in,
        r.check_out,
        (r.check_out - r.check_in) AS number_of_nights,
        r.status,
        r.type
    FROM
        reservations r
    JOIN
        hotels h ON r.hotel_id = h.id
    LEFT JOIN
        clients c ON r.reservation_client_id = c.id
    WHERE
        NOT EXISTS (
            SELECT 1
            FROM reservation_details rd
            WHERE rd.reservation_id = r.id
        )
    ORDER BY
        r.check_in, h.formal_name, c.name;
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving empty reservations:', err);
    throw new Error('Database error');
  }
};

module.exports = {
  getDoubleBookings,
  getEmptyReservations,
};