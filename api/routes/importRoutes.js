const express = require('express');
const router = express.Router();
const { addYadomasterClients, addYadomasterReservations, addYadomasterDetails, addYadomasterPayments, addYadomasterAddons, addYadomasterRates, addForecastData } = require('../controllers/importController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageDB } = require('../middleware/authMiddleware');

router.post('/import/yadomaster/clients', authMiddleware_manageDB, addYadomasterClients);
router.post('/import/yadomaster/reservations', authMiddleware_manageDB, addYadomasterReservations);
router.post('/import/yadomaster/reservation-details', authMiddleware_manageDB, addYadomasterDetails);
router.post('/import/yadomaster/reservation-payments', authMiddleware_manageDB, addYadomasterPayments);
router.post('/import/yadomaster/reservation-addons', authMiddleware_manageDB, addYadomasterAddons);
router.post('/import/yadomaster/reservation-rates', authMiddleware_manageDB, addYadomasterRates);

router.post('/import/finance/forecast', authMiddleware_manageDB, addForecastData);

module.exports = router;