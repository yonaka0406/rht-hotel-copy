const express = require('express');
const router = express.Router();
const reservationsController = require('../controllers/reservationsController');
const { authMiddleware, authMiddlewareCRUDAccess } = require('../middleware/authMiddleware');

router.get('/reservation/available-rooms', authMiddleware, reservationsController.getAvailableRooms);
router.get('/reservation/reserved-rooms', authMiddleware, reservationsController.getReservedRooms);
router.get('/reservation/info', authMiddleware, reservationsController.getReservation);
router.get('/reservation/detail/info', authMiddleware, reservationsController.getReservationDetails);
router.get('/reservation/hold-list', authMiddleware, reservationsController.getMyHoldReservations);
router.get('/reservation/today/:hid/:date', authMiddleware, reservationsController.getReservationsToday);
router.get('/reservation/query/:hid/:rid/:ci/:co', authMiddleware, reservationsController.getAvailableDatesForChange);
router.get('/reservation/list/clients/:hid/:id', authMiddleware, reservationsController.getReservationClientIds);
router.get('/reservation/payment/list/:hid/:id', authMiddleware, reservationsController.getReservationPayments);
router.post('/reservation/hold', authMiddlewareCRUDAccess, reservationsController.createReservationHold);
router.post('/reservation/add/hold-combo', authMiddlewareCRUDAccess, reservationsController.createHoldReservationCombo);
router.post('/reservation/addon', authMiddlewareCRUDAccess, reservationsController.createReservationAddons);
router.post('/reservation/client', authMiddlewareCRUDAccess, reservationsController.createReservationClient);
router.post('/reservation/add/room', authMiddlewareCRUDAccess, reservationsController.addNewRoomToReservation);
router.post('/reservation/move/room', authMiddlewareCRUDAccess, reservationsController.alterReservationRoom);
router.post('/reservation/payment/add', authMiddlewareCRUDAccess, reservationsController.createReservationPayment);
router.post('/reservation/payment/bulk-add', authMiddlewareCRUDAccess, reservationsController.createBulkReservationPayment);
router.post('/reservation/update/details', authMiddlewareCRUDAccess, reservationsController.createReservationDetails);

router.put('/reservation/update/details/:id', authMiddlewareCRUDAccess, reservationsController.editReservationDetail);
router.put('/reservation/update/detail/status/:id', authMiddlewareCRUDAccess, reservationsController.editReservationDetailStatus);
router.put('/reservation/update/guest/:id', authMiddlewareCRUDAccess, reservationsController.editReservationGuests);
router.put('/reservation/update/plan/:id', authMiddlewareCRUDAccess, reservationsController.editReservationPlan);
router.put('/reservation/update/addon/:id', authMiddlewareCRUDAccess, reservationsController.editReservationAddon);
router.put('/reservation/update/room/:id', authMiddlewareCRUDAccess, reservationsController.editReservationRoom);
router.put('/reservation/update/room/plan/:hid/:rid/:id', authMiddlewareCRUDAccess, reservationsController.editReservationRoomPlan);
router.put('/reservation/update/room/pattern/:hid/:rid/:id', authMiddlewareCRUDAccess, reservationsController.editReservationRoomPattern);
router.put('/reservation/update/status/:id', authMiddlewareCRUDAccess, reservationsController.editReservationStatus);
router.put('/reservation/update/comment/:id', authMiddlewareCRUDAccess, reservationsController.editReservationComment);
router.put('/reservation/update/time/:id', authMiddlewareCRUDAccess, reservationsController.editReservationTime);
router.put('/reservation/update/type/:id', authMiddlewareCRUDAccess, reservationsController.editReservationType);
router.put('/reservation/update/client/:id', authMiddlewareCRUDAccess, reservationsController.editReservationResponsible);
router.put('/reservation/update/calendar/:id', authMiddlewareCRUDAccess, reservationsController.editRoomFromCalendar);
router.put('/reservation/update/free/calendar', authMiddlewareCRUDAccess, reservationsController.editCalendarFreeChange);
router.put('/reservation/update/room/guestnumber/:id', authMiddlewareCRUDAccess, reservationsController.editRoomGuestNumber);
router.put('/reservation/convert/:id', authMiddlewareCRUDAccess, reservationsController.convertBlockToReservation);

router.delete('/reservation/delete/hold/:id', authMiddlewareCRUDAccess, reservationsController.deleteHoldReservation);
router.delete('/reservation/delete/room/:id', authMiddlewareCRUDAccess, reservationsController.deleteRoomFromReservation);
router.delete('/reservation/payment/delete/:id', authMiddlewareCRUDAccess, reservationsController.delReservationPayment);

// Copy
router.post('/reservation/copy', authMiddleware, reservationsController.copyReservation);

module.exports = router;