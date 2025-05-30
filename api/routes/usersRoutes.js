const express = require('express');
const router = express.Router();
const { users, getUser, registerUser, updateUser, updateUserCalendarPreferences, getCalendarEmbedUrl, triggerGoogleCalendarSync } = require('../controllers/usersController'); // Added triggerGoogleCalendarSync
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageUsers } = require('../middleware/authMiddleware');
const {
  emailValidation,
  nameValidation,
  strongPasswordValidation,
} = require('../middleware/validators');

router.get('/users', authMiddleware, users);
router.get('/user/get', authMiddleware, getUser);
router.post(
  '/user/register',
  authMiddleware_manageUsers,
  emailValidation,
  nameValidation, // Assuming 'name' is part of the registration form
  strongPasswordValidation,
  registerUser
);
router.put('/user/update', authMiddleware_manageUsers, updateUser);

// Route for user calendar settings
router.post('/settings/calendar', authMiddleware, updateUserCalendarPreferences);

// Route for getting user-specific calendar embed URL
router.get('/settings/calendar/embed-url', authMiddleware, getCalendarEmbedUrl);

// Route for manually triggering a sync from Google Calendar to PMS
router.post('/settings/calendar/sync-from-google', authMiddleware, triggerGoogleCalendarSync);

module.exports = router;