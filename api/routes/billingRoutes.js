const express = require('express');
const router = express.Router();
const { getBillableListView, getBilledListView } = require('../controllers/billingController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageUsers } = require('../middleware/authMiddleware');

router.get('/billing/res/billable-list/:hid/:sdate/:edate', authMiddleware, getBillableListView);
router.get('/billing/res/billed-list/:hid/:mdate', authMiddleware, getBilledListView);

module.exports = router;