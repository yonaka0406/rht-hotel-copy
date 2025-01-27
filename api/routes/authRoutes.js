const express = require('express');
const router = express.Router();
const { login, forgot, forgotAdmin, reset, getActiveUsers } = require('../controllers/authController');

router.post('/login', login);
router.post('/forgot-password', forgot);
router.post('/forgot-password-admin', forgotAdmin);
router.post('/reset-password', reset);
router.get('/active-users', getActiveUsers);

module.exports = router;