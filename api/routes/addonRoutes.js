const express = require('express');
const router = express.Router();
const { getAllAddons, getGlobalAddons, getHotelsAddons, getHotelAddons, createGlobalAddon,
    createHotelAddon, editGlobalAddon, editHotelAddon } = require('../controllers/addonController');
const { authMiddleware, authMiddleware_manageDB } = require('../middleware/authMiddleware');

// All
router.get('/addons/all/:hotel_id', authMiddleware, getAllAddons);

// Global addons routes
router.get('/addons/global', authMiddleware, getGlobalAddons);
router.post('/addons/global', authMiddleware_manageDB, createGlobalAddon);
router.put('/addons/global/:id', authMiddleware_manageDB, editGlobalAddon);

// Hotel-specific addons routes
router.get('/addons/hotel', authMiddleware, getHotelsAddons);
router.get('/addons/hotel/:hotel_id', authMiddleware, getHotelAddons);
router.post('/addons/hotel', authMiddleware_manageDB, createHotelAddon);
router.put('/addons/hotel/:id', authMiddleware_manageDB, editHotelAddon);

module.exports = router;