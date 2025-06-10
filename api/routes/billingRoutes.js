const express = require('express');
const router = express.Router();
const {
    getBillableListView,
    // getBilledListView, // Assuming this might be deprecated if not used elsewhere
    // generateInvoice, // Assuming this might be deprecated if not used elsewhere
    getPaymentsForReceipts, // Keep if still used
    handleGenerateReceiptRequest // New unified handler
} = require('../controllers/billingController');
const { authMiddleware, authMiddlewareCRUDAccess } = require('../middleware/authMiddleware');

router.get('/billing/res/billable-list/:hid/:sdate/:edate', authMiddleware, getBillableListView);
// router.get('/billing/res/billed-list/:hid/:mdate', authMiddleware, getBilledListView); // Example if removing
// router.post('/billing/res/generate/:hid/:invoice', authMiddlewareCRUDAccess, generateInvoice); // Example if removing
router.post('/billing/res/generate-receipt/:hid/:payment_id', authMiddlewareCRUDAccess, handleGenerateReceiptRequest); // Updated
router.get('/billing/payments-for-receipts/:hid/:sdate/:edate', authMiddleware, getPaymentsForReceipts);
router.post('/billing/res/generate-consolidated-receipt/:hid', authMiddlewareCRUDAccess, handleGenerateReceiptRequest); // Updated

module.exports = router;