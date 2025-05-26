const express = require('express');
const router = express.Router();
const { login, forgot, forgotAdmin, reset, getActiveUsers, googleLogin, googleCallback } = require('../controllers/authController');

router.post('/login', login);
router.post('/forgot-password', forgot);
router.post('/forgot-password-admin', forgotAdmin);
router.post('/reset-password', reset);
router.get('/active-users', getActiveUsers);

// Google OAuth routes
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

module.exports = router;