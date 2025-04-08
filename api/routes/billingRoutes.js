const express = require('express');
const router = express.Router();
const { getBillableListView } = require('../controllers/billingController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageUsers } = require('../middleware/authMiddleware');

router.get('/billing/res/billable-list/:hid/:sdate/:edate', authMiddleware, getBillableListView);

module.exports = router;