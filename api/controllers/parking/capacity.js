const parkingModel = require('../../models/parking');
const { validateNumericParam, validateDateStringParam } = require('../../utils/validationUtils');
const ParkingCapacityService = require('./services/parkingCapacityService');

/**
 * GET /api/parking/capacity/available
 * Get available parking capacity for a date range and vehicle category
 */
const getAvailableCapacity = async (req, res) => {
    try {
        const { hotelId, startDate, endDate, vehicleCategoryId } = req.query;
        
        // Validate parameters
        if (!validateNumericParam(hotelId)) {
            return res.status(400).json({ message: 'Invalid hotel ID' });
        }
        
        if (!validateNumericParam(vehicleCategoryId)) {
            return res.status(400).json({ message: 'Invalid vehicle category ID' });
        }
        
        if (!validateDateStringParam(startDate) || !validateDateStringParam(endDate)) {
            return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
        }
        
        // Use ParkingCapacityService
        const service = new ParkingCapacityService(req.requestId);
        const availability = await service.getAvailableCapacity(
            parseInt(hotelId),
            startDate,
            endDate,
            parseInt(vehicleCategoryId)
        );
        
        res.json(availability);
    } catch (error) {
        console.error('Error getting available capacity:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

/**
 * POST /api/parking/capacity/block
 * Block parking capacity for a date range
 */
const blockCapacity = async (req, res) => {
    try {
        const {
            hotel_id,
            vehicle_category_id,
            start_date,
            end_date,
            blocked_capacity,
            reason,
            comment
        } = req.body;
        const user_id = req.user.id;
        
        // Validate required parameters
        if (!hotel_id || !vehicle_category_id || !start_date || !end_date || !blocked_capacity) {
            return res.status(400).json({ 
                message: 'Missing required parameters: hotel_id, vehicle_category_id, start_date, end_date, blocked_capacity' 
            });
        }
        
        if (!validateNumericParam(hotel_id) || !validateNumericParam(vehicle_category_id)) {
            return res.status(400).json({ message: 'Invalid hotel ID or vehicle category ID' });
        }
        
        if (!validateDateStringParam(start_date) || !validateDateStringParam(end_date)) {
            return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
        }
        
        if (!validateNumericParam(String(blocked_capacity)) || blocked_capacity <= 0) {
            return res.status(400).json({ message: 'Blocked capacity must be a positive number' });
        }
        
        // Use ParkingCapacityService
        const service = new ParkingCapacityService(req.requestId);
        const result = await service.blockCapacity({
            hotel_id: parseInt(hotel_id),
            vehicle_category_id: parseInt(vehicle_category_id),
            start_date,
            end_date,
            blocked_capacity: parseInt(blocked_capacity),
            reason,
            comment,
            user_id
        });
        
        res.status(201).json(result);
    } catch (error) {
        console.error('Error blocking capacity:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/parking/capacity/blocks
 * Get blocked capacity records for a date range
 */
const getBlockedCapacity = async (req, res) => {
    try {
        const { hotelId, startDate, endDate } = req.query;
        
        // Validate parameters
        if (!validateNumericParam(hotelId)) {
            return res.status(400).json({ message: 'Invalid hotel ID' });
        }
        
        if (!validateDateStringParam(startDate) || !validateDateStringParam(endDate)) {
            return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
        }
        
        // Use parking model
        const blocks = await parkingModel.getBlockedCapacity(
            req.requestId,
            parseInt(hotelId),
            startDate,
            endDate
        );
        
        res.json(blocks);
    } catch (error) {
        console.error('Error getting blocked capacity:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * DELETE /api/parking/capacity/blocks/:blockId
 * Remove a capacity block
 */
const removeCapacityBlock = async (req, res) => {
    try {
        const { blockId } = req.params;
        const user_id = req.user.id;
        
        if (!blockId) {
            return res.status(400).json({ message: 'Block ID is required' });
        }
        
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(blockId)) {
            return res.status(400).json({ message: 'Invalid block ID format' });
        }
        
        // Use ParkingCapacityService
        const service = new ParkingCapacityService(req.requestId);
        const result = await service.releaseBlockedCapacity(blockId);
        
        res.json(result);
    } catch (error) {
        console.error('Error removing capacity block:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

/**
 * GET /api/parking/capacity/summary
 * Get comprehensive capacity summary for a hotel
 */
const getCapacitySummary = async (req, res) => {
    try {
        const { hotelId, startDate, endDate } = req.query;
        
        // Validate parameters
        if (!validateNumericParam(hotelId)) {
            return res.status(400).json({ message: 'Invalid hotel ID' });
        }
        
        if (!validateDateStringParam(startDate) || !validateDateStringParam(endDate)) {
            return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
        }
        
        // Use ParkingCapacityService
        const service = new ParkingCapacityService(req.requestId);
        const summary = await service.getCapacitySummary(
            parseInt(hotelId),
            startDate,
            endDate
        );
        
        res.json(summary);
    } catch (error) {
        console.error('Error getting capacity summary:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAvailableCapacity,
    blockCapacity,
    getBlockedCapacity,
    removeCapacityBlock,
    getCapacitySummary,
};
