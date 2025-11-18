let getPool = require('../../config/database').getPool;
const format = require('pg-format');
const { formatDate } = require('../../utils/reportUtils');

const updateReservationRoomsPeriod = async (requestId, { originalReservationId, hotelId, newCheckIn, newCheckOut, roomIds, userId, allRoomsSelected }) => {
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
    const originalReservationResult = await client.query('SELECT * FROM reservations WHERE id = $1 AND hotel_id = $2', [originalReservationId, hotelId]);
    const originalReservation = originalReservationResult.rows[0];

    if (!originalReservation) {
      throw new Error('Original reservation not found.');
    }

    // Calculate the shift direction in JavaScript
    const shiftDirection = newCheckIn >= originalReservation.check_in ? 'DESC' : 'ASC';
    //console.log(`Shift direction calculated as: ${shiftDirection}`);

    let newReservationId = originalReservationId;
    let totalPeopleMoved = 0;

    // If not all rooms are selected, or if all rooms are selected but duration changes, create a new reservation
    // The logic here is: if allRoomsSelected is true, we update the original reservation.
    // If allRoomsSelected is false, we create a new reservation for the selected rooms.
    if (!allRoomsSelected) {
        // Calculate total people being moved for the new reservation
        // Calculate total people being moved for the new reservation by summing number_of_people for selected rooms on the original check-in date
        const peopleQuery = `
            SELECT COALESCE(SUM(rd.number_of_people), 0) as total_people_moved
            FROM reservation_details rd
            WHERE rd.reservation_id = $1
              AND rd.room_id = ANY($2::int[])
              AND rd.date = $3;
        `;
        try {
            const peopleResult = await client.query(peopleQuery, [originalReservationId, roomIds, originalReservation.check_in]);
            totalPeopleMoved = peopleResult.rows[0].total_people_moved || 0;
        } catch (queryError) {
            console.error(`[${requestId}] Error executing peopleQuery:`, queryError);
            throw queryError;
        }

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

        // Adjust number_of_people in the original reservation
        const updateOriginalReservationPeopleQuery = `
            UPDATE reservations
            SET number_of_people = number_of_people - $1
            WHERE id = $2 AND hotel_id = $3
        `;
        await client.query(updateOriginalReservationPeopleQuery, [totalPeopleMoved, originalReservationId, hotelId]);
    }

    // Calculate the difference in days
    const oldDuration = (new Date(originalReservation.check_out).getTime() - new Date(originalReservation.check_in).getTime()) / (1000 * 60 * 60 * 24);
    const newDuration = (new Date(newCheckOut).getTime() - new Date(newCheckIn).getTime()) / (1000 * 60 * 60 * 24);

    // If the duration is the same, update the dates. Else, add dates and delete the old ones
    if (oldDuration === newDuration) {
        const newCheckInDate = new Date(newCheckIn);
        const origCheckInDate = new Date(originalReservation.check_in);

        const newCheckInUTC = Date.UTC(newCheckInDate.getFullYear(), newCheckInDate.getMonth(), newCheckInDate.getDate());
        const origCheckInUTC = Date.UTC(origCheckInDate.getFullYear(), origCheckInDate.getMonth(), origCheckInDate.getDate()); // Changed to local getters

        const dateShift = newCheckInUTC - origCheckInUTC;
        const interval = `${dateShift / (1000 * 60 * 60 * 24)} days`;

        const updateDetailsQuery = `
            UPDATE reservation_details
            SET reservation_id = $1,
                date = date + $2::interval,
                updated_by = $3
            WHERE reservation_id = $4 AND room_id = ANY($5::int[])
        `;
        await client.query(updateDetailsQuery, [newReservationId, interval, userId, originalReservationId, roomIds]);

    } else { // Duration has changed. Recreating reservation_details records.

        // Loop through each room to process its details
        for (const roomId of roomIds) {

            // Get all original details for the room to copy plans, clients, addons
            const originalDetailsQuery = `
                SELECT id, date, plans_global_id, plans_hotel_id, plan_name, plan_type, number_of_people, price, billable
                FROM reservation_details
                WHERE reservation_id = $1 AND room_id = $2
                ORDER BY date ASC
            `;
            let originalDetails;
            try {
                const originalDetailsResult = await client.query(originalDetailsQuery, [originalReservationId, roomId]);
                originalDetails = originalDetailsResult.rows;
            } catch (queryError) {
                console.error(`[${requestId}] Error executing originalDetailsQuery for room ${roomId}:`, queryError);
                throw queryError;
            }

            // Fetch clients and addons from the first original detail (assuming they are consistent across days for a room)
            let clientsToCopy = [];
            let addonsToCopy = [];
            let templateDetail = null; // Will be used as a template for new dates

            if (originalDetails.length > 0) {
                templateDetail = originalDetails[0]; // Use the first detail as template
                const sourceDetailId = templateDetail.id;
                const clientsResult = await client.query('SELECT client_id FROM reservation_clients WHERE reservation_details_id = $1', [sourceDetailId]);
                clientsToCopy = clientsResult.rows;
                const addonsResult = await client.query('SELECT addons_global_id, addons_hotel_id, addon_name, addon_type, quantity, price, tax_type_id, tax_rate FROM reservation_addons WHERE reservation_detail_id = $1', [sourceDetailId]);
                addonsToCopy = addonsResult.rows;
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
            }

            // Update existing details to point to new reservation (for overlapping dates)
            const overlappingDates = newDatesRange.filter(date => oldDates.has(date));
            if (overlappingDates.length > 0) {
                const updateOverlappingDetailsQuery = `
                    UPDATE reservation_details
                    SET reservation_id = $1, updated_by = $2
                    WHERE reservation_id = $3 AND room_id = $4 AND date = ANY($5::date[])
                `;
                const updateOverlappingResult = await client.query(updateOverlappingDetailsQuery, [newReservationId, userId, originalReservationId, roomId, overlappingDates]);
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

                // Copy clients and addons to the new detail
                if (clientsToCopy.length > 0) {
                    for (const clientRow of clientsToCopy) {
                        await client.query('INSERT INTO reservation_clients (hotel_id, reservation_details_id, client_id, created_by, updated_by) VALUES ($1, $2, $3, $4, $4)', [hotelId, newDetailId, clientRow.client_id, userId]);
                    }
                }
                if (addonsToCopy.length > 0) {
                    for (const addonRow of addonsToCopy) {
                        await client.query('INSERT INTO reservation_addons (hotel_id, reservation_detail_id, addons_global_id, addons_hotel_id, addon_name, addon_type, quantity, price, tax_type_id, tax_rate, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
                        [hotelId, newDetailId, addonRow.addons_global_id, addonRow.addons_hotel_id, addonRow.addon_name, addonRow.addon_type, addonRow.quantity, addonRow.price, addonRow.tax_type_id, addonRow.tax_rate, userId, userId]);
                    }
                }
            }
        }

    // Update the check_in and check_out dates of the original reservation
    // This applies when allRoomsSelected is true, as newReservationId will be originalReservationId
    // If !allRoomsSelected, newReservationId will be the ID of the new reservation, 
    // and the original reservation's dates will be recalculated based on remaining details.
    // For now, we only update the original reservation's dates if all rooms are selected.
    if (allRoomsSelected) {
        const updateReservationDatesQuery = `
            UPDATE reservations
            SET check_in = $1, check_out = $2, updated_by = $3
            WHERE id = $4 AND hotel_id = $5;
        `;
        await client.query(updateReservationDatesQuery, [newCheckIn, newCheckOut, userId, originalReservationId, hotelId]);
    }


    // Recalculate and update number_of_people for original reservation ONLY if not all rooms were selected
    if (!allRoomsSelected) {
        const originalReservationPeopleSumQuery = `
            SELECT COALESCE(SUM(number_of_people), 0) as total_people
            FROM reservation_details
            WHERE reservation_id = $1
              AND date = (SELECT MIN(date) FROM reservation_details WHERE reservation_id = $1);
        `;
        const originalPeopleResult = await client.query(originalReservationPeopleSumQuery, [originalReservationId]);
        const originalTotalPeople = originalPeopleResult.rows[0].total_people || 0;
        await client.query('UPDATE reservations SET number_of_people = $1, updated_by = $2 WHERE id = $3', [originalTotalPeople, userId, originalReservationId]);
    }

        // If a new reservation was created, recalculate and update its number_of_people
        if (newReservationId !== originalReservationId) {
            const newReservationPeopleSumQuery = `
                SELECT COALESCE(SUM(number_of_people), 0) as total_people
                FROM reservation_details
                WHERE reservation_id = $1
                  AND date = (SELECT MIN(date) FROM reservation_details WHERE reservation_id = $1);
            `;
            const newPeopleResult = await client.query(newReservationPeopleSumQuery, [newReservationId]);
            const newTotalPeople = newPeopleResult.rows[0].total_people || 0;
            await client.query('UPDATE reservations SET number_of_people = $1, updated_by = $2 WHERE id = $3', [newTotalPeople, userId, newReservationId]);
        }

        // Check if original reservation is now empty
        const remainingDetails = await client.query('SELECT 1 FROM reservation_details WHERE reservation_id = $1 LIMIT 1', [originalReservationId]);
        if (remainingDetails.rows.length === 0) {
            await client.query('DELETE FROM reservations WHERE id = $1', [originalReservationId]);
        }

        await client.query('COMMIT');
        return { success: true, newReservationId };
    }
  } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[${requestId}] Error in updateReservationRoomsPeriod, transaction rolled back:`, error);
        throw error;
    } finally {
        client.release();
    }
};

const selectRoomsForIndicator = async (requestId, hotelId, date) => {
  const pool = getPool(requestId);
  
  const query = `
    WITH ReservationDetailsAgg AS (
      SELECT
        rd_inner.reservation_id,
        rd_inner.room_id,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'date', rd_inner.date,
            'plans_global_id', rd_inner.plans_global_id,
            'plans_hotel_id', rd_inner.plans_hotel_id,
            'plan_name', COALESCE(ph.name, pg.name),
            'plan_type', rd_inner.plan_type,
            'plan_color', COALESCE(ph.color, pg.color),
            'cancelled', rd_inner.cancelled
          ) ORDER BY rd_inner.date
        ) AS details,
        COUNT(*) AS details_count
      FROM
        reservation_details rd_inner
        LEFT JOIN plans_hotel ph ON ph.hotel_id = rd_inner.hotel_id AND ph.id = rd_inner.plans_hotel_id
        LEFT JOIN plans_global pg ON pg.id = rd_inner.plans_global_id
      WHERE rd_inner.hotel_id = $1
      GROUP BY
        rd_inner.reservation_id,
        rd_inner.room_id
    )
    SELECT
      r.id AS room_id,
      r.room_number,
      r.floor,
      r.capacity,
      r.for_sale,
      r.smoking,
      r.has_wet_area,
      rt.name AS room_type_name,
      res.id AS reservation_id,
      res.check_in,
      res.check_out,
      res.check_in_time,
      res.check_out_time,
      res.status,
      res.payment_timing,
      res.has_important_comment,
      COALESCE(c.name_kanji, c.name_kana, c.name) AS client_name,
      c.id AS booker_client_id,
      c.gender AS booker_gender,
      rd.id AS reservation_detail_id,
      rd.date,
      rd.cancelled,
      rd.number_of_people,
      rd.price,
      rd.plan_name,
      rd.plan_type,
      details_agg.details,
      COALESCE(res_clients.clients_json, '[]'::json) as clients_json,
      (details_agg.details_count < (res.check_out - res.check_in)) AS has_less_dates,
      (
          rd.cancelled IS NOT NULL
          AND EXISTS (
              SELECT 1
              FROM json_array_elements(details_agg.details) AS d
              WHERE d->>'date' = (rd.date - INTERVAL '1 day')::date::text
                AND d->>'cancelled' IS NULL
          )
      ) AS early_checkout,
      (
          rd.cancelled IS NULL
          AND EXISTS (
              SELECT 1
              FROM json_array_elements(details_agg.details) AS d
              WHERE d->>'date' = (rd.date - INTERVAL '1 day')::date::text
                AND d->>'cancelled' IS NOT NULL
          )
      ) AS late_checkin
    FROM
      reservation_details rd
      JOIN reservations res ON res.id = rd.reservation_id AND res.hotel_id = rd.hotel_id
      JOIN clients c ON c.id = res.reservation_client_id
      JOIN rooms r ON r.id = rd.room_id
      JOIN room_types rt ON rt.id = r.room_type_id
      LEFT JOIN ReservationDetailsAgg details_agg ON details_agg.reservation_id = res.id AND details_agg.room_id = rd.room_id
      LEFT JOIN (
        SELECT
          rc.reservation_details_id,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'client_id', rc.client_id,
              'name', c.name,
              'name_kana', c.name_kana,
              'name_kanji', c.name_kanji,
              'email', c.email,
              'phone', c.phone,
              'gender', c.gender
            )
          ) AS clients_json
        FROM reservation_clients rc
        JOIN clients c ON rc.client_id = c.id
        GROUP BY rc.reservation_details_id
    ) AS res_clients ON res_clients.reservation_details_id = rd.id
    WHERE
      rd.hotel_id = $1 AND
      (
        rd.date = $2 OR
        (res.check_out = $2 AND rd.date = ($2::date - INTERVAL '1 day')::date AND rd.cancelled IS NULL)
      )
    ORDER BY
      floor,
      room_number;
  `;

  const values = [hotelId, date];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error fetching room indicator data:', err);
    throw new Error('Database error');
  }
};

module.exports = {
  updateReservationRoomsPeriod,
  selectRoomsForIndicator
};