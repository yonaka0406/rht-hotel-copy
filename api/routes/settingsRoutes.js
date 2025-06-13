const express = require('express');
const router = express.Router();
const { getPaymentTypes, addPaymentType, changePaymentTypeVisibility, changePaymentTypeDescription,
    getTaxTypes, addTaxType, changeTaxTypeVisibility, changeTaxTypeDescription, getCompanyStampImage, uploadStampImage,
    handleGetLoyaltyTiers, handleUpsertLoyaltyTiers
 } = require('../controllers/settingsController');
const { authMiddleware, authMiddlewareAdmin } = require('../middleware/authMiddleware');

router.get('/settings/payments/get', authMiddleware, getPaymentTypes);
router.put('/settings/payments/add', authMiddlewareAdmin, addPaymentType);
router.put('/settings/payments/visibility/:id', authMiddlewareAdmin, changePaymentTypeVisibility);
router.put('/settings/payments/description/:id', authMiddlewareAdmin, changePaymentTypeDescription);
router.get('/settings/tax/get', authMiddleware, getTaxTypes);
router.put('/settings/tax/add', authMiddlewareAdmin, addTaxType);
router.put('/settings/tax/visibility/:id', authMiddlewareAdmin, changeTaxTypeVisibility);
router.put('/settings/tax/description/:id', authMiddlewareAdmin, changeTaxTypeDescription);

// Routes for stamp image
router.get('/settings/stamp/get', authMiddleware, getCompanyStampImage); 
router.post('/settings/stamp/upload', authMiddlewareAdmin, uploadStampImage);

// Routes for Loyalty Tiers
router.get('/settings/loyalty-tiers', authMiddleware, handleGetLoyaltyTiers);
router.post('/settings/loyalty-tiers', authMiddlewareAdmin, handleUpsertLoyaltyTiers);

module.exports = router;