const express = require('express');
const router = express.Router();
const { fetchUserActions, fetchClientActions, fetchAllActions, addAction, editAction, removeAction, syncActionToCalendar  } = require('../controllers/crmController'); // Added syncActionToCalendar
const { authMiddleware, authMiddlewareCRUDAccess } = require('../middleware/authMiddleware');

router.get('/actions/user/:uid', authMiddleware, fetchUserActions);
router.get('/actions/client/:cid', authMiddleware, fetchClientActions);
router.get('/actions/get', authMiddleware, fetchAllActions);
router.post('/action/new', authMiddlewareCRUDAccess, addAction);
router.put('/action/edit/:id', authMiddlewareCRUDAccess, editAction);
router.delete('/action/:id', authMiddlewareCRUDAccess, removeAction);
router.post('/action/:id/sync-to-calendar', authMiddlewareCRUDAccess, syncActionToCalendar); // Added new route, using authMiddlewareCRUDAccess

module.exports = router;