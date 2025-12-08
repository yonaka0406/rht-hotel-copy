const { getAllPlanAddons, createPlanAddon, updatePlanAddon, deletePlanAddon, getPlanAddonById } = require('../models/planAddon');

// GET all plan addons
const getPlanAddons = async (req, res) => {
    // const plans_global_id = req.params.gid; // Deprecated
    const plans_hotel_id = req.params.hid;
    const hotel_id = req.params.hotel_id;

    try {
        const addons = await getAllPlanAddons(req.requestId, null, plans_hotel_id, hotel_id);
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
        const addon = await getPlanAddonById(req.requestId, addonId);
        res.json(addon);
    } catch (error) {
        console.error('Error getting plan addon:', error);
        res.status(500).json({ error: error.message });
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
        console.error('Error creating plan addon:', error);
        res.status(500).json({ error: error.message });
    }
};

// PUT update an existing plan addon
const updateExistingPlanAddon = async (req, res) => {
    const addonId = parseInt(req.params.id);

    try {
        const existingAddon = await getPlanAddonById(req.requestId, addonId);

        const planAddon = {
            hotel_id: req.body.hotel_id ?? existingAddon.hotel_id,
            // plans_global_id: req.body.plans_global_id ?? existingAddon.plans_global_id, // Deprecated
            plans_hotel_id: req.body.plans_hotel_id ?? existingAddon.plans_hotel_id,
            addons_global_id: req.body.addons_global_id ?? existingAddon.addons_global_id,
            addons_hotel_id: req.body.addons_hotel_id ?? existingAddon.addons_hotel_id,
            price: req.body.price ?? existingAddon.price,
            date_start: req.body.date_start ?? existingAddon.date_start,
            date_end: req.body.date_end ?? existingAddon.date_end,
            sales_category: req.body.sales_category ?? existingAddon.sales_category,
            updated_by: req.user.id
        };

        // Ensure date_start is not null if it is required by the DB
        // Assuming it is required based on the error message.
        if (!planAddon.date_start) {
            // Provide a default or throw an error. For now, let's use a default.
            // A reasonable default for date_start could be the current date.
            planAddon.date_start = new Date().toISOString().split('T')[0];
        }

        const updatedAddon = await updatePlanAddon(req.requestId, addonId, planAddon);
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
        const deletedAddon = await deletePlanAddon(req.requestId, addonId);
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