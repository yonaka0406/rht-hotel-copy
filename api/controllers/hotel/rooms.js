const { getPool } = require('../../config/database');
const validationUtils = require('../../utils/validationUtils');
const hotelModel = require('../../models/hotel');

const roomCreate = async (req, res) => {
    const pool = getPool(req.requestId);
    const client = await pool.connect();  
    const { floor, room_number, room_type, room_type_id, capacity, smoking, for_sale, hotel_id: hotelIdFromBody } = req.body;    
    const created_by = req.user.id;
    const updated_by = req.user.id;

    let numericHotelId, numericFloor, validatedRoomNumber, numericCapacity, validatedRoomTypeString;
    try {
      numericHotelId = validationUtils.validateNumericParam(hotelIdFromBody, 'Hotel ID from body');
      numericFloor = validationUtils.validateNumericParam(String(floor), 'Floor');
      validatedRoomNumber = validationUtils.validateNonEmptyStringParam(room_number, 'Room Number');
      numericCapacity = validationUtils.validateNumericParam(String(capacity), 'Capacity');
      if (room_type_id === 0 && room_type) {
        validatedRoomTypeString = validationUtils.validateNonEmptyStringParam(room_type, 'Room Type Name (string)');
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
const getHotelRooms = async (req, res) => {
    let numericId;
    try {
      numericId = validationUtils.validateNumericParam(req.params.id, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const hotels = await hotelModel.getAllRoomsByHotelId(req.requestId, numericId);
      res.json(hotels);
    } catch (error) {
      console.error('Error getting hotel rooms:', error);
      res.status(500).json({ error: error.message });
    }
  };
const editRoom = async (req, res) => {
    const { id: idParam } = req.params;
    const { room_type_id, floor, room_number, capacity, smoking, for_sale, hotel_id: hotelIdFromBody } = req.body;
    const updated_by = req.user.id;

    let numericId, numericRoomTypeId, numericFloor, validatedRoomNumber, numericCapacity, numericHotelId;
    try {
      numericId = validationUtils.validateNumericParam(idParam, 'Room ID');
      numericRoomTypeId = validationUtils.validateNumericParam(String(room_type_id), 'Room Type ID');
      numericFloor = validationUtils.validateNumericParam(String(floor), 'Floor');
      validatedRoomNumber = validationUtils.validateNonEmptyStringParam(room_number, 'Room Number');
      numericCapacity = validationUtils.validateNumericParam(String(capacity), 'Capacity');
      numericHotelId = validationUtils.validateNumericParam(hotelIdFromBody, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const updatedRoom = await hotelModel.updateRoom(req.requestId, numericId, numericRoomTypeId, numericFloor, validatedRoomNumber, numericCapacity, smoking, for_sale, updated_by, numericHotelId);
      if (!updatedRoom) {
        return res.status(404).json({ message: 'Room not found' });
      }
      res.status(200).json(updatedRoom);
    } catch (error) {
      console.error('Error updating room:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

module.exports = {
  roomCreate,
  getHotelRooms,
  editRoom,
};
