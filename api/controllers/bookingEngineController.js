const { getPool } = require('../config/database');
const { validateNumericParam, validateNonEmptyStringParam, validateDateStringParam } = require('../utils/validationUtils');
const logger = require('../config/logger');

/**
 * Get hotels data for booking engine
 * Returns hotel information in the format expected by the booking engine
 */
const getHotelsForBookingEngine = async (req, res) => {
  const { hotel_id } = req.params;
  
  let validatedHotelId;
  try {
    validatedHotelId = validateNumericParam(hotel_id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  try {
    const query = `
      SELECT 
        id,
        formal_name,
        name,
        facility_type,
        open_date,
        total_rooms,
        postal_code,
        address,
        email,
        phone_number,
        created_at,
        updated_at
      FROM hotels 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    const result = await client.query(query, [validatedHotelId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    const hotel = result.rows[0];
    
    // Format response according to booking engine expectations
    const response = {
      hotel_id: hotel.id,
      name: hotel.name,
      formal_name: hotel.formal_name,
      facility_type: hotel.facility_type,
      open_date: hotel.open_date,
      total_rooms: hotel.total_rooms,
      postal_code: hotel.postal_code,
      address: hotel.address,
      email: hotel.email,
      phone_number: hotel.phone_number,
      created_at: hotel.created_at,
      updated_at: hotel.updated_at
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error fetching hotel for booking engine:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Get room types for a specific hotel
 * Returns room type information in the format expected by the booking engine
 */
const getRoomTypesForBookingEngine = async (req, res) => {
  const { hotel_id } = req.params;
  
  let validatedHotelId;
  try {
    validatedHotelId = validateNumericParam(hotel_id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  try {
    const query = `
      SELECT 
        rt.id,
        rt.name,
        rt.description,
        rt.hotel_id,
        rt.created_at,
        rt.updated_at
      FROM room_types rt
      INNER JOIN hotels h ON rt.hotel_id = h.id
      WHERE rt.hotel_id = $1 
        AND h.deleted_at IS NULL 
        AND rt.deleted_at IS NULL
      ORDER BY rt.name
    `;
    
    const result = await client.query(query, [validatedHotelId]);
    
    // Format response according to booking engine expectations
    const roomTypes = result.rows.map(roomType => ({
      id: roomType.id,
      name: roomType.name,
      description: roomType.description,
      hotel_id: roomType.hotel_id,
      created_at: roomType.created_at,
      updated_at: roomType.updated_at
    }));

    res.status(200).json({
      hotel_id: validatedHotelId,
      room_types: roomTypes
    });

  } catch (error) {
    logger.error('Error fetching room types for booking engine:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Get availability for a specific hotel and date range
 * Returns availability information in the format expected by the booking engine
 */
const getAvailabilityForBookingEngine = async (req, res) => {
  const { hotel_id } = req.params;
  const { date, room_type_id } = req.query;
  
  let validatedHotelId, validatedDate, validatedRoomTypeId;
  try {
    validatedHotelId = validateNumericParam(hotel_id, 'Hotel ID');
    validatedDate = validateDateStringParam(date, 'Date');
    if (room_type_id) {
      validatedRoomTypeId = validateNumericParam(room_type_id, 'Room Type ID');
    }
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  try {
    // Build query based on whether room_type_id is provided
    let query, params;
    
    if (validatedRoomTypeId) {
      query = `
        SELECT 
          r.id as room_id,
          rt.id as room_type_id,
          rt.name as room_type_name,
          h.id as hotel_id,
          h.name as hotel_name,
          $2::date as date,
          CASE 
            WHEN r.id IN (
              SELECT DISTINCT rd.room_id 
              FROM reservation_details rd
              INNER JOIN reservations res ON rd.reservation_id = res.id
              WHERE res.check_in <= $2::date 
                AND res.check_out > $2::date
                AND res.status != 'cancelled'
            ) THEN 0
            ELSE 1
          END as available_rooms
        FROM rooms r
        INNER JOIN room_types rt ON r.room_type_id = rt.id
        INNER JOIN hotels h ON rt.hotel_id = h.id
        WHERE h.id = $1 
          AND rt.id = $3
          AND h.deleted_at IS NULL 
          AND rt.deleted_at IS NULL
          AND r.deleted_at IS NULL
      `;
      params = [validatedHotelId, validatedDate, validatedRoomTypeId];
    } else {
      query = `
        SELECT 
          rt.id as room_type_id,
          rt.name as room_type_name,
          h.id as hotel_id,
          h.name as hotel_name,
          $2::date as date,
          COUNT(r.id) as total_rooms,
          COUNT(r.id) - COALESCE(
            (SELECT COUNT(DISTINCT rd.room_id)
             FROM reservation_details rd
             INNER JOIN reservations res ON rd.reservation_id = res.id
             INNER JOIN rooms r2 ON rd.room_id = r2.id
             WHERE r2.room_type_id = rt.id
               AND res.check_in <= $2::date 
               AND res.check_out > $2::date
               AND res.status != 'cancelled'), 0
          ) as available_rooms
        FROM room_types rt
        INNER JOIN hotels h ON rt.hotel_id = h.id
        LEFT JOIN rooms r ON rt.id = r.room_type_id AND r.deleted_at IS NULL
        WHERE h.id = $1 
          AND h.deleted_at IS NULL 
          AND rt.deleted_at IS NULL
        GROUP BY rt.id, rt.name, h.id, h.name
        ORDER BY rt.name
      `;
      params = [validatedHotelId, validatedDate];
    }
    
    const result = await client.query(query, params);
    
    // Format response according to booking engine expectations
    const availability = result.rows.map(row => ({
      hotel_id: row.hotel_id,
      room_type_id: row.room_type_id,
      date: row.date,
      available_rooms: parseInt(row.available_rooms),
      total_rooms: row.total_rooms ? parseInt(row.total_rooms) : undefined,
      room_type_name: row.room_type_name
    }));

    res.status(200).json({
      hotel_id: validatedHotelId,
      date: validatedDate,
      availability: availability
    });

  } catch (error) {
    logger.error('Error fetching availability for booking engine:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Get amenities for a specific hotel
 * Returns amenities information in the format expected by the booking engine
 */
const getAmenitiesForBookingEngine = async (req, res) => {
  const { hotel_id } = req.params;
  
  let validatedHotelId;
  try {
    validatedHotelId = validateNumericParam(hotel_id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  try {
    // For now, return empty amenities array
    // This can be expanded when amenities are implemented in the PMS
    res.status(200).json({
      hotel_id: validatedHotelId,
      amenities: []
    });

  } catch (error) {
    logger.error('Error fetching amenities for booking engine:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Get hotel images
 * Returns hotel images in the format expected by the booking engine
 */
const getHotelImagesForBookingEngine = async (req, res) => {
  const { hotel_id } = req.params;
  
  let validatedHotelId;
  try {
    validatedHotelId = validateNumericParam(hotel_id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  try {
    // For now, return empty images array
    // This can be expanded when hotel images are implemented in the PMS
    res.status(200).json({
      hotel_id: validatedHotelId,
      images: []
    });

  } catch (error) {
    logger.error('Error fetching hotel images for booking engine:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Get hotel pricing
 * Returns hotel pricing in the format expected by the booking engine
 */
const getHotelPricingForBookingEngine = async (req, res) => {
  const { hotel_id } = req.params;
  const { date, room_type_id } = req.query;
  
  let validatedHotelId, validatedDate, validatedRoomTypeId;
  try {
    validatedHotelId = validateNumericParam(hotel_id, 'Hotel ID');
    validatedDate = validateDateStringParam(date, 'Date');
    if (room_type_id) {
      validatedRoomTypeId = validateNumericParam(room_type_id, 'Room Type ID');
    }
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  try {
    // Build query to get pricing information
    let query, params;
    
    if (validatedRoomTypeId) {
      query = `
        SELECT 
          p.id as plan_id,
          p.name as plan_name,
          p.description as plan_description,
          pr.rate as price,
          rt.id as room_type_id,
          rt.name as room_type_name,
          h.id as hotel_id
        FROM plans p
        INNER JOIN plan_rates pr ON p.id = pr.plan_id
        INNER JOIN room_types rt ON pr.room_type_id = rt.id
        INNER JOIN hotels h ON rt.hotel_id = h.id
        WHERE h.id = $1 
          AND rt.id = $2
          AND pr.date = $3::date
          AND h.deleted_at IS NULL 
          AND rt.deleted_at IS NULL
          AND p.deleted_at IS NULL
        ORDER BY p.name
      `;
      params = [validatedHotelId, validatedRoomTypeId, validatedDate];
    } else {
      query = `
        SELECT 
          p.id as plan_id,
          p.name as plan_name,
          p.description as plan_description,
          pr.rate as price,
          rt.id as room_type_id,
          rt.name as room_type_name,
          h.id as hotel_id
        FROM plans p
        INNER JOIN plan_rates pr ON p.id = pr.plan_id
        INNER JOIN room_types rt ON pr.room_type_id = rt.id
        INNER JOIN hotels h ON rt.hotel_id = h.id
        WHERE h.id = $1 
          AND pr.date = $2::date
          AND h.deleted_at IS NULL 
          AND rt.deleted_at IS NULL
          AND p.deleted_at IS NULL
        ORDER BY rt.name, p.name
      `;
      params = [validatedHotelId, validatedDate];
    }
    
    const result = await client.query(query, params);
    
    // Format response according to booking engine expectations
    const pricing = result.rows.map(row => ({
      plan_id: row.plan_id,
      plan_name: row.plan_name,
      plan_description: row.plan_description,
      room_type_id: row.room_type_id,
      room_type_name: row.room_type_name,
      price: parseFloat(row.price),
      date: validatedDate
    }));

    res.status(200).json({
      hotel_id: validatedHotelId,
      date: validatedDate,
      pricing: pricing
    });

  } catch (error) {
    logger.error('Error fetching hotel pricing for booking engine:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Validate booking engine token
 * Validates the token sent by the booking engine
 */
const validateBookingEngineToken = async (req, res) => {
  try {
    // For now, return success if user is authenticated
    // This can be expanded with specific booking engine token validation
    res.status(200).json({
      valid: true,
      user_id: req.user.id,
      permissions: req.user.permissions
    });
  } catch (error) {
    logger.error('Error validating booking engine token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user information for booking engine
 * Returns user information in the format expected by the booking engine
 */
const getUserForBookingEngine = async (req, res) => {
  const { user_id } = req.params;
  
  let validatedUserId;
  try {
    validatedUserId = validateNumericParam(user_id, 'User ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  try {
    const query = `
      SELECT 
        id,
        username,
        email,
        first_name,
        last_name,
        status_id,
        created_at,
        updated_at
      FROM users 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    const result = await client.query(query, [validatedUserId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    // Format response according to booking engine expectations
    const response = {
      user_id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      status: user.status_id === 1 ? 'active' : 'inactive',
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error fetching user for booking engine:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Create booking from booking engine
 * Creates a new booking based on data from the booking engine
 */
const createBookingFromBookingEngine = async (req, res) => {
  const { 
    hotel_id, 
    room_type_id, 
    check_in, 
    check_out, 
    num_rooms, 
    customer_info,
    plan_id 
  } = req.body;

  // Validate required fields
  let validatedHotelId, validatedRoomTypeId, validatedCheckIn, validatedCheckOut, validatedNumRooms;
  try {
    validatedHotelId = validateNumericParam(hotel_id, 'Hotel ID');
    validatedRoomTypeId = validateNumericParam(room_type_id, 'Room Type ID');
    validatedCheckIn = validateDateStringParam(check_in, 'Check In Date');
    validatedCheckOut = validateDateStringParam(check_out, 'Check Out Date');
    validatedNumRooms = validateNumericParam(num_rooms, 'Number of Rooms');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create reservation
    const reservationQuery = `
      INSERT INTO reservations (
        hotel_id, check_in, check_out, num_rooms, 
        status, created_by, updated_by
      ) 
      VALUES ($1, $2, $3, $4, 'confirmed', $5, $5)
      RETURNING id
    `;
    
    const reservationResult = await client.query(reservationQuery, [
      validatedHotelId, validatedCheckIn, validatedCheckOut, validatedNumRooms, req.user.id
    ]);
    
    const reservationId = reservationResult.rows[0].id;

    // Create reservation details for each room
    const roomQuery = `
      SELECT id FROM rooms 
      WHERE room_type_id = $1 
        AND hotel_id = $2 
        AND deleted_at IS NULL
      LIMIT $3
    `;
    
    const roomResult = await client.query(roomQuery, [validatedRoomTypeId, validatedHotelId, validatedNumRooms]);
    
    if (roomResult.rows.length < validatedNumRooms) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient rooms available' });
    }

    // Insert reservation details
    for (const room of roomResult.rows) {
      await client.query(`
        INSERT INTO reservation_details (reservation_id, room_id)
        VALUES ($1, $2)
      `, [reservationId, room.id]);
    }

    // Create customer record if customer_info is provided
    let customerId = null;
    if (customer_info && customer_info.email) {
      const customerQuery = `
        INSERT INTO clients (
          first_name, last_name, email, phone,
          created_by, updated_by
        ) 
        VALUES ($1, $2, $3, $4, $5, $5)
        RETURNING id
      `;
      
      const customerResult = await client.query(customerQuery, [
        customer_info.first_name || '',
        customer_info.last_name || '',
        customer_info.email,
        customer_info.phone || '',
        req.user.id
      ]);
      
      customerId = customerResult.rows[0].id;

      // Link customer to reservation
      await client.query(`
        INSERT INTO reservation_clients (reservation_id, client_id)
        VALUES ($1, $2)
      `, [reservationId, customerId]);
    }

    // Add plan rate if plan_id is provided
    if (plan_id) {
      const planRateQuery = `
        INSERT INTO reservation_rates (
          reservation_id, plan_id, room_type_id, rate, date
        )
        SELECT $1, $2, $3, pr.rate, pr.date
        FROM plan_rates pr
        WHERE pr.plan_id = $2 
          AND pr.room_type_id = $3
          AND pr.date >= $4 
          AND pr.date < $5
      `;
      
      await client.query(planRateQuery, [
        reservationId, plan_id, validatedRoomTypeId, validatedCheckIn, validatedCheckOut
      ]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Booking created successfully',
      booking_id: reservationId,
      customer_id: customerId
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating booking from booking engine:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Get booking from booking engine
 * Returns booking information in the format expected by the booking engine
 */
const getBookingFromBookingEngine = async (req, res) => {
  const { booking_id } = req.params;
  
  let validatedBookingId;
  try {
    validatedBookingId = validateNumericParam(booking_id, 'Booking ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  try {
    const query = `
      SELECT 
        r.id,
        r.hotel_id,
        r.check_in,
        r.check_out,
        r.num_rooms,
        r.status,
        r.created_at,
        r.updated_at,
        h.name as hotel_name,
        rt.name as room_type_name,
        c.first_name,
        c.last_name,
        c.email,
        c.phone
      FROM reservations r
      INNER JOIN hotels h ON r.hotel_id = h.id
      INNER JOIN reservation_details rd ON r.id = rd.reservation_id
      INNER JOIN rooms rm ON rd.room_id = rm.id
      INNER JOIN room_types rt ON rm.room_type_id = rt.id
      LEFT JOIN reservation_clients rc ON r.id = rc.reservation_id
      LEFT JOIN clients c ON rc.client_id = c.id
      WHERE r.id = $1 
        AND h.deleted_at IS NULL
      LIMIT 1
    `;
    
    const result = await client.query(query, [validatedBookingId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];
    
    // Format response according to booking engine expectations
    const response = {
      booking_id: booking.id,
      hotel_id: booking.hotel_id,
      hotel_name: booking.hotel_name,
      room_type_name: booking.room_type_name,
      check_in: booking.check_in,
      check_out: booking.check_out,
      num_rooms: booking.num_rooms,
      status: booking.status,
      customer: {
        first_name: booking.first_name,
        last_name: booking.last_name,
        email: booking.email,
        phone: booking.phone
      },
      created_at: booking.created_at,
      updated_at: booking.updated_at
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error fetching booking for booking engine:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Update booking from booking engine
 * Updates an existing booking based on data from the booking engine
 */
const updateBookingFromBookingEngine = async (req, res) => {
  const { booking_id } = req.params;
  const { 
    check_in, 
    check_out, 
    num_rooms, 
    customer_info,
    status 
  } = req.body;

  let validatedBookingId, validatedCheckIn, validatedCheckOut, validatedNumRooms;
  try {
    validatedBookingId = validateNumericParam(booking_id, 'Booking ID');
    if (check_in) validatedCheckIn = validateDateStringParam(check_in, 'Check In Date');
    if (check_out) validatedCheckOut = validateDateStringParam(check_out, 'Check Out Date');
    if (num_rooms) validatedNumRooms = validateNumericParam(num_rooms, 'Number of Rooms');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if booking exists
    const existingBooking = await client.query(`
      SELECT id, status FROM reservations WHERE id = $1
    `, [validatedBookingId]);

    if (existingBooking.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update reservation
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (validatedCheckIn) {
      updateFields.push(`check_in = $${paramCount++}`);
      updateValues.push(validatedCheckIn);
    }
    if (validatedCheckOut) {
      updateFields.push(`check_out = $${paramCount++}`);
      updateValues.push(validatedCheckOut);
    }
    if (validatedNumRooms) {
      updateFields.push(`num_rooms = $${paramCount++}`);
      updateValues.push(validatedNumRooms);
    }
    if (status) {
      updateFields.push(`status = $${paramCount++}`);
      updateValues.push(status);
    }

    updateFields.push(`updated_by = $${paramCount++}`);
    updateValues.push(req.user.id);

    if (updateFields.length > 1) { // More than just updated_by
      const updateQuery = `
        UPDATE reservations 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
      `;
      updateValues.push(validatedBookingId);
      
      await client.query(updateQuery, updateValues);
    }

    // Update customer info if provided
    if (customer_info) {
      const customerQuery = `
        UPDATE clients 
        SET 
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          email = COALESCE($3, email),
          phone = COALESCE($4, phone),
          updated_by = $5,
          updated_at = NOW()
        WHERE id = (
          SELECT client_id 
          FROM reservation_clients 
          WHERE reservation_id = $6
        )
      `;
      
      await client.query(customerQuery, [
        customer_info.first_name,
        customer_info.last_name,
        customer_info.email,
        customer_info.phone,
        req.user.id,
        validatedBookingId
      ]);
    }

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Booking updated successfully',
      booking_id: validatedBookingId
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating booking from booking engine:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Delete booking from booking engine
 * Cancels an existing booking
 */
const deleteBookingFromBookingEngine = async (req, res) => {
  const { booking_id } = req.params;
  
  let validatedBookingId;
  try {
    validatedBookingId = validateNumericParam(booking_id, 'Booking ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if booking exists
    const existingBooking = await client.query(`
      SELECT id, status FROM reservations WHERE id = $1
    `, [validatedBookingId]);

    if (existingBooking.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Update booking status to cancelled
    await client.query(`
      UPDATE reservations 
      SET status = 'cancelled', updated_by = $1, updated_at = NOW()
      WHERE id = $2
    `, [req.user.id, validatedBookingId]);

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Booking cancelled successfully',
      booking_id: validatedBookingId
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error cancelling booking from booking engine:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  getHotelsForBookingEngine,
  getRoomTypesForBookingEngine,
  getAvailabilityForBookingEngine,
  getAmenitiesForBookingEngine,
  getHotelImagesForBookingEngine,
  getHotelPricingForBookingEngine,
  validateBookingEngineToken,
  getUserForBookingEngine,
  createBookingFromBookingEngine,
  getBookingFromBookingEngine,
  updateBookingFromBookingEngine,
  deleteBookingFromBookingEngine
}; 