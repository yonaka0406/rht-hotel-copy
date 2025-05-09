const express = require('express');
const router = express.Router();
const { getClients, getClient, getConvertedName, getClientReservations, getCustomerID, getClientGroups, createClientBasic, createClient, createAddress, removeAddress, updateClient, updateClientFull, updateAddress, mergeClients } = require('../controllers/clientsController');
const { authMiddleware, authMiddleware_manageClients } = require('../middleware/authMiddleware');

router.get('/client-list/:page', authMiddleware, getClients);
router.get('/client/:id', authMiddleware, getClient);
router.get('/client/name/:name', authMiddleware, getConvertedName);
router.get('/client/reservation/history/:id', authMiddleware, getClientReservations);
router.get('/client/customer-id/:clientId/:customerId', authMiddleware, getCustomerID);
router.get('/client/groups/all', authMiddleware, getClientGroups);
router.post('/client/basic', authMiddleware, createClientBasic);
router.post('/client/new', authMiddleware, createClient);
router.post('/client/address/new', authMiddleware, createAddress);
router.put('/client/update/:id', authMiddleware, updateClient);
router.put('/client/address/update/:id', authMiddleware, updateAddress);
router.put('/crm/client/update/:id', authMiddleware_manageClients, updateClientFull);
router.put('/crm/client/:nid/merge/:oid', authMiddleware, mergeClients);
router.delete('/client/address/del/:id', authMiddleware_manageClients, removeAddress);

module.exports = router;