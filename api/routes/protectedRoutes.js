const express = require('express');
const router = express.Router();
const { getProtectedData } = require('../controllers/protectedController');
const { authMiddleware, authMiddlewareAdmin } = require('../middleware/authMiddleware');

// Apply authMiddleware to protect this route
router.get('/protected', authMiddleware, getProtectedData);
router.get('/adminProtected', authMiddlewareAdmin, getProtectedData);

module.exports = router;