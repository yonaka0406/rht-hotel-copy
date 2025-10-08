const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metrics');

router.get('/metrics/reservations-today/:hotelId/:date', metricsController.getReservationsToday);
router.get('/metrics/average-lead-time/booking/:hotelId/:lookback/:date', metricsController.getBookingAverageLeadTime);
router.get('/metrics/average-lead-time/arrival/:hotelId/:lookback/:date', metricsController.getArrivalAverageLeadTime);
router.get('/metrics/waitlist-entries-today/:hotelId/:date', metricsController.getWaitlistEntriesToday);

router.get('/metrics/booking-source', metricsController.fetchBookingSourceBreakdown);
router.get('/metrics/payment-timing', metricsController.fetchPaymentTimingBreakdown);
router.get('/metrics/booker-type', metricsController.fetchBookerTypeBreakdown);

module.exports = router;
