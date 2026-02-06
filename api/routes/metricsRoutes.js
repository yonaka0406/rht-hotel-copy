const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/metrics/reservations-today/:hotelId/:date', authMiddleware, metricsController.getReservationsToday);
router.get('/metrics/average-lead-time/booking/:hotelId/:lookback/:date', authMiddleware, metricsController.getBookingAverageLeadTime);
router.get('/metrics/average-lead-time/arrival/:hotelId/:lookback/:date', authMiddleware, metricsController.getArrivalAverageLeadTime);
router.get('/metrics/waitlist-entries-today/:hotelId/:date', authMiddleware, metricsController.getWaitlistEntriesToday);

router.get('/metrics/booking-source', authMiddleware, metricsController.fetchBookingSourceBreakdown);
router.get('/metrics/payment-timing', authMiddleware, metricsController.fetchPaymentTimingBreakdown);
router.get('/metrics/booker-type', authMiddleware, metricsController.fetchBookerTypeBreakdown);

module.exports = router;
