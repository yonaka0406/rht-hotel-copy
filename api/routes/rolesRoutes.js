const express = require('express');
const router = express.Router();
const rolesControllers = require('../controllers/roles');
const { authMiddleware, authMiddleware_manageUsers } = require('../middleware/authMiddleware');

router.get('/roles', authMiddleware, rolesControllers.roles);
router.post('/roles/create', authMiddleware_manageUsers, rolesControllers.createRole);
router.put('/roles/update', authMiddleware_manageUsers, rolesControllers.updateRole);
router.delete('/roles/delete/:id', authMiddleware_manageUsers, rolesControllers.deleteRole);

module.exports = router;