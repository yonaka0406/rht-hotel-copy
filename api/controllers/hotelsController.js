const pool = require('../config/database');
const { getAllHotels, findHotelById, updateHotel, updateRoomType, updateRoom, getAllRoomsByHotelId } = require('../models/hotel');

// POST
  const hotels = async (req, res) => {
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
        req.body.formal_name, req.body.name, req.body.facility_type.code,
        req.body.open_date, req.body.total_rooms, req.body.postal_code,
        req.body.address, req.body.email, req.body.phone_number,      
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

      // Create partitions for all related tables
      await Promise.all([
        createPartition('room_types'),
        createPartition('rooms'),
        createPartition('room_inventory'),
        createPartition('reservations'),
        createPartition('reservation_details'),
        createPartition('reservation_addons'), 
        createPartition('reservation_clients'),
        createPartition('plans_hotel'),        
        createPartition('addons_hotel')
      ]);

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
    const client = await pool.connect();
    const { name, description, hotel_id } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    try {
      await client.query('BEGIN');

      const insertRoomTypeQuery = `
        INSERT INTO room_types (name, description, hotel_id, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      const result = await client.query(insertRoomTypeQuery, [name, description, hotel_id, created_by, updated_by]);

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
  }

  const roomCreate = async (req, res) => {
    const client = await pool.connect();  
    const { floor, room_number, room_type, room_type_id, capacity, smoking, for_sale, hotel_id } = req.body;    
    const created_by = req.user.id;
    const updated_by = req.user.id;

    let finalRoomTypeId = room_type_id;

    if (room_type_id === 0 && room_type) {
      // Fetch the room_type_id based on the room type name and hotel_id
      const roomTypeQuery = `
        SELECT id FROM room_types
        WHERE name = $1 AND hotel_id = $2
      `;
      const roomTypeResult = await client.query(roomTypeQuery, [room_type, hotel_id]);

      if (roomTypeResult.rows.length === 0) {
        throw new Error('Room type not found');
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
      const result = await client.query(insertRoomQuery, [finalRoomTypeId, floor, room_number, capacity, smoking, for_sale, hotel_id, created_by, updated_by]);
      
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

  }

// GET
  const getHotels = async (req, res) => {
    try {
      const hotels = await getAllHotels();
      res.json(hotels);
    } catch (error) {
      console.error('Error getting hotels:', error);
      res.status(500).json({ error: error.message });
    }
  };

  const getHotelRooms = async (req, res) => {
    const { id } = req.params;

    try {
      const hotels = await getAllRoomsByHotelId(id);
      res.json(hotels);
    } catch (error) {
      console.error('Error getting hotel rooms:', error);
      res.status(500).json({ error: error.message });
    }
  };

// PUT
  const editHotel = async (req, res) => {
    const { id } = req.params;
    const { formal_name, name, email, phone_number, latitude, longitude } = req.body;
    const updated_by = req.user.id;

    try {
      const updatedHotel = await updateHotel(id, formal_name, name, email, phone_number, latitude, longitude, updated_by);
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
  const { id } = req.params;
  const { name, description } = req.body;
  const updated_by = req.user.id;

  try {
    const updatedRoomType = await updateRoomType(id, name, description, updated_by);
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
  const { id } = req.params;
  const { room_type_id, floor, room_number, capacity, smoking, for_sale } = req.body;
  const updated_by = req.user.id;

  try {
    const updatedRoom = await updateRoom(id, room_type_id, floor, room_number, capacity, smoking, for_sale, updated_by);
    if (!updatedRoom) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.status(200).json(updatedRoom);
  } catch (error) {
    console.error('Error updating hotel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


module.exports = { hotels, roomTypeCreate, roomCreate, getHotels, editHotel, editRoomType, editRoom, getHotelRooms };