const express = require('express');
const router = express.Router();
const { getClients, getClient, getConvertedName, createClientBasic, createClient, updateClient, updateClientFull } = require('../controllers/clientsController');
const { authMiddleware, authMiddleware_manageClients } = require('../middleware/authMiddleware');

router.get('/client-list/:page', authMiddleware, getClients);
router.get('/client/:id', authMiddleware, getClient);
router.get('/client/name/:name', authMiddleware, getConvertedName);
router.post('/client/basic', authMiddleware, createClientBasic);
router.post('/client/new', authMiddleware, createClient);
router.put('/client/update/:id', authMiddleware, updateClient);
router.put('/crm/client/update/:id', authMiddleware_manageClients, updateClientFull);

module.exports = router;