const express = require('express');
const router = express.Router();
const { 
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
} = require('../controllers/bookingEngineController');
const { authMiddlewareBookingEngine } = require('../middleware/authMiddleware');

// Availability & Inventory
// router.get('/availability/:hotel_id', authMiddleware, getAvailabilityForBookingEngine);
router.get('/room-types/:hotel_id', authMiddlewareBookingEngine, getRoomTypesForBookingEngine);
// router.get('/amenities/:hotel_id', authMiddleware, getAmenitiesForBookingEngine);
router.get('/hotels/:hotel_id', authMiddlewareBookingEngine, getHotelsForBookingEngine);

// Booking Operations
// router.post('/bookings', authMiddleware, createBookingFromBookingEngine);
// router.get('/bookings/:booking_id', authMiddleware, getBookingFromBookingEngine);
// router.put('/bookings/:booking_id', authMiddleware, updateBookingFromBookingEngine);
// router.delete('/bookings/:booking_id', authMiddleware, deleteBookingFromBookingEngine);

// Authentication & Validation
// router.post('/auth/validate-token', authMiddleware, validateBookingEngineToken);
// router.get('/auth/user/:user_id', authMiddleware, getUserForBookingEngine);

// Hotel Information
// router.get('/hotels/:hotel_id/images', authMiddleware, getHotelImagesForBookingEngine);
// router.get('/hotels/:hotel_id/pricing', authMiddleware, getHotelPricingForBookingEngine);

// Cache Management (for PMS to trigger updates)
router.post('/cache/update-hotels', authMiddlewareBookingEngine, async (req, res) => {
  try {
    // Call the controller to get all hotels for cache update
    await getAllHotelsForCache(req, res);
  } catch (error) {
    console.error('Error in hotel cache update endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to update hotel cache',
      message: error.message,
      timestamp: new Date().toISOString(),
      status: 'error'
    });
  }
});

router.post('/cache/update-room-types', authMiddlewareBookingEngine, async (req, res) => {
  try {
    // Call the controller to get all room types for cache update
    await getAllRoomTypesForCache(req, res);
  } catch (error) {
    console.error('Error in room type cache update endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to update room type cache',
      message: error.message,
      timestamp: new Date().toISOString(),
      status: 'error'
    });
  }
});

router.get('/cache/status', authMiddlewareBookingEngine, getCacheStatus);

// router.post('/cache/refresh-availability', authMiddleware, (req, res) => {
//   // This endpoint will be called by the booking engine to refresh availability cache
//   const { hotel_id, room_type_id, start_date, end_date } = req.body;
//   
//   res.status(200).json({ 
//     message: 'Availability cache refresh request received',
//     hotel_id,
//     room_type_id,
//     start_date,
//     end_date,
//     timestamp: new Date().toISOString(),
//     status: 'processing'
//   });
// });

module.exports = router; 