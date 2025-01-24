const express = require('express');
const router = express.Router();
const { hotels, roomTypeCreate, roomCreate, getHotels, editHotel, editRoomType, editRoom, getHotelRooms } = require('../controllers/hotelsController');
const { authMiddleware, authMiddlewareAdmin, authMiddleware_manageDB } = require('../middleware/authMiddleware');

router.get('/hotel-list', authMiddlewareAdmin, getHotels);
router.get('/hotel-rooms/:id', authMiddlewareAdmin, getHotelRooms);
router.post('/hotels', authMiddleware_manageDB, hotels);
router.post('/room-types', authMiddleware_manageDB, roomTypeCreate);
router.post('/rooms', authMiddleware_manageDB, roomCreate);
router.put('/hotel/:id', authMiddleware_manageDB, editHotel);
router.put('/room-type/:id', authMiddleware_manageDB, editRoomType);
router.put('/room/:id', authMiddleware_manageDB, editRoom);

module.exports = router;