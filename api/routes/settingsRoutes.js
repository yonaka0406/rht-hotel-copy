const express = require('express');
const router = express.Router();
const { getPaymentTypes, addPaymentType } = require('../controllers/settingsController');
const { authMiddleware, authMiddlewareAdmin } = require('../middleware/authMiddleware');

router.get('/settings/payments/get', authMiddleware, getPaymentTypes);
router.put('/settings/payments/add', authMiddlewareAdmin, addPaymentType);

module.exports = router;