const { getPool } = require('../../config/database');
const format = require('pg-format');
const logger = require('../../config/logger');
const { insertReservationDetails } = require('../reservations/details');

const createHotel = async (requestId, hotelData, userId) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hotelQuery = `
        INSERT INTO hotels (
          formal_name, name, facility_type, 
          open_date, total_rooms, postal_code,
          address, email, phone_number,        
          created_by, updated_by
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `;

    const hotelResult = await client.query(hotelQuery, [
      hotelData.formal_name, hotelData.name, hotelData.facility_type_code,
      hotelData.open_date, hotelData.total_rooms, hotelData.postal_code,
      hotelData.address, hotelData.email, hotelData.phone_number,
      userId, userId
    ]);
    const hotelId = hotelResult.rows[0].id;

    const createPartition = async (tableName) => {
      const partitionQuery = `
          CREATE TABLE ${tableName}_${hotelId} 
          PARTITION OF ${tableName} 
          FOR VALUES IN (${hotelId})
        `;
      await client.query(partitionQuery);
    };

    const createPartitionsSequentially = async () => {
      await createPartition('room_types');
      await createPartition('rooms');
      await createPartition('reservations');
      await createPartition('reservation_details');
      await createPartition('reservation_addons');
      await createPartition('reservation_clients');
      await createPartition('reservation_payments');
      await createPartition('reservation_rates');
      await createPartition('plans_hotel');
      await createPartition('addons_hotel');
      await createPartition('invoices');
      await createPartition('receipts');
      await createPartition('xml_requests');
      await createPartition('xml_responses');
      await createPartition('reservation_parking');
      await createPartition('parking_blocks');
    };

    await createPartitionsSequentially();

    await client.query('COMMIT');
    return hotelId;

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`[${requestId}] Hotel creation error in model:`, error);
    throw error;
  } finally {
    client.release();
  }
};

const updateHotel = async (requestId, id, formal_name, name, postal_code, address, email, phone_number, latitude, longitude, bank_name, bank_branch_name, bank_account_type, bank_account_number, bank_account_name, google_drive_url, sort_order, updated_by) => {
  const pool = getPool(requestId);
  const query = `
      UPDATE hotels SET 
        formal_name = $1
        ,name = $2
        ,postal_code = $3
        ,address = $4
        ,email = $5
        ,phone_number = $6
        ,latitude = $7
        ,longitude = $8
        ,bank_name = $9
        ,bank_branch_name = $10
        ,bank_account_type = $11
        ,bank_account_number = $12
        ,bank_account_name = $13
        ,google_drive_url = $14
        ,sort_order = $15
        ,updated_by = $16
      WHERE id = $17
      RETURNING *
    `;
  const values = [formal_name, name, postal_code, address, email, phone_number, latitude, longitude, bank_name, bank_branch_name, bank_account_type, bank_account_number, bank_account_name, google_drive_url, sort_order, updated_by, id];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the updated user
  } catch (err) {
    logger.error(`[${requestId}] Error updating hotel:`, err);
    throw new Error('Database error');
  }
};

