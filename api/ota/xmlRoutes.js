const express = require('express');
const router = express.Router();
const { getXMLTemplate, getXMLRecentResponses, postXMLResponse, submitXMLTemplate, getTLRoomMaster, createTLRoomMaster, updateInventoryMultipleDays } = require('../ota/xmlController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageDB } = require('../middleware/authMiddleware');

// GET
router.get('/xml/template/:hotel_id/:name', authMiddleware_manageDB, getXMLTemplate);
router.get('/xml/responses/recent', authMiddlewareAdmin, getXMLRecentResponses);
router.get('/sc/tl/:hotel_id/master/room', authMiddleware_manageDB, getTLRoomMaster);

// POST
router.post('/xml/response/:hotel_id/:name', authMiddleware_manageDB, postXMLResponse);
router.post('/sc/tl/master/room', authMiddleware_manageDB, createTLRoomMaster);

// Internal route
router.post('/sc/tl/inventory/multiple/:hotel_id/:log_id', updateInventoryMultipleDays);

module.exports = router;