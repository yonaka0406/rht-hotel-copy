let getPool = require('../../config/database').getPool;
const format = require('pg-format');
const { formatDate } = require('../../utils/reportUtils');

const updateReservationRoomsPeriod = async (requestId, { reservationId, hotelId, newCheckIn, newCheckOut, roomIds, userId, allRoomsSelected }) => {
  //console.log('--- Starting updateReservationRoomsPeriod ---');
  //console.log('Received roomData:', { reservationId, hotelId, newCheckIn, newCheckOut, roomIds, userId, allRoomsSelected });
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    //console.log('Transaction started.');

    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, userId);
    await client.query(setSessionQuery);

    // 1. Get original reservation details
    const originalReservationResult = await client.query('SELECT * FROM reservations WHERE id = $1 AND hotel_id = $2', [reservationId, hotelId]);
    const originalReservation = originalReservationResult.rows[0];

    if (!originalReservation) {
      throw new Error('Original reservation not found.');
    }

    // Calculate the shift direction in JavaScript
    const shiftDirection = newCheckIn >= originalReservation.check_in ? 'DESC' : 'ASC';
    //console.log(`Shift direction calculated as: ${shiftDirection}`);

    let newReservationId = reservationId;
    let totalPeopleMoved = 0;

    // If not all rooms are selected, or if all rooms are selected but duration changes, create a new reservation
    // The logic here is: if allRoomsSelected is true, we update the original reservation.
    // If allRoomsSelected is false, we create a new reservation for the selected rooms.
    if (!allRoomsSelected) {
        // Calculate total people being moved for the new reservation
        const peopleQuery = `
            SELECT room_id, number_of_people
            FROM reservation_details
            WHERE reservation_id = $1 AND room_id = ANY($2::int[])
            GROUP BY room_id, number_of_people;
        `;
        const peopleResult = await client.query(peopleQuery, [reservationId, roomIds]);
        totalPeopleMoved = peopleResult.rows.reduce((sum, row) => sum + row.number_of_people, 0);

        const insertReservationQuery = `
            INSERT INTO reservations (hotel_id, reservation_client_id, check_in, check_out, number_of_people, status, type, agent, ota_reservation_id, payment_timing, comment, has_important_comment, created_at, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id;
        `;
        const newReservationResult = await client.query(insertReservationQuery, [
            hotelId, originalReservation.reservation_client_id, newCheckIn, newCheckOut, totalPeopleMoved,
            originalReservation.status, originalReservation.type, originalReservation.agent, originalReservation.ota_reservation_id,
            originalReservation.payment_timing, originalReservation.comment, originalReservation.has_important_comment, originalReservation.created_at, userId, userId
        ]);
        newReservationId = newReservationResult.rows[0].id;
        console.log(`[${requestId}] New reservation created with ID: ${newReservationId}`);

        // Adjust number_of_people in the original reservation
        const updateOriginalReservationPeopleQuery = `
            UPDATE reservations
            SET number_of_people = number_of_people - $1
            WHERE id = $2 AND hotel_id = $3
        `;
        await client.query(updateOriginalReservationPeopleQuery, [totalPeopleMoved, reservationId, hotelId]);
    }

    // Calculate the difference in days
    const oldDuration = (new Date(originalReservation.check_out).getTime() - new Date(originalReservation.check_in).getTime()) / (1000 * 60 * 60 * 24);
    const newDuration = (new Date(newCheckOut).getTime() - new Date(newCheckIn).getTime()) / (1000 * 60 * 60 * 24);
    console.log(`[${requestId}] Durations - Old: ${oldDuration} days, New: ${newDuration} days.`);

    // If the duration is the same, update the dates. Else, add dates and delete the old ones
    if (oldDuration === newDuration) {
        console.log('Duration is the same. Updating existing reservation_details dates.');
        const newCheckInDate = new Date(newCheckIn);
        const origCheckInDate = new Date(originalReservation.check_in);

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

    } else { // Duration has changed. Recreating reservation_details records.
        console.log(`[${requestId}] Duration has changed. Recreating reservation_details records.`);

        // Loop through each room to process its details
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
            let templateDetail = null; // Will be used as a template for new dates

            if (originalDetails.length > 0) {
                templateDetail = originalDetails[0]; // Use the first detail as template
                const sourceDetailId = templateDetail.id;
                const clientsResult = await client.query('SELECT client_id FROM reservation_clients WHERE reservation_details_id = $1', [sourceDetailId]);
                clientsToCopy = clientsResult.rows;
                console.log(`[${requestId}] Clients to copy for room ${roomId}:`, clientsToCopy.length);
                const addonsResult = await client.query('SELECT addons_global_id, addons_hotel_id, addon_name, addon_type, quantity, price, tax_type_id, tax_rate FROM reservation_addons WHERE reservation_detail_id = $1', [sourceDetailId]);
                addonsToCopy = addonsResult.rows;
                console.log(`[${requestId}] Addons to copy for room ${roomId}:`, addonsToCopy.length);
            } else {
                // If no original details, create a basic template
                templateDetail = {
                    plans_global_id: null, plans_hotel_id: null, plan_name: null, plan_type: 'per_room',
                    number_of_people: 0, price: 0, billable: true
                };
            }

            // Identify dates to delete and dates to create
            const oldDates = new Set(originalDetails.map(d => formatDate(new Date(d.date))));
            const newDatesRange = [];
            let currentDate = new Date(newCheckIn);
            while (currentDate < new Date(newCheckOut)) {
                newDatesRange.push(formatDate(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const datesToDelete = originalDetails.filter(d => !newDatesRange.includes(formatDate(new Date(d.date))));
            const datesToCreate = newDatesRange.filter(date => !oldDates.has(date));

            // Delete details that are no longer in the new range
            if (datesToDelete.length > 0) {
                const detailIdsToDelete = datesToDelete.map(d => d.id);
                const deleteOldDetailsResult = await client.query('DELETE FROM reservation_details WHERE id = ANY($1::uuid[])', [detailIdsToDelete]);
                console.log(`[${requestId}] Deleted ${deleteOldDetailsResult.rowCount} old details for room ${roomId} outside new range.`);
            }

            // Update existing details to point to new reservation (for overlapping dates)
            const overlappingDates = newDatesRange.filter(date => oldDates.has(date));
            if (overlappingDates.length > 0) {
                const updateOverlappingDetailsQuery = `
                    UPDATE reservation_details
                    SET reservation_id = $1, updated_by = $2
                    WHERE reservation_id = $3 AND room_id = $4 AND date = ANY($5::date[])
                `;
                const updateOverlappingResult = await client.query(updateOverlappingDetailsQuery, [newReservationId, userId, reservationId, roomId, overlappingDates]);
                console.log(`[${requestId}] Updated ${updateOverlappingResult.rowCount} overlapping details for room ${roomId} to new reservation.`);
            }


            // Insert new details for dates that are in the new range but not in the old
            for (const date of datesToCreate) {
                const insertDetailQuery = `
                    INSERT INTO reservation_details (hotel_id, reservation_id, date, room_id, plans_global_id, plans_hotel_id, plan_name, plan_type, number_of_people, price, billable, created_by, updated_by)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id;
                `;
                const newDetailResult = await client.query(insertDetailQuery, [
                    hotelId, newReservationId, date, roomId,
                    templateDetail.plans_global_id, templateDetail.plans_hotel_id, templateDetail.plan_name, templateDetail.plan_type,
                    templateDetail.number_of_people, templateDetail.price, templateDetail.billable, userId, userId
                ]);
                const newDetailId = newDetailResult.rows[0].id;
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
                        [hotelId, newDetailId, addonRow.addons_global_id, addonRow.addons_hotel_id, addonRow.addon_name, addonRow.addon_type, addonRow.quantity, addonRow.price, addonRow.tax_type_id, addonRow.tax_rate, userId, userId]);
                        console.log(`[${requestId}] Copied addon ${addonRow.addon_name} to new detail ${newDetailId}.`);
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
    }
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
