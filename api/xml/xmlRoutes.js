const express = require('express');
const router = express.Router();
const { getXMLTemplate, getXMLRecentResponses, postXMLResponse, submitXMLTemplate } = require('../xml/xmlController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageDB } = require('../middleware/authMiddleware');

// GET
router.get('/xml/template/:name', authMiddleware_manageDB, getXMLTemplate);
router.get('/xml/responses/recent', authMiddlewareAdmin, getXMLRecentResponses);

// POST
router.post('/xml/response/:name', authMiddleware_manageDB, postXMLResponse);


module.exports = router;