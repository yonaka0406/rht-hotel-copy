const { getAllPlanAddons, createPlanAddon, updatePlanAddon, deletePlanAddon, getPlanAddonById } = require('../../models/planAddon');
const { validateNumericParam, validateUuidParam } = require('../../utils/validationUtils');

// Helper function to handle common error responses
const handleError = (res, message, error, statusCode = 500) => {
  console.error(message, error);
  res.status(statusCode).json({ message });
};

// GET all plan addons
const getPlanAddons = async (req, res) => {    
    const plans_global_id = req.params.gid;
    const plans_hotel_id = req.params.hid;
    const hotel_id = req.params.hotel_id;

    try {
        const addons = await getAllPlanAddons(req.requestId, plans_global_id, plans_hotel_id, hotel_id);
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

// Add an addon to a plan
const addAddonToPlan = async (req, res) => {
  const { planId, addonId } = req.params;
  if (!validateNumericParam(planId, 'Plan ID') || !validateNumericParam(addonId, 'Addon ID')) {
    return res.status(400).json({ message: 'Invalid Plan ID or Addon ID' });
  }

  try {
    const newPlanAddon = await createPlanAddon(req.requestId, planId, addonId);
    res.status(201).json(newPlanAddon);
  } catch (error) {
    handleError(res, 'Failed to add addon to plan', error);
  }
};

// Remove an addon from a plan
const removeAddonFromPlan = async (req, res) => {
  const { planId, addonId } = req.params;
  if (!validateNumericParam(planId, 'Plan ID') || !validateNumericParam(addonId, 'Addon ID')) {
    return res.status(400).json({ message: 'Invalid Plan ID or Addon ID' });
  }

  try {
    const deleted = await deletePlanAddon(req.requestId, planId, addonId);
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Plan addon not found' });
    }
  } catch (error) {
    handleError(res, 'Failed to remove addon from plan', error);
  }
};

module.exports = {
    getPlanAddons,
    getPlanAddon,
    createNewPlanAddon,
    updateExistingPlanAddon,
    deleteExistingPlanAddon,
    addAddonToPlan,
    removeAddonFromPlan
};