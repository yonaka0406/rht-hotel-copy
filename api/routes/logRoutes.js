const express = require('express');
const router = express.Router();
const { fetchReservationHistory, fetchReservationInventoryChange, fetchClientHistory } = require('../controllers/logController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageDB } = require('../middleware/authMiddleware');

router.get('/log/reservation/:id', authMiddleware, fetchReservationHistory);
router.get('/log/client/:id', authMiddleware, fetchClientHistory);

// Internal route
router.get('/log/reservation-inventory/:id/:type', fetchReservationInventoryChange);

module.exports = router;