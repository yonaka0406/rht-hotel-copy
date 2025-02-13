const express = require('express');
const router = express.Router();
const { getAvailableRooms, getReservedRooms, getReservation, getReservationDetails, getMyHoldReservations, getAvailableDatesForChange, 
    createReservationHold, createReservationDetails, createReservationAddons, createReservationClient, addNewRoomToReservation,
    editReservationDetail, editReservationGuests, editReservationStatus, editReservationResponsible, editRoomFromCalendar, editRoomGuestNumber, deleteHoldReservation, deleteRoomFromReservation } = require('../controllers/reservationsController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/reservation/available-rooms', authMiddleware, getAvailableRooms);
router.get('/reservation/reserved-rooms', authMiddleware, getReservedRooms);
router.get('/reservation/info', authMiddleware, getReservation);
router.get('/reservation/detail/info', authMiddleware, getReservationDetails);
router.get('/reservation/hold-list', authMiddleware, getMyHoldReservations);
router.get('/reservation/query/:hid/:rid/:ci/:co', authMiddleware, getAvailableDatesForChange);
router.post('/reservation/hold', authMiddleware, createReservationHold);
router.post('/reservation/addon', authMiddleware, createReservationAddons);
router.post('/reservation/client', authMiddleware, createReservationClient);
router.post('/reservation/add/room', authMiddleware, addNewRoomToReservation);
router.post('/reservation/update/details', authMiddleware, createReservationDetails);
router.put('/reservation/update/details/:id', authMiddleware, editReservationDetail);
router.put('/reservation/update/guest/:id', authMiddleware, editReservationGuests);
router.put('/reservation/update/status/:id', authMiddleware, editReservationStatus);
router.put('/reservation/update/client/:id', authMiddleware, editReservationResponsible);
router.put('/reservation/update/calendar/:id', authMiddleware, editRoomFromCalendar);
router.put('/reservation/update/room/guestnumber/:id', authMiddleware, editRoomGuestNumber);
router.delete('/reservation/delete/hold/:id', authMiddleware, deleteHoldReservation);
router.delete('/reservation/delete/room/:id', authMiddleware, deleteRoomFromReservation);

module.exports = router;