const express = require('express');
const router = express.Router();
const { getDoubleBookings, getEmptyReservations } = require('../controllers/validationController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/validation/double-booking', authMiddleware, getDoubleBookings);
router.get('/validation/empty-reservations', authMiddleware, getEmptyReservations);

module.exports = router;