const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const searchController = require('../controllers/searchController');

// Text conversion endpoints for search functionality
router.post('/convert-text', authMiddleware, searchController.convertText);
router.post('/phonetic-variants', authMiddleware, searchController.getPhoneticVariants);
router.post('/suggestions/:hotelId', authMiddleware, searchController.getSuggestions);

module.exports = router;