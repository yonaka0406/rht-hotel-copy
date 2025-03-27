const express = require('express');
const router = express.Router();
const { getAvailableRooms, getReservedRooms, getReservation, getReservationDetails, getMyHoldReservations, getReservationsToday, getAvailableDatesForChange, getReservationClientIds, getReservationPayments, 
    createReservationHold, createHoldReservationCombo, createReservationDetails, createReservationAddons, createReservationClient, addNewRoomToReservation, alterReservationRoom, createReservationPayment,
    editReservationDetail, editReservationGuests, editReservationPlan, editReservationAddon, editReservationRoom, editReservationRoomPlan, editReservationStatus, editReservationDetailStatus, editReservationComment, editReservationTime, editReservationType, editReservationResponsible, editRoomFromCalendar, editCalendarFreeChange, editRoomGuestNumber, deleteHoldReservation, deleteRoomFromReservation, delReservationPayment } = require('../controllers/reservationsController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/reservation/available-rooms', authMiddleware, getAvailableRooms);
router.get('/reservation/reserved-rooms', authMiddleware, getReservedRooms);
router.get('/reservation/info', authMiddleware, getReservation);
router.get('/reservation/detail/info', authMiddleware, getReservationDetails);
router.get('/reservation/hold-list', authMiddleware, getMyHoldReservations);
router.get('/reservation/today/:hid/:date', authMiddleware, getReservationsToday);
router.get('/reservation/query/:hid/:rid/:ci/:co', authMiddleware, getAvailableDatesForChange);
router.get('/reservation/list/clients/:hid/:id', authMiddleware, getReservationClientIds);
router.get('/reservation/payment/list/:hid/:id', authMiddleware, getReservationPayments);
router.post('/reservation/hold', authMiddleware, createReservationHold);
router.post('/reservation/add/hold-combo', authMiddleware, createHoldReservationCombo);
router.post('/reservation/addon', authMiddleware, createReservationAddons);
router.post('/reservation/client', authMiddleware, createReservationClient);
router.post('/reservation/add/room', authMiddleware, addNewRoomToReservation);
router.post('/reservation/move/room', authMiddleware, alterReservationRoom);
router.post('/reservation/payment/add', authMiddleware, createReservationPayment);
router.post('/reservation/update/details', authMiddleware, createReservationDetails);
router.put('/reservation/update/details/:id', authMiddleware, editReservationDetail);
router.put('/reservation/update/detail/status/:id', authMiddleware, editReservationDetailStatus);
router.put('/reservation/update/guest/:id', authMiddleware, editReservationGuests);
router.put('/reservation/update/plan/:id', authMiddleware, editReservationPlan);
router.put('/reservation/update/addon/:id', authMiddleware, editReservationAddon);
router.put('/reservation/update/room/:id', authMiddleware, editReservationRoom);
router.put('/reservation/update/room/plan/:hid/:rid/:id', authMiddleware, editReservationRoomPlan);
router.put('/reservation/update/status/:id', authMiddleware, editReservationStatus);
router.put('/reservation/update/comment/:id', authMiddleware, editReservationComment);
router.put('/reservation/update/time/:id', authMiddleware, editReservationTime);
router.put('/reservation/update/type/:id', authMiddleware, editReservationType);
router.put('/reservation/update/client/:id', authMiddleware, editReservationResponsible);
router.put('/reservation/update/calendar/:id', authMiddleware, editRoomFromCalendar);
router.put('/reservation/update/free/calendar', authMiddleware, editCalendarFreeChange);
router.put('/reservation/update/room/guestnumber/:id', authMiddleware, editRoomGuestNumber);
router.delete('/reservation/delete/hold/:id', authMiddleware, deleteHoldReservation);
router.delete('/reservation/delete/room/:id', authMiddleware, deleteRoomFromReservation);
router.delete('/reservation/payment/delete/:id', authMiddleware, delReservationPayment);


module.exports = router;