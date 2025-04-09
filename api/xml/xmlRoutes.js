const express = require('express');
const router = express.Router();
const { getXMLTemplate, postXMLResponse } = require('../xml/xmlController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageDB } = require('../middleware/authMiddleware');

// GET
router.get('/xml/template/:name', authMiddleware_manageDB, getXMLTemplate);

// POST
router.post('/xml/response/:name', authMiddleware_manageDB, postXMLResponse);

module.exports = router;