const updateHotelSiteController = async (requestId, id, data) => {
  const pool = getPool(requestId);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete existing entries
    await client.query(
      'DELETE FROM sc_user_info WHERE hotel_id = $1',
      [id]
    );

    // Insert new entries
    const insertPromises = data.map(entry => {
      return client.query(
        `
        INSERT INTO sc_user_info (hotel_id, name, user_id, password)
        VALUES ($1, $2, $3, $4)
        `,
        [entry.hotel_id, entry.name, entry.user_id, entry.password]
      );
    });

    await Promise.all(insertPromises);
    await client.query('COMMIT');
    return true;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateHotelCalendar = async (requestId, hotelId, roomIds, startDate, endDate, number_of_people, comment, updated_by, block_type) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));

    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));
    const dateArray = [];

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Please provide valid dates.');
    }

    // Include the start date in the range, up to but not including the end date
    for (let dt = new Date(start); dt < end; dt.setDate(dt.getDate() + 1)) {
      dateArray.push(new Date(dt));
    }

    let hotelsToUpdate = [];
    if (hotelId) {
      hotelsToUpdate.push(hotelId);
    } else {
      const hotelsResult = await client.query('SELECT id FROM hotels');
      hotelsToUpdate = hotelsResult.rows.map(hotel => hotel.id);
    }

    for (const currentHotelId of hotelsToUpdate) {
      let roomsToUpdate = [];

      if (roomIds && roomIds.length > 0) {
        roomsToUpdate = roomIds;
      } else {
        const roomsResult = await client.query('SELECT id FROM rooms WHERE hotel_id = $1', [currentHotelId]);
        roomsToUpdate = roomsResult.rows.map(room => room.id);
      }

      for (const roomId of roomsToUpdate) {
        const reservationIdResult = await client.query('SELECT gen_random_uuid() as id');
        const mockReservationId = reservationIdResult.rows[0].id;
        const checkInDate = dateArray[0];
        // Set checkOutDate to be one day after the last date in dateArray
        const checkOutDate = new Date(dateArray[dateArray.length - 1]);
        checkOutDate.setDate(checkOutDate.getDate() + 1);

        const clientId = block_type === 'temp' ? '22222222-2222-2222-2222-222222222222' : '11111111-1111-1111-1111-111111111111';

        try {
          await client.query(
            `INSERT INTO reservations (id, hotel_id, reservation_client_id, check_in, check_out, number_of_people, status, comment, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6, 'block', $7, $8, $8)
            ON CONFLICT (hotel_id, id) DO NOTHING`,
            [
              mockReservationId,
              currentHotelId,
              clientId,
              checkInDate,
              checkOutDate,
              number_of_people || 1,
              comment,
              updated_by,
            ]
          );
        } catch (error) {
          logger.error(`[${requestId}] Error inserting reservation:`, error);
          throw error;
        }

        for (const [index, date] of dateArray.entries()) {

          try {
            const existingReservation = await client.query(
              `SELECT 1 FROM reservation_details 
               WHERE hotel_id = $1 AND room_id = $2 AND date = $3 AND cancelled IS NULL`,
              [currentHotelId, roomId, date]
            );

            if (existingReservation.rowCount > 0) {
              logger.error(`[${requestId}] Room already reserved for this date:`, date);
              await client.query('ROLLBACK');
              return {
                success: false,
                message: `${date.toISOString().split('T')[0]}に予約は既に登録されています。`
              };
            }

            // Temp blocks are temporary holds (is_accommodation = TRUE)
            // System blocks (non-temp) are permanent blocks (is_accommodation = FALSE)
            const isAccommodation = block_type === 'temp';
            
            await client.query(
              `INSERT INTO reservation_details (hotel_id, reservation_id, date, room_id, number_of_people, is_accommodation, created_by, updated_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (hotel_id, reservation_id, room_id, date) 
               WHERE cancelled IS NULL 
               DO UPDATE SET updated_by = $7`,
              [
                currentHotelId,
                mockReservationId,
                date,
                roomId,
                number_of_people || 1,
                isAccommodation,
                updated_by,
                updated_by,
              ]
            );
          } catch (error) {
            logger.error(`[${requestId}] Error processing date: ${date}`, error);
            throw error;
          }
        }
      }
    }

    await client.query('COMMIT');
    return { success: true, message: 'Calendar updated successfully' };

  } catch (error) {
    logger.error(`[${requestId}] Error in updateHotelCalendar:`, error);
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logger.error(`[${requestId}] Error during rollback:`, rollbackError);
    }
    return {
      success: false,
      message: error.message || 'Failed to update calendar'
    };
  } finally {
    client.release();
  }
};

const deleteBlockedRooms = async (requestId, reservationId, userID) => {
  // Validate reservationId is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(reservationId)) {
    logger.error(`[${requestId}] Invalid UUID format for reservationId: ${reservationId}`);
    throw new Error('Invalid reservation ID format');
  }

  const pool = getPool(requestId);
  const query = format(`
    -- Set the updated_by value in a session variable
    SET SESSION "my_app.user_id" = %L;

    DELETE FROM reservations
    WHERE id = %L AND status = 'block'
    RETURNING *;
  `, userID, reservationId);

  try {
    const result = await pool.query(query);

    if (result.rowCount === 0) {
      logger.warn(`[${requestId}] No rows were deleted - reservation not found or not a block type`);
    }

    return true;
  } catch (err) {
    logger.error(`[${requestId}] Error deleting reservation:`, {
      error: err.message,
      code: err.code,
      detail: err.detail,
      query: query,
      parameters: { reservationId, userID }
    });
    throw new Error('Database error: ' + err.message);
  }
};

const updatePlanExclusions = async (requestId, hotel_id, global_plan_ids) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Delete existing exclusions for the hotel
    const deleteQuery = 'DELETE FROM hotel_plan_exclusions WHERE hotel_id = $1;';
    await client.query(deleteQuery, [hotel_id]);

    // Insert new exclusions if any are provided
    if (global_plan_ids && Array.isArray(global_plan_ids) && global_plan_ids.length > 0) {
      const insertQuery = 'INSERT INTO hotel_plan_exclusions (hotel_id, global_plan_id) VALUES ($1, $2);';
      for (const global_plan_id of global_plan_ids) {
        await client.query(insertQuery, [hotel_id, global_plan_id]);
      }
    }

    await client.query('COMMIT');
    // Optionally return a success status or the updated list, though not strictly required by the prompt
    // For now, let's not return anything specific for success, as the controller handles the response message.
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`[${requestId}] Error updating plan exclusions:`, err);
    throw new Error('Database error updating plan exclusions');
  } finally {
    client.release();
  }
};

// Helper
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};


const blockRoomsByRoomType = async (requestId, hotel_id, check_in, check_out, room_type_counts_processed, parking_combos_processed, comment, number_of_people, userId) => {
  const pool = getPool(requestId);
  const client = await pool.connect();
  let blockedRoomIds = [];

  try {
    await client.query('BEGIN');

    const startDate = new Date(check_in);
    const endDate = new Date(check_out);
    const dateArray = [];

    for (let dt = new Date(startDate); dt < endDate; dt.setDate(dt.getDate() + 1)) {
      dateArray.push(new Date(dt));
    }

    const mockReservationId = (await client.query('SELECT gen_random_uuid() as id')).rows[0].id;
    const checkInDate = dateArray[0];
    const checkOutDate = new Date(dateArray[dateArray.length - 1]);
    checkOutDate.setDate(checkOutDate.getDate() + 1);
    const clientId = '22222222-2222-2222-2222-222222222222'; // Client ID for temp blocks

    // Insert the main reservation entry ONCE for the entire block
    await client.query(
      `INSERT INTO reservations (id, hotel_id, reservation_client_id, check_in, check_out, number_of_people, status, comment, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'block', $7, $8, $8)`,
      [
        mockReservationId,
        hotel_id,
        clientId,
        checkInDate,
        checkOutDate,
        number_of_people || 1,
        comment,
        userId,
      ]
    );

    for (const roomTypeRequest of room_type_counts_processed) {
      const { room_type_id, count } = roomTypeRequest;

      // Find available rooms of this type for the entire date range
      const availableRoomsResult = await client.query(
        `SELECT r.id AS room_id, r.capacity
         FROM rooms r
         WHERE r.hotel_id = $1 AND r.room_type_id = $2
         AND NOT EXISTS (
           SELECT 1
           FROM reservation_details rd
           WHERE rd.room_id = r.id
             AND rd.hotel_id = $1
             AND rd.date >= $3 AND rd.date < $4
             AND rd.cancelled IS NULL
         )
         ORDER BY r.assignment_priority ASC NULLS LAST, r.floor, r.room_number
         LIMIT $5`,
        [hotel_id, room_type_id, startDate, endDate, count]
      );

      const roomsToBlock = availableRoomsResult.rows.map(row => ({
        id: row.room_id,
        capacity: row.capacity
      }));

      if (roomsToBlock.length < count) {
        logger.warn(`[${requestId}] Not enough rooms of type ${room_type_id} available. Requested: ${count}, Found: ${roomsToBlock.length}`);
      }

      for (const room of roomsToBlock) {
        const peopleForRoom = Math.min(number_of_people || 1, room.capacity);
        // Insert reservation details for each day, using the single mockReservationId
        // blockRoomsByRoomType creates temp blocks (temporary holds), so is_accommodation = TRUE
        for (const date of dateArray) {
          const detailData = {
            hotel_id: hotel_id,
            reservation_id: mockReservationId,
            date: date,
            room_id: room.id,
            number_of_people: peopleForRoom,
            is_accommodation: true, // Temp blocks are temporary holds
            created_by: userId,
            updated_by: userId,
            // plans_hotel_id, plan_name, plan_type, price can be null for block
            plans_hotel_id: null,
            plan_name: 'ブロック', // Default name for a block
            plan_type: 'per_room', // Default type for a block
            price: 0, // No price for a block
            billable: false, // Blocked rooms are not billable
          };
          await insertReservationDetails(requestId, detailData, client);
        }
        blockedRoomIds.push(room.id);
      }
    }

    // --- Parking Spot Blocking Logic ---
    if (parking_combos_processed && parking_combos_processed.length > 0) {
      // Move require inside the function, but outside the loop
      const { selectAvailableParkingSpots } = require('../models/reservations');
      const { saveParkingAssignments } = require('../models/parking'); // Import saveParkingAssignments 

      logger.debug(`[${requestId}] Starting parking spot blocking for ${parking_combos_processed.length} combos.`);
      for (const parkingCombo of parking_combos_processed) {
        const { vehicle_category_id, number_of_rooms: requestedSpots } = parkingCombo;
        logger.debug(`[${requestId}] Processing parking combo: vehicle_category_id=${vehicle_category_id}, requestedSpots=${requestedSpots}`);

        const { getVehicleCategoryCapacity } = require('../models/hotel/read'); // Assuming this is now in read.js
        const capacity_units_required = await getVehicleCategoryCapacity(requestId, vehicle_category_id);
        logger.debug(`[${requestId}] Capacity units required for vehicle_category_id ${vehicle_category_id}: ${capacity_units_required}`);
        if (capacity_units_required === 0) {
          logger.warn(`[${requestId}] Vehicle category ${vehicle_category_id} has 0 capacity units required. Skipping parking block.`);
          continue;
        }

        // Fetch available parking spots for the given dates and capacity units
        logger.debug(`[${requestId}] Fetching available parking spots for hotel ${hotel_id}, dates ${formatDate(startDate)} to ${formatDate(endDate)}, capacity ${capacity_units_required}`);
        const availableSpots = await selectAvailableParkingSpots(
          requestId,
          hotel_id,
          formatDate(startDate), // Use formatDate for consistency
          formatDate(endDate),   // Use formatDate for consistency
          capacity_units_required,
          client // Pass the client for transaction
        );
        logger.debug(`[${requestId}] Found ${availableSpots.length} available parking spots.`);

        if (availableSpots.length < requestedSpots) {
          logger.warn(`[${requestId}] Not enough available parking spots for vehicle category ${vehicle_category_id}. Requested: ${requestedSpots}, Available: ${availableSpots.length}`);
          throw new Error(`Not enough available parking spots for vehicle category ${vehicle_category_id}. Requested: ${requestedSpots}, Available: ${availableSpots.length}`);
        }

        // Select the required number of spots
        const spotsToReserve = availableSpots.slice(0, requestedSpots);
        logger.debug(`[${requestId}] Selected ${spotsToReserve.length} spots to reserve:`, spotsToReserve.map(s => s.parking_spot_id));

        // Prepare assignments for saveParkingAssignments
        const parkingAssignments = spotsToReserve.map(s => ({
          hotel_id: hotel_id,
          reservation_id: mockReservationId,
          vehicle_category_id: vehicle_category_id,
          check_in: formatDate(startDate),
          check_out: formatDate(endDate),
          unit_price: 0, // Assuming 0 for blocked spots, or fetch from somewhere
          number_of_vehicles: 1, // Each spot is one vehicle
          spotId: s.parking_spot_id // Preferred spot
        }));

        await saveParkingAssignments(requestId, parkingAssignments, userId, client);
        logger.debug(`[${requestId}] Successfully assigned ${parkingAssignments.length} parking spots.`);

      }
    } else {
      logger.debug(`[${requestId}] No parking combos to process.`);
    }

    await client.query('COMMIT');
    return { success: true, blocked_room_ids: blockedRoomIds };

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`[${requestId}] Error in blockRoomsByRoomType:`, error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createHotel,
  updateHotel,
  updateHotelSiteController,
  updateHotelCalendar,
  deleteBlockedRooms,
  updatePlanExclusions,
  blockRoomsByRoomType
};