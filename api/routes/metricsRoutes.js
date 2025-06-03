const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');

router.get('/metrics/reservations-today/:hotelId/:date', metricsController.getReservationsToday);
router.get('/metrics/average-lead-time/booking/:hotelId/:lookback/:date', metricsController.getBookingAverageLeadTime);
router.get('/metrics/average-lead-time/arrival/:hotelId/:lookback/:date', metricsController.getArrivalAverageLeadTime);

module.exports = router;
