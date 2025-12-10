const { validateNumericParam } = require('../utils/validationUtils');
const logger = require('../config/logger');
const bookingEngineModel = require('../models/bookingEngine');

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

  try {
    const hotel = await bookingEngineModel.getHotelForBookingEngine(req.requestId, validatedHotelId);
    
    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

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

  try {
    const roomTypes = await bookingEngineModel.getRoomTypesForBookingEngine(req.requestId, validatedHotelId);
    
    // Format response according to booking engine expectations
    const formattedRoomTypes = roomTypes.map(roomType => ({
      id: roomType.id,
      name: roomType.name,
      description: roomType.description,
      hotel_id: roomType.hotel_id,
      created_at: roomType.created_at,
      updated_at: roomType.updated_at
    }));

    res.status(200).json({
      hotel_id: validatedHotelId,
      room_types: formattedRoomTypes
    });

  } catch (error) {
    logger.error('Error fetching room types for booking engine:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get plans for a specific hotel
 * Returns plan information in the format expected by the booking engine
 */
const getPlansForBookingEngine = async (req, res) => {
  const { hotel_id } = req.params;
  
  let validatedHotelId;
  try {
    validatedHotelId = validateNumericParam(hotel_id, 'Hotel ID');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    const plans = await bookingEngineModel.getPlansForBookingEngine(req.requestId, validatedHotelId);
    
    // Format response according to booking engine expectations
    const formattedPlans = plans.map(plan => ({
      global_plan_id: plan.plans_global_id,
      hotel_plan_id: plan.plans_hotel_id,
      name: plan.name,
      description: plan.description,
      plan_type: plan.plan_type,
      color: plan.color
    }));

    res.status(200).json({
      hotel_id: validatedHotelId,
      plans: formattedPlans
    });

  } catch (error) {
    logger.error('Error fetching plans for booking engine:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all hotels for booking engine
 * Returns all active hotels in the format expected by the booking engine
 */
const getAllHotelsForBookingEngine = async (req, res) => {
  try {
    const hotels = await bookingEngineModel.getAllHotelsForBookingEngine(req.requestId);
    
    // Format response according to booking engine expectations
    const formattedHotels = hotels.map(hotel => ({
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

    res.status(200).json({ hotels: formattedHotels });

  } catch (error) {
    logger.error('Error fetching all hotels for booking engine:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getHotelsForBookingEngine,
  getRoomTypesForBookingEngine,
  getPlansForBookingEngine,
  getAllHotelsForBookingEngine
}; 