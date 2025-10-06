const express = require('express');
const router = express.Router();
const logController = require('../controllers/log');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/log/reservation/:id', authMiddleware, logController.fetchReservationHistory);
router.get('/log/client/:id', authMiddleware, logController.fetchClientHistory);

// Internal route
router.get('/log/reservation-inventory/:id/:type', logController.fetchReservationInventoryChange);

module.exports = router;