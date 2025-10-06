const { getPool } = require('../../config/database');
const validationUtils = require('../../utils/validationUtils');
const hotelModel = require('../../models/hotel');

const roomTypeCreate = async (req, res) => {
    const pool = getPool(req.requestId);
    const client = await pool.connect();
    const { name, description, hotel_id: hotelIdFromBody } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    let numericHotelId, validatedRoomTypeName;
    try {
      numericHotelId = validationUtils.validateNumericParam(hotelIdFromBody, 'Hotel ID from body');
      validatedRoomTypeName = validationUtils.validateNonEmptyStringParam(name, 'Room Type Name');
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
const getHotelRoomTypes = async (req, res) => {
    let numericId;
    try {
      numericId = validationUtils.validateNumericParam(req.params.id, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const hotels = await hotelModel.getAllHotelRoomTypesById(req.requestId, numericId);
      res.json(hotels);
    } catch (error) {
      console.error('Error getting hotel room types:', error);
      res.status(500).json({ error: error.message });
    }
  };
const editRoomType = async (req, res) => {
    const { id: idParam } = req.params;
    const { name, description, hotel_id: hotelIdFromBody } = req.body;
    const updated_by = req.user.id;

    let numericId, validatedName, numericHotelId;
    try {
      numericId = validationUtils.validateNumericParam(idParam, 'Room Type ID');
      validatedName = validationUtils.validateNonEmptyStringParam(name, 'Room Type Name');
      numericHotelId = validationUtils.validateNumericParam(hotelIdFromBody, 'Hotel ID');
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const updatedRoomType = await hotelModel.updateRoomType(req.requestId, numericId, validatedName, description, updated_by, numericHotelId);
      if (!updatedRoomType) {
        return res.status(404).json({ message: 'Room type not found' });
      }
      res.status(200).json(updatedRoomType);
    } catch (error) {
      console.error('Error updating room type:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

module.exports = {
  roomTypeCreate,
  getHotelRoomTypes,
  editRoomType,
};
