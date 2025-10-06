const express = require('express');
const router = express.Router();
const settingsControllers = require('../controllers/settings');
const { authMiddleware, authMiddlewareAdmin } = require('../middleware/authMiddleware');

router.get('/settings/payments/get', authMiddleware, settingsControllers.getPaymentTypes);
router.put('/settings/payments/add', authMiddlewareAdmin, settingsControllers.addPaymentType);
router.put('/settings/payments/visibility/:id', authMiddlewareAdmin, settingsControllers.changePaymentTypeVisibility);
router.put('/settings/payments/description/:id', authMiddlewareAdmin, settingsControllers.changePaymentTypeDescription);
router.get('/settings/tax/get', authMiddleware, settingsControllers.getTaxTypes);
router.put('/settings/tax/add', authMiddlewareAdmin, settingsControllers.addTaxType);
router.put('/settings/tax/visibility/:id', authMiddlewareAdmin, settingsControllers.changeTaxTypeVisibility);
router.put('/settings/tax/description/:id', authMiddlewareAdmin, settingsControllers.changeTaxTypeDescription);

// Routes for stamp image
router.get('/settings/stamp/get', authMiddleware, settingsControllers.getCompanyStampImage); 
router.post('/settings/stamp/upload', authMiddlewareAdmin, settingsControllers.uploadStampImage);

// Routes for Loyalty Tiers
router.get('/settings/loyalty-tiers', authMiddleware, settingsControllers.handleGetLoyaltyTiers);
router.post('/settings/loyalty-tiers', authMiddlewareAdmin, settingsControllers.handleUpsertLoyaltyTiers);

module.exports = router;