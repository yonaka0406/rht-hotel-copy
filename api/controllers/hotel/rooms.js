const { getPool } = require('../../config/database');
const { validateNumericParam, validateNonEmptyStringParam } = require('../../utils/validationUtils');
const roomsModel = require('../../models/rooms');
const logger = require('../../config/logger');

const createRoom = async (req, res) => {
  const { floor, room_number, room_type, room_type_id, capacity, smoking, for_sale, has_wet_area, is_staff_room, hotel_id: hotelIdFromBody } = req.body;
  const created_by = req.user.id;
  const updated_by = req.user.id;

  let numericHotelId, numericFloor, validatedRoomNumber, numericCapacity, validatedRoomTypeString, validatedSmoking, validatedForSale, validatedHasWetArea, validatedIsStaffRoom;
  try {
    numericHotelId = validateNumericParam(hotelIdFromBody, 'Hotel ID from body');
    numericFloor = validateNumericParam(String(floor), 'Floor');
    validatedRoomNumber = validateNonEmptyStringParam(room_number, 'Room Number');
    numericCapacity = validateNumericParam(String(capacity), 'Capacity');
    validatedSmoking = validateBooleanParam(smoking, 'Smoking');
    validatedForSale = validateBooleanParam(for_sale, 'For Sale');
    validatedHasWetArea = validateBooleanParam(has_wet_area, 'Has Wet Area');
    validatedIsStaffRoom = validateBooleanParam(is_staff_room, 'Is Staff Room');

    if (room_type_id === 0 && room_type) {
      validatedRoomTypeString = validateNonEmptyStringParam(room_type, 'Room Type Name (string)');
    }
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Start transaction

    let finalRoomTypeId = room_type_id; // This is numeric from body directly or 0

    if (room_type_id === 0 && validatedRoomTypeString) { // Use validated string
      // Fetch the room_type_id based on the room type name and hotel_id
      const roomTypeIdFromModel = await roomsModel.selectRoomTypeByName(req.requestId, validatedRoomTypeString, numericHotelId, client);

      if (!roomTypeIdFromModel) {
        await client.query('ROLLBACK'); // Rollback if room type not found
        return res.status(400).json({ error: 'Room type not found for the given hotel ID.' });
      }

      finalRoomTypeId = roomTypeIdFromModel;
    }

    const roomId = await roomsModel.createRoom(req.requestId, {
      room_type_id: finalRoomTypeId,
      floor: numericFloor,
      room_number: validatedRoomNumber,
      capacity: numericCapacity,
      smoking: validatedSmoking,
      for_sale: validatedForSale,
      has_wet_area: validatedHasWetArea,
      is_staff_room: validatedIsStaffRoom,
      hotel_id: numericHotelId,
      created_by: created_by,
      updated_by: updated_by
    }, client); // Pass client to model function

    await client.query('COMMIT'); // Commit transaction

    res.status(201).json({
      message: 'Rooms created successfully',
      roomId: roomId
    });

  } catch (error) {
    await client.query('ROLLBACK'); // Rollback on error
    logger.error('Room creation error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release(); // Release client
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
    const hotelRooms = await roomsModel.selectAllRoomsByHotel(req.requestId, numericId); // Corrected model call
    res.json(hotelRooms);
  } catch (error) {
    logger.error('Error getting hotel rooms:', error);
    res.status(500).json({ error: error.message });
  }
};

const validateBooleanParam = (value, paramName) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  throw new Error(`${paramName} must be a boolean (true/false)`);
};

const editRoom = async (req, res) => {
  const { id: idParam } = req.params;
  const { room_type_id, floor, room_number, capacity, smoking, for_sale, has_wet_area, is_staff_room, hotel_id: hotelIdFromBody } = req.body;
  const updated_by = req.user.id;

  let numericId, numericRoomTypeId, numericFloor, validatedRoomNumber, numericCapacity, numericHotelId, validatedSmoking, validatedForSale, validatedHasWetArea, validatedIsStaffRoom;
  try {
    numericId = validateNumericParam(idParam, 'Room ID');
    numericRoomTypeId = validateNumericParam(String(room_type_id), 'Room Type ID');
    numericFloor = floor !== undefined ? validateNumericParam(String(floor), 'Floor') : undefined;
    validatedRoomNumber = validateNonEmptyStringParam(room_number, 'Room Number');
    numericCapacity = validateNumericParam(String(capacity), 'Capacity');
    numericHotelId = validateNumericParam(hotelIdFromBody, 'Hotel ID');
    validatedSmoking = validateBooleanParam(smoking, 'Smoking status');
    validatedForSale = validateBooleanParam(for_sale, 'For sale status');
    validatedHasWetArea = validateBooleanParam(has_wet_area, 'Has wet area status');
    validatedIsStaffRoom = validateBooleanParam(is_staff_room, 'Is staff room status');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const updatedRoom = await roomsModel.updateRoom(req.requestId, numericId, numericRoomTypeId, numericFloor, validatedRoomNumber, numericCapacity, validatedSmoking, validatedForSale, validatedHasWetArea, validatedIsStaffRoom, updated_by, numericHotelId);
    if (!updatedRoom) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.status(200).json(updatedRoom);
  } catch (error) {
    logger.error('Error updating room:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createRoom,
  getHotelRooms,
  editRoom
};