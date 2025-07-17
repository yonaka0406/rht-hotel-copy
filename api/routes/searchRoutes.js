const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const searchController = require('../controllers/searchController');

// Text conversion endpoints for search functionality
router.post('/convert-text', searchController.convertText);
router.post('/phonetic-variants', searchController.getPhoneticVariants);

module.exports = router;