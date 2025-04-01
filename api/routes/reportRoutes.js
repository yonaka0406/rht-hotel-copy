const express = require('express');
const router = express.Router();
const { getCountReservation, getCountReservationDetails, getOccupationByPeriod, getReservationListView, getExportReservationList, getExportReservationDetails, getExportMealCount } = require('../controllers/reportController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageUsers } = require('../middleware/authMiddleware');

router.get('/report/res/count/:hid/:sdate/:edate', authMiddleware, getCountReservation);
router.get('/report/res/count/dtl/:hid/:sdate/:edate', authMiddleware, getCountReservationDetails);
router.get('/report/occ/:period/:hid/:rdate', authMiddleware, getOccupationByPeriod);
router.get('/report/res/list/:hid/:sdate/:edate', authMiddleware, getReservationListView);
router.get('/report/download/res/list/:hid/:sdate/:edate', authMiddleware, getExportReservationList);
router.get('/report/download/res/dtl/:hid/:sdate/:edate', authMiddleware, getExportReservationDetails);
router.get('/report/download/res/meals/:hid/:sdate/:edate', authMiddleware, getExportMealCount);

module.exports = router;