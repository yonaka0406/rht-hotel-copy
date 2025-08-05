const { getPool } = require('../config/database');
const { validateNumericParam, validateNonEmptyStringParam, validateDateStringParam, validateIntegerParam } = require('../utils/validationUtils');
const { getAllHotels, getHotelSiteController, updateHotel, updateHotelSiteController, updateRoomType, updateRoom, updateHotelCalendar, selectBlockedRooms, getAllHotelRoomTypesById, getAllRoomsByHotelId, deleteBlockedRooms, getPlanExclusionSettings, updatePlanExclusions } = require('../models/hotel');

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
      //console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
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
      //console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
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

    const { formal_name, name, postal_code, address, email, phone_number, latitude, longitude, bank_name, bank_branch_name, bank_account_type, bank_account_number, bank_account_name, google_drive_url  } = req.body;
    const updated_by = req.user.id;

    let validatedFormalName, validatedName, validatedAddress, validatedEmail, validatedPhoneNumber;
    try {
      // numericId for req.params.id is already validated at the start of the function
      validatedFormalName = validateNonEmptyStringParam(formal_name, 'Formal Name');
      validatedName = validateNonEmptyStringParam(name, 'Name');
      validatedAddress = validateNonEmptyStringParam(address, 'Address');
      validatedEmail = validateNonEmptyStringParam(email, 'Email');
      validatedPhoneNumber = validateNonEmptyStringParam(phone_number, 'Phone Number');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const updatedHotel = await updateHotel(req.requestId, numericId, validatedFormalName, validatedName, postal_code, validatedAddress, validatedEmail, validatedPhoneNumber, latitude, longitude, bank_name, bank_branch_name, bank_account_type, bank_account_number, bank_account_name, google_drive_url, updated_by);
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
    const { name, description } = req.body;
    const updated_by = req.user.id;

    let numericId, validatedName;
    try {
      numericId = validateNumericParam(idParam, 'Room Type ID');
      validatedName = validateNonEmptyStringParam(name, 'Room Type Name');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const updatedRoomType = await updateRoomType(req.requestId, numericId, validatedName, description, updated_by);
      if (!updatedRoomType) {
        return res.status(404).json({ message: 'Room type not found' });
      }
      res.status(200).json(updatedRoomType);
    } catch (error) {
      console.error('Error updating hotel:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  const editRoom = async (req, res) => {
    const { id: idParam } = req.params;
    const { room_type_id, floor, room_number, capacity, smoking, for_sale } = req.body;
    const updated_by = req.user.id;

    let numericId, numericRoomTypeId, numericFloor, validatedRoomNumber, numericCapacity;
    try {
      numericId = validateNumericParam(idParam, 'Room ID');
      numericRoomTypeId = validateNumericParam(String(room_type_id), 'Room Type ID');
      numericFloor = validateNumericParam(String(floor), 'Floor');
      validatedRoomNumber = validateNonEmptyStringParam(room_number, 'Room Number');
      numericCapacity = validateNumericParam(String(capacity), 'Capacity');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const updatedRoom = await updateRoom(req.requestId, numericId, numericRoomTypeId, numericFloor, validatedRoomNumber, numericCapacity, smoking, for_sale, updated_by);
      if (!updatedRoom) {
        return res.status(404).json({ message: 'Room not found' });
      }
      res.status(200).json(updatedRoom);
    } catch (error) {
      console.error('Error updating hotel:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  const editHotelCalendar = async (req, res) => {
    const { startDate: startDateParam, endDate: endDateParam } = req.params;
    const { hotelId: hotelIdFromBody, roomIds, number_of_people, comment, block_type } = req.body;
    const updated_by = req.user.id;

    console.log('=== editHotelCalendar Request ===');
    console.log('Request Params:', req.params);
    console.log('Request Body:', req.body);
    console.log('Request User:', req.user);

    console.log('Extracted Values:', {
      startDateParam,
      endDateParam,
      hotelIdFromBody,
      roomIds,
      number_of_people,
      comment,
      block_type,
      updated_by
    });

    let numericHotelId, validatedStartDate, validatedEndDate, validatedRoomIds = [];
    try {
      console.log('=== Starting Validation ===');
      numericHotelId = validateNumericParam(hotelIdFromBody, 'Hotel ID from body');
      validatedStartDate = validateDateStringParam(startDateParam, 'Start Date parameter');
      validatedEndDate = validateDateStringParam(endDateParam, 'End Date parameter');      

      if (!Array.isArray(roomIds)) {
        console.error('roomIds is not an array:', roomIds);
        throw new Error('roomIds must be an array.');
      }
      for (const roomId of roomIds) {
        validatedRoomIds.push(validateNumericParam(String(roomId), 'Room ID in roomIds array'));
      }
      if (validatedRoomIds.length === 0 && !comment) { // Or based on specific logic if comment alone is not enough
         throw new Error('Either roomIds must not be empty or a comment must be provided.');
      }

      console.log('Validated Values:', {
        numericHotelId,
        validatedStartDate,
        validatedEndDate,
        number_of_people
      });

    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      console.log('=== Calling updateHotelCalendar ===', {
        requestId: req.requestId,
        numericHotelId,
        validatedRoomIds,
        validatedStartDate,
        validatedEndDate,
        number_of_people,
        comment,
        updated_by,
        block_type
      });
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
      res.status(200).json({ success: true, message: 'Rooms updated successfully' });
    } catch (error) {
      console.error('Error updating hotel:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  const editBlockedRooms = async (req, res) => {
    console.log('=== editBlockedRooms called ===');
    console.log('Request params:', req.params);
    console.log('User:', req.user);
    
    const { id: blockId } = req.params;
    const user_id = req.user?.id;
    
    console.log('Block ID parameter:', blockId);
    console.log('User ID:', user_id);

    if (!blockId) {
        console.error('No block ID provided');
        return res.status(400).json({ 
            success: false, 
            message: 'Block ID is required',
            receivedId: blockId
        });
    }

    try {
        console.log('Attempting to delete blocked room with ID:', blockId);
        const unblock = await deleteBlockedRooms(req.requestId, blockId, user_id);
        
        if (!unblock) {
            console.warn('Blocked room not found for ID:', blockId);
            return res.status(404).json({ 
                success: false, 
                message: 'Reservation not found',
                blockId: blockId
            });
        }
        
        console.log('Successfully unblocked room with ID:', blockId);
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

module.exports = { 
  hotels, 
  roomTypeCreate, 
  roomCreate, 
  getHotels,
  getHotelRoomTypes,
  editHotel, 
  editHotelSiteController,
  editRoomType, 
  editRoom, 
  editHotelCalendar, 
  getHotelRooms, 
  getBlockedRooms, 
  fetchHotelSiteController, 
  editBlockedRooms,
  getPlanExclusionSettingsController,
  updatePlanExclusionSettingsController
};