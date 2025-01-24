const { getAllPlanAddons, createPlanAddon, updatePlanAddon, deletePlanAddon, getPlanAddonById } = require('../models/planAddon');

// GET all plan addons
const getPlanAddons = async (req, res) => {    
    const plans_global_id = req.params.gid;
    const plans_hotel_id = req.params.hid;
    const hotel_id = req.params.hotel_id;

    try {
        const addons = await getAllPlanAddons(plans_global_id, plans_hotel_id, hotel_id);
        res.json(addons);
    } catch (error) {
        console.error('Error getting plan addons:', error);
        res.status(500).json({ error: error.message });
    }
};

// GET plan addon by ID
const getPlanAddon = async (req, res) => {
    const addonId = parseInt(req.params.id);

    try {
        const addon = await getPlanAddonById(addonId);
        res.json(addon);
    } catch (error) {
        console.error('Error getting plan addon:', error);
        res.status(500).json({ error: error.message });
    }
};

// POST create a new plan addon
const createNewPlanAddon = async (req, res) => {
    const planAddon = {
        hotel_id: req.body.hotel_id,
        plans_global_id: req.body.plans_global_id,
        plans_hotel_id: req.body.plans_hotel_id,
        addons_id: req.body.addons_id,
        price: req.body.price,
        date_start: req.body.date_start,
        date_end: req.body.date_end,
        created_by: req.user.id,
        updated_by: req.user.id
    };

    try {
        const newAddon = await createPlanAddon(planAddon);
        res.status(201).json(newAddon);
    } catch (error) {
        console.error('Error creating plan addon:', error);
        res.status(500).json({ error: error.message });
    }
};

// PUT update an existing plan addon
const updateExistingPlanAddon = async (req, res) => {
    const addonId = parseInt(req.params.id);
    const planAddon = {
        hotel_id: req.body.hotel_id,
        plans_global_id: req.body.plans_global_id,
        plans_hotel_id: req.body.plans_hotel_id,
        addons_global_id: req.body.addons_global_id,
        addons_hotel_id: req.body.addons_hotel_id,
        price: req.body.price,
        date_start: req.body.date_start,
        date_end: req.body.date_end,
        updated_by: req.user.id
    };

    try {
        const updatedAddon = await updatePlanAddon(addonId, planAddon);
        res.json(updatedAddon);
    } catch (error) {
        console.error('Error updating plan addon:', error);
        res.status(500).json({ error: error.message });
    }
};

// DELETE a plan addon by ID
const deleteExistingPlanAddon = async (req, res) => {
    const addonId = parseInt(req.params.id);

    try {
        const deletedAddon = await deletePlanAddon(addonId);
        res.json(deletedAddon);
    } catch (error) {
        console.error('Error deleting plan addon:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getPlanAddons,
    getPlanAddon,
    createNewPlanAddon,
    updateExistingPlanAddon,
    deleteExistingPlanAddon
};