const express = require('express');
const router = express.Router();
const usersControllers = require('../controllers/users');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageUsers } = require('../middleware/authMiddleware');
const {
  emailValidation,
  nameValidation,
  strongPasswordValidation,
} = require('../middleware/validators');

router.get('/users', authMiddleware, usersControllers.users);
router.get('/user/get', authMiddleware, usersControllers.getUser);
router.get('/users/:id', authMiddleware, usersControllers.getUserById);
router.post(
  '/user/register',
  authMiddleware_manageUsers,
  emailValidation,
  nameValidation, // Assuming 'name' is part of the registration form
  strongPasswordValidation,
  usersControllers.registerUser
);
router.put('/user/update', authMiddleware_manageUsers, usersControllers.updateUser);

router.post('/user/calendar/create-google', authMiddleware, usersControllers.createUserCalendar);
router.post('/user/calendar/sync-from-google', authMiddleware, usersControllers.triggerGoogleCalendarSync);

module.exports = router;