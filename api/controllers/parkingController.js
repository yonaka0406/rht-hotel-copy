const parkingModel = require('../models/parking');
const { validateNumericParam, validateNonEmptyStringParam, validateDateStringParam, validateIntegerParam } = require('../utils/validationUtils');

// Vehicle Category
const getVehicleCategories = async (req, res) => {
    try {
        const categories = await parkingModel.getVehicleCategories(req.requestId);
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createVehicleCategory = async (req, res) => {
    try {
        const { name, capacity_units_required } = req.body;
        const newCategory = await parkingModel.createVehicleCategory(req.requestId, { name, capacity_units_required });
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateVehicleCategory = async (req, res) => {
    try {
        const { name, capacity_units_required } = req.body;
        const updatedCategory = await parkingModel.updateVehicleCategory(req.requestId, req.params.id, { name, capacity_units_required });
        res.json(updatedCategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteVehicleCategory = async (req, res) => {
    try {
        if (req.params.id == 1) {
            return res.status(400).json({ message: 'Cannot delete default vehicle category' });
        }
        await parkingModel.deleteVehicleCategory(req.requestId, req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Parking Lot
const getParkingLots = async (req, res) => {
    try {
        const lots = await parkingModel.getParkingLots(req.requestId, req.params.hotel_id);
        res.json(lots);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createParkingLot = async (req, res) => {
    try {
        const { hotel_id, name, description } = req.body;
        const newLot = await parkingModel.createParkingLot(req.requestId, { hotel_id, name, description });
        res.status(201).json(newLot);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateParkingLot = async (req, res) => {
    try {
        const { name, description } = req.body;
        const updatedLot = await parkingModel.updateParkingLot(req.requestId, req.params.id, { name, description });
        res.json(updatedLot);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteParkingLot = async (req, res) => {
    try {
        await parkingModel.deleteParkingLot(req.requestId, req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Parking Spot
const getParkingSpots = async (req, res) => {
    try {
        const spots = await parkingModel.getParkingSpots(req.requestId, req.params.parking_lot_id);
        res.json(spots);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createParkingSpot = async (req, res) => {
    try {
        const newSpot = await parkingModel.createParkingSpot(req.requestId, req.body);
        res.status(201).json(newSpot);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateParkingSpot = async (req, res) => {
    try {
        const updatedSpot = await parkingModel.updateParkingSpot(req.requestId, req.params.id, req.body);
        res.json(updatedSpot);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteParkingSpot = async (req, res) => {
    try {
        await parkingModel.deleteParkingSpot(req.requestId, req.params.id);
        res.status(204).send();
    } catch (error) {
        if (error.message.includes('Cannot delete parking spot with existing reservations')) {
            return res.status(400).json({ 
                message: 'この駐車スペースは予約で使用されているため削除できません。',
                code: 'HAS_RESERVATIONS'
            });
        }
        res.status(500).json({ 
            message: error.message,
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
};

// Block Parking Spot
const blockParkingSpot = async (req, res) => {
    try {
        const { hotel_id, parking_spot_id, start_date, end_date, comment } = req.body;
        const user_id = req.user.id;
        const result = await parkingModel.blockParkingSpot(req.requestId, { hotel_id, parking_spot_id, start_date, end_date, comment, user_id });
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateParkingSpotsForLot = async (req, res) => {
    try {
        const { parking_lot_id } = req.params;
        const { spots } = req.body;
        const result = await parkingModel.syncParkingSpots(req.requestId, parking_lot_id, spots);
        res.json(result);
    } catch (error) {
        console.error('Error syncing parking spots:', error);
        res.status(500).json({ message: 'Failed to sync parking spots' });
    }
};

// Get parking reservations
const getParkingReservations = async (req, res) => {
    try {
        const { hotel_id, startDate, endDate } = req.query;
        const reservations = await parkingModel.getParkingReservations(req.requestId, hotel_id, startDate, endDate);
        res.json(reservations);
    } catch (error) {
        console.error('Error fetching parking reservations:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get all parking spots for a hotel
const getAllParkingSpotsByHotel = async (req, res) => {
    try {
        const { hotel_id } = req.params;
        const spots = await parkingModel.getAllParkingSpotsByHotel(req.requestId, hotel_id);
        res.json(spots);
    } catch (error) {
        console.error('Error fetching all parking spots for hotel:', error);
        res.status(500).json({ message: error.message });
    }
};

// Check parking vacancies for specific vehicle category
const checkParkingVacancies = async (req, res) => {
    try {
        const { hotelId, startDate, endDate, vehicleCategoryId } = req.params;
        
        // Validate parameters
        if (!validateNumericParam(hotelId) || !validateNumericParam(vehicleCategoryId)) {
            return res.status(400).json({ message: 'Invalid hotel ID or vehicle category ID' });
        }
        
        if (!validateDateStringParam(startDate) || !validateDateStringParam(endDate)) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        // Create date range array
        const dateRange = [];
        const currentDate = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        while (currentDate < endDateObj) {
            dateRange.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Use enhanced service method
        const ParkingAddonService = require('../services/parkingAddonService');
        const service = new ParkingAddonService(req.requestId);
        
        const vacancyInfo = await service.checkParkingVacancies(
            parseInt(hotelId),
            dateRange,
            parseInt(vehicleCategoryId)
        );
        
        res.json(vacancyInfo);
    } catch (error) {
        console.error('Error checking parking vacancies:', error);
        if (error.message.includes('Vehicle category not found')) {
            return res.status(404).json({ message: 'Vehicle category not found' });
        }
        res.status(500).json({ message: error.message });
    }
};

// Get compatible parking spots for vehicle category
const getCompatibleSpots = async (req, res) => {
    try {
        const { hotelId, vehicleCategoryId } = req.params;
        
        // Validate parameters
        if (!validateNumericParam(hotelId) || !validateNumericParam(vehicleCategoryId)) {
            return res.status(400).json({ message: 'Invalid hotel ID or vehicle category ID' });
        }
        
        // Use enhanced service method
        const ParkingAddonService = require('../services/parkingAddonService');
        const service = new ParkingAddonService(req.requestId);
        
        const compatibleSpotsInfo = await service.getCompatibleSpots(
            parseInt(hotelId),
            parseInt(vehicleCategoryId)
        );
        
        res.json(compatibleSpotsInfo);
    } catch (error) {
        console.error('Error fetching compatible spots:', error);
        if (error.message.includes('Vehicle category not found')) {
            return res.status(404).json({ message: 'Vehicle category not found' });
        }
        res.status(500).json({ message: error.message });
    }
};

// Get available spots for specific dates with capacity validation
const getAvailableSpotsForDates = async (req, res) => {
    try {
        const { hotelId, vehicleCategoryId } = req.params;
        const { startDate, endDate } = req.query;
        
        // Validate parameters
        if (!validateNumericParam(hotelId) || !validateNumericParam(vehicleCategoryId)) {
            return res.status(400).json({ message: 'Invalid hotel ID or vehicle category ID' });
        }
        
        if (!validateDateStringParam(startDate) || !validateDateStringParam(endDate)) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        // Use enhanced service method
        const ParkingAddonService = require('../services/parkingAddonService');
        const service = new ParkingAddonService(req.requestId);
        
        const availableSpotsInfo = await service.getAvailableSpotsForDates(
            parseInt(hotelId),
            startDate,
            endDate,
            parseInt(vehicleCategoryId)
        );
        
        res.json(availableSpotsInfo);
    } catch (error) {
        console.error('Error fetching available spots for dates:', error);
        if (error.message.includes('Vehicle category not found')) {
            return res.status(404).json({ message: 'Vehicle category not found' });
        }
        res.status(500).json({ message: error.message });
    }
};

// Check real-time availability with capacity unit consideration
const checkRealTimeAvailability = async (req, res) => {
    try {
        const { hotelId, vehicleCategoryId } = req.params;
        const { dates, excludeReservationId } = req.body;
        
        // Validate parameters
        if (!validateNumericParam(hotelId) || !validateNumericParam(vehicleCategoryId)) {
            return res.status(400).json({ message: 'Invalid hotel ID or vehicle category ID' });
        }
        
        if (!dates || !Array.isArray(dates) || dates.length === 0) {
            return res.status(400).json({ message: 'Dates array is required' });
        }

        // Validate date format for each date
        for (const date of dates) {
            if (!validateDateStringParam(date)) {
                return res.status(400).json({ message: `Invalid date format: ${date}` });
            }
        }

        // Use enhanced service method
        const ParkingAddonService = require('../services/parkingAddonService');
        const service = new ParkingAddonService(req.requestId);
        
        const realTimeAvailability = await service.checkRealTimeAvailability(
            parseInt(hotelId),
            dates,
            parseInt(vehicleCategoryId),
            excludeReservationId ? parseInt(excludeReservationId) : null
        );
        
        res.json(realTimeAvailability);
    } catch (error) {
        console.error('Error checking real-time availability:', error);
        if (error.message.includes('Vehicle category not found')) {
            return res.status(404).json({ message: 'Vehicle category not found' });
        }
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
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
    checkRealTimeAvailability
};
