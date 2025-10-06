const express = require('express');
const router = express.Router();
const waitlistControllers = require('../controllers/waitlist');
const { authMiddleware, authMiddlewareCRUDAccess, authMiddlewareWaitlistToken } = require('../middleware/authMiddleware');

// POST /api/waitlist - Create a new waitlist entry
// Protected by authentication and CRUD access middleware
router.post('/waitlist', authMiddleware, authMiddlewareCRUDAccess, waitlistControllers.create);

// GET /api/waitlist/hotel/:hotelId - List entries for a hotel (requires auth, potentially specific permissions)
router.get('/waitlist/hotel/:hotelId', authMiddleware, waitlistControllers.getByHotel); // Path corrected

// POST /api/waitlist/hotel/:hotelId - List entries for a hotel with filters in body
router.post('/waitlist/hotel/:hotelId', authMiddleware, waitlistControllers.getByHotelPost);

// PUT /api/waitlist/:id/status - Update entry status (requires auth, specific permissions)
// router.put('/waitlist/:id/status', authMiddleware, authMiddlewareCRUDAccess, waitlistController.updateStatus);

// DELETE /api/waitlist/:id - Remove entry (soft delete) (requires auth, specific permissions)
// router.delete('/waitlist/:id', authMiddleware, authMiddlewareCRUDAccess, waitlistController.delete);

// GET /api/waitlist/confirm/:token - Validate token and return reservation details (publicly accessible)
router.get('/waitlist/confirm/:token', waitlistControllers.getConfirmationDetails);

// POST /api/waitlist/confirm/:token - Client confirmation (publicly accessible but token-based)
router.post('/waitlist/confirm/:token', waitlistControllers.confirmReservation);

// POST /waitlist/:id/manual-notify - Trigger manual email notification for an entry
router.post('/waitlist/:id/manual-notify', authMiddleware, waitlistControllers.sendEmailNotification);

// POST /waitlist/:id/phone-notify - Mark entry as notified via phone
router.post('/waitlist/:id/phone-notify', authMiddleware, waitlistControllers.sendPhoneNotification);

// PUT /waitlist/:id/cancel - Cancel a waitlist entry (requires auth)
router.put('/waitlist/:id/cancel', authMiddleware, waitlistControllers.cancelEntry);

// PUT /waitlist/:id/cancel-token - Cancel a waitlist entry via waitlist token (public)
router.put('/waitlist/:id/cancel-token', authMiddlewareWaitlistToken, waitlistControllers.cancelEntry);

// POST /api/waitlist/check-vacancy - Check if there is vacancy for a waitlist entry
router.post('/waitlist/check-vacancy', waitlistControllers.checkVacancy);

module.exports = router;
