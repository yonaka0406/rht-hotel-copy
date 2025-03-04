const express = require('express');
const router = express.Router();
const { getPaymentTypes, addPaymentType, changePaymentTypeVisibility, changePaymentTypeDescription } = require('../controllers/settingsController');
const { authMiddleware, authMiddlewareAdmin } = require('../middleware/authMiddleware');

router.get('/settings/payments/get', authMiddleware, getPaymentTypes);
router.put('/settings/payments/add', authMiddlewareAdmin, addPaymentType);
router.put('/settings/payments/visibility/:id', authMiddlewareAdmin, changePaymentTypeVisibility);
router.put('/settings/payments/description/:id', authMiddlewareAdmin, changePaymentTypeDescription);

module.exports = router;