let getPool = require('../../config/database').getPool;
const format = require('pg-format');
const { formatDate } = require('../../utils/reportUtils');

const updateReservationRoomsPeriod = async (requestId, { reservationId, hotelId, newCheckIn, newCheckOut, roomIds, userId }) => {
    console.log(`[${requestId}] Starting updateReservationRoomsPeriod with data:`, { reservationId, hotelId, newCheckIn, newCheckOut, roomIds, userId });
    const pool = getPool(requestId);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        console.log(`[${requestId}] Transaction started.`);
        await client.query(format(`SET SESSION "my_app.user_id" = %L;`, userId));

        // 1. Get original reservation
        const reservationResult = await client.query('SELECT * FROM reservations WHERE id = $1', [reservationId]);
        const reservation = reservationResult.rows[0];
        console.log(`[${requestId}] Original reservation check_in: ${reservation.check_in}, check_out: ${reservation.check_out}`);
        console.log(`[${requestId}] Received newCheckIn: ${newCheckIn}, newCheckOut: ${newCheckOut}`);
        console.log(`[${requestId}] Original reservation:`, reservation);

        // Calculate durations
        const oldDuration = (new Date(reservation.check_out).getTime() - new Date(reservation.check_in).getTime()) / (1000 * 60 * 60 * 24);
        const newDuration = (new Date(newCheckOut).getTime() - new Date(newCheckIn).getTime()) / (1000 * 60 * 60 * 24);
        console.log(`[${requestId}] Durations - Old: ${oldDuration} days, New: ${newDuration} days.`);

        // 2. Calculate total people being moved
        const peopleQuery = `
            SELECT room_id, number_of_people
            FROM reservation_details
            WHERE reservation_id = $1 AND room_id = ANY($2::int[])
            GROUP BY room_id, number_of_people;
        `;
        const peopleResult = await client.query(peopleQuery, [reservationId, roomIds]);
        const totalPeopleMoved = peopleResult.rows.reduce((sum, row) => sum + row.number_of_people, 0);
        console.log(`[${requestId}] Total people moved: ${totalPeopleMoved}`);

        // 3. Create new reservation
        const newReservationQuery = `
            INSERT INTO reservations (hotel_id, reservation_client_id, check_in, check_out, number_of_people, status, type, agent, ota_reservation_id, payment_timing, comment, has_important_comment, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
            RETURNING id;
        `;
        const newReservationResult = await client.query(newReservationQuery, [
            hotelId, reservation.reservation_client_id, newCheckIn, newCheckOut, totalPeopleMoved,
            reservation.status, reservation.type, reservation.agent, reservation.ota_reservation_id,
            reservation.payment_timing, reservation.comment, reservation.has_important_comment, userId
        ]);
        const newReservationId = newReservationResult.rows[0].id;
        console.log(`[${requestId}] New reservation created with ID: ${newReservationId}`);

        // Logic for handling duration changes
        if (oldDuration === newDuration) {
            console.log(`[${requestId}] Duration is the same. Updating existing reservation_details dates.`);
            const newCheckInDate = new Date(newCheckIn);
            const origCheckInDate = new Date(reservation.check_in);

            const newCheckInUTC = Date.UTC(newCheckInDate.getFullYear(), newCheckInDate.getMonth(), newCheckInDate.getDate());
            const origCheckInUTC = Date.UTC(origCheckInDate.getUTCFullYear(), origCheckInDate.getUTCMonth(), origCheckInDate.getUTCDate());

            const dateShift = newCheckInUTC - origCheckInUTC;
            console.log(`[${requestId}] Date shift in ms: ${dateShift}`);
            const interval = `${dateShift / (1000 * 60 * 60 * 24)} days`;
            console.log(`[${requestId}] Date shift interval: ${interval}`);

            const updateDetailsQuery = `
                UPDATE reservation_details
                SET reservation_id = $1,
                    date = date + $2::interval,
                    updated_by = $3
                WHERE reservation_id = $4 AND room_id = ANY($5::int[])
            `;
            const updateResult = await client.query(updateDetailsQuery, [newReservationId, interval, userId, reservationId, roomIds]);
            console.log(`[${requestId}] Updated ${updateResult.rowCount} reservation_details.`);

        } else {
            console.log(`[${requestId}] Duration has changed. Recreating reservation_details records.`);
            // 4. Process each room
            for (const roomId of roomIds) {
                console.log(`[${requestId}] Processing room: ${roomId}`);
                // Get all original details for the room to copy plans, clients, addons
                const originalDetailsQuery = `
                    SELECT id, date, plans_global_id, plans_hotel_id, plan_name, plan_type, number_of_people, price, billable
                    FROM reservation_details
                    WHERE reservation_id = $1 AND room_id = $2
                    ORDER BY date ASC
                `;
                const originalDetailsResult = await client.query(originalDetailsQuery, [reservationId, roomId]);
                const originalDetails = originalDetailsResult.rows;
                console.log(`[${requestId}] Original details for room ${roomId}:`, originalDetails.length);

                // Fetch clients and addons from the first original detail (assuming they are consistent across days for a room)
                let clientsToCopy = [];
                let addonsToCopy = [];
                if (originalDetails.length > 0) {
                    const sourceDetailId = originalDetails[0].id;
                    const clientsResult = await client.query('SELECT client_id FROM reservation_clients WHERE reservation_details_id = $1', [sourceDetailId]);
                    clientsToCopy = clientsResult.rows;
                    console.log(`[${requestId}] Clients to copy for room ${roomId}:`, clientsToCopy.length);
                    const addonsResult = await client.query('SELECT addons_global_id, addons_hotel_id, addon_name, addon_type, quantity, price, tax_type_id, tax_rate FROM reservation_addons WHERE reservation_detail_id = $1', [sourceDetailId]);
                    addonsToCopy = addonsResult.rows;
                    console.log(`[${requestId}] Addons to copy for room ${roomId}:`, addonsToCopy.length);
                }

                // Delete old details for this room from the original reservation
                const deleteOldDetailsResult = await client.query('DELETE FROM reservation_details WHERE reservation_id = $1 AND room_id = $2', [reservationId, roomId]);
                console.log(`[${requestId}] Deleted ${deleteOldDetailsResult.rowCount} old details for room ${roomId}.`);

                // Generate new dates and insert new details
                const newDates = [];
                let currentDate = new Date(newCheckIn);
                while (currentDate < new Date(newCheckOut)) {
                    newDates.push(formatDate(currentDate));
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                console.log(`[${requestId}] New dates for room ${roomId}:`, newDates);

                for (const date of newDates) {
                    const template = originalDetails[0] || { // Use first original detail as template
                        plans_global_id: null, plans_hotel_id: null, plan_name: null, plan_type: 'per_room',
                        number_of_people: 0, price: 0, billable: true
                    };

                    const insertDetailQuery = `
                                            INSERT INTO reservation_details (hotel_id, reservation_id, date, room_id, plans_global_id, plans_hotel_id, plan_name, plan_type, number_of_people, price, billable, created_by, updated_by)
                                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id;
                                        `;
                                        const newDetailResult = await client.query(insertDetailQuery, [
                                            hotelId, newReservationId, date, roomId,
                                            template.plans_global_id, template.plans_hotel_id, template.plan_name, template.plan_type,
                                            template.number_of_people, template.price, template.billable, userId, userId
                                        ]);                    const newDetailId = newDetailResult.rows[0].id;
                    console.log(`[${requestId}] Inserted new detail ${newDetailId} for room ${roomId} on ${date}.`);

                    // Copy clients and addons to the new detail
                    if (clientsToCopy.length > 0) {
                        for (const clientRow of clientsToCopy) {
                            await client.query('INSERT INTO reservation_clients (hotel_id, reservation_details_id, client_id, created_by, updated_by) VALUES ($1, $2, $3, $4, $4)', [hotelId, newDetailId, clientRow.client_id, userId]);
                            console.log(`[${requestId}] Copied client ${clientRow.client_id} to new detail ${newDetailId}.`);
                        }
                    }
                    if (addonsToCopy.length > 0) {
                        for (const addonRow of addonsToCopy) {
                                                    await client.query('INSERT INTO reservation_addons (hotel_id, reservation_detail_id, addons_global_id, addons_hotel_id, addon_name, addon_type, quantity, price, tax_type_id, tax_rate, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
                                                    [hotelId, newDetailId, addonRow.addons_global_id, addonRow.addons_hotel_id, addonRow.addon_name, addonRow.addon_type, addonRow.quantity, addonRow.price, addonRow.tax_type_id, addonRow.tax_rate, userId, userId]);                            console.log(`[${requestId}] Copied addon ${addonRow.addon_name} to new detail ${newDetailId}.`);
                        }
                    }
                }
            }
        }

        // 5. Update people count on original reservation
        const updateOrigQuery = 'UPDATE reservations SET number_of_people = number_of_people - $1, updated_by = $2 WHERE id = $3';
        await client.query(updateOrigQuery, [totalPeopleMoved, userId, reservationId]);
        console.log(`[${requestId}] Updated people count on original reservation ${reservationId}.`);

        // Check if original reservation is now empty
        const remainingDetails = await client.query('SELECT 1 FROM reservation_details WHERE reservation_id = $1 LIMIT 1', [reservationId]);
        if (remainingDetails.rows.length === 0) {
            await client.query('DELETE FROM reservations WHERE id = $1', [reservationId]);
            console.log(`[${requestId}] Deleted empty original reservation ${reservationId}.`);
        }

        await client.query('COMMIT');
        console.log(`[${requestId}] Transaction committed.`);
        return { success: true, newReservationId };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[${requestId}] Error in updateReservationRoomsPeriod, transaction rolled back:`, error);
        throw error;
    } finally {
        client.release();
        console.log(`[${requestId}] Database client released.`);
    }
};


module.exports = {
    updateReservationRoomsPeriod,
};
