const express = require('express');
const router = express.Router();
const { getClients, getClient, getGroup, getConvertedName, getClientReservations, getCustomerID, getClientGroups, createClientBasic, createClient, createAddress, createClientGroup, removeAddress, updateClient, updateClientFull, updateAddress, updateClientGroup, updateGroup, mergeClients } = require('../controllers/clientsController');
const { authMiddleware, authMiddlewareCRUDAccess, authMiddleware_manageClients } = require('../middleware/authMiddleware');

router.get('/client-list/:page', authMiddleware, getClients);
router.get('/client/:id', authMiddleware, getClient);
router.get('/client/group/:id', authMiddleware, getGroup);
router.get('/client/name/:name', authMiddleware, getConvertedName);
router.get('/client/reservation/history/:id', authMiddleware, getClientReservations);
router.get('/client/customer-id/:clientId/:customerId', authMiddleware, getCustomerID);
router.get('/client/groups/all', authMiddleware, getClientGroups);
router.post('/client/basic', authMiddlewareCRUDAccess, createClientBasic);
router.post('/client/new', authMiddlewareCRUDAccess, createClient);
router.post('/client/address/new', authMiddlewareCRUDAccess, createAddress);
router.post('/client/group/new', authMiddlewareCRUDAccess, createClientGroup);
router.put('/client/update/:id', authMiddlewareCRUDAccess, updateClient);
router.put('/client/address/update/:id', authMiddlewareCRUDAccess, updateAddress);
router.put('/client/group/:gid/update/:id', authMiddlewareCRUDAccess, updateClientGroup);
router.put('/client/group/update/:gid', authMiddlewareCRUDAccess, updateGroup);
router.put('/crm/client/update/:id', authMiddleware_manageClients, updateClientFull);
router.put('/crm/client/:nid/merge/:oid', authMiddlewareCRUDAccess, mergeClients);
router.delete('/client/address/del/:id', authMiddleware_manageClients, removeAddress);

module.exports = router;