const express = require('express');
const router = express.Router();
const { login, forgot, forgotAdmin, reset, getActiveUsers, googleLogin, googleCallback } = require('../controllers/authController');
const {
  emailValidation,
  passwordLoginValidation,
  passwordResetValidation,
} = require('../middleware/validators');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, emailValidation, passwordLoginValidation, login);
router.post('/forgot-password', authLimiter, emailValidation, forgot);
router.post('/forgot-password-admin', authLimiter, emailValidation, forgotAdmin); // Added email validation for admin too
router.post('/reset-password', authLimiter, passwordResetValidation, reset);
router.get('/active-users', getActiveUsers);

const { setupRequestContext } = require('../config/database'); // Import the middleware

// Google OAuth routes
router.get('/google', setupRequestContext, googleLogin); // Apply middleware
router.get('/google/callback', setupRequestContext, googleCallback); // Apply middleware

module.exports = router;