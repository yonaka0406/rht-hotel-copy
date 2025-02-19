const express = require('express');
const router = express.Router();
const { getCountReservation, getOccupationByPeriod } = require('../controllers/reportController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageUsers } = require('../middleware/authMiddleware');

router.get('/report/res/count/:hid/:sdate/:edate', authMiddleware, getCountReservation);
router.get('/report/occ/:period/:hid/:rdate', authMiddleware, getOccupationByPeriod);

module.exports = router;