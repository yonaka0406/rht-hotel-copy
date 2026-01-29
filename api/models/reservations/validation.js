const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const checkReservationOverlap = async (requestId, reservationId, hotelId) => {
    const pool = getPool(requestId);
    const query = `
    WITH target_reservation AS (
        SELECT 
            id, hotel_id, date, room_id, reservation_id
        FROM 
            reservation_details
        WHERE 
            reservation_id = $1 AND hotel_id = $2
    )
    SELECT 
        TO_CHAR(t.date, 'YYYY-MM-DD') as date,
        r.room_number,
        rd.reservation_id AS conflicting_reservation_id
    FROM 
        target_reservation t
    INNER JOIN 
        reservation_details rd 
    ON 
        t.hotel_id = rd.hotel_id 
        AND t.date = rd.date 
        AND t.room_id = rd.room_id
    INNER JOIN
        rooms r
    ON
        t.room_id = r.id
    WHERE 
        rd.cancelled IS NULL
        AND rd.reservation_id != t.reservation_id
    LIMIT 1;
  `;

    try {
        const result = await pool.query(query, [reservationId, hotelId]);
        return result.rows[0]; // Returns { date, room_number, conflicting_reservation_id } or undefined
    } catch (error) {
        logger.error('Error in checkReservationOverlap:', error);
        throw error;
    }
};

const checkReservationDetailOverlap = async (requestId, detailId, hotelId) => {
    const pool = getPool(requestId);
    const query = `
    WITH target_reservation AS (
        SELECT 
            id, hotel_id, date, room_id, reservation_id
        FROM 
            reservation_details
        WHERE 
            id = $1 AND hotel_id = $2
    )
    SELECT 
        TO_CHAR(t.date, 'YYYY-MM-DD') as date,
        r.room_number,
        rd.reservation_id AS conflicting_reservation_id
    FROM 
        target_reservation t
    INNER JOIN 
        reservation_details rd 
    ON 
        t.hotel_id = rd.hotel_id 
        AND t.date = rd.date 
        AND t.room_id = rd.room_id
    INNER JOIN
        rooms r
    ON
        t.room_id = r.id
    WHERE 
        rd.cancelled IS NULL
        AND rd.reservation_id != t.reservation_id
    LIMIT 1;
  `;

    try {
        const result = await pool.query(query, [detailId, hotelId]);
        return result.rows[0];
    } catch (error) {
        logger.error('Error in checkReservationDetailOverlap:', error);
        throw error;
    }
};

const checkBookingConflict = async (requestId, { reservationId, detailId }, dbClient = null) => {
  const pool = getPool(requestId);
  const executor = dbClient || pool;

  if (!reservationId && !detailId) {
    throw new Error('Either reservationId or detailId must be provided.');
  }

  let subquery;
  let params;

  if (reservationId) {
    subquery = `
      SELECT hotel_id, date, room_id, reservation_id
      FROM reservation_details
      WHERE reservation_id = $1::uuid
    `;
    params = [reservationId];
  } else {
    subquery = `
      SELECT hotel_id, date, room_id, reservation_id
      FROM reservation_details
      WHERE id = $1::uuid
    `;
    params = [detailId];
  }

  const query = `
    WITH target_reservations AS (${subquery})
    SELECT 
        t.reservation_id AS target_reservation_id,
        t.date,
        rm.room_number,
        conflicting_rd.id AS conflicting_detail_id,
        conflicting_rd.reservation_id AS conflicting_reservation_id,
        conflicting_res.status AS conflicting_status
    FROM 
        target_reservations t
    INNER JOIN 
        reservation_details conflicting_rd 
        ON t.hotel_id = conflicting_rd.hotel_id 
        AND t.date = conflicting_rd.date 
        AND t.room_id = conflicting_rd.room_id
    INNER JOIN
        reservations conflicting_res
        ON conflicting_rd.reservation_id = conflicting_res.id
    INNER JOIN
        rooms rm
        ON t.room_id = rm.id
    WHERE 
        conflicting_rd.cancelled IS NULL
        AND conflicting_rd.reservation_id != t.reservation_id;
  `;

  try {
    const result = await executor.query(query, params);
    return result.rows;
  } catch (err) {
    logger.error(`[${requestId}] checkBookingConflict - Error checking for booking conflicts: ${err.message}`, {
      stack: err.stack,
      reservationId,
      detailId,
    });
    throw new Error('Database error during conflict check.');
  }
};

module.exports = {
    checkReservationOverlap,
    checkReservationDetailOverlap,
    checkBookingConflict
};
