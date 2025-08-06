const express = require('express');
const router = express.Router();
const {
    getVehicleCategories,
    createVehicleCategory,
    updateVehicleCategory,
    deleteVehicleCategory,
    getParkingLots,
    createParkingLot,
    updateParkingLot,
    deleteParkingLot,
    getParkingSpots,
    createParkingSpot,
    updateParkingSpot,
    deleteParkingSpot,
    blockParkingSpot
} = require('../controllers/parkingController');
const { authMiddleware, authMiddleware_manageDB } = require('../middleware/authMiddleware');

// Vehicle Categories
router.get('/vehicle-categories', authMiddleware, getVehicleCategories);
router.post('/vehicle-categories', authMiddleware_manageDB, createVehicleCategory);
router.put('/vehicle-categories/:id', authMiddleware_manageDB, updateVehicleCategory);
router.delete('/vehicle-categories/:id', authMiddleware_manageDB, deleteVehicleCategory);

// Parking Lots
router.get('/parking-lots/:hotel_id', authMiddleware, getParkingLots);
router.post('/parking-lots', authMiddleware_manageDB, createParkingLot);
router.put('/parking-lots/:id', authMiddleware_manageDB, updateParkingLot);
router.delete('/parking-lots/:id', authMiddleware_manageDB, deleteParkingLot);

// Parking Spots
router.get('/parking-spots/:parking_lot_id', authMiddleware, getParkingSpots);
router.post('/parking-spots', authMiddleware_manageDB, createParkingSpot);
router.put('/parking-spots/:id', authMiddleware_manageDB, updateParkingSpot);
router.delete('/parking-spots/:id', authMiddleware_manageDB, deleteParkingSpot);

// Block Parking Spot
router.post('/parking/block', authMiddleware_manageDB, blockParkingSpot);

module.exports = router;
