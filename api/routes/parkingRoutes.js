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

/**
 * GET /api/parking/capacity/available
 * Get available parking capacity for a specific date range and vehicle category
 * 
 * Query Parameters:
 * @param {number} hotelId - Hotel ID (required)
 * @param {string} startDate - Start date in YYYY-MM-DD format (required)
 * @param {string} endDate - End date in YYYY-MM-DD format, exclusive (required)
 * @param {number} vehicleCategoryId - Vehicle category ID (required)
 * 
 * @example
 * GET /api/parking/capacity/available?hotelId=1&startDate=2024-01-01&endDate=2024-01-31&vehicleCategoryId=1
 * 
 * @returns {Object} Capacity availability breakdown by date
 */
router.get('/parking/capacity/available', authMiddleware, getAvailableCapacity);

/**
 * POST /api/parking/capacity/block
 * Block parking capacity for a date range (admin only)
 * 
 * Request Body:
 * @param {number} hotel_id - Hotel ID (required)
 * @param {number} vehicle_category_id - Vehicle category ID (required)
 * @param {string} start_date - Start date in YYYY-MM-DD format (required)
 * @param {string} end_date - End date in YYYY-MM-DD format, exclusive (required)
 * @param {number} blocked_capacity - Number of spots to block (required, must be > 0)
 * @param {string} reason - Reason for blocking (optional)
 * @param {string} comment - Additional comments (optional)
 * 
 * @example
 * POST /api/parking/capacity/block
 * Body: {
 *   "hotel_id": 1,
 *   "vehicle_category_id": 1,
 *   "start_date": "2024-01-01",
 *   "end_date": "2024-01-31",
 *   "blocked_capacity": 5,
 *   "reason": "Maintenance",
 *   "comment": "Annual parking lot maintenance"
 * }
 * 
 * @returns {Object} Block creation result with blockId
 */
router.post('/parking/capacity/block', authMiddleware_manageDB, blockCapacity);

/**
 * GET /api/parking/capacity/blocks
 * Get all blocked capacity records for a hotel within a date range
 * 
 * Query Parameters:
 * @param {number} hotelId - Hotel ID (required)
 * @param {string} startDate - Start date in YYYY-MM-DD format (required)
 * @param {string} endDate - End date in YYYY-MM-DD format (required)
 * 
 * @example
 * GET /api/parking/capacity/blocks?hotelId=1&startDate=2024-01-01&endDate=2024-01-31
 * 
 * @returns {Array} List of parking block records
 */
router.get('/parking/capacity/blocks', authMiddleware, getBlockedCapacity);

/**
 * DELETE /api/parking/capacity/blocks/:blockId
 * Remove a capacity block (admin only)
 * 
 * Path Parameters:
 * @param {string} blockId - Block UUID (required)
 * 
 * @example
 * DELETE /api/parking/capacity/blocks/550e8400-e29b-41d4-a716-446655440000
 * 
 * @returns {Object} Deletion result with audit information
 */
router.delete('/parking/capacity/blocks/:blockId', authMiddleware_manageDB, removeCapacityBlock);

/**
 * GET /api/parking/capacity/summary
 * Get comprehensive capacity summary for a hotel across all vehicle categories
 * 
 * Query Parameters:
 * @param {number} hotelId - Hotel ID (required)
 * @param {string} startDate - Start date in YYYY-MM-DD format (required)
 * @param {string} endDate - End date in YYYY-MM-DD format (required)
 * 
 * @example
 * GET /api/parking/capacity/summary?hotelId=1&startDate=2024-01-01&endDate=2024-01-31
 * 
 * @returns {Object} Comprehensive capacity summary with breakdown by category and parking lot
 */
router.get('/parking/capacity/summary', authMiddleware, getCapacitySummary);

module.exports = router;
