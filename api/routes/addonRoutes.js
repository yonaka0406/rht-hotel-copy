const express = require('express');
const router = express.Router();
const { getAllAddons, getGlobalAddons, getHotelsAddons, getHotelAddons, createGlobalAddon,
    createHotelAddon, editGlobalAddon, editHotelAddon } = require('../controllers/addonController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageDB } = require('../middleware/authMiddleware');

// All
router.get('/addons/all/:hotel_id', authMiddlewareAdmin, getAllAddons);

// Global addons routes
router.get('/addons/global', authMiddlewareAdmin, getGlobalAddons);
router.post('/addons/global', authMiddleware_manageDB, createGlobalAddon);
router.put('/addons/global/:id', authMiddleware_manageDB, editGlobalAddon);

// Hotel-specific addons routes
router.get('/addons/hotel', authMiddlewareAdmin, getHotelsAddons);
router.get('/addons/hotel/:hotel_id', authMiddlewareAdmin, getHotelAddons);
router.post('/addons/hotel', authMiddleware_manageDB, createHotelAddon);
router.put('/addons/hotel/:id', authMiddleware_manageDB, editHotelAddon);

module.exports = router;