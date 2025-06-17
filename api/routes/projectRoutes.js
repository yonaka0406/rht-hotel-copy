const express = require('express');
const projectsController = require('../controllers/projectsController');
const { authMiddleware, authMiddlewareCRUDAccess } = require('../middleware/authMiddleware'); 

const router = express.Router();

router.get('/projects', authMiddleware, projectsController.handleGetAllProjects);
router.post('/projects', authMiddlewareCRUDAccess, projectsController.handleCreateProject);

module.exports = router;
