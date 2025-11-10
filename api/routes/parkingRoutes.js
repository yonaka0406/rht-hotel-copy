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
    blockParkingSpot,
    updateParkingSpotsForLot,
    getParkingReservations,
    getAllParkingSpotsByHotel,
    checkParkingVacancies,
    getCompatibleSpots,
    getAvailableSpotsForDates,
    checkRealTimeAvailability,
    createParkingAddonAssignment,
    updateParkingAddonAssignment,
    deleteParkingAddonAssignment,
    bulkDeleteParkingAddonAssignments,
    saveParkingAssignments,
    // Capacity management endpoints
    getAvailableCapacity,
    blockCapacity,
    getBlockedCapacity,
    removeCapacityBlock,
    getCapacitySummary
} = require('../controllers/parking');
const { authMiddleware, authMiddlewareCRUDAccess, authMiddleware_manageDB } = require('../middleware/authMiddleware');



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
router.put('/parking-lots/:parking_lot_id/spots', authMiddleware_manageDB, updateParkingSpotsForLot);

// Block Parking Spot
router.post('/parking/block', authMiddleware_manageDB, blockParkingSpot);

// Parking Reservations
router.get('/parking/reservations', authMiddleware, getParkingReservations);
router.post('/parking/reservations', authMiddlewareCRUDAccess, saveParkingAssignments);

// All Parking Spots by Hotel
router.get('/parking/spots/hotel/:hotel_id', authMiddleware, getAllParkingSpotsByHotel);

// Enhanced Vehicle Category and Capacity Management Endpoints
router.get('/parking/vacancies/:hotelId/:startDate/:endDate/:vehicleCategoryId', authMiddleware, checkParkingVacancies);
router.get('/parking/compatible-spots/:hotelId/:vehicleCategoryId', authMiddleware, getCompatibleSpots);
router.get('/parking/available-spots/:hotelId/:vehicleCategoryId', authMiddleware, getAvailableSpotsForDates);
router.post('/parking/real-time-availability/:hotelId/:vehicleCategoryId', authMiddlewareCRUDAccess, checkRealTimeAvailability);

// Parking Addon Assignment Endpoints
router.post('/parking/addon-assignment', authMiddlewareCRUDAccess, createParkingAddonAssignment);
router.put('/parking/addon-assignment/:id', authMiddlewareCRUDAccess, updateParkingAddonAssignment);
router.delete('/parking/addon-assignment/bulk', authMiddlewareCRUDAccess, bulkDeleteParkingAddonAssignments);
router.delete('/parking/addon-assignment/:id', authMiddlewareCRUDAccess, deleteParkingAddonAssignment);

// Capacity Management Endpoints
router.get('/parking/capacity/available', authMiddleware, getAvailableCapacity);
router.post('/parking/capacity/block', authMiddleware_manageDB, blockCapacity);
router.get('/parking/capacity/blocks', authMiddleware, getBlockedCapacity);
router.delete('/parking/capacity/blocks/:blockId', authMiddleware_manageDB, removeCapacityBlock);
router.get('/parking/capacity/summary', authMiddleware, getCapacitySummary);

module.exports = router;
