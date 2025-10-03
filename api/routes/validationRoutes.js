const express = require('express');
const router = express.Router();
const { getDoubleBookings } = require('../controllers/validationController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/validation/double-booking', authMiddleware, getDoubleBookings);

module.exports = router;