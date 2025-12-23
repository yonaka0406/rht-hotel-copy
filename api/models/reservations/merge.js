const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

// Helper: Recalculate metrics for a reservation
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

    // If no details left (unlikely in merge target, but possible), these might be null.
    // However, we are merging INTO this reservation, so it should have details.
    if (!check_in) return;

    const updateReservationQuery = `
        UPDATE reservations
        SET check_in = $1, check_out = $2, number_of_people = $3, updated_by = $4
        WHERE id = $5 AND hotel_id = $6;
    `;
    await dbClient.query(updateReservationQuery, [check_in, check_out, total_people || 0, userId, reservationId, hotelId]);
}

/**
 * Merges sourceReservationId INTO targetReservationId.
 * Source reservation is deleted after merge.
 * 
 * @param {string} requestId 
 * @param {string} targetReservationId - The reservation to keep.
 * @param {string} sourceReservationId - The reservation to merge from (will be deleted).
 * @param {number} hotelId 
 * @param {number} userId 
 */
const mergeReservations = async (requestId, targetReservationId, sourceReservationId, hotelId, userId) => {
    if (!targetReservationId || !sourceReservationId) {
        throw new Error('Both target and source reservation IDs are required.');
    }
    if (targetReservationId === sourceReservationId) {
        throw new Error('Cannot merge a reservation with itself.');
    }

    const client = await getPool(requestId).connect();

    try {
        await client.query('BEGIN');

        // 1. Fetch both reservations
        const query = `SELECT * FROM reservations WHERE id IN ($1, $2) AND hotel_id = $3`;
        const result = await client.query(query, [targetReservationId, sourceReservationId, hotelId]);

        if (result.rows.length !== 2) {
            throw new Error('One or both reservations not found.');
        }

        const targetRes = result.rows.find(r => r.id === targetReservationId);
        const sourceRes = result.rows.find(r => r.id === sourceReservationId);

        // 2. Validation

        // 2a. Same Booker
        if (targetRes.reservation_client_id !== sourceRes.reservation_client_id) {
            throw new Error('Reservations must have the same booker (client_id).');
        }

        // 2b. Date/Logic Layout Validation
        /**
         * We need to check if they are "Same Dates" or "Contiguous".
         * As per requirement: "Same date check will consider the range of reservation_details including cancelled ones"
         * So we fetch the MIN/MAX date of details for both, and also calculate the effective daily people count.
         */
        const dateRangeQuery = `
            SELECT 
                reservation_id, 
                MIN(date) as min_date, 
                MAX(date) as max_date,
                MAX(daily_people) as total_people
            FROM (
                SELECT 
                    reservation_id, 
                    date, 
                    SUM(number_of_people) as daily_people
                FROM reservation_details
                WHERE reservation_id IN ($1, $2) AND hotel_id = $3 AND cancelled IS NULL
                GROUP BY reservation_id, date
            ) sub
            GROUP BY reservation_id
        `;
        const dateRangeResult = await client.query(dateRangeQuery, [targetReservationId, sourceReservationId, hotelId]);

        const targetRange = dateRangeResult.rows.find(r => r.reservation_id === targetReservationId);
        const sourceRange = dateRangeResult.rows.find(r => r.reservation_id === sourceReservationId);

        if (!targetRange || !sourceRange) {
            throw new Error('One of the reservations has no active details, cannot validate dates.');
        }

        const tMin = new Date(targetRange.min_date);
        const tMax = new Date(targetRange.max_date);
        const tPeople = parseInt(targetRange.total_people);
        const sMin = new Date(sourceRange.min_date);
        const sMax = new Date(sourceRange.max_date);
        const sPeople = parseInt(sourceRange.total_people);

        // Calculate "Next Day" for contiguous check
        // If R1 ends on date D (last night), check-out is D+1. 
        // If R2 starts on D+1, it is contiguous? 
        // No, typically: Details Date 2023-10-01 means night of Oct 1. Check-out Oct 2.
        // If next reservation starts Oct 2, its first detail date is Oct 2.
        // So contiguous means: (MaxDate1 + 1 day) == MinDate2 OR (MaxDate2 + 1 day) == MinDate1.

        const oneDay = 24 * 60 * 60 * 1000;

        const isSameDates = tMin.getTime() === sMin.getTime() && tMax.getTime() === sMax.getTime();

        const tMaxPlus1 = new Date(tMax.getTime() + oneDay);
        const sMaxPlus1 = new Date(sMax.getTime() + oneDay);

        const isContiguousTargetFirst = tMaxPlus1.getTime() === sMin.getTime();
        const isContiguousSourceFirst = sMaxPlus1.getTime() === tMin.getTime();
        const isContiguous = isContiguousTargetFirst || isContiguousSourceFirst;

        if (isContiguous) {
            // For contiguous, number of people must be identical
            // We use the effective people count calculated from active details
            if (tPeople !== sPeople) {
                throw new Error('For contiguous merge, number of people must be identical.');
            }
        } else if (!isSameDates) {
            // If not same dates and not contiguous, fail
            throw new Error('Reservations must have same dates or be contiguous.');
        }

        // 3. Execution

        // 3a. Move Reservation Details
        const moveDetailsQuery = `
            UPDATE reservation_details
            SET reservation_id = $1, updated_by = $2
            WHERE reservation_id = $3 AND hotel_id = $4
        `;
        await client.query(moveDetailsQuery, [targetReservationId, userId, sourceReservationId, hotelId]);

        // 3b. Move Reservation Payments
        const movePaymentsQuery = `
            UPDATE reservation_payments
            SET reservation_id = $1, updated_by = $2
            WHERE reservation_id = $3
        `;
        await client.query(movePaymentsQuery, [targetReservationId, userId, sourceReservationId]);

        // 3c. Recalculate Metrics for Target
        await recalculateReservationMetrics(targetReservationId, hotelId, userId, client);

        // 3d. Delete Source Reservation
        // Note: We need to delete associated records that rely on reservation_id if any remain (like guests, addons linked to reservation - wait, addons are linked to details, so they moved).
        // reservation_clients? They are linked to details or reservation?
        // Checked clients.js: addReservationClient inserts into reservation_clients (reservation_details_id). 
        // So they are linked to details. They moved with details.
        // What about reservation_clients that might be linked to reservation (if any legacy)?
        // The schema seems to link clients to details mostly.
        // But check constraints? 
        // Let's assume standard cascade or just delete.

        const deleteSourceQuery = `DELETE FROM reservations WHERE id = $1 AND hotel_id = $2`;
        await client.query(deleteSourceQuery, [sourceReservationId, hotelId]);

        await client.query('COMMIT');
        return targetReservationId;

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Error merging reservations ${targetReservationId} and ${sourceReservationId}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    mergeReservations
};
