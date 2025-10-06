const express = require('express');
const router = express.Router();
const addonControllers = require('../controllers/addon');
const { authMiddleware, authMiddleware_manageDB } = require('../middleware/authMiddleware');

// All
router.get('/addons/all/:hotel_id', authMiddleware, addonControllers.getAllAddons);

// Global addons routes
router.get('/addons/global', authMiddleware, addonControllers.getGlobalAddons);
router.post('/addons/global', authMiddleware_manageDB, addonControllers.createGlobalAddon);
router.put('/addons/global/:id', authMiddleware_manageDB, addonControllers.editGlobalAddon);

// Hotel-specific addons routes
router.get('/addons/hotel', authMiddleware, addonControllers.getHotelsAddons);
router.get('/addons/hotel/:hotel_id', authMiddleware, addonControllers.getHotelAddons);
router.post('/addons/hotel', authMiddleware_manageDB, addonControllers.createHotelAddon);
router.put('/addons/hotel/:id', authMiddleware_manageDB, addonControllers.editHotelAddon);

module.exports = router;