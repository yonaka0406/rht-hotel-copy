const express = require('express');
const router = express.Router();
const { getClients, createClientBasic } = require('../controllers/clientsController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/client-list', authMiddleware, getClients);
router.post('/client/basic', authMiddleware, createClientBasic);

module.exports = router;