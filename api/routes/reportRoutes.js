const express = require('express');
const router = express.Router();
const { getCountReservation } = require('../controllers/reportController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageUsers } = require('../middleware/authMiddleware');

router.get('/report/res/count/:hid/:sdate/:edate', authMiddleware, getCountReservation);

module.exports = router;