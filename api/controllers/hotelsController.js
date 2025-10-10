const { getPool } = require('../config/database');
const { validateNumericParam, validateNonEmptyStringParam, validateDateStringParam, validateIntegerParam } = require('../utils/validationUtils');
const hotelModel = require('../models/hotel');
const { getAllHotels, getHotelSiteController, updateHotel, updateHotelSiteController, updateRoomType, updateRoom, updateHotelCalendar, selectBlockedRooms, getAllHotelRoomTypesById, getAllRoomsByHotelId, deleteBlockedRooms, getPlanExclusionSettings, updatePlanExclusions, getRoomAssignmentOrder, updateRoomAssignmentOrder } = hotelModel;

// POST
  const hotels = async (req, res) => {
    let validatedFormalName, validatedName, validatedOpenDate, validatedTotalRooms, 
        validatedAddress, validatedEmail, validatedPhoneNumber;
    try {
      validatedFormalName = validateNonEmptyStringParam(req.body.formal_name, 'Formal Name');
      validatedName = validateNonEmptyStringParam(req.body.name, 'Name');
      validatedOpenDate = validateDateStringParam(req.body.open_date, 'Open Date');
      validatedTotalRooms = validateIntegerParam(String(req.body.total_rooms), 'Total Rooms');
      validatedAddress = validateNonEmptyStringParam(req.body.address, 'Address');
      validatedEmail = validateNonEmptyStringParam(req.body.email, 'Email');
      validatedPhoneNumber = validateNonEmptyStringParam(req.body.phone_number, 'Phone Number');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const pool = getPool(req.requestId);
    const client = await pool.connect();

    try {
      // Start a transaction
      await client.query('BEGIN');

      // Insert hotel
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
        validatedFormalName, validatedName, req.body.facility_type.code, // Use validated names
        validatedOpenDate, validatedTotalRooms, req.body.postal_code, // Use validated open_date and total_rooms
        validatedAddress, validatedEmail, validatedPhoneNumber, // Use validated address, email, phone
        req.user.id, req.user.id 
      ]);
      const hotelId = hotelResult.rows[0].id;

      // Dynamic Partition Creation Functions
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
      };

      await createPartitionsSequentially();

      // Commit transaction
      await client.query('COMMIT');
      res.status(201).json({
        message: 'Hotel created successfully with all partitions',
        id: hotelId
      });

    } catch (error) {
      // Rollback in case of error
      await client.query('ROLLBACK');
      console.error('Hotel creation error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  };
  const roomTypeCreate = async (req, res) => {
    const pool = getPool(req.requestId);
    const client = await pool.connect();
    const { name, description, hotel_id: hotelIdFromBody } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    let numericHotelId, validatedRoomTypeName;
    try {
      numericHotelId = validateNumericParam(hotelIdFromBody, 'Hotel ID from body');
      validatedRoomTypeName = validateNonEmptyStringParam(name, 'Room Type Name');
    } catch (error) {
      // The finally block will release the client
      return res.status(400).json({ error: error.message });
    }

    try {
      await client.query('BEGIN');

      const insertRoomTypeQuery = `
        INSERT INTO room_types (name, description, hotel_id, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      const result = await pool.query(insertRoomTypeQuery, [validatedRoomTypeName, description, numericHotelId, created_by, updated_by]);

      await client.query('COMMIT');
      res.status(201).json({
        message: 'Room type created successfully',
        roomTypeId: result.rows[0].id
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Room type creation error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();      
    }
  };
  const roomCreate = async (req, res) => {
    const pool = getPool(req.requestId);
    const client = await pool.connect();  
    const { floor, room_number, room_type, room_type_id, capacity, smoking, for_sale, hotel_id: hotelIdFromBody } = req.body;    
    const created_by = req.user.id;
    const updated_by = req.user.id;

    let numericHotelId, numericFloor, validatedRoomNumber, numericCapacity, validatedRoomTypeString;
    try {
      numericHotelId = validateNumericParam(hotelIdFromBody, 'Hotel ID from body');
      numericFloor = validateNumericParam(String(floor), 'Floor');
      validatedRoomNumber = validateNonEmptyStringParam(room_number, 'Room Number');
      numericCapacity = validateNumericParam(String(capacity), 'Capacity');
      if (room_type_id === 0 && room_type) {
        validatedRoomTypeString = validateNonEmptyStringParam(room_type, 'Room Type Name (string)');
      }
    } catch (error) {
      // The finally block will release the client
      return res.status(400).json({ error: error.message });
    }

    let finalRoomTypeId = room_type_id; // This is numeric from body directly or 0

    if (room_type_id === 0 && validatedRoomTypeString) { // Use validated string
      // Fetch the room_type_id based on the room type name and hotel_id
      const roomTypeQuery = `
        SELECT id FROM room_types
        WHERE name = $1 AND hotel_id = $2
      `;
      const roomTypeResult = await client.query(roomTypeQuery, [validatedRoomTypeString, numericHotelId]);

      if (roomTypeResult.rows.length === 0) {
        client.release(); // Release client before returning
        return res.status(400).json({ error: 'Room type not found for the given hotel ID.' });
      }

      finalRoomTypeId = roomTypeResult.rows[0].id;
    }

    try {
      await client.query('BEGIN');
      
      // Insert room with the room_type_id
      const insertRoomQuery = `
        INSERT INTO rooms (room_type_id, floor, room_number, capacity, smoking, for_sale, hotel_id, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;
      const result = await pool.query(insertRoomQuery, [finalRoomTypeId, numericFloor, validatedRoomNumber, numericCapacity, smoking, for_sale, numericHotelId, created_by, updated_by]);
      
      await client.query('COMMIT');
      res.status(201).json({
        message: 'Rooms created successfully',
        roomId: result.rows[0].id
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Room creation error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      client.release();      
    }

  };

// GET
  const getHotels = async (req, res) => {
    try {
      const hotels = await getAllHotels(req.requestId);
      res.json(hotels);
    } catch (error) {
      console.error('Error getting hotels:', error);
      res.status(500).json({ error: error.message });
    }
  };
  const getHotelRoomTypes = async (req, res) => {
    let numericId;
    try {
      numericId = validateNumericParam(req.params.id, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const hotels = await getAllHotelRoomTypesById(req.requestId, numericId);
      res.json(hotels);
    } catch (error) {
      console.error('Error getting hotel room types:', error);
      res.status(500).json({ error: error.message });
    }
  };
  const getHotelRooms = async (req, res) => {
    let numericId;
    try {
      numericId = validateNumericParam(req.params.id, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const hotels = await getAllRoomsByHotelId(req.requestId, numericId);
      res.json(hotels);
    } catch (error) {
      console.error('Error getting hotel rooms:', error);
      res.status(500).json({ error: error.message });
    }
  };
  const getBlockedRooms = async (req, res) => {
    let numericId;
    try {
      numericId = validateNumericParam(req.params.id, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const blocked = await selectBlockedRooms(req.requestId, numericId);
      res.json(blocked);
    } catch (error) {
      console.error('Error getting hotel blocked rooms:', error);
      res.status(500).json({ error: error.message });
    }
  };
  const fetchHotelSiteController = async (req, res) => {
    let numericId;
    try {
      numericId = validateNumericParam(req.params.id, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const hotel = await getHotelSiteController(req.requestId, numericId);
      res.json(hotel);
    } catch (error) {
      console.error('Error getting hotels:', error);
      res.status(500).json({ error: error.message });
    }
  };


// PUT
  const editHotel = async (req, res) => {
    let numericId;
    try {
      numericId = validateNumericParam(req.params.id, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const { formal_name, name, postal_code, address, email, phone_number, latitude, longitude, bank_name, bank_branch_name, bank_account_type, bank_account_number, bank_account_name, google_drive_url, sort_order } = req.body;
    const updated_by = req.user.id;

    let validatedFormalName, validatedName, validatedAddress, validatedEmail, validatedPhoneNumber, validatedSortOrder;
    try {
      // numericId for req.params.id is already validated at the start of the function
      validatedFormalName = validateNonEmptyStringParam(formal_name, 'Formal Name');
      validatedName = validateNonEmptyStringParam(name, 'Name');
      validatedAddress = validateNonEmptyStringParam(address, 'Address');
      validatedEmail = validateNonEmptyStringParam(email, 'Email');
      validatedPhoneNumber = validateNonEmptyStringParam(phone_number, 'Phone Number');
      validatedSortOrder = validateIntegerParam(String(sort_order), 'Sort Order');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const updatedHotel = await updateHotel(req.requestId, numericId, validatedFormalName, validatedName, postal_code, validatedAddress, validatedEmail, validatedPhoneNumber, latitude, longitude, bank_name, bank_branch_name, bank_account_type, bank_account_number, bank_account_name, google_drive_url, validatedSortOrder, updated_by);
      if (!updatedHotel) {
        return res.status(404).json({ message: 'Hotel not found' });
      }
      res.status(200).json(updatedHotel);
    } catch (error) {
      console.error('Error updating hotel:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  const editHotelSiteController = async (req, res) => {
    let numericId;
    try {
      numericId = validateNumericParam(req.params.id, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const data = req.body;    

    try {
      const updatedHotel = await updateHotelSiteController(req.requestId, numericId, data);
      if (!updatedHotel) {
        return res.status(404).json({ message: 'Hotel not found' });
      }
      res.status(200).json(updatedHotel);
    } catch (error) {
      console.error('Error updating hotel:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  const editRoomType = async (req, res) => {
    const { id: idParam } = req.params;
    const { name, description, hotel_id: hotelIdFromBody } = req.body;
    const updated_by = req.user.id;

    let numericId, validatedName, numericHotelId;
    try {
      numericId = validateNumericParam(idParam, 'Room Type ID');
      validatedName = validateNonEmptyStringParam(name, 'Room Type Name');
      numericHotelId = validateNumericParam(hotelIdFromBody, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const updatedRoomType = await updateRoomType(req.requestId, numericId, validatedName, description, updated_by, numericHotelId);
      if (!updatedRoomType) {
        return res.status(404).json({ message: 'Room type not found' });
      }
      res.status(200).json(updatedRoomType);
    } catch (error) {
      console.error('Error updating room type:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  const editRoom = async (req, res) => {
    const { id: idParam } = req.params;
    const { room_type_id, floor, room_number, capacity, smoking, for_sale, hotel_id: hotelIdFromBody } = req.body;
    const updated_by = req.user.id;

    let numericId, numericRoomTypeId, numericFloor, validatedRoomNumber, numericCapacity, numericHotelId;
    try {
      numericId = validateNumericParam(idParam, 'Room ID');
      numericRoomTypeId = validateNumericParam(String(room_type_id), 'Room Type ID');
      numericFloor = validateNumericParam(String(floor), 'Floor');
      validatedRoomNumber = validateNonEmptyStringParam(room_number, 'Room Number');
      numericCapacity = validateNumericParam(String(capacity), 'Capacity');
      numericHotelId = validateNumericParam(hotelIdFromBody, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const updatedRoom = await updateRoom(req.requestId, numericId, numericRoomTypeId, numericFloor, validatedRoomNumber, numericCapacity, smoking, for_sale, updated_by, numericHotelId);
      if (!updatedRoom) {
        return res.status(404).json({ message: 'Room not found' });
      }
      res.status(200).json(updatedRoom);
    } catch (error) {
      console.error('Error updating room:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  const editHotelCalendar = async (req, res) => {
    const { startDate: startDateParam, endDate: endDateParam } = req.params;
    const { hotelId: hotelIdFromBody, roomIds, number_of_people, comment, block_type } = req.body;
    const updated_by = req.user.id;
    
    let numericHotelId, validatedStartDate, validatedEndDate, validatedRoomIds = [];
    const pool = getPool();
    const client = await pool.connect();

    try {      
      numericHotelId = validateNumericParam(hotelIdFromBody, 'Hotel ID from body');
      validatedStartDate = validateDateStringParam(startDateParam, 'Start Date parameter');
      validatedEndDate = validateDateStringParam(endDateParam, 'End Date parameter');

      // If start and end dates are the same, increment end date by one day
      if (validatedStartDate === validatedEndDate) {
        const tempEndDate = new Date(validatedEndDate);
        tempEndDate.setDate(tempEndDate.getDate() + 1);
        validatedEndDate = tempEndDate.toISOString().split('T')[0];
      }

      // If roomIds is not provided, fetch all room IDs for the hotel
      if (!roomIds) {        
        const result = await client.query('SELECT id FROM rooms WHERE hotel_id = $1', [numericHotelId]);
        validatedRoomIds = result.rows.map(row => row.id);
      } else {
        // If roomIds is provided, validate each one
        if (!Array.isArray(roomIds)) {
          console.error('roomIds is not an array:', roomIds);
          throw new Error('roomIds must be an array.');
        }
        for (const roomId of roomIds) {
          validatedRoomIds.push(validateNumericParam(String(roomId), 'Room ID in roomIds array'));
        }
      }

      if (validatedRoomIds.length === 0 && !comment) {
        throw new Error('No valid rooms found for the specified hotel or no comment provided.');
      }      
            
      const updatedRoom = await updateHotelCalendar(
        req.requestId, 
        numericHotelId, 
        validatedRoomIds, 
        validatedStartDate, 
        validatedEndDate, 
        number_of_people,
        comment, 
        updated_by, 
        block_type
      );
      
      if (!updatedRoom.success) { 
        return res.status(400).json({ success: false, message: updatedRoom.message });
      }
      
      res.status(200).json({
        success: true,
        message: 'Rooms updated successfully',
        roomIds: validatedRoomIds
      });
    } catch (error) {
      console.error('Error updating hotel:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update rooms',
        error: error.message
      });
    } finally {
      client.release();
    }
  };
  const editBlockedRooms = async (req, res) => {        
    const { id: blockId } = req.params;
    const user_id = req.user?.id;
        
    if (!blockId) {
        console.error('No block ID provided');
        return res.status(400).json({ 
            success: false, 
            message: 'Block ID is required',
            receivedId: blockId
        });
    }

    try {    
        const unblock = await deleteBlockedRooms(req.requestId, blockId, user_id);
        
        if (!unblock) {
            console.warn('Blocked room not found for ID:', blockId);
            return res.status(404).json({ 
                success: false, 
                message: 'Reservation not found',
                blockId: blockId
            });
        }
                
        res.status(200).json({ 
            success: true, 
            message: 'Calendar settings updated.',
            blockId: blockId
        });
    } catch (error) {
        console.error('Error in editBlockedRooms:', {
            error: error.message,
            stack: error.stack,
            blockId: blockId,
            userId: user_id,
            requestId: req.requestId
        });
        
        const statusCode = error.message.includes('Invalid') ? 400 : 500;
        res.status(statusCode).json({ 
            success: false, 
            message: error.message || 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
  };

// Controller for getting plan exclusion settings
const getPlanExclusionSettingsController = async (req, res) => {
  let parsedId;
  try {
    parsedId = validateNumericParam(req.params.hotel_id, 'Hotel ID');
  } catch (error) {
    // If validateNumericParam throws because hotel_id is empty/null/undefined,
    // it will say "Hotel ID is required...". If it's not a positive int, it'll say that.
    return res.status(400).json({ error: error.message });
  }

  try {
    const settings = await getPlanExclusionSettings(req.requestId, parsedId);
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error getting plan exclusion settings:', error);
    res.status(500).json({ message: 'Internal server error while retrieving plan exclusion settings.' });
  }
};

// Controller for updating plan exclusion settings
const updatePlanExclusionSettingsController = async (req, res) => {
  let parsedId;
  try {
    parsedId = validateNumericParam(req.params.hotel_id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const { global_plan_ids } = req.body; // e.g. { "global_plan_ids": [1, 2, 3] }

    if (!Array.isArray(global_plan_ids)) {
      return res.status(400).json({ message: 'global_plan_ids must be an array.' });
    }

    await updatePlanExclusions(req.requestId, parsedId, global_plan_ids);
    res.status(200).json({ message: 'Plan exclusions updated successfully' });
  } catch (error) {
    console.error('Error updating plan exclusion settings:', error);
    res.status(500).json({ message: 'Internal server error while updating plan exclusion settings.' });
  }
};

const getRoomAssignmentOrderController = async (req, res) => {
  let numericId;
  try {
    numericId = validateNumericParam(req.params.id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const order = await getRoomAssignmentOrder(req.requestId, numericId);
    res.json(order);
  } catch (error) {
    console.error('Error getting room assignment order:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateRoomAssignmentOrderController = async (req, res) => {
  let numericId;
  try {
    numericId = validateNumericParam(req.params.id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const { rooms } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(rooms)) {
    return res.status(400).json({ error: 'Request body must be an array of rooms.' });
  }

  try {
    await updateRoomAssignmentOrder(req.requestId, numericId, rooms, userId);
    res.status(200).json({ message: 'Room assignment order updated successfully.' });
  } catch (error) {
    console.error('Error updating room assignment order:', error);
    res.status(500).json({ error: error.message });
  }
};

const blockMultipleRooms = async (req, res) => {
  // console.log('Starting blockMultipleRooms with request body:', JSON.stringify(req.body, null, 2));
  const {
      hotel_id,
      check_in,
      check_out,
      room_type_counts,
      parking_combos, // Add parking_combos
      comment,
      number_of_people
  } = req.body;
  
  const updated_by = req.user.id;
  const requestId = req.requestId;
  // console.log(`Processing request ${requestId} for hotel ${hotel_id} by user ${updated_by}`);
  
  // Validate required fields
  if (!hotel_id || !check_in || !check_out || !room_type_counts || !comment) {
      const errorMsg = 'Missing required fields: hotel_id, check_in, check_out, room_type_counts, and comment are required.';
      console.error('Validation error:', errorMsg);
      return res.status(400).json({
          success: false,
          message: errorMsg
      });
  }
  
  // Convert room_type_counts to an array of { room_type_id, count }
  const roomTypeCounts = [];
  if (room_type_counts) { // Ensure room_type_counts exists
    try {
        // console.log('Processing room type counts:', JSON.stringify(room_type_counts, null, 2));
        for (const [roomTypeId, count] of Object.entries(room_type_counts)) {
            roomTypeCounts.push({
                room_type_id: parseInt(roomTypeId, 10),
                count: parseInt(count, 10)
            });
        }
        // console.log('Processed room type counts:', JSON.stringify(roomTypeCounts, null, 2));
    } catch (error) {
        const errorMsg = 'Invalid room_type_counts format. Expected an object with room_type_id as keys and counts as values.';
        console.error('Error processing room type counts:', errorMsg, error);
        return res.status(400).json({
            success: false,
            message: errorMsg
        });
    }
  }

  // Process parking_combos
  const parkingCombos = [];
  if (parking_combos) { // Ensure parking_combos exists
    try {
        // console.log('Processing parking combos:', JSON.stringify(parking_combos, null, 2));
        // Assuming parking_combos is an array of objects like { vehicle_category_id, number_of_rooms }
        for (const combo of parking_combos) {
            parkingCombos.push({
                vehicle_category_id: parseInt(combo.vehicle_category_id, 10),
                number_of_rooms: parseInt(combo.number_of_rooms, 10)
            });
        }
        // console.log('Processed parking combos:', JSON.stringify(parkingCombos, null, 2));
    } catch (error) {
        const errorMsg = 'Invalid parking_combos format. Expected an array of objects with vehicle_category_id and number_of_rooms.';
        console.error('Error processing parking combos:', errorMsg, error);
        return res.status(400).json({
            success: false,
            message: errorMsg
        });
    }
  }
  
  // Validate date range
  const startDate = new Date(check_in);
  const endDate = new Date(check_out);
  // console.log(`Validating date range: ${startDate} to ${endDate}`);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      const errorMsg = 'Invalid date format. Please use YYYY-MM-DD.';
      console.error('Date validation error:', errorMsg);
      return res.status(400).json({
          success: false,
          message: errorMsg
      });
  }
  
  if (startDate >= endDate) {
      const errorMsg = 'Check-out date must be after check-in date.';
      console.error('Date range validation error:', errorMsg);
      return res.status(400).json({
          success: false,
          message: errorMsg
      });
  }
  
  const pool = getPool(requestId);
  const client = await pool.connect();
  // console.log('Database connection established');
  
  try {
      // Call the model function to block rooms by room type
      const result = await hotelModel.blockRoomsByRoomType(
          requestId,
          hotel_id,
          check_in,
          check_out,
          roomTypeCounts, // Use the processed roomTypeCounts
          parkingCombos,  // Pass the processed parkingCombos
          comment,
          number_of_people,
          updated_by
      );

      if (result.success) {
          // console.log(`Transaction committed. Successfully blocked ${result.blocked_room_ids.length} rooms`);
          const successResponse = {
              success: true,
              message: `Successfully blocked ${result.blocked_room_ids.length} rooms`,
              blocked_rooms: result.blocked_room_ids.length,
              room_ids: result.blocked_room_ids
          };
          // console.log('Sending success response:', JSON.stringify(successResponse, null, 2));
          res.status(200).json(successResponse);
      } else {
          // This case should ideally be handled by blockRoomsByRoomType throwing an error
          // but as a fallback, if it returns success: false, handle it here.
          console.error('Error in blockMultipleRooms: Model returned failure without throwing:', result.message);
          res.status(400).json({
              success: false,
              message: result.message || 'Failed to block rooms due to an unknown reason.'
          });
      }
      
  } catch (error) {
      console.error('Error in blockMultipleRooms transaction:', error);
      // The blockRoomsByRoomType function already handles its own transaction and rollback.
      // If an error reaches here, it means blockRoomsByRoomType threw an error.
      res.status(500).json({
          success: false,
          message: 'Failed to block rooms',
          error: error.message
      });
  } finally {
      // The client is released by blockRoomsByRoomType, so no need to release here.
      // console.log('Database connection released');
  }
};

module.exports = { 
  hotels, 
  roomTypeCreate, 
  roomCreate, 
  getHotels,
  getHotelRoomTypes,
  getHotelRooms,
  editHotel, 
  editHotelSiteController,
  editRoomType, 
  editRoom, 
  editHotelCalendar, 
  getBlockedRooms, 
  fetchHotelSiteController, 
  editBlockedRooms,
  getPlanExclusionSettingsController,
  updatePlanExclusionSettingsController,
  getRoomAssignmentOrderController,
  updateRoomAssignmentOrderController,
  blockMultipleRooms
};