const express = require('express');
const router = express.Router();
const { login, forgot, forgotAdmin, reset, getActiveUsers, googleLogin, googleCallback } = require('../controllers/authController');
const {
  emailValidation,
  passwordLoginValidation,
  passwordResetValidation,
} = require('../middleware/validators');

router.post('/login', emailValidation, passwordLoginValidation, login);
router.post('/forgot-password', emailValidation, forgot);
router.post('/forgot-password-admin', emailValidation, forgotAdmin); // Added email validation for admin too
router.post('/reset-password', passwordResetValidation, reset);
router.get('/active-users', getActiveUsers);

// Google OAuth routes
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

module.exports = router;