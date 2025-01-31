const express = require('express');
const router = express.Router();
const { getClients, getConvertedName, createClientBasic, createClient, updateClient } = require('../controllers/clientsController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/client-list', authMiddleware, getClients);
router.get('/client/name/:name', authMiddleware, getConvertedName);
router.post('/client/basic', authMiddleware, createClientBasic);
router.post('/client/new', authMiddleware, createClient);
router.put('/client/update/:id', authMiddleware, updateClient);

module.exports = router;