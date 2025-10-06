const express = require('express');
const router = express.Router();
const validationControllers = require('../controllers/validation');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/validation/double-booking', authMiddleware, validationControllers.getDoubleBookings);
router.get('/validation/empty-reservations', authMiddleware, validationControllers.getEmptyReservations);
router.delete('/validation/empty-reservations/:id', authMiddleware, validationControllers.deleteEmptyReservation);

module.exports = router;