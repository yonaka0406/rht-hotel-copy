const express = require('express');
const router = express.Router();
const { fetchUserActions, fetchAllActions  } = require('../controllers/crmController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/actions/user/:uid', authMiddleware, fetchUserActions);
router.get('/actions/get', authMiddleware, fetchAllActions);

module.exports = router;