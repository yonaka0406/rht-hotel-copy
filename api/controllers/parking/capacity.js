const parkingModel = require('../../models/parking');
const { validateNumericParam, validateDateStringParam } = require('../../utils/validationUtils');
const { validateDateRange, validateCapacityAmount } = require('./utils/capacityValidation');
const ParkingCapacityService = require('./services/parkingCapacityService');

/**
 * GET /api/parking/capacity/available
 * Get available parking capacity for a date range and vehicle category
 */
const getAvailableCapacity = async (req, res) => {
    try {
        const { hotelId, startDate, endDate, vehicleCategoryId } = req.query;
        
        // Validate required parameters
        if (!hotelId) {
            return res.status(400).json({ 
                message: 'Missing required parameter: hotelId',
                example: '/api/parking/capacity/available?hotelId=1&startDate=2024-01-01&endDate=2024-01-31&vehicleCategoryId=1'
            });
        }
        
        if (!startDate) {
            return res.status(400).json({ 
                message: 'Missing required parameter: startDate (format: YYYY-MM-DD)',
                example: '/api/parking/capacity/available?hotelId=1&startDate=2024-01-01&endDate=2024-01-31&vehicleCategoryId=1'
            });
        }
        
        if (!endDate) {
            return res.status(400).json({ 
                message: 'Missing required parameter: endDate (format: YYYY-MM-DD)',
                example: '/api/parking/capacity/available?hotelId=1&startDate=2024-01-01&endDate=2024-01-31&vehicleCategoryId=1'
            });
        }
        
        if (!vehicleCategoryId) {
            return res.status(400).json({ 
                message: 'Missing required parameter: vehicleCategoryId',
                example: '/api/parking/capacity/available?hotelId=1&startDate=2024-01-01&endDate=2024-01-31&vehicleCategoryId=1'
            });
        }
        
        // Validate parameter formats
        if (!validateNumericParam(hotelId)) {
            return res.status(400).json({ message: 'Invalid hotel ID: must be a positive integer' });
        }
        
        if (!validateNumericParam(vehicleCategoryId)) {
            return res.status(400).json({ message: 'Invalid vehicle category ID: must be a positive integer' });
        }
        
        if (!validateDateStringParam(startDate)) {
            return res.status(400).json({ message: 'Invalid startDate format: must be YYYY-MM-DD (e.g., 2024-01-01)' });
        }
        
        if (!validateDateStringParam(endDate)) {
            return res.status(400).json({ message: 'Invalid endDate format: must be YYYY-MM-DD (e.g., 2024-01-31)' });
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
        // Validate user authentication
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User authentication required' });
        }
        
        const {
            hotel_id,
            parking_lot_id,
            spot_size,
            start_date,
            end_date,
            number_of_spots,
            comment
        } = req.body;
        const user_id = req.user.id;
        
        // Validate required parameters
        if (!hotel_id || !start_date || !end_date || !number_of_spots) {
            return res.status(400).json({ 
                message: 'Missing required parameters: hotel_id, start_date, end_date, number_of_spots' 
            });
        }
        
        if (!validateNumericParam(hotel_id)) {
            return res.status(400).json({ message: 'Invalid hotel ID' });
        }
        
        // Validate optional parameters
        if (parking_lot_id && !validateNumericParam(parking_lot_id)) {
            return res.status(400).json({ message: 'Invalid parking lot ID' });
        }
        
        if (spot_size && !validateNumericParam(spot_size)) {
            return res.status(400).json({ message: 'Invalid spot size' });
        }
        
        if (!validateDateStringParam(start_date) || !validateDateStringParam(end_date)) {
            return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
        }
        
        // Validate date range
        const dateRangeValidation = validateDateRange(start_date, end_date);
        if (!dateRangeValidation.isValid) {
            return res.status(400).json({ message: dateRangeValidation.error });
        }
        
        // Validate capacity amount
        const capacityValidation = validateCapacityAmount(parseInt(number_of_spots));
        if (!capacityValidation.isValid) {
            return res.status(400).json({ message: capacityValidation.error });
        }
        
        // Use ParkingCapacityService
        const service = new ParkingCapacityService(req.requestId);
        const result = await service.blockCapacity({
            hotel_id: parseInt(hotel_id),
            parking_lot_id: parking_lot_id ? parseInt(parking_lot_id) : null,
            spot_size: spot_size ? parseInt(spot_size) : null,
            start_date,
            end_date,
            number_of_spots: parseInt(number_of_spots),
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
        
        // Validate required parameters
        if (!hotelId) {
            return res.status(400).json({ 
                message: 'Missing required parameter: hotelId',
                example: '/api/parking/capacity/blocks?hotelId=1&startDate=2024-01-01&endDate=2024-01-31'
            });
        }
        
        if (!startDate) {
            return res.status(400).json({ 
                message: 'Missing required parameter: startDate (format: YYYY-MM-DD)',
                example: '/api/parking/capacity/blocks?hotelId=1&startDate=2024-01-01&endDate=2024-01-31'
            });
        }
        
        if (!endDate) {
            return res.status(400).json({ 
                message: 'Missing required parameter: endDate (format: YYYY-MM-DD)',
                example: '/api/parking/capacity/blocks?hotelId=1&startDate=2024-01-01&endDate=2024-01-31'
            });
        }
        
        // Validate parameter formats
        if (!validateNumericParam(hotelId)) {
            return res.status(400).json({ message: 'Invalid hotel ID: must be a positive integer' });
        }
        
        if (!validateDateStringParam(startDate)) {
            return res.status(400).json({ message: 'Invalid startDate format: must be YYYY-MM-DD (e.g., 2024-01-01)' });
        }
        
        if (!validateDateStringParam(endDate)) {
            return res.status(400).json({ message: 'Invalid endDate format: must be YYYY-MM-DD (e.g., 2024-01-31)' });
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
        // Validate user authentication
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User authentication required' });
        }
        
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
        const result = await service.releaseBlockedCapacity(blockId, user_id);
        
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
        
        // Validate required parameters
        if (!hotelId) {
            return res.status(400).json({ 
                message: 'Missing required parameter: hotelId',
                example: '/api/parking/capacity/summary?hotelId=1&startDate=2024-01-01&endDate=2024-01-31'
            });
        }
        
        if (!startDate) {
            return res.status(400).json({ 
                message: 'Missing required parameter: startDate (format: YYYY-MM-DD)',
                example: '/api/parking/capacity/summary?hotelId=1&startDate=2024-01-01&endDate=2024-01-31'
            });
        }
        
        if (!endDate) {
            return res.status(400).json({ 
                message: 'Missing required parameter: endDate (format: YYYY-MM-DD)',
                example: '/api/parking/capacity/summary?hotelId=1&startDate=2024-01-01&endDate=2024-01-31'
            });
        }
        
        // Validate parameter formats
        if (!validateNumericParam(hotelId)) {
            return res.status(400).json({ message: 'Invalid hotel ID: must be a positive integer' });
        }
        
        if (!validateDateStringParam(startDate)) {
            return res.status(400).json({ message: 'Invalid startDate format: must be YYYY-MM-DD (e.g., 2024-01-01)' });
        }
        
        if (!validateDateStringParam(endDate)) {
            return res.status(400).json({ message: 'Invalid endDate format: must be YYYY-MM-DD (e.g., 2024-01-31)' });
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
