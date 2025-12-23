const { getAllPlanAddons, createPlanAddon, updatePlanAddon, deletePlanAddon, getPlanAddonById } = require('../models/planAddon');
const { validateNumericParam } = require('../utils/validationUtils');
const logger = require('../config/logger');

const parseParam = (val) => {
    if (val === 'undefined' || val === 'null' || !val) return null;
    return parseInt(val, 10);
};

// GET all plan addons
const getPlanAddons = async (req, res) => {
    try {
        const plans_global_id = parseParam(req.params.gid);
        const plans_hotel_id = parseParam(req.params.hid);
        const hotel_id = validateNumericParam(req.params.hotel_id, 'Hotel ID');

        const addons = await getAllPlanAddons(req.requestId, plans_global_id, plans_hotel_id, hotel_id);
        res.json(addons);
    } catch (error) {
        logger.error('Error getting plan addons:', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            query: req.query,
            requestId: req.requestId
        });
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

// GET plan addon by ID
const getPlanAddon = async (req, res) => {
    try {
        const addonId = validateNumericParam(req.params.id, 'Plan Addon ID');
        const addon = await getPlanAddonById(req.requestId, addonId);
        res.json(addon);
    } catch (error) {
        logger.error('Error getting plan addon by ID:', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            query: req.query,
            requestId: req.requestId
        });
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

// POST create a new plan addon
const createNewPlanAddon = async (req, res) => {
    const planAddon = {
        ...req.body,
        created_by: req.user.id,
        updated_by: req.user.id
    };

    try {
        const newAddon = await createPlanAddon(req.requestId, planAddon);
        res.status(201).json(newAddon);
    } catch (error) {
        logger.error('Error creating plan addon:', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            query: req.query,
            requestId: req.requestId
        });
        res.status(500).json({ error: error.message });
    }
};

// PUT update an existing plan addon
const updateExistingPlanAddon = async (req, res) => {
    try {
        const addonId = validateNumericParam(req.params.id, 'Plan Addon ID');
        const existingAddon = await getPlanAddonById(req.requestId, addonId);

        const planAddon = {
            hotel_id: req.body.hotel_id ?? existingAddon.hotel_id,
            plans_global_id: req.body.plans_global_id ?? existingAddon.plans_global_id,
            plans_hotel_id: req.body.plans_hotel_id ?? existingAddon.plans_hotel_id,
            addons_global_id: req.body.addons_global_id ?? existingAddon.addons_global_id,
            addons_hotel_id: req.body.addons_hotel_id ?? existingAddon.addons_hotel_id,
            price: req.body.price ?? existingAddon.price,
            date_start: req.body.date_start ?? existingAddon.date_start,
            date_end: req.body.date_end ?? existingAddon.date_end,
            sales_category: req.body.sales_category ?? existingAddon.sales_category,
            updated_by: req.user.id
        };

        // Ensure date_start is not null
        if (!planAddon.date_start) {
            planAddon.date_start = new Date().toISOString().split('T')[0];
        }

        const updatedAddon = await updatePlanAddon(req.requestId, addonId, planAddon);
        res.json(updatedAddon);
    } catch (error) {
        logger.error('Error updating plan addon:', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            query: req.query,
            requestId: req.requestId
        });
        res.status(error.statusCode || 500).json({ error: error.message });
    }
};

// DELETE a plan addon by ID
const deleteExistingPlanAddon = async (req, res) => {
    try {
        const addonId = validateNumericParam(req.params.id, 'Plan Addon ID');
        const deletedAddon = await deletePlanAddon(req.requestId, addonId);
        res.json(deletedAddon);
    } catch (error) {
        logger.error('Error deleting plan addon:', {
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
    getPlanAddons,
    getPlanAddon,
    createNewPlanAddon,
    updateExistingPlanAddon,
    deleteExistingPlanAddon
};