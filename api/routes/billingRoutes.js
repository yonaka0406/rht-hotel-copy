const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing');
const { authMiddleware, authMiddlewareCRUDAccess } = require('../middleware/authMiddleware');

router.get('/billing/res/billable-list/:hid/:sdate/:edate', authMiddleware, billingController.getBillableListView);
router.get('/billing/res/billed-list/:hid/:mdate', authMiddleware, billingController.getBilledListView);
router.post('/billing/res/generate/excel-invoice/:hid/:invoice', authMiddlewareCRUDAccess, billingController.generateInvoiceExcel);
router.post('/billing/res/generate/:hid/:invoice', authMiddlewareCRUDAccess, billingController.generateInvoice);
router.post('/billing/res/generate-receipt/:hid/:payment_id', authMiddlewareCRUDAccess, billingController.handleGenerateReceiptRequest);
router.get('/billing/payments-for-receipts/:hid/:sdate/:edate', authMiddleware, billingController.getPaymentsForReceipts);
router.post('/billing/res/generate-consolidated-receipt/:hid', authMiddlewareCRUDAccess, billingController.handleGenerateReceiptRequest);

module.exports = router;