const express = require('express');
const router = express.Router();
const { getDoubleBookings, getEmptyReservations, deleteEmptyReservation } = require('../controllers/validationController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/validation/double-booking', authMiddleware, getDoubleBookings);
router.get('/validation/empty-reservations', authMiddleware, getEmptyReservations);
router.delete('/validation/empty-reservations/:id', authMiddleware, deleteEmptyReservation);

module.exports = router;