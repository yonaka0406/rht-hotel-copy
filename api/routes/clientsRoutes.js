const express = require('express');
const router = express.Router();
const clientsController = require('../controllers/clients');
const { handleGetClientProjects } = require('../controllers/projectsController');
const { authMiddleware, authMiddlewareCRUDAccess, authMiddleware_manageClients } = require('../middleware/authMiddleware');

router.get('/client-list/:page', authMiddleware, clientsController.getClients);
router.get('/clients/stats', authMiddleware, clientsController.getClientStats);
router.get('/clients/next-customer-id', authMiddleware, clientsController.getNextCustomerId);
router.get('/client/:id', authMiddleware, clientsController.getClient);
router.get('/clients/:id/candidates', authMiddleware, clientsController.getClientCandidates);
router.get('/client/group/:id', authMiddleware, clientsController.getGroup);
router.get('/client/name/:name', authMiddleware, clientsController.getConvertedName);
router.get('/client/reservation/history/:id', authMiddleware, clientsController.getClientReservations);
router.get('/client/customer-id/:clientId/:customerId', authMiddleware, clientsController.getCustomerID);
router.get('/client/groups/all', authMiddleware, clientsController.getClientGroups);
router.post('/clients/export/count', authMiddleware, clientsController.getExportClientsCount);
router.post('/clients/export', authMiddleware, clientsController.exportClients);
router.post('/client/basic', authMiddlewareCRUDAccess, clientsController.createClientBasic);
router.post('/client/new', authMiddlewareCRUDAccess, clientsController.createClient);
router.post('/client/address/new', authMiddlewareCRUDAccess, clientsController.createAddress);
router.post('/client/group/new', authMiddlewareCRUDAccess, clientsController.createClientGroup);
router.put('/client/update/:id', authMiddlewareCRUDAccess, clientsController.updateClient);
router.put('/client/address/update/:id', authMiddlewareCRUDAccess, clientsController.updateAddress);
router.put('/client/group/:gid/update/:id', authMiddlewareCRUDAccess, clientsController.updateClientGroup);
router.put('/client/group/update/:gid', authMiddlewareCRUDAccess, clientsController.updateGroup);
router.put('/crm/client/:nid/merge/:oid', authMiddlewareCRUDAccess, clientsController.mergeClients);

router.put('/crm/client/update/:id', authMiddleware_manageClients, clientsController.updateClientFull);
router.delete('/client/address/del/:id', authMiddleware_manageClients, clientsController.removeAddress);

// --- Client Relationship Routes ---
router.get('/crm/common-relationship-pairs', authMiddleware, clientsController.handleGetCommonRelationshipPairs);
router.get('/clients/:clientId/related', authMiddleware, clientsController.handleGetRelatedCompanies);
router.post('/clients/:clientId/related', authMiddleware_manageClients, clientsController.handleAddClientRelationship);
router.put('/crm/client-relationships/:relationshipId', authMiddleware_manageClients, clientsController.handleUpdateClientRelationship);
router.delete('/crm/client-relationships/:relationshipId', authMiddleware_manageClients, clientsController.handleDeleteClientRelationship);

router.get('/clients/:clientId/projects', authMiddleware, handleGetClientProjects);

// --- Client Impediment Routes ---
router.get('/clients/:clientId/impediments', authMiddleware, clientsController.handleGetImpedimentsByClientId);
router.post('/clients/impediments', authMiddleware_manageClients, clientsController.handleCreateImpediment);
router.put('/clients/impediments/:impedimentId', authMiddleware_manageClients, clientsController.handleUpdateImpediment);
router.delete('/clients/impediments/:impedimentId', authMiddleware_manageClients, clientsController.handleDeleteImpediment);

module.exports = router;