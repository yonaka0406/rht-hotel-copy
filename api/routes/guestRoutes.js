const express = require('express');
const router = express.Router();
const { generateGuestList } = require('../controllers/guestController');
const { authMiddleware, authMiddlewareCRUDAccess } = require('../middleware/authMiddleware');

router.post('/guests/generate-list/:hotelId/:reservationId', authMiddlewareCRUDAccess, generateGuestList);

module.exports = router;
