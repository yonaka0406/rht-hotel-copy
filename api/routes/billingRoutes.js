const express = require('express');
const router = express.Router();
const { getBillableListView, getBilledListView, generateInvoice, generateInvoiceExcel, getPaymentsForReceipts, handleGenerateReceiptRequest } = require('../controllers/billing');
const { authMiddleware, authMiddlewareCRUDAccess } = require('../middleware/authMiddleware');

router.get('/billing/res/billable-list/:hid/:sdate/:edate', authMiddleware, getBillableListView);
router.get('/billing/res/billed-list/:hid/:mdate', authMiddleware, getBilledListView);
router.post('/billing/res/generate/excel-invoice/:hid/:invoice', authMiddlewareCRUDAccess, generateInvoiceExcel);
router.post('/billing/res/generate/:hid/:invoice', authMiddlewareCRUDAccess, generateInvoice);
router.post('/billing/res/generate-receipt/:hid/:payment_id', authMiddlewareCRUDAccess, handleGenerateReceiptRequest);
router.get('/billing/payments-for-receipts/:hid/:sdate/:edate', authMiddleware, getPaymentsForReceipts);
router.post('/billing/res/generate-consolidated-receipt/:hid', authMiddlewareCRUDAccess, handleGenerateReceiptRequest);

module.exports = router;