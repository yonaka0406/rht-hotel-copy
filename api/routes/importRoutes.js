const express = require('express');
const router = express.Router();
const importControllers = require('../controllers/import');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageDB } = require('../middleware/authMiddleware');

router.post('/import/yadomaster/clients', authMiddleware_manageDB, importControllers.addYadomasterClients);
router.post('/import/yadomaster/reservations', authMiddleware_manageDB, importControllers.addYadomasterReservations);
router.post('/import/yadomaster/reservation-details', authMiddleware_manageDB, importControllers.addYadomasterDetails);
router.post('/import/yadomaster/reservation-payments', authMiddleware_manageDB, importControllers.addYadomasterPayments);
router.post('/import/yadomaster/reservation-addons', authMiddleware_manageDB, importControllers.addYadomasterAddons);
router.post('/import/yadomaster/reservation-rates', authMiddleware_manageDB, importControllers.addYadomasterRates);

router.post('/import/finance/forecast', authMiddleware_manageDB, importControllers.addForecastData);
router.post('/import/finance/accounting', authMiddleware_manageDB, importControllers.addAccountingData);

router.get('/import/prefilled-template', authMiddleware_manageDB, importControllers.getPrefilledTemplate);

module.exports = router;