const express = require('express');
const router = express.Router();
const { generateGuestList, getGuestListExcel } = require('../controllers/guestController');
const { authMiddleware, authMiddlewareCRUDAccess } = require('../middleware/authMiddleware');

router.post('/guests/generate-list/:hotelId/:reservationId', authMiddlewareCRUDAccess, generateGuestList);
router.get('/guests/guest-list/excel/:date/:hotelId', authMiddleware, getGuestListExcel);

module.exports = router;
