const express = require('express');
const router = express.Router();
const { fetchReservationHistory } = require('../controllers/logController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageDB } = require('../middleware/authMiddleware');

router.get('/log/reservation/:id', authMiddleware, fetchReservationHistory);

module.exports = router;