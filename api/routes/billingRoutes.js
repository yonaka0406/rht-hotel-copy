const express = require('express');
const router = express.Router();
const { getBillableListView, getBilledListView, generateInvoice, generateReceipt, getPaymentsForReceipts, generateConsolidatedReceipt } = require('../controllers/billingController');
const { authMiddleware, authMiddlewareCRUDAccess } = require('../middleware/authMiddleware');

router.get('/billing/res/billable-list/:hid/:sdate/:edate', authMiddleware, getBillableListView);
router.get('/billing/res/billed-list/:hid/:mdate', authMiddleware, getBilledListView);
router.post('/billing/res/generate/:hid/:invoice', authMiddlewareCRUDAccess, generateInvoice);
router.post('/billing/res/generate-receipt/:hid/:payment_id', authMiddlewareCRUDAccess, generateReceipt);
router.get('/billing/payments-for-receipts/:hid/:sdate/:edate', authMiddleware, getPaymentsForReceipts);
router.post('/billing/res/generate-consolidated-receipt/:hid', authMiddlewareCRUDAccess, generateConsolidatedReceipt);

module.exports = router;