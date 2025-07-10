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
 * Get all hotels for cache update
 * Returns all active hotels for the booking engine to cache
 */
const getAllHotelsForCache = async (req, res) => {
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
      WHERE deleted_at IS NULL
      ORDER BY id
    `;
    
    const result = await client.query(query);
    
    // Format response according to booking engine expectations
    const hotels = result.rows.map(hotel => ({
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
    }));

    res.status(200).json({
      hotels: hotels,
      count: hotels.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching all hotels for cache:', error);
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
 * Get all room types for cache update
 * Returns all active room types for the booking engine to cache
 */
const getAllRoomTypesForCache = async (req, res) => {
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
      WHERE h.deleted_at IS NULL 
        AND rt.deleted_at IS NULL
      ORDER BY rt.hotel_id, rt.name
    `;
    
    const result = await client.query(query);
    
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
      room_types: roomTypes,
      count: roomTypes.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching all room types for cache:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Get cache status for the booking engine
 * Returns the current status of various cache types
 */
const getCacheStatus = async (req, res) => {
  try {
    // For now, return a basic status structure
    // In a full implementation, this would query actual cache status from the database
    const status = {
      hotels: {
        last_updated: new Date().toISOString(),
        is_active: true,
        cache_ttl_minutes: 1440
      },
      room_types: {
        last_updated: new Date().toISOString(),
        is_active: true,
        cache_ttl_minutes: 1440
      },
      availability: {
        last_updated: new Date().toISOString(),
        is_active: true,
        cache_ttl_minutes: 15
      }
    };

    res.status(200).json(status);
  } catch (error) {
    logger.error('Error getting cache status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Commented out other controllers for now - only hotel and room type functions are needed for cache updates

/*
const getAvailabilityForBookingEngine = async (req, res) => {
  // Availability controller - commented out for now
};

const getAmenitiesForBookingEngine = async (req, res) => {
  // Amenities controller - commented out for now
};

const getHotelImagesForBookingEngine = async (req, res) => {
  // Hotel images controller - commented out for now
};

const getHotelPricingForBookingEngine = async (req, res) => {
  // Hotel pricing controller - commented out for now
};

const validateBookingEngineToken = async (req, res) => {
  // Token validation controller - commented out for now
};

const getUserForBookingEngine = async (req, res) => {
  // User controller - commented out for now
};

const createBookingFromBookingEngine = async (req, res) => {
  // Create booking controller - commented out for now
};

const getBookingFromBookingEngine = async (req, res) => {
  // Get booking controller - commented out for now
};

const updateBookingFromBookingEngine = async (req, res) => {
  // Update booking controller - commented out for now
};

const deleteBookingFromBookingEngine = async (req, res) => {
  // Delete booking controller - commented out for now
};
*/

module.exports = {
  getHotelsForBookingEngine,
  getAllHotelsForCache,
  getRoomTypesForBookingEngine,
  getAllRoomTypesForCache,
  getCacheStatus
  // getAvailabilityForBookingEngine,
  // getAmenitiesForBookingEngine,
  // getHotelImagesForBookingEngine,
  // getHotelPricingForBookingEngine,
  // validateBookingEngineToken,
  // getUserForBookingEngine,
  // createBookingFromBookingEngine,
  // getBookingFromBookingEngine,
  // updateBookingFromBookingEngine,
  // deleteBookingFromBookingEngine
}; 