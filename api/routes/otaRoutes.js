const express = require('express');
const router = express.Router();
const investigationController = require('../controllers/ota/investigationController');
const { authMiddleware } = require('../middleware/authMiddleware');

// OTA Stock Investigation Routes
router.get('/ota/investigate-stock', authMiddleware, investigationController.investigateStock);
router.get('/ota/xml-data/:id', authMiddleware, investigationController.getXMLData);

module.exports = router;