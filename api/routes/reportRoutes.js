const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report');
const { authMiddleware, authMiddlewareAdmin } = require('../middleware/authMiddleware');

// Existing routes
router.get('/report/res/count/:hid/:sdate/:edate', authMiddleware, reportController.getCountReservation);
router.get('/report/res/count/dtl/:hid/:sdate/:edate', authMiddleware, reportController.getCountReservationDetails);
router.get('/report/occ/:period/:hid/:rdate', authMiddleware, reportController.getOccupationByPeriod);
router.get('/report/res/list/:search_type/:hid/:sdate/:edate', authMiddleware, reportController.getReservationListView);
router.get('/report/forecast/:hid/:sdate/:edate', authMiddleware, reportController.getForecastData);
router.get('/report/accounting/:hid/:sdate/:edate', authMiddleware, reportController.getAccountingData);
// Category-based endpoints (new)
router.get('/report/forecast-by-category/:hid/:sdate/:edate', authMiddleware, reportController.getForecastDataByCategory);
router.get('/report/accounting-by-category/:hid/:sdate/:edate', authMiddleware, reportController.getAccountingDataByCategory);
// Backward compatibility endpoints (deprecated but maintained)
router.get('/report/forecast-by-plan/:hid/:sdate/:edate', authMiddleware, reportController.getForecastDataByPlan);
router.get('/report/accounting-by-plan/:hid/:sdate/:edate', authMiddleware, reportController.getAccountingDataByPlan);
router.get('/report/download/res/list/:hid/:sdate/:edate', authMiddleware, reportController.getExportReservationList);
router.get('/report/download/res/dtl/:hid/:sdate/:edate', authMiddleware, reportController.getExportReservationDetails);
router.get('/report/download/res/meals/:hid/:sdate/:edate', authMiddleware, reportController.getExportMealCount);
router.get('/report/download/accommodation-tax/:hid/:sdate/:edate', authMiddleware, reportController.getExportAccommodationTax);

// Daily Report
router.get('/report/daily/available-dates', authMiddleware, reportController.getAvailableMetricDates);
router.get('/report/daily/latest-date', authMiddleware, reportController.getLatestDailyReportDate);
router.get('/report/daily/data/:date', authMiddleware, reportController.getDailyReportData);
router.get('/report/daily/download-excel/:date1/:date2', authMiddleware, reportController.getExportDailyReportExcel);
router.post('/report/daily/generate-for-today', authMiddleware, reportController.generateDailyMetrics);
router.post('/report/daily/data-by-hotel', authMiddleware, reportController.getDailyReportDataByHotel);

// Internal route
router.get('/report/res/inventory/:hid/:sdate/:edate', reportController.getReservationsInventory);
router.get('/report/res/inventory-all/:hid/:sdate/:edate', reportController.getAllInventory);
router.get('/report/res/google/:sid/:hid/:sdate/:edate', reportController.getReservationsForGoogle);
router.get('/report/res/google-parking/:sid/:hid/:sdate/:edate', reportController.getParkingReservationsForGoogle);
router.get('/report/res/google/sheets/create', authMiddlewareAdmin, reportController.createNewGoogleSheet);

// New Report Routes
router.get('/report/active-reservations-change/:hotel_id/:date', authMiddleware, reportController.getActiveReservationsChange);
router.get('/report/monthly-reservation-evolution/:hotel_id/:target_month', authMiddleware, reportController.getMonthlyReservationEvolution);
router.get('/report/sales-by-plan/:hid/:sdate/:edate', authMiddleware, reportController.getSalesByPlan);
router.get('/report/occupation-breakdown/:hid/:sdate/:edate', authMiddleware, reportController.getOccupationBreakdown);
router.post('/report/channel-summary', authMiddleware, reportController.getChannelSummary);
router.get('/report/checkin-out/:hid/:sdate/:edate', authMiddleware, reportController.getCheckInOutReport);

// PDF Report Generation Routes
router.post('/report/pdf/single-month/single-hotel', authMiddleware, reportController.generateSingleMonthSingleHotelPdf);
router.post('/report/pdf/single-month/multiple-hotels', authMiddleware, reportController.generateSingleMonthMultipleHotelsPdf);
router.post('/report/pdf/cumulative/single-hotel', authMiddleware, reportController.generateCumulativeSingleHotelPdf);
router.post('/report/pdf/cumulative/multiple-hotels', authMiddleware, reportController.generateCumulativeMultipleHotelsPdf);

// Batch endpoints for optimized multi-hotel queries
router.post('/report/batch/count', authMiddleware, reportController.getBatchCountReservation);
router.post('/report/batch/forecast', authMiddleware, reportController.getBatchForecastData);
router.post('/report/batch/accounting', authMiddleware, reportController.getBatchAccountingData);
router.post('/report/batch/occupation-breakdown', authMiddleware, reportController.getBatchOccupationBreakdown);
router.post('/report/batch/res-list', authMiddleware, reportController.getBatchReservationListView);
router.post('/report/batch/booker-type', authMiddleware, reportController.getBatchBookerTypeBreakdown);
router.post('/report/batch/future-outlook', authMiddleware, reportController.getBatchFutureOutlook);

module.exports = router;