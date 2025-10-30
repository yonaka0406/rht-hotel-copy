const { getPool } = require('../../config/database');

/**
 * Splits a reservation by moving specified reservation details to a new reservation.
 * All operations are performed within a single transaction.
 *
 * @param {string} requestId - The request ID for database pool selection.
 * @param {string} originalReservationId - The ID of the original reservation.
 * @param {number} hotelId - The ID of the hotel.
 * @param {string[]} reservationDetailIdsToMove - An array of reservation detail IDs to move to the new reservation.
 * @param {number} userId - The ID of the user performing the action.
 * @returns {Promise<string>} The ID of the newly created reservation.
 */
const splitReservation = async (requestId, originalReservationId, hotelId, reservationDetailIdsToMove, userId) => {
    const client = await getPool(requestId).connect();
    try {
        await client.query('BEGIN');

        // 1. Fetch the original reservation
        const originalReservationQuery = `
            SELECT *
            FROM reservations
            WHERE id = $1 AND hotel_id = $2;
        `;
        const originalReservationResult = await client.query(originalReservationQuery, [originalReservationId, hotelId]);
        if (originalReservationResult.rows.length === 0) {
            throw new Error('Original reservation not found.');
        }
        const originalReservation = originalReservationResult.rows[0];

        // 2. Create a new reservation by copying the original and overriding specific fields
        const newReservationQuery = `
            INSERT INTO reservations (
                hotel_id, reservation_client_id, check_in, check_in_time, check_out, check_out_time,
                number_of_people, status, type, agent, ota_reservation_id, payment_timing,
                comment, has_important_comment, created_by, created_at, updated_by
            )
            SELECT
                hotel_id, reservation_client_id, check_in, check_in_time, check_out, check_out_time,
                0, -- Initial number_of_people for new reservation
                status, type, agent, ota_reservation_id, payment_timing,
                comment, has_important_comment, created_by, created_at, $3
            FROM reservations
            WHERE id = $1 AND hotel_id = $2
            RETURNING id;
        `;
        const newReservationValues = [
            originalReservationId,
            hotelId,
            userId
        ];
        const newReservationResult = await client.query(newReservationQuery, newReservationValues);
        const newReservationId = newReservationResult.rows[0].id;

        // 3. Update reservation_details to link them to the new reservation
        const updateDetailsQuery = `
            UPDATE reservation_details
            SET reservation_id = $1, updated_by = $2
            WHERE id = ANY($3::uuid[]) AND hotel_id = $4 AND reservation_id = $5;
        `;
        await client.query(updateDetailsQuery, [newReservationId, userId, reservationDetailIdsToMove, hotelId, originalReservationId]);

        // 4. Recalculate and update check_in, check_out, and number_of_people for the NEW reservation
        const newReservationMetricsQuery = `
            SELECT
                MIN(date) AS check_in,
                MAX(date) + INTERVAL '1 day' AS check_out,
                MAX(daily_people) AS total_people
            FROM (
                SELECT
                    date,
                    SUM(number_of_people) AS daily_people
                FROM reservation_details
                WHERE reservation_id = $1 AND hotel_id = $2 AND cancelled IS NULL
                GROUP BY date
            ) AS daily_counts;
        `;
        const newMetricsResult = await client.query(newReservationMetricsQuery, [newReservationId, hotelId]);
        const { check_in: newCheckIn, check_out: newCheckOut, total_people: newTotalPeople } = newMetricsResult.rows[0];

        const updateNewReservationQuery = `
            UPDATE reservations
            SET check_in = $1, check_out = $2, number_of_people = $3, updated_by = $4
            WHERE id = $5 AND hotel_id = $6;
        `;
        await client.query(updateNewReservationQuery, [newCheckIn, newCheckOut, newTotalPeople, userId, newReservationId, hotelId]);


        // 5. Recalculate and update check_in, check_out, and number_of_people for the ORIGINAL reservation
        const originalReservationMetricsQuery = `
            SELECT
                MIN(date) AS check_in,
                MAX(date) + INTERVAL '1 day' AS check_out,
                MAX(daily_people) AS total_people
            FROM (
                SELECT
                    date,
                    SUM(number_of_people) AS daily_people
                FROM reservation_details
                WHERE reservation_id = $1 AND hotel_id = $2 AND cancelled IS NULL
                GROUP BY date
            ) AS daily_counts;
        `;
        const originalMetricsResult = await client.query(originalReservationMetricsQuery, [originalReservationId, hotelId]);
        const { check_in: originalCheckIn, check_out: originalCheckOut, total_people: originalTotalPeople } = originalMetricsResult.rows[0];

        const updateOriginalReservationQuery = `
            UPDATE reservations
            SET check_in = $1, check_out = $2, number_of_people = $3, updated_by = $4
            WHERE id = $5 AND hotel_id = $6;
        `;
        await client.query(updateOriginalReservationQuery, [originalCheckIn, originalCheckOut, originalTotalPeople, userId, originalReservationId, hotelId]);

        // 6. Move associated payments
        const getMovedRoomIdsQuery = `
            SELECT DISTINCT room_id FROM reservation_details WHERE id = ANY($1::uuid[])
        `;
        const movedRoomIdsResult = await client.query(getMovedRoomIdsQuery, [reservationDetailIdsToMove]);
        const movedRoomIds = movedRoomIdsResult.rows.map(row => row.room_id);

        for (const roomId of movedRoomIds) {
            // Check if all details for this room are being moved
            const originalDetailsQuery = `SELECT id FROM reservation_details WHERE reservation_id = $1 AND room_id = $2`;
            const originalDetailsResult = await client.query(originalDetailsQuery, [originalReservationId, roomId]);
            const originalDetailIds = originalDetailsResult.rows.map(row => row.id);

            const movedDetailsForRoomQuery = `SELECT id FROM reservation_details WHERE reservation_id = $1 AND room_id = $2`;
            const movedDetailsForRoomResult = await client.query(movedDetailsForRoomQuery, [newReservationId, roomId]);
            const movedDetailIdsForRoom = movedDetailsForRoomResult.rows.map(row => row.id);

            if (movedDetailIdsForRoom.length > 0 && originalDetailIds.length === 0) {
                // Full move for this room: move all payments for this room
                const updatePaymentsQuery = `
                    UPDATE reservation_payments
                    SET reservation_id = $1, updated_by = $2
                    WHERE reservation_id = $3 AND room_id = $4;
                `;
                await client.query(updatePaymentsQuery, [newReservationId, userId, originalReservationId, roomId]);
            } else {
                // Partial move for this room: move payments within the date range of moved details
                const movedDateRangeQuery = `
                    SELECT MIN(date) AS min_date, MAX(date) AS max_date
                    FROM reservation_details
                    WHERE reservation_id = $1 AND room_id = $2;
                `;
                const movedDateRangeResult = await client.query(movedDateRangeQuery, [newReservationId, roomId]);
                const { min_date, max_date } = movedDateRangeResult.rows[0];

                if (min_date && max_date) {
                    const updatePaymentsQuery = `
                        UPDATE reservation_payments
                        SET reservation_id = $1, updated_by = $2
                        WHERE reservation_id = $3
                          AND room_id = $4
                          AND date >= $5
                          AND date <= $6;
                    `;
                    await client.query(updatePaymentsQuery, [newReservationId, userId, originalReservationId, roomId, min_date, max_date]);
                }
            }
        }

        await client.query('COMMIT');
        return newReservationId;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    splitReservation,
};
