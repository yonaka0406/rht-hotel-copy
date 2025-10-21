const express = require('express');
const router = express.Router();
const { getReservationLogs } = require('../controllers/system_logs');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/reservation-logs', authMiddleware, getReservationLogs);

module.exports = router;
