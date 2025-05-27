const express = require('express');
const router = express.Router();
const { getBillableListView, getBilledListView, generateInvoice } = require('../controllers/billingController');
const { authMiddleware, authMiddlewareCRUDAccess } = require('../middleware/authMiddleware');

router.get('/billing/res/billable-list/:hid/:sdate/:edate', authMiddleware, getBillableListView);
router.get('/billing/res/billed-list/:hid/:mdate', authMiddleware, getBilledListView);
router.post('/billing/res/generate/:hid/:invoice', authMiddlewareCRUDAccess, generateInvoice);

module.exports = router;