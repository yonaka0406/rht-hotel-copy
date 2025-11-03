const pool = require('../../config/database');

/**
 * Finds reservations that are mergeable with a given reservation.
 * Mergeable reservations are defined as:
 * 1. Belonging to the same client.
 * 2. Having the same check-in and check-out dates OR
 * 3. Having consecutive dates (one reservation ends the day before another begins).
 *
 * @param {string} requestId - The request ID for logging and database pool selection.
 * @param {number} hotelId - The ID of the hotel.
 * @param {number} reservationId - The ID of the reservation to find mergeable reservations for.
 * @returns {Array} - A list of mergeable reservations.
 */
const findMergeableReservations = async (requestId, hotelId, reservationId) => {
    const client = await pool.get(requestId).connect();
    try {
        // Get the client ID, reservation dates, and max rooms per day for the given reservation
        const currentReservationRes = await client.query(
            `SELECT
                r.reservation_client_id,
                r.check_in,
                r.check_out,
                (SELECT MAX(daily_rooms.num_rooms)
                 FROM (
                     SELECT COUNT(DISTINCT rd.room_id) AS num_rooms
                     FROM reservation_details rd
                     WHERE rd.reservation_id = r.reservation_id
                     GROUP BY rd.date
                 ) AS daily_rooms
                ) AS max_rooms_per_day
            FROM
                reservations r
            WHERE
                r.reservation_id = $1 AND r.hotel_id = $2`,
            [reservationId, hotelId]
        );

        if (currentReservationRes.rows.length === 0) {
            return []; // Current reservation not found
        }

        const currentReservation = currentReservationRes.rows[0];
        const clientId = currentReservation.reservation_client_id;
        const currentCheckIn = currentReservation.check_in;
        const currentCheckOut = currentReservation.check_out;
        const currentMaxRoomsPerDay = parseInt(currentReservation.max_rooms_per_day, 10);

        // Find other reservations for the same client in the same hotel
        // that are either overlapping or consecutive, considering max rooms per day for vertical merges
        const mergeableReservationsRes = await client.query(
            `SELECT
                r.reservation_id,
                r.check_in,
                r.check_out,
                (SELECT MAX(daily_rooms.num_rooms)
                 FROM (
                     SELECT COUNT(DISTINCT rd.room_id) AS num_rooms
                     FROM reservation_details rd
                     WHERE rd.reservation_id = r.reservation_id
                     GROUP BY rd.date
                 ) AS daily_rooms
                ) AS max_rooms_per_day,
                r.reservation_status,
                r.total_price,
                r.number_of_guests,
                r.room_id,
                r.plan_id,
                r.source_id,
                r.created_at,
                r.updated_at
            FROM
                reservations r
            WHERE
                r.hotel_id = $1
                AND r.reservation_client_id = $2
                AND r.reservation_id != $3
            HAVING
                -- Same check-in and check-out dates (horizontal merge)
                (r.check_in = $4 AND r.check_out = $5)
                OR
                -- Consecutive: current reservation ends the day before another begins (vertical merge)
                (r.check_in = ($5 + INTERVAL '1 day') AND (SELECT MAX(daily_rooms.num_rooms) FROM (SELECT COUNT(DISTINCT rd.room_id) AS num_rooms FROM reservation_details rd WHERE rd.reservation_id = r.reservation_id GROUP BY rd.date) AS daily_rooms) = $6)
                OR
                -- Consecutive: another reservation ends the day before current begins (vertical merge)
                (r.check_out = ($4 - INTERVAL '1 day') AND (SELECT MAX(daily_rooms.num_rooms) FROM (SELECT COUNT(DISTINCT rd.room_id) AS num_rooms FROM reservation_details rd WHERE rd.reservation_id = r.reservation_id GROUP BY rd.date) AS daily_rooms) = $6)
            ORDER BY
                r.check_in`,
            [hotelId, clientId, reservationId, currentCheckIn, currentCheckOut, currentMaxRoomsPerDay]
        );

        return mergeableReservationsRes.rows;

    } finally {
        client.release();
    }
};

/**
 * Merges multiple reservations into a single main reservation.
 *
 * @param {string} requestId - The request ID for logging and database pool selection.
 * @param {number} hotelId - The ID of the hotel.
 * @param {number} mainReservationId - The ID of the reservation to merge into.
 * @param {Array<number>} reservationIdsToMerge - An array of reservation IDs to be merged and then deleted.
 * @param {number} userId - The ID of the user performing the merge.
 * @returns {object} - The updated main reservation.
 */
const mergeReservations = async (requestId, hotelId, mainReservationId, reservationIdsToMerge, userId) => {
    const client = await pool.get(requestId).connect();
    try {
        await client.query('BEGIN');

        // 1. Move reservation_details
        await client.query(
            `UPDATE reservation_details
             SET reservation_id = $1, updated_by = $2, updated_at = NOW()
             WHERE reservation_id = ANY($3::int[]) AND hotel_id = $4`,
            [mainReservationId, userId, reservationIdsToMerge, hotelId]
        );

        // 2. Move reservation_addons
        await client.query(
            `UPDATE reservation_addons
             SET reservation_detail_id = rd.id, updated_by = $1, updated_at = NOW()
             FROM reservation_details rd
             WHERE reservation_addons.reservation_detail_id = rd.id
             AND rd.reservation_id = ANY($2::int[]) AND rd.hotel_id = $3`,
            [userId, reservationIdsToMerge, hotelId]
        );

        // 3. Move reservation_clients
        await client.query(
            `UPDATE reservation_clients
             SET reservation_details_id = rd.id, updated_by = $1, updated_at = NOW()
             FROM reservation_details rd
             WHERE reservation_clients.reservation_details_id = rd.id
             AND rd.reservation_id = ANY($2::int[]) AND rd.hotel_id = $3`,
            [userId, reservationIdsToMerge, hotelId]
        );

        // 4. Delete merged reservations
        await client.query(
            `DELETE FROM reservations WHERE reservation_id = ANY($1::int[]) AND hotel_id = $2`,
            [reservationIdsToMerge, hotelId]
        );

        // 5. Update main reservation's dates, total price, and number of guests
        const updateMainReservationRes = await client.query(
            `UPDATE reservations r
             SET
                 check_in = (SELECT MIN(rd.check_in_date) FROM reservation_details rd WHERE rd.reservation_id = r.reservation_id),
                 check_out = (SELECT MAX(rd.check_out_date) FROM reservation_details rd WHERE rd.reservation_id = r.reservation_id),
                 total_price = (SELECT SUM(rd.price) FROM reservation_details rd WHERE rd.reservation_id = r.reservation_id),
                 number_of_guests = (SELECT SUM(rd.number_of_people) FROM reservation_details rd WHERE rd.reservation_id = r.reservation_id),
                 updated_by = $2, updated_at = NOW()
             WHERE r.reservation_id = $1 AND r.hotel_id = $3
             RETURNING *`,
            [mainReservationId, userId, hotelId]
        );

        await client.query('COMMIT');

        return updateMainReservationRes.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    findMergeableReservations,
    mergeReservations,
};
