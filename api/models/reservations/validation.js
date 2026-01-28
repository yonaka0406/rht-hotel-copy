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

module.exports = {
    checkReservationOverlap,
    checkReservationDetailOverlap
};
