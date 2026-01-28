const express = require('express');
const router = express.Router();
const investigationController = require('../controllers/ota/investigationController');
const { authMiddleware } = require('../middleware/authMiddleware');

// OTA Stock Investigation Routes
router.get('/ota/investigate-stock', authMiddleware, investigationController.investigateStock);
router.get('/ota/xml-data/:id', authMiddleware, investigationController.getXMLData);

// OTA Trigger Monitoring Routes
router.get('/ota/trigger-monitor/status', authMiddleware, investigationController.getTriggerMonitorStatus);
router.post('/ota/trigger-monitor/check', authMiddleware, investigationController.runTriggerMonitorCheck);

module.exports = router;