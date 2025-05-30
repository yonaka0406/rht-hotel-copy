const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware'); // Assuming a general auth middleware
const { updateUserCalendarPreferences } = require('../controllers/userController');

// Route for updating user's calendar integration settings
router.post('/calendar/settings', authMiddleware, updateUserCalendarPreferences);

module.exports = router;
