// api/routes/loyaltyTierRoutes.js
const express = require('express');
const router = express.Router();
const loyaltyTierController = require('../controllers/loyaltyTierController');
const { isAuthenticated, isAuthorized } = require('../middleware/authMiddleware'); // Assuming standard auth middleware

// GET all loyalty tier settings
router.get('/', isAuthenticated, isAuthorized(['Admin', 'Manager']), loyaltyTierController.getAllLoyaltyTierSettings);

// GET settings for a specific tier (e.g., /api/loyalty-tiers/REPEATER or /api/loyalty-tiers/HOTEL_LOYAL?hotel_id=1)
router.get('/:tier_name', isAuthenticated, isAuthorized(['Admin', 'Manager']), loyaltyTierController.getLoyaltyTierSettingsByTierName);

// POST to create or update loyalty tier settings
router.post('/', isAuthenticated, isAuthorized(['Admin']), loyaltyTierController.createOrUpdateLoyaltyTierSettings);

module.exports = router;
