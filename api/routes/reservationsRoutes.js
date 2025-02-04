const express = require('express');
const router = express.Router();
const { getAvailableRooms, getReservedRooms, getReservation, getMyHoldReservations, 
    createReservationHold, createReservationDetails, createReservationAddons, createReservationClient, 
    editReservationDetail, editReservationGuests, editReservationStatus, editReservationResponsible, editRoomFromCalendar, deleteHoldReservation } = require('../controllers/reservationsController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/reservation/available-rooms', authMiddleware, getAvailableRooms);
router.get('/reservation/reserved-rooms', authMiddleware, getReservedRooms);
router.get('/reservation/info', authMiddleware, getReservation);
router.get('/reservation/hold-list', authMiddleware, getMyHoldReservations);
router.post('/reservation/hold', authMiddleware, createReservationHold);
router.post('/reservation/addon', authMiddleware, createReservationAddons);
router.post('/reservation/client', authMiddleware, createReservationClient);
router.post('/reservation/update/details', authMiddleware, createReservationDetails);
router.put('/reservation/update/details/:id', authMiddleware, editReservationDetail);
router.put('/reservation/update/guest/:id', authMiddleware, editReservationGuests);
router.put('/reservation/update/status/:id', authMiddleware, editReservationStatus);
router.put('/reservation/update/client/:id', authMiddleware, editReservationResponsible);
router.put('/reservation/update/calendar/:id', authMiddleware, editRoomFromCalendar);
router.delete('/reservation/delete/hold/:id', authMiddleware, deleteHoldReservation);

module.exports = router;