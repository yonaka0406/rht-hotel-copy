// api/routes/metricsRoutes.js

const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController'); // Adjust path if necessary

// --- Reservations Made Today Metric ---
// GET /api/v1/hotels/:hotelId/metrics/reservations-today?date=YYYY-MM-DD
// (Assuming a base path like /api/v1 is set in your main app.js for this router)
router.get(
    '/hotels/:hotelId/metrics/reservations-today',
    metricsController.getReservationsToday
);

// --- Average Lead Time for New Bookings Metric ---
// GET /api/v1/hotels/:hotelId/metrics/average-lead-time?lookback_days=30
router.get(
    '/hotels/:hotelId/metrics/average-lead-time',
    metricsController.getAverageLeadTime
);


// Add other metrics-related routes here in the future

module.exports = router;
