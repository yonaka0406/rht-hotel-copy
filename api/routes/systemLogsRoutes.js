const express = require('express');
const router = express.Router();
const systemLogsController = require('../controllers/system_logs');
const { protect } = require('../middleware/authMiddleware');

router.get('/reservation-logs', protect, systemLogsController.getReservationLogs);

module.exports = router;
