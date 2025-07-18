const express = require('express');
const router = express.Router();
const userSavedSearchController = require('../controllers/userSavedSearchController');

// All routes require authentication (assume middleware is applied globally or in parent)

router.get('/', userSavedSearchController.getAll);
router.get('/:id', userSavedSearchController.getById);
router.post('/', userSavedSearchController.create);
router.put('/:id', userSavedSearchController.update);
router.delete('/:id', userSavedSearchController.remove);

module.exports = router; 