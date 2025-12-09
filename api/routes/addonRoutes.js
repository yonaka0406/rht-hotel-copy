const express = require('express');
const router = express.Router();
const { getAllAddons, getHotelsAddons, getHotelAddons, createHotelAddon, editHotelAddon } = require('../controllers/addons');
const { authMiddleware, authMiddleware_manageDB } = require('../middleware/authMiddleware');

// All addons for a specific hotel (used in frontend for plan creation/editing)
router.get('/addons/all/:hotel_id', authMiddleware, getAllAddons);

// All addons for all hotels (used in admin panel to manage hotel addons)
router.get('/addons/hotel', authMiddleware, getHotelsAddons);
router.get('/addons/hotel/:hotel_id', authMiddleware, getHotelAddons); // Specific hotel addons

// Hotel-specific addon creation and update
router.post('/addons/hotel', authMiddleware_manageDB, createHotelAddon);
router.put('/addons/hotel/:id', authMiddleware_manageDB, editHotelAddon);

module.exports = router;
