const { getPool } = require('../config/database');
const { getAllHotels, getHotelSiteController, updateHotel, updateHotelSiteController, updateRoomType, updateRoom, updateHotelCalendar, selectBlockedRooms, getAllHotelRoomTypesById, getAllRoomsByHotelId, deleteBlockedRooms } = require('../models/hotel');

// POST
  const hotels = async (req, res) => {
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
      
      const hotelResult = await pool.query(hotelQuery, [      
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
        await pool.query(partitionQuery);
      };

      const createPartitionsSequentially = async () => {
        await createPartition('room_types');
        await createPartition('rooms');
        await createPartition('room_inventory');
        await createPartition('reservations');
        await createPartition('reservation_details');
        await createPartition('reservation_addons');
        await createPartition('reservation_clients');
        await createPartition('reservation_payments');
        await createPartition('reservation_rates');        
        await createPartition('plans_hotel');
        await createPartition('addons_hotel');
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
      const result = await pool.query(insertRoomTypeQuery, [name, description, hotel_id, created_by, updated_by]);

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
      console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
    }
  };
  const roomCreate = async (req, res) => {
    const pool = getPool(req.requestId);
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
      const result = await pool.query(insertRoomQuery, [finalRoomTypeId, floor, room_number, capacity, smoking, for_sale, hotel_id, created_by, updated_by]);
      
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
      console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
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
    const { id } = req.params;

    try {
      const hotels = await getAllHotelRoomTypesById(req.requestId, id);
      res.json(hotels);
    } catch (error) {
      console.error('Error getting hotel room types:', error);
      res.status(500).json({ error: error.message });
    }
  };
  const getHotelRooms = async (req, res) => {
    const { id } = req.params;

    try {
      const hotels = await getAllRoomsByHotelId(req.requestId, id);
      res.json(hotels);
    } catch (error) {
      console.error('Error getting hotel rooms:', error);
      res.status(500).json({ error: error.message });
    }
  };
  const getBlockedRooms = async (req, res) => {
    const { id } = req.params;

    try {
      const blocked = await selectBlockedRooms(req.requestId, id);
      res.json(blocked);
    } catch (error) {
      console.error('Error getting hotel blocked rooms:', error);
      res.status(500).json({ error: error.message });
    }
  };
  const fetchHotelSiteController = async (req, res) => {
    const { id } = req.params;

    try {
      const hotel = await getHotelSiteController(req.requestId, id);
      res.json(hotel);
    } catch (error) {
      console.error('Error getting hotels:', error);
      res.status(500).json({ error: error.message });
    }
  };


// PUT
  const editHotel = async (req, res) => {
    const { id } = req.params;
    const { formal_name, name, postal_code, address, email, phone_number, latitude, longitude } = req.body;
    const updated_by = req.user.id;

    try {
      const updatedHotel = await updateHotel(req.requestId, id, formal_name, name, postal_code, address, email, phone_number, latitude, longitude, updated_by);
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
    const { id } = req.params;
    const data = req.body;    

    try {
      const updatedHotel = await updateHotelSiteController(req.requestId, id, data);
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
      const updatedRoomType = await updateRoomType(req.requestId, id, name, description, updated_by);
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
      const updatedRoom = await updateRoom(req.requestId, id, room_type_id, floor, room_number, capacity, smoking, for_sale, updated_by);
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
    const { startDate, endDate } = req.params;
    const { hotelId, roomIds, comment } = req.body;
    const updated_by = req.user.id;

    try {
      const updatedRoom = await updateHotelCalendar(req.requestId, hotelId, roomIds, startDate, endDate, comment, updated_by);
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
    const { id } = req.params;
    const user_id = req.user.id;

    try {
      const unblock = await deleteBlockedRooms(req.requestId, id, user_id);
      if (!unblock) {
        return res.status(404).json({ success: false, message: 'Reservation not found' });
      }
      res.status(200).json({ success: true, message: 'Calendar settings updated.' });
    } catch (error) {
      console.error('Error updating hotel:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
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
  editBlockedRooms 
};