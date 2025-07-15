const express = require('express');
const router = express.Router();
const reservationsController = require('../controllers/reservationsController');
const { authMiddleware, authMiddlewareCRUDAccess } = require('../middleware/authMiddleware');

router.get('/available-rooms', authMiddleware, reservationsController.getAvailableRooms);
router.get('/reserved-rooms', authMiddleware, reservationsController.getReservedRooms);
router.get('/info', authMiddleware, reservationsController.getReservation);
router.get('/detail/info', authMiddleware, reservationsController.getReservationDetails);
router.get('/hold-list', authMiddleware, reservationsController.getMyHoldReservations);
router.get('/today/:hid/:date', authMiddleware, reservationsController.getReservationsToday);
router.get('/query/:hid/:rid/:ci/:co', authMiddleware, reservationsController.getAvailableDatesForChange);
router.get('/list/clients/:hid/:id', authMiddleware, reservationsController.getReservationClientIds);
router.get('/payment/list/:hid/:id', authMiddleware, reservationsController.getReservationPayments);
router.post('/hold', authMiddlewareCRUDAccess, reservationsController.createReservationHold);
router.post('/add/hold-combo', authMiddlewareCRUDAccess, reservationsController.createHoldReservationCombo);
router.post('/addon', authMiddlewareCRUDAccess, reservationsController.createReservationAddons);
router.post('/client', authMiddlewareCRUDAccess, reservationsController.createReservationClient);
router.post('/add/room', authMiddlewareCRUDAccess, reservationsController.addNewRoomToReservation);
router.post('/move/room', authMiddlewareCRUDAccess, reservationsController.alterReservationRoom);
router.post('/payment/add', authMiddlewareCRUDAccess, reservationsController.createReservationPayment);
router.post('/payment/bulk-add', authMiddlewareCRUDAccess, reservationsController.createBulkReservationPayment);
router.post('/update/details', authMiddlewareCRUDAccess, reservationsController.createReservationDetails);
router.put('/update/details/:id', authMiddlewareCRUDAccess, reservationsController.editReservationDetail);
router.put('/update/detail/status/:id', authMiddlewareCRUDAccess, reservationsController.editReservationDetailStatus);
router.put('/update/guest/:id', authMiddlewareCRUDAccess, reservationsController.editReservationGuests);
router.put('/update/plan/:id', authMiddlewareCRUDAccess, reservationsController.editReservationPlan);
router.put('/update/addon/:id', authMiddlewareCRUDAccess, reservationsController.editReservationAddon);
router.put('/update/room/:id', authMiddlewareCRUDAccess, reservationsController.editReservationRoom);
router.put('/update/room/plan/:hid/:rid/:id', authMiddlewareCRUDAccess, reservationsController.editReservationRoomPlan);
router.put('/update/room/pattern/:hid/:rid/:id', authMiddlewareCRUDAccess, reservationsController.editReservationRoomPattern);
router.put('/update/status/:id', authMiddlewareCRUDAccess, reservationsController.editReservationStatus);
router.put('/update/comment/:id', authMiddlewareCRUDAccess, reservationsController.editReservationComment);
router.put('/update/time/:id', authMiddlewareCRUDAccess, reservationsController.editReservationTime);
router.put('/update/type/:id', authMiddlewareCRUDAccess, reservationsController.editReservationType);
router.put('/update/client/:id', authMiddlewareCRUDAccess, reservationsController.editReservationResponsible);
router.put('/update/calendar/:id', authMiddlewareCRUDAccess, reservationsController.editRoomFromCalendar);
router.put('/update/free/calendar', authMiddlewareCRUDAccess, reservationsController.editCalendarFreeChange);
router.put('/update/room/guestnumber/:id', authMiddlewareCRUDAccess, reservationsController.editRoomGuestNumber);
router.delete('/delete/hold/:id', authMiddlewareCRUDAccess, reservationsController.deleteHoldReservation);
router.delete('/delete/room/:id', authMiddlewareCRUDAccess, reservationsController.deleteRoomFromReservation);
router.delete('/payment/delete/:id', authMiddlewareCRUDAccess, reservationsController.delReservationPayment);

// Copy
router.post('/copy', authMiddleware, reservationsController.copyReservation);

module.exports = router;