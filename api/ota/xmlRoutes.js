const express = require('express');
const router = express.Router();
const { getXMLTemplate, getRecentQueuedReservations, getXMLRecentResponses, postXMLResponse, submitXMLTemplate, getTLRoomMaster, getTLPlanMaster, createTLRoomMaster, createTLPlanMaster, getOTAReservations, successOTAReservations, updateInventoryMultipleDays, manualUpdateInventoryMultipleDays, getOTAXmlQueue, updateOTAXmlQueueStatus, getFailedOTAXmlQueue } = require('../ota/xmlController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageDB } = require('../middleware/authMiddleware');

// GET
router.get('/xml/template/:hotel_id/:name', authMiddleware_manageDB, getXMLTemplate);
router.get('/xml/responses/recent', authMiddlewareAdmin, getXMLRecentResponses);
router.get('/xml-queue/recent', authMiddlewareAdmin, getOTAXmlQueue);
router.get('/xml-queue/failed', authMiddlewareAdmin, getFailedOTAXmlQueue);

// PUT
router.put('/xml-queue/:id/status', authMiddlewareAdmin, updateOTAXmlQueueStatus);

router.get('/ota-queue', authMiddlewareAdmin, getRecentQueuedReservations);
router.get('/sc/tl/:hotel_id/master/room', authMiddleware_manageDB, getTLRoomMaster);
router.get('/sc/tl/:hotel_id/master/plan', authMiddleware_manageDB, getTLPlanMaster);

// POST
router.post('/xml/response/:hotel_id/:name', authMiddleware_manageDB, postXMLResponse);
router.post('/sc/tl/master/room', authMiddleware_manageDB, createTLRoomMaster);
router.post('/sc/tl/master/plan', authMiddleware_manageDB, createTLPlanMaster);

// Internal route
router.get('/sc/tl/reservations/fetch', getOTAReservations);
router.get('/sc/tl/reservations/success', successOTAReservations);
router.post('/sc/tl/inventory/multiple/:hotel_id/:log_id', updateInventoryMultipleDays);
router.post('/sc/tl/inventory-manual/multiple/:hotel_id/:log_id', manualUpdateInventoryMultipleDays);

module.exports = router;