const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageUsers } = require('../middleware/authMiddleware');
const {
  emailValidation,
  nameValidation,
  strongPasswordValidation,
} = require('../middleware/validators');

router.get('/users', authMiddleware_manageUsers, usersController.getAllUsers);
router.get('/user/get', authMiddleware, usersController.getUser);
router.get('/users/:id', authMiddleware_manageUsers, usersController.getUserById);
router.post(
  '/user/register',
  authMiddleware_manageUsers,
  emailValidation,
  nameValidation, // Assuming 'name' is part of the registration form
  strongPasswordValidation,
  usersController.registerUser
);
router.put('/user/update', authMiddleware_manageUsers, usersController.updateUser);

router.post('/user/calendar/create-google', authMiddleware, usersController.createUserCalendar);
router.post('/user/calendar/sync-from-google', authMiddleware, usersController.triggerGoogleCalendarSync);

module.exports = router;