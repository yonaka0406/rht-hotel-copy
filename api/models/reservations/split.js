const { getPool } = require('../../config/database');

// Helper functions
async function createNewReservation(originalReservation, userId, dbClient) {
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
        originalReservation.id,
        originalReservation.hotel_id,
        userId
    ];
    const newReservationResult = await dbClient.query(newReservationQuery, newReservationValues);
    return newReservationResult.rows[0].id;
}

async function moveReservationDetails(targetReservationId, userId, detailIds, hotelId, originalReservationId, dbClient) {
    const updateDetailsQuery = `
        UPDATE reservation_details
        SET reservation_id = $1, updated_by = $2
        WHERE id = ANY($3::uuid[]) AND hotel_id = $4 AND reservation_id = $5;
    `;
    const updateDetailsResult = await dbClient.query(updateDetailsQuery, [targetReservationId, userId, detailIds, hotelId, originalReservationId]);
    if (updateDetailsResult.rowCount !== detailIds.length) {
        throw new Error(`Failed to move all reservation details. Expected ${detailIds.length} updates, but got ${updateDetailsResult.rowCount}.`);
    }
}

async function recalculateReservationMetrics(reservationId, hotelId, userId, dbClient) {
    const metricsQuery = `
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
    const metricsResult = await dbClient.query(metricsQuery, [reservationId, hotelId]);
    const { check_in, check_out, total_people } = metricsResult.rows[0];

    const updateReservationQuery = `
        UPDATE reservations
        SET check_in = $1, check_out = $2, number_of_people = $3, updated_by = $4
        WHERE id = $5 AND hotel_id = $6;
    `;
    await dbClient.query(updateReservationQuery, [check_in, check_out, total_people, userId, reservationId, hotelId]);
}

async function moveAssociatedPayments(targetReservationId, userId, originalReservationId, hotelId, movedDetails, dbClient) {
    const movedRoomIds = [...new Set(movedDetails.map(row => row.room_id))];

    for (const roomId of movedRoomIds) {
        const originalDetailsQuery = `SELECT id FROM reservation_details WHERE reservation_id = $1 AND room_id = $2 AND hotel_id = $3`;
        const originalDetailsResult = await dbClient.query(originalDetailsQuery, [originalReservationId, roomId, hotelId]);
        const originalDetailIds = originalDetailsResult.rows.map(row => row.id);

        const movedDetailsForRoomQuery = `SELECT id FROM reservation_details WHERE reservation_id = $1 AND room_id = $2 AND hotel_id = $3`;
        const movedDetailsForRoomResult = await dbClient.query(movedDetailsForRoomQuery, [targetReservationId, roomId, hotelId]);
        const movedDetailIdsForRoom = movedDetailsForRoomResult.rows.map(row => row.id);

        if (movedDetailIdsForRoom.length > 0 && originalDetailIds.length === 0) {
            const updatePaymentsQuery = `
                    UPDATE reservation_payments
                    SET reservation_id = $1, updated_by = $2
                    WHERE reservation_id = $3 AND room_id = $4;
                `;
            await dbClient.query(updatePaymentsQuery, [targetReservationId, userId, originalReservationId, roomId]);
        } else {
            const movedDateRangeQuery = `
                    SELECT MIN(date) AS min_date, MAX(date) AS max_date
                    FROM reservation_details
                    WHERE reservation_id = $1 AND room_id = $2 AND hotel_id = $3;
                `;
            const movedDateRangeResult = await dbClient.query(movedDateRangeQuery, [targetReservationId, roomId, hotelId]);
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
                await dbClient.query(updatePaymentsQuery, [targetReservationId, userId, originalReservationId, roomId, min_date, max_date]);
            }
        }
    }
}

/**
 * Splits a reservation by moving specified reservation details to a new reservation.
 * All operations are performed within a single transaction.
 *
 * @param {string} requestId - The request ID for database pool selection.
 * @param {string} originalReservationId - The ID of the original reservation.
 * @param {number} hotelId - The ID of the hotel.
 * @param {string[]} reservationDetailIdsToMove - An array of reservation detail IDs to move to the new reservation.
 * @param {number} userId - The ID of the user performing the action.
 * @param {boolean} isFullPeriodSplit - Indicator if the period split is full.
 * @param {boolean} isFullRoomSplit - Indicator if the room split is full.
 * @returns {Promise<string>} The ID of the newly created reservation.
 */
const splitReservation = async (requestId, originalReservationId, hotelId, reservationDetailIdsToMove, userId, isFullPeriodSplit, isFullRoomSplit) => {
    if (!Array.isArray(reservationDetailIdsToMove) || reservationDetailIdsToMove.length === 0) {
        throw new Error('reservationDetailIdsToMove must be a non-empty array.');
    }
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

        // Fetch all details for the original reservation
        const allOriginalDetailsQuery = `
            SELECT *
            FROM reservation_details
            WHERE reservation_id = $1 AND hotel_id = $2;
        `;
        const allOriginalDetailsResult = await client.query(allOriginalDetailsQuery, [originalReservationId, hotelId]);
        const allOriginalDetails = allOriginalDetailsResult.rows;

        // Separate details into those to move and those to keep in original
        const detailsToMove = allOriginalDetails.filter(detail => reservationDetailIdsToMove.includes(detail.id));
        const detailsToKeepInOriginal = allOriginalDetails.filter(detail => !reservationDetailIdsToMove.includes(detail.id));

        let newReservationIds = [];

        // Logic based on split indicators
        if (isFullPeriodSplit && isFullRoomSplit) {
            // If both period and rooms are full, it means the entire reservation is selected.
            // This is not a split operation, so no action is performed, and no new reservation is created.
            await client.query('COMMIT');
            return []; // Return an empty array as no new reservation was created.
        } else if ((isFullPeriodSplit && !isFullRoomSplit) || (!isFullPeriodSplit && isFullRoomSplit)) {
            // Case 2: Full Period, Partial Rooms OR Partial Period, Full Rooms
            // Create new reservation for detailsToMove
            const newReservationId = await createNewReservation(originalReservation, userId, client);
            newReservationIds.push(newReservationId);

            // Move detailsToMove to the new reservation
            await moveReservationDetails(newReservationId, userId, detailsToMove.map(d => d.id), hotelId, originalReservationId, client);

            // Recalculate metrics for the new reservation
            await recalculateReservationMetrics(newReservationId, hotelId, userId, client);

            // Recalculate metrics for the original reservation (detailsToKeepInOriginal)
            await recalculateReservationMetrics(originalReservationId, hotelId, userId, client);

            // Move associated payments
            await moveAssociatedPayments(newReservationId, userId, originalReservationId, hotelId, detailsToMove, client);

        } else { // !isFullPeriodSplit && !isFullRoomSplit
            console.log('--- Debugging Partial Period, Partial Rooms Split ---');
            console.log('Original Reservation ID:', originalReservationId);
            console.log('Details to Move (NewRes1):', detailsToMove.map(d => ({ id: d.id, room_id: d.room_id, date: d.date })));
            console.log('Details to Keep in Original:', detailsToKeepInOriginal.map(d => ({ id: d.id, room_id: d.room_id, date: d.date })));

            // This is the most complex scenario, requiring two new reservations and adjustment of the original.

            // Create NewRes1 with detailsToMove
            const newReservationId1 = await createNewReservation(originalReservation, userId, client);
            newReservationIds.push(newReservationId1);
            await moveReservationDetails(newReservationId1, userId, detailsToMove.map(d => d.id), hotelId, originalReservationId, client);
            await recalculateReservationMetrics(newReservationId1, hotelId, userId, client);
            await moveAssociatedPayments(newReservationId1, userId, originalReservationId, hotelId, detailsToMove, client);

            // Identify details for a potential second new reservation (same rooms as detailsToMove, but for remaining period)

            const initialSplitRoomIds = new Set(detailsToMove.map(d => d.room_id));
            const allRelevantRoomIds = new Set(initialSplitRoomIds); // Start with rooms directly in the split

            // Iterate through all original details to find continuations
            const sortedAllOriginalDetails = [...allOriginalDetails].sort((a, b) => new Date(a.date) - new Date(b.date));

            // Use a queue to process room IDs that need their continuations checked
            const queue = [...initialSplitRoomIds];
            let head = 0;

            while(head < queue.length) {
                const currentRoomId = queue[head++];

                for (let i = 0; i < sortedAllOriginalDetails.length; i++) {
                    const currentDetail = sortedAllOriginalDetails[i];

                    if (currentDetail.room_id === currentRoomId) {
                        // Check for a successor detail that forms a continuation
                        if (i + 1 < sortedAllOriginalDetails.length) {
                            const nextDetail = sortedAllOriginalDetails[i + 1];
                            const currentDate = new Date(currentDetail.date);
                            const nextDate = new Date(nextDetail.date);
                            const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day

                            if (currentDetail.reservation_id === nextDetail.reservation_id &&
                                (nextDate.getTime() - currentDate.getTime() === oneDay) &&
                                currentDetail.room_id !== nextDetail.room_id) {
                                // Found a room change that is a continuation
                                if (!allRelevantRoomIds.has(nextDetail.room_id)) {
                                    allRelevantRoomIds.add(nextDetail.room_id);
                                    queue.push(nextDetail.room_id); // Add new room_id to the queue to explore its continuations
                                }
                            }
                        }
                    }
                }
            }

            console.log('All Relevant Room IDs (including continuations):', [...allRelevantRoomIds]);

            const detailsForSecondNewReservation = allOriginalDetails.filter(detail =>
                allRelevantRoomIds.has(detail.room_id) &&
                !reservationDetailIdsToMove.includes(detail.id)
            );
            console.log('Details for Second New Reservation (new logic):', detailsForSecondNewReservation.map(d => ({ id: d.id, room_id: d.room_id, date: d.date })));

            if (detailsForSecondNewReservation.length > 0) {
                const newReservationId2 = await createNewReservation(originalReservation, userId, client);
                newReservationIds.push(newReservationId2);
                await moveReservationDetails(newReservationId2, userId, detailsForSecondNewReservation.map(d => d.id), hotelId, originalReservationId, client);
                await recalculateReservationMetrics(newReservationId2, hotelId, userId, client);
                await moveAssociatedPayments(newReservationId2, userId, originalReservationId, hotelId, detailsForSecondNewReservation, client);
            }

            // Recalculate metrics for the original reservation (detailsToKeepInOriginal)
            await recalculateReservationMetrics(originalReservationId, hotelId, userId, client);
        }

        await client.query('COMMIT');
        return newReservationIds; // Return array of new IDs
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
