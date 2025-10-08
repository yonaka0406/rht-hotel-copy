const express = require('express');
const router = express.Router();
const parkingControllers = require('../controllers/parking');
const { authMiddleware, authMiddlewareCRUDAccess, authMiddleware_manageDB } = require('../middleware/authMiddleware');



// Vehicle Categories
router.get('/vehicle-categories', authMiddleware, parkingControllers.getVehicleCategories);
router.post('/vehicle-categories', authMiddleware_manageDB, parkingControllers.createVehicleCategory);
router.put('/vehicle-categories/:id', authMiddleware_manageDB, parkingControllers.updateVehicleCategory);
router.delete('/vehicle-categories/:id', authMiddleware_manageDB, parkingControllers.deleteVehicleCategory);

// Parking Lots
router.get('/parking-lots/:hotel_id', authMiddleware, parkingControllers.getParkingLots);
router.post('/parking-lots', authMiddleware_manageDB, parkingControllers.createParkingLot);
router.put('/parking-lots/:id', authMiddleware_manageDB, parkingControllers.updateParkingLot);
router.delete('/parking-lots/:id', authMiddleware_manageDB, parkingControllers.deleteParkingLot);

// Parking Spots
router.get('/parking-spots/:parking_lot_id', authMiddleware, parkingControllers.getParkingSpots);
router.post('/parking-spots', authMiddleware_manageDB, parkingControllers.createParkingSpot);
router.put('/parking-spots/:id', authMiddleware_manageDB, parkingControllers.updateParkingSpot);
router.delete('/parking-spots/:id', authMiddleware_manageDB, parkingControllers.deleteParkingSpot);
router.put('/parking-lots/:parking_lot_id/spots', authMiddleware_manageDB, parkingControllers.updateParkingSpotsForLot);

// Block Parking Spot
router.post('/parking/block', authMiddleware_manageDB, parkingControllers.blockParkingSpot);

// Parking Reservations
router.get('/parking/reservations', authMiddleware, parkingControllers.getParkingReservations);
router.post('/parking/reservations', authMiddlewareCRUDAccess, parkingControllers.saveParkingAssignments);

// All Parking Spots by Hotel
router.get('/parking/spots/hotel/:hotel_id', authMiddleware, parkingControllers.getAllParkingSpotsByHotel);

// Enhanced Vehicle Category and Capacity Management Endpoints
router.get('/parking/vacancies/:hotelId/:startDate/:endDate/:vehicleCategoryId', authMiddleware, parkingControllers.checkParkingVacancies);
router.get('/parking/compatible-spots/:hotelId/:vehicleCategoryId', authMiddleware, parkingControllers.getCompatibleSpots);
router.get('/parking/available-spots/:hotelId/:vehicleCategoryId', authMiddleware, parkingControllers.getAvailableSpotsForDates);
router.post('/parking/real-time-availability/:hotelId/:vehicleCategoryId', authMiddlewareCRUDAccess, parkingControllers.checkRealTimeAvailability);

// Parking Addon Assignment Endpoints
router.post('/parking/addon-assignment', authMiddlewareCRUDAccess, parkingControllers.createParkingAddonAssignment);
router.put('/parking/addon-assignment/:id', authMiddlewareCRUDAccess, parkingControllers.updateParkingAddonAssignment);
router.delete('/parking/addon-assignment/bulk', authMiddlewareCRUDAccess, parkingControllers.bulkDeleteParkingAddonAssignments);
router.delete('/parking/addon-assignment/:id', authMiddlewareCRUDAccess, parkingControllers.deleteParkingAddonAssignment);

module.exports = router;
