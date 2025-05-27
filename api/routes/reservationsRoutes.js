const express = require('express');
const router = express.Router();
const { getAvailableRooms, getReservedRooms, getReservation, getReservationDetails, getMyHoldReservations, getReservationsToday, getAvailableDatesForChange, getReservationClientIds, getReservationPayments, 
    createReservationHold, createHoldReservationCombo, createReservationDetails, createReservationAddons, createReservationClient, addNewRoomToReservation, alterReservationRoom, createReservationPayment, createBulkReservationPayment,
    editReservationDetail, editReservationGuests, editReservationPlan, editReservationAddon, editReservationRoom, editReservationRoomPlan, editReservationRoomPattern, editReservationStatus, editReservationDetailStatus, editReservationComment, editReservationTime, editReservationType, editReservationResponsible, editRoomFromCalendar, editCalendarFreeChange, editRoomGuestNumber, deleteHoldReservation, deleteRoomFromReservation, delReservationPayment } = require('../controllers/reservationsController');
const { authMiddleware, authMiddlewareCRUDAccess } = require('../middleware/authMiddleware');

router.get('/reservation/available-rooms', authMiddleware, getAvailableRooms);
router.get('/reservation/reserved-rooms', authMiddleware, getReservedRooms);
router.get('/reservation/info', authMiddleware, getReservation);
router.get('/reservation/detail/info', authMiddleware, getReservationDetails);
router.get('/reservation/hold-list', authMiddleware, getMyHoldReservations);
router.get('/reservation/today/:hid/:date', authMiddleware, getReservationsToday);
router.get('/reservation/query/:hid/:rid/:ci/:co', authMiddleware, getAvailableDatesForChange);
router.get('/reservation/list/clients/:hid/:id', authMiddleware, getReservationClientIds);
router.get('/reservation/payment/list/:hid/:id', authMiddleware, getReservationPayments);
router.post('/reservation/hold', authMiddlewareCRUDAccess, createReservationHold);
router.post('/reservation/add/hold-combo', authMiddlewareCRUDAccess, createHoldReservationCombo);
router.post('/reservation/addon', authMiddlewareCRUDAccess, createReservationAddons);
router.post('/reservation/client', authMiddlewareCRUDAccess, createReservationClient);
router.post('/reservation/add/room', authMiddlewareCRUDAccess, addNewRoomToReservation);
router.post('/reservation/move/room', authMiddlewareCRUDAccess, alterReservationRoom);
router.post('/reservation/payment/add', authMiddlewareCRUDAccess, createReservationPayment);
router.post('/reservation/payment/bulk-add', authMiddlewareCRUDAccess, createBulkReservationPayment);
router.post('/reservation/update/details', authMiddlewareCRUDAccess, createReservationDetails);
router.put('/reservation/update/details/:id', authMiddlewareCRUDAccess, editReservationDetail);
router.put('/reservation/update/detail/status/:id', authMiddlewareCRUDAccess, editReservationDetailStatus);
router.put('/reservation/update/guest/:id', authMiddlewareCRUDAccess, editReservationGuests);
router.put('/reservation/update/plan/:id', authMiddlewareCRUDAccess, editReservationPlan);
router.put('/reservation/update/addon/:id', authMiddlewareCRUDAccess, editReservationAddon);
router.put('/reservation/update/room/:id', authMiddlewareCRUDAccess, editReservationRoom);
router.put('/reservation/update/room/plan/:hid/:rid/:id', authMiddlewareCRUDAccess, editReservationRoomPlan);
router.put('/reservation/update/room/pattern/:hid/:rid/:id', authMiddlewareCRUDAccess, editReservationRoomPattern);
router.put('/reservation/update/status/:id', authMiddlewareCRUDAccess, editReservationStatus);
router.put('/reservation/update/comment/:id', authMiddlewareCRUDAccess, editReservationComment);
router.put('/reservation/update/time/:id', authMiddlewareCRUDAccess, editReservationTime);
router.put('/reservation/update/type/:id', authMiddlewareCRUDAccess, editReservationType);
router.put('/reservation/update/client/:id', authMiddlewareCRUDAccess, editReservationResponsible);
router.put('/reservation/update/calendar/:id', authMiddlewareCRUDAccess, editRoomFromCalendar);
router.put('/reservation/update/free/calendar', authMiddlewareCRUDAccess, editCalendarFreeChange);
router.put('/reservation/update/room/guestnumber/:id', authMiddlewareCRUDAccess, editRoomGuestNumber);
router.delete('/reservation/delete/hold/:id', authMiddlewareCRUDAccess, deleteHoldReservation);
router.delete('/reservation/delete/room/:id', authMiddlewareCRUDAccess, deleteRoomFromReservation);
router.delete('/reservation/payment/delete/:id', authMiddlewareCRUDAccess, delReservationPayment);

module.exports = router;