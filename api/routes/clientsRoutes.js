const express = require('express');
const router = express.Router();
const { getClients, createClientBasic, createClient, updateClient } = require('../controllers/clientsController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/client-list', authMiddleware, getClients);
router.post('/client/basic', authMiddleware, createClientBasic);
router.post('/client/new', authMiddleware, createClient);
router.put('/client/update/:id', authMiddleware, updateClient);

module.exports = router;