const express = require('express');
const router = express.Router();
const { getPaymentTypes, addPaymentType, changePaymentTypeVisibility, changePaymentTypeDescription,
    getTaxTypes, addTaxType, changeTaxTypeVisibility, changeTaxTypeDescription, uploadStampImage
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

// Route for uploading stamp image
router.post('/settings/stamp/upload', authMiddlewareAdmin, uploadStampImage);

module.exports = router;