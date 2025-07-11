const express = require('express');
const router = express.Router();
const { 
  getHotelsForBookingEngine,
  getRoomTypesForBookingEngine,
  getPlansForBookingEngine,
  getAllHotelsForBookingEngine
} = require('../controllers/bookingEngineController');
const { authMiddlewareBookingEngine } = require('../middleware/authMiddleware');

// Hotel and Room Type Data
router.get('/hotels', authMiddlewareBookingEngine, getAllHotelsForBookingEngine);
router.get('/hotels/:hotel_id', authMiddlewareBookingEngine, getHotelsForBookingEngine);
router.get('/room-types/:hotel_id', authMiddlewareBookingEngine, getRoomTypesForBookingEngine);
router.get('/plans/:hotel_id', authMiddlewareBookingEngine, getPlansForBookingEngine);

module.exports = router; 