const express = require('express');
const router = express.Router();
// const { 
//   getHotelsForBookingEngine,
//   getRoomTypesForBookingEngine,
//   getAvailabilityForBookingEngine,
//   getAmenitiesForBookingEngine,
//   getHotelImagesForBookingEngine,
//   getHotelPricingForBookingEngine,
//   validateBookingEngineToken,
//   getUserForBookingEngine,
//   createBookingFromBookingEngine,
//   getBookingFromBookingEngine,
//   updateBookingFromBookingEngine,
//   deleteBookingFromBookingEngine
// } = require('../controllers/bookingEngineController');
const { authMiddlewareBookingEngine } = require('../middleware/authMiddleware');

// Availability & Inventory
// router.get('/booking-engine/availability/:hotel_id', authMiddleware, getAvailabilityForBookingEngine);
// router.get('/booking-engine/room-types/:hotel_id', authMiddleware, getRoomTypesForBookingEngine);
// router.get('/booking-engine/amenities/:hotel_id', authMiddleware, getAmenitiesForBookingEngine);
// router.get('/booking-engine/hotels/:hotel_id', authMiddleware, getHotelsForBookingEngine);

// Booking Operations
// router.post('/booking-engine/bookings', authMiddleware, createBookingFromBookingEngine);
// router.get('/booking-engine/bookings/:booking_id', authMiddleware, getBookingFromBookingEngine);
// router.put('/booking-engine/bookings/:booking_id', authMiddleware, updateBookingFromBookingEngine);
// router.delete('/booking-engine/bookings/:booking_id', authMiddleware, deleteBookingFromBookingEngine);

// Authentication & Validation
// router.post('/booking-engine/auth/validate-token', authMiddleware, validateBookingEngineToken);
// router.get('/booking-engine/auth/user/:user_id', authMiddleware, getUserForBookingEngine);

// Hotel Information
// router.get('/booking-engine/hotels/:hotel_id/images', authMiddleware, getHotelImagesForBookingEngine);
// router.get('/booking-engine/hotels/:hotel_id/pricing', authMiddleware, getHotelPricingForBookingEngine);

// Cache Management (for PMS to trigger updates)
router.post('/booking-engine/cache/update-hotels', authMiddlewareBookingEngine, (req, res) => {
  // This endpoint will be called by the booking engine to update hotel cache
  res.status(200).json({ 
    message: 'Hotel cache update request received',
    timestamp: new Date().toISOString(),
    status: 'pending'
  });
});

router.post('/booking-engine/cache/update-room-types', authMiddlewareBookingEngine, (req, res) => {
  // This endpoint will be called by the booking engine to update room type cache
  res.status(200).json({ 
    message: 'Room type cache update request received',
    timestamp: new Date().toISOString(),
    status: 'pending'
  });
});

// router.get('/booking-engine/cache/status', authMiddleware, (req, res) => {
//   // This endpoint will return cache status to the booking engine
//   res.status(200).json({
//     hotels: {
//       last_updated: new Date().toISOString(),
//       is_active: true,
//       cache_ttl_minutes: 1440
//     },
//     room_types: {
//       last_updated: new Date().toISOString(),
//       is_active: true,
//       cache_ttl_minutes: 1440
//     },
//     availability: {
//       last_updated: new Date().toISOString(),
//       is_active: true,
//       cache_ttl_minutes: 15
//     }
//   });
// });

// router.post('/booking-engine/cache/refresh-availability', authMiddleware, (req, res) => {
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