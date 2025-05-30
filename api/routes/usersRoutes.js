const express = require('express');
const router = express.Router();
const { users, getUser, registerUser, updateUser } = require('../controllers/usersController');
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


module.exports = router;