const express = require('express');
const router = express.Router();
const { fetchReservationHistory, fetchReservationInventoryChange } = require('../controllers/logController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageDB } = require('../middleware/authMiddleware');

router.get('/log/reservation/:id', authMiddleware, fetchReservationHistory);

// Internal route
router.get('/log/reservation-inventory/:id', fetchReservationInventoryChange);

module.exports = router;