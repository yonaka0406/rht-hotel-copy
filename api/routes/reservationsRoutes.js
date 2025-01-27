const express = require('express');
const router = express.Router();
const { getAvailableRooms, getReservedRooms, getReservation, getMyHoldReservations, 
    createReservationHold, createReservationDetails, createReservationAddons, editReservationDetail, editReservationStatus } = require('../controllers/reservationsController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/reservation/available-rooms', authMiddleware, getAvailableRooms);
router.get('/reservation/reserved-rooms', authMiddleware, getReservedRooms);
router.get('/reservation/info', authMiddleware, getReservation);
router.get('/reservation/hold-list', authMiddleware, getMyHoldReservations);
router.post('/reservation/hold', authMiddleware, createReservationHold);
router.post('/reservation/addon', authMiddleware, createReservationAddons);
router.post('/reservation/update/details', authMiddleware, createReservationDetails);
router.put('/reservation/update/details/:id', authMiddleware, editReservationDetail);
router.put('/reservation/update/status/:id', authMiddleware, editReservationStatus);



module.exports = router;