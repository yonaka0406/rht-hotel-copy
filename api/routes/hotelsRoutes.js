const express = require('express');
const router = express.Router();
const { hotels, roomTypeCreate, roomCreate, getHotels, getHotelRoomTypes, editHotel, editHotelSiteController, editRoomType, editRoom, editHotelCalendar, getHotelRooms, fetchHotelSiteController, getBlockedRooms, editBlockedRooms, getPlanExclusionSettingsController, updatePlanExclusionSettingsController } = require('../controllers/hotelsController');
const { authMiddleware, authMiddleware_manageDB } = require('../middleware/authMiddleware');

router.get('/hotel-list', authMiddleware, getHotels);
router.get('/hotel-room-types/:id', authMiddleware, getHotelRoomTypes);
router.get('/hotel-rooms/:id', authMiddleware, getHotelRooms);
router.get('/hotel-ota/:id', authMiddleware, fetchHotelSiteController);
router.get('/hotel-calendar/blocked/:id', authMiddleware, getBlockedRooms);
router.get('/hotels/:hotel_id/plan-exclusions', authMiddleware_manageDB, getPlanExclusionSettingsController);

router.post('/hotels', authMiddleware_manageDB, hotels);
router.post('/room-types', authMiddleware_manageDB, roomTypeCreate);
router.post('/rooms', authMiddleware_manageDB, roomCreate);

router.put('/hotel/:id', authMiddleware_manageDB, editHotel);
router.put('/hotel-ota/:id', authMiddleware_manageDB, editHotelSiteController);
router.put('/room-type/:id', authMiddleware_manageDB, editRoomType);
router.put('/room/:id', authMiddleware_manageDB, editRoom);
router.put('/hotel-calendar/update/:startDate/:endDate', authMiddleware_manageDB, editHotelCalendar);
router.put('/hotel-calendar/unblock/:id', authMiddleware_manageDB, editBlockedRooms);
router.put('/hotels/:hotel_id/plan-exclusions', authMiddleware_manageDB, updatePlanExclusionSettingsController);

module.exports = router;