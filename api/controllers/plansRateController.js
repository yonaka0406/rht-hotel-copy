const { getAllPlansRates, getPriceForReservation, getRatesForTheDay, createPlansRate, updatePlansRate, deletePlansRate, getPlansRateById } = require('../models/planRate');
const { validateNumericParam } = require('../utils/validationUtils');
const logger = require('../config/logger');

const parseParam = (val) => {
    if (val === 'undefined' || val === 'null' || !val) return null;
    return parseInt(val, 10);
};

// GET all plan rates
const getPlanRates = async (req, res) => {
    try {
        const plans_global_id = parseParam(req.params.gid);
        const plans_hotel_id = parseParam(req.params.hid);
        const hotel_id = validateNumericParam(req.params.hotel_id, 'Hotel ID');

        const rates = await getAllPlansRates(req.requestId, plans_global_id, plans_hotel_id, hotel_id);

        if (rates.length === 0) {
            // console.log('No rates found for planId:');
        }
        res.json(rates);
    } catch (error) {
        logger.error('Error getting plan rates:', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            query: req.query,
            requestId: req.requestId
        });
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

// GET plan rate by ID
const getPlanRate = async (req, res) => {
    try {
        const rateId = validateNumericParam(req.params.id, 'Plan Rate ID');
        const rate = await getPlansRateById(req.requestId, rateId);
        res.json(rate);
    } catch (error) {
        logger.error('Error getting plan rate by ID:', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            query: req.query,
            requestId: req.requestId
        });
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

const getPlanRateByDay = async (req, res) => {
    try {
        const plans_global_id = parseParam(req.params.gid);
        const plans_hotel_id = parseParam(req.params.hid);
        const hotel_id = validateNumericParam(req.params.hotel_id, 'Hotel ID');
        const date = req.params.date;

        const rates = await getPriceForReservation(req.requestId, plans_global_id, plans_hotel_id, hotel_id, date, false, null);
        res.json(rates);
    } catch (error) {
        logger.error('Error getting plan rate by ID:', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            query: req.query,
            requestId: req.requestId
        });
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};
const getPlanRatesByDay = async (req, res) => {
    try {
        const plans_global_id = parseParam(req.params.gid);
        const plans_hotel_id = parseParam(req.params.hid);
        const hotel_id = validateNumericParam(req.params.hotel_id, 'Hotel ID');
        const date = req.params.date;

        const rates = await getRatesForTheDay(req.requestId, plans_global_id, plans_hotel_id, hotel_id, date, null);
        res.json(rates);
    } catch (error) {
        logger.error('Error getting plan rates:', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            query: req.query,
            requestId: req.requestId
        });
        res.status(error.statusCode || 500).json({ error: error.message });
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
        logger.error('Error creating plan rate:', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            query: req.query,
            requestId: req.requestId
        });
        res.status(500).json({ error: error.message });
    }
};

// PUT update an existing plan rate
const updateExistingPlanRate = async (req, res) => {
    try {
        const rateId = validateNumericParam(req.params.id, 'Plan Rate ID');
        const planRate = {
            ...req.body,
            updated_by: req.user.id
        };

        const updatedRate = await updatePlansRate(req.requestId, rateId, planRate);
        res.json(updatedRate);
    } catch (error) {
        logger.error('Error updating plan rate:', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            query: req.query,
            requestId: req.requestId
        });
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

// DELETE a plan rate by ID
const deletePlanRate = async (req, res) => {
    try {
        const rateId = validateNumericParam(req.params.id, 'Plan Rate ID');
        const deletedRate = await deletePlansRate(req.requestId, rateId);
        res.json(deletedRate);
    } catch (error) {
        logger.error('Error deleting plan rate:', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            query: req.query,
            requestId: req.requestId
        });
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

module.exports = {
    getPlanRates,
    getPlanRate,
    getPlanRateByDay,
    getPlanRatesByDay,
    createNewPlanRate,
    updateExistingPlanRate,
    deletePlanRate
};