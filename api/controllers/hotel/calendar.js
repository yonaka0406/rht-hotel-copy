const { getPool } = require('../../config/database');
const validationUtils = require('../../utils/validationUtils');
const hotelModel = require('../../models/hotel');

const editHotelCalendar = async (req, res) => {
    const { startDate: startDateParam, endDate: endDateParam } = req.params;
    const { hotelId: hotelIdFromBody, roomIds, number_of_people, comment, block_type } = req.body;
    const updated_by = req.user.id;
    
    let numericHotelId, validatedStartDate, validatedEndDate, validatedRoomIds = [];
    const pool = getPool(req.requestId);
    const client = await pool.connect();

    try {      
      numericHotelId = validationUtils.validateNumericParam(hotelIdFromBody, 'Hotel ID from body');
      validatedStartDate = validationUtils.validateDateStringParam(startDateParam, 'Start Date parameter');
      validatedEndDate = validationUtils.validateDateStringParam(endDateParam, 'End Date parameter');

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
          validatedRoomIds.push(validationUtils.validateNumericParam(String(roomId), 'Room ID in roomIds array'));
        }
      }

      if (validatedRoomIds.length === 0 && !comment) {
        throw new Error('No valid rooms found for the specified hotel or no comment provided.');
      }      
            
      const updatedRoom = await hotelModel.updateHotelCalendar(
        req.requestId, 
        numericHotelId, 
        validatedRoomIds, 
        validatedStartDate, 
        validatedEndDate, 
        number_of_people,
        comment, 
        updated_by, 
        block_type,
        client // Pass client for transaction
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
const getBlockedRooms = async (req, res) => {
    let numericId;
    try {
      numericId = validationUtils.validateNumericParam(req.params.id, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const blocked = await hotelModel.selectBlockedRooms(req.requestId, numericId);
      res.json(blocked);
    } catch (error) {
      console.error('Error getting hotel blocked rooms:', error);
      res.status(500).json({ error: error.message });
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

    const pool = getPool(req.requestId);
    const client = await pool.connect();

    try {    
        await client.query('BEGIN');
        const unblock = await hotelModel.deleteBlockedRooms(req.requestId, blockId, user_id, client);
        
        if (!unblock) {
            console.warn('Blocked room not found for ID:', blockId);
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                message: 'Reservation not found',
                blockId: blockId
            });
        }
        await client.query('COMMIT');
        res.status(200).json({ 
            success: true, 
            message: 'Calendar settings updated.',
            blockId: blockId
        });
    } catch (error) {
        await client.query('ROLLBACK');
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
    } finally {
        client.release();
    }
  };
const blockMultipleRooms = async (req, res) => {
  console.log('Starting blockMultipleRooms with request body:', JSON.stringify(req.body, null, 2));
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
  console.log(`Processing request ${requestId} for hotel ${hotel_id} by user ${updated_by}`);
  
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
        console.log('Processing room type counts:', JSON.stringify(room_type_counts, null, 2));
        for (const [roomTypeId, count] of Object.entries(room_type_counts)) {
            roomTypeCounts.push({
                room_type_id: parseInt(roomTypeId, 10),
                count: parseInt(count, 10)
            });
        }
        console.log('Processed room type counts:', JSON.stringify(roomTypeCounts, null, 2));
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
        console.log('Processing parking combos:', JSON.stringify(parking_combos, null, 2));
        // Assuming parking_combos is an array of objects like { vehicle_category_id, number_of_rooms }
        for (const combo of parking_combos) {
            parkingCombos.push({
                vehicle_category_id: parseInt(combo.vehicle_category_id, 10),
                number_of_rooms: parseInt(combo.number_of_rooms, 10)
            });
        }
        console.log('Processed parking combos:', JSON.stringify(parkingCombos, null, 2));
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
  console.log(`Validating date range: ${startDate} to ${endDate}`);
  
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
  console.log('Database connection established');
  
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
          updated_by,
          client // Pass client for transaction
      );

      if (result.success) {
          console.log(`Transaction committed. Successfully blocked ${result.blocked_room_ids.length} rooms`);
          const successResponse = {
              success: true,
              message: `Successfully blocked ${result.blocked_room_ids.length} rooms`,
              blocked_rooms: result.blocked_room_ids.length,
              room_ids: result.blocked_room_ids
          };
          console.log('Sending success response:', JSON.stringify(successResponse, null, 2));
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
      client.release();
  }
};

module.exports = {
  editHotelCalendar,
  getBlockedRooms,
  editBlockedRooms,
  blockMultipleRooms,
};
