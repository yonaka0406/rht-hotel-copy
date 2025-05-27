const express = require('express');
const router = express.Router();
const { getCountReservation, getCountReservationDetails, getOccupationByPeriod, getReservationListView, getForecastData, getAccountingData, getExportReservationList, getExportReservationDetails, getExportMealCount, getReservationsInventory, getAllInventory, getReservationsForGoogle } = require('../controllers/reportController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/report/res/count/:hid/:sdate/:edate', authMiddleware, getCountReservation);
router.get('/report/res/count/dtl/:hid/:sdate/:edate', authMiddleware, getCountReservationDetails);
router.get('/report/occ/:period/:hid/:rdate', authMiddleware, getOccupationByPeriod);
router.get('/report/res/list/:hid/:sdate/:edate', authMiddleware, getReservationListView);
router.get('/report/forecast/:hid/:sdate/:edate', authMiddleware, getForecastData);
router.get('/report/accounting/:hid/:sdate/:edate', authMiddleware, getAccountingData);
router.get('/report/download/res/list/:hid/:sdate/:edate', authMiddleware, getExportReservationList);
router.get('/report/download/res/dtl/:hid/:sdate/:edate', authMiddleware, getExportReservationDetails);
router.get('/report/download/res/meals/:hid/:sdate/:edate', authMiddleware, getExportMealCount);

// Internal route
router.get('/report/res/inventory/:hid/:sdate/:edate', getReservationsInventory);
router.get('/report/res/inventory-all/:hid/:sdate/:edate', getAllInventory);
router.get('/report/res/google/:sid/:hid/:sdate/:edate', getReservationsForGoogle);

module.exports = router;