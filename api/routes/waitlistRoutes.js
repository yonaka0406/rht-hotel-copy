const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlistController');
const { authMiddleware, authMiddlewareCRUDAccess, authMiddlewareWaitlistToken } = require('../middleware/authMiddleware');

// POST /api/waitlist - Create a new waitlist entry
// Protected by authentication and CRUD access middleware
router.post('/waitlist', authMiddleware, authMiddlewareCRUDAccess, waitlistController.create);

// Future routes for waitlist management as per WAITLIST_STRATEGY.md:
// GET /api/waitlist/hotel/:hotelId - List entries for a hotel (requires auth, potentially specific permissions)
router.get('/waitlist/hotel/:hotelId', authMiddleware, waitlistController.getByHotel); // Path corrected

// PUT /api/waitlist/:id/status - Update entry status (requires auth, specific permissions)
// router.put('/waitlist/:id/status', authMiddleware, authMiddlewareCRUDAccess, waitlistController.updateStatus);

// DELETE /api/waitlist/:id - Remove entry (soft delete) (requires auth, specific permissions)
// router.delete('/waitlist/:id', authMiddleware, authMiddlewareCRUDAccess, waitlistController.delete);

// GET /api/waitlist/confirm/:token - Validate token and return reservation details (publicly accessible)
router.get('/waitlist/confirm/:token', waitlistController.getConfirmationDetails);

// POST /api/waitlist/confirm/:token - Client confirmation (publicly accessible but token-based)
// router.post('/waitlist/confirm/:token', waitlistController.confirmReservation);

// POST /waitlist/:id/manual-notify - Trigger manual email notification for an entry
router.post('/waitlist/:id/manual-notify', authMiddleware, waitlistController.sendManualNotificationEmail);

// PUT /waitlist/:id/cancel - Cancel a waitlist entry (requires auth)
router.put('/waitlist/:id/cancel', authMiddleware, waitlistController.cancelEntry);

// PUT /waitlist/:id/cancel-token - Cancel a waitlist entry via waitlist token (public)
router.put('/waitlist/:id/cancel-token', authMiddlewareWaitlistToken, waitlistController.cancelEntry);

module.exports = router;
