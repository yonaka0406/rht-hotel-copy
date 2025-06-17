const express = require('express');
const projectsController = require('../controllers/projectsController');
const { authMiddleware, authMiddlewareCRUDAccess } = require('../middleware/authMiddleware'); 

const router = express.Router();

router.get('/projects', authMiddleware, projectsController.handleGetAllProjects);
router.post('/projects', authMiddlewareCRUDAccess, projectsController.handleCreateProject);
router.delete('/projects/:projectId', authMiddlewareCRUDAccess, projectsController.handleDeleteProject);
router.put('/projects/:projectId', authMiddlewareCRUDAccess, projectsController.handleUpdateProject);

module.exports = router;
