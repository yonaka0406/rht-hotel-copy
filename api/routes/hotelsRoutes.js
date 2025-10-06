const express = require('express');
const router = express.Router();
const hotelControllers = require('../controllers/hotel');
const { authMiddleware, authMiddlewareCRUDAccess, authMiddleware_manageDB } = require('../middleware/authMiddleware');

router.get('/hotel-list', authMiddleware, hotelControllers.getHotels);
router.get('/hotel-room-types/:id', authMiddleware, hotelControllers.getHotelRoomTypes);
router.get('/hotel-rooms/:id', authMiddleware, hotelControllers.getHotelRooms);
router.get('/hotel-ota/:id', authMiddleware, hotelControllers.fetchHotelSiteController);
router.get('/hotel-calendar/blocked/:id', authMiddleware, hotelControllers.getBlockedRooms);
router.get('/hotels/:hotel_id/plan-exclusions', authMiddleware_manageDB, hotelControllers.getPlanExclusionSettingsController);
router.get('/hotel-assignment-order/:id', authMiddleware_manageDB, hotelControllers.getRoomAssignmentOrderController);

router.post('/hotels', authMiddleware_manageDB, hotelControllers.hotels);
router.post('/room-types', authMiddleware_manageDB, hotelControllers.roomTypeCreate);
router.post('/rooms', authMiddleware_manageDB, hotelControllers.roomCreate);

router.put('/hotel/:id', authMiddleware_manageDB, hotelControllers.editHotel);
router.put('/hotel-ota/:id', authMiddleware_manageDB, hotelControllers.editHotelSiteController);
router.put('/room-type/:id', authMiddleware_manageDB, hotelControllers.editRoomType);
router.put('/room/:id', authMiddleware_manageDB, hotelControllers.editRoom);
router.put('/hotels/:hotel_id/plan-exclusions', authMiddleware_manageDB, hotelControllers.updatePlanExclusionSettingsController);
router.put('/hotel-assignment-order/:id', authMiddleware_manageDB, hotelControllers.updateRoomAssignmentOrderController);

router.put('/hotel-calendar/update/:startDate/:endDate', authMiddlewareCRUDAccess, hotelControllers.editHotelCalendar);
router.put('/hotel-calendar/unblock/:id', authMiddlewareCRUDAccess, hotelControllers.editBlockedRooms);
router.post('/hotels/multi-block-rooms', authMiddlewareCRUDAccess, hotelControllers.blockMultipleRooms);

module.exports = router;