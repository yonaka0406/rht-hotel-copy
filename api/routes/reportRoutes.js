const express = require('express');
const router = express.Router();
const { getCountReservation, getCountReservationDetails, getOccupationByPeriod, getReservationListView, getForecastData, getAccountingData, getForecastDataByPlan, getAccountingDataByPlan,
    getExportReservationList, getExportReservationDetails, getExportMealCount, getReservationsInventory, getAllInventory,
    getReservationsForGoogle, getParkingReservationsForGoogle, createNewGoogleSheet, getActiveReservationsChange, getMonthlyReservationEvolution, getSalesByPlan, getOccupationBreakdown, getChannelSummary, getCheckInOutReport, getDailyReport, getDailyReportData, getAvailableMetricDates, generateDailyMetrics } = require('../controllers/report');const { authMiddleware, authMiddlewareAdmin } = require('../middleware/authMiddleware');

// Existing routes
router.get('/report/res/count/:hid/:sdate/:edate', authMiddleware, getCountReservation);
router.get('/report/res/count/dtl/:hid/:sdate/:edate', authMiddleware, getCountReservationDetails);
router.get('/report/occ/:period/:hid/:rdate', authMiddleware, getOccupationByPeriod);
router.get('/report/res/list/:search_type/:hid/:sdate/:edate', authMiddleware, getReservationListView);
router.get('/report/forecast/:hid/:sdate/:edate', authMiddleware, getForecastData);
router.get('/report/accounting/:hid/:sdate/:edate', authMiddleware, getAccountingData);
router.get('/report/forecast-by-plan/:hid/:sdate/:edate', authMiddleware, getForecastDataByPlan);
router.get('/report/accounting-by-plan/:hid/:sdate/:edate', authMiddleware, getAccountingDataByPlan);
router.get('/report/download/res/list/:hid/:sdate/:edate', authMiddleware, getExportReservationList);
router.get('/report/download/res/dtl/:hid/:sdate/:edate', authMiddleware, getExportReservationDetails);
router.get('/report/download/res/meals/:hid/:sdate/:edate', authMiddleware, getExportMealCount);

// Daily Report
router.get('/report/daily/available-dates', authMiddleware, getAvailableMetricDates);
router.get('/report/daily/data/:date', authMiddleware, getDailyReportData);
router.get('/report/daily/download/:date', authMiddleware, getDailyReport);
router.post('/report/daily/generate-for-today', authMiddleware, generateDailyMetrics);

// Internal route
router.get('/report/res/inventory/:hid/:sdate/:edate', getReservationsInventory);
router.get('/report/res/inventory-all/:hid/:sdate/:edate', getAllInventory);
router.get('/report/res/google/:sid/:hid/:sdate/:edate', getReservationsForGoogle);
router.get('/report/res/google-parking/:sid/:hid/:sdate/:edate', getParkingReservationsForGoogle);
router.get('/report/res/google/sheets/create', authMiddlewareAdmin, createNewGoogleSheet);

// New Report Routes
router.get('/report/active-reservations-change/:hotel_id/:date', authMiddleware, getActiveReservationsChange);
router.get('/report/monthly-reservation-evolution/:hotel_id/:target_month', authMiddleware, getMonthlyReservationEvolution);
router.get('/report/sales-by-plan/:hid/:sdate/:edate', authMiddleware, getSalesByPlan);
router.get('/report/occupation-breakdown/:hid/:sdate/:edate', authMiddleware, getOccupationBreakdown);
router.post('/report/channel-summary', authMiddleware, getChannelSummary);
router.get('/report/checkin-out/:hid/:sdate/:edate', authMiddleware, getCheckInOutReport);

module.exports = router;