const express = require('express');
const router = express.Router();
const { generateGuestList, generateGroupGuestList } = require('../controllers/guestController');
const { authMiddleware, authMiddlewareCRUDAccess } = require('../middleware/authMiddleware');

router.post('/guests/generate-list/:hotelId/:reservationId', authMiddlewareCRUDAccess, generateGuestList);
router.post('/guests/generate-group-list/:hotelId/:reservationId', authMiddlewareCRUDAccess, generateGroupGuestList);

module.exports = router;
