const express = require('express');
const router = express.Router();
const { roles, createRole, updateRole, deleteRole  } = require('../controllers/rolesController');
const { authMiddleware, authMiddleware_manageUsers } = require('../middleware/authMiddleware');

router.get('/roles', authMiddleware_manageUsers, roles);
router.post('/roles/create', authMiddleware_manageUsers, createRole);
router.put('/roles/update', authMiddleware_manageUsers, updateRole);
router.delete('/roles/delete/:id', authMiddleware_manageUsers, deleteRole);

module.exports = router;