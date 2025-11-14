const express = require('express');
const router = express.Router();
const { generateGuestList, getGuestListExcel } = require('../controllers/guestController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/guests/generate-list/:hotelId/:reservationId', authMiddleware, generateGuestList);
router.get('/guests/guest-list/excel/:date/:hotelId', authMiddleware, getGuestListExcel);

module.exports = router;
