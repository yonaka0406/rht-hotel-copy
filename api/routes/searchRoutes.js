const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const searchControllers = require('../controllers/search');

// Text conversion endpoints for search functionality
router.post('/convert-text', authMiddleware, searchControllers.convertText);
router.post('/phonetic-variants', authMiddleware, searchControllers.getPhoneticVariants);
router.post('/suggestions/:hotelId', authMiddleware, searchControllers.getSuggestions);
router.post('/reservations', authMiddleware, searchControllers.searchReservations);

module.exports = router;