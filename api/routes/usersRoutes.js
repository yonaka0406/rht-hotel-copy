const express = require('express');
const router = express.Router();
const { users, getUser, register, update } = require('../controllers/usersController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageUsers } = require('../middleware/authMiddleware');

router.get('/users', authMiddleware, users);
router.get('/user/get', authMiddleware, getUser);
router.post('/user/register', authMiddleware_manageUsers, register);
router.put('/user/update', authMiddleware_manageUsers, update);


module.exports = router;