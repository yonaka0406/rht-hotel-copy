const express = require('express');
const router = express.Router();
const { fetchUserActions, fetchAllActions, addAction, editAction, removeAction  } = require('../controllers/crmController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/actions/user/:uid', authMiddleware, fetchUserActions);
router.get('/actions/get', authMiddleware, fetchAllActions);
router.post('/action/new', authMiddleware, addAction);
router.put('/action/edit/:id', authMiddleware, editAction);
router.delete('/action/:id', authMiddleware, removeAction);

module.exports = router;