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
    updateParkingSpotsForLot
};
