const { getAllPlansRates, getPriceForReservation, createPlansRate, updatePlansRate, deletePlansRate, getPlansRateById } = require('../models/planRate');

// GET all plan rates
const getPlanRates = async (req, res) => {
    
    const plans_global_id = req.params.gid;
    const plans_hotel_id = req.params.hid;
    const hotel_id = req.params.hotel_id;
    
    try {
        const rates = await getAllPlansRates(req.requestId, plans_global_id, plans_hotel_id, hotel_id);
        
        if (rates.length === 0) {
            // console.log('No rates found for planId:');
        }
        res.json(rates);
    } catch (error) {
        console.error('Error getting plan rates:', error);
        res.status(500).json({ error: error.message });
    }
};

// GET plan rate by ID
const getPlanRate = async (req, res) => {
    const rateId = parseInt(req.params.id);

    try {
        const rate = await getPlansRateById(req.requestId, rateId);
        res.json(rate);
    } catch (error) {
        console.error('Error getting plan rate:', error);
        res.status(500).json({ error: error.message });
    }
};

const getPlanRateByDay = async (req, res) => {
    const plans_global_id = req.params.gid;
    const plans_hotel_id = req.params.hid;
    const hotel_id = req.params.hotel_id;
    const date = req.params.date;

    try {
        const rates = await getPriceForReservation(req.requestId, plans_global_id, plans_hotel_id, hotel_id, date);                
        res.json(rates);
    } catch (error) {
        console.error('Error getting plan rates:', error);
        res.status(500).json({ error: error.message });
    }
};

// POST create a new plan rate
const createNewPlanRate = async (req, res) => {
    const planRate = {
        ...req.body,        
        created_by: req.user.id,
        updated_by: req.user.id        
    };

    try {
        const newRate = await createPlansRate(req.requestId, planRate);
        res.status(201).json(newRate);
    } catch (error) {
        console.error('Error creating plan rate:', error);
        res.status(500).json({ error: error.message });
    }
};

// PUT update an existing plan rate
const updateExistingPlanRate = async (req, res) => {
    const rateId = parseInt(req.params.id);
    const planRate = {
        ...req.body,        
        updated_by: req.user.id
    };

    try {
        const updatedRate = await updatePlansRate(req.requestId, rateId, planRate);
        res.json(updatedRate);
    } catch (error) {
        console.error(`Error updating plan rate with ID ${rateId}:`, error);
        res.status(500).json({ error: error.message });
    }
};

// DELETE a plan rate by ID
const deletePlanRate = async (req, res) => {
    const rateId = parseInt(req.params.id);

    try {
        const deletedRate = await deletePlansRate(req.requestId, rateId);
        res.json(deletedRate);
    } catch (error) {
        console.error(`Error deleting plan rate with ID ${rateId}:`, error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getPlanRates,
    getPlanRate,
    getPlanRateByDay,
    createNewPlanRate,
    updateExistingPlanRate,
    deletePlanRate
};