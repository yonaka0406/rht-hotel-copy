const plansModel = require('../../models/plan');
const planAddonModel = require('../../models/planAddon');
const planRateModel = require('../../models/planRate');
const { validateNumericParam, validateUuidParam } = require('../../utils/validationUtils');

// Helper function to handle common error responses
const handleError = (res, message, error, statusCode = 500) => {
  console.error(message, error);
  res.status(statusCode).json({ message });
};

// Create a new plan
exports.createGlobalPlan = async (req, res) => {
  const { name, description, price, capacity } = req.body;
  if (!name || !price || !capacity) {
    return res.status(400).json({ message: 'Missing required plan fields' });
  }

  try {
    const newPlan = await plansModel.newGlobalPlan(req.requestId, { name, description, price, capacity });
    res.status(201).json(newPlan);
  } catch (error) {
    handleError(res, 'Failed to create plan', error);
  }
};

exports.createHotelPlan = async (req, res) => {
    const { hotel_id, plans_global_id, name, description, plan_type, colorHEX } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    const color = '#' + colorHEX;

    try {
        const newPlan = await plansModel.newHotelPlan(req.requestId, hotel_id, plans_global_id, name, description, plan_type, color, created_by, updated_by);
        res.json(newPlan);
    } catch (err) {
        console.error('Error creating hotel Plan:', err);
        res.status(500).json({ error: 'Failed to create hotel Plan' });
    }
};

const createPlanPattern = async (req, res) => {
    const { hotel_id, name, template } = req.body;
    const user_id = req.user.id;    

    try {
        const newData = await plansModel.newPlanPattern(req.requestId, hotel_id, name, template, user_id);
        res.json(newData);
    } catch (err) {
        console.error('Error creating plan pattern:', err);
        res.status(500).json({ error: 'Failed to create plan pattern' });
    }
};

const editGlobalPlan = async (req, res) => {    
    const { id } = req.params;
    const { name, description, plan_type, colorHEX } = req.body;
    const updated_by = req.user.id;

    const color = '#' + colorHEX;

    try {
        const updatedPlan = await plansModel.updateGlobalPlan(req.requestId, id, name, description, plan_type, color, updated_by);
        res.json(updatedPlan);
    } catch (err) {
        console.error('Error updating global Plan:', err);
        res.status(500).json({ error: 'Failed to update global Plan' });
    }
};

const editHotelPlan = async (req, res) => {
    const { id } = req.params;
    const { hotel_id, plans_global_id, name, description, plan_type, colorHEX } = req.body;
    const updated_by = req.user.id;

    const color = '#' + colorHEX;

    try {
        const updatedPlan = await plansModel.updateHotelPlan(req.requestId, id, hotel_id, plans_global_id, name, description, plan_type, color, updated_by);
        res.json(updatedPlan);
    } catch (err) {
        console.error('Error updating hotel Plan:', err);
        res.status(500).json({ error: 'Failed to update hotel Plan' });
    }
};

const editPlanPattern = async (req, res) => {
    const { id } = req.params;
    const { name, template } = req.body;
    const user_id = req.user.id;    

    try {
        const newData = await plansModel.updatePlanPattern(req.requestId, id, name, template, user_id);
        res.json(newData);
    } catch (err) {
        console.error('Error edit global pattern:', err);
        res.status(500).json({ error: 'Failed to edit global pattern' });
    }
};

// Update an existing plan
exports.updatePlan = async (req, res) => {
  const { id } = req.params;
  if (!validateNumericParam(id, 'Plan ID')) {
    return res.status(400).json({ message: 'Invalid Plan ID' });
  }

  try {
    const updatedPlan = await plansModel.updatePlan(req.requestId, id, req.body);
    if (updatedPlan) {
      res.status(200).json(updatedPlan);
    } else {
      res.status(404).json({ message: 'Plan not found' });
    }
  } catch (error) {
    handleError(res, 'Failed to update plan', error);
  }
};

// Delete a plan
exports.deletePlan = async (req, res) => {
  const { id } = req.params;
  if (!validateNumericParam(id, 'Plan ID')) {
    return res.status(400).json({ message: 'Invalid Plan ID' });
  }

  try {
    const deleted = await plansModel.deletePlan(req.requestId, id);
    if (deleted) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ message: 'Plan not found' });
    }
  } catch (error) {
    handleError(res, 'Failed to delete plan', error);
  }
};

exports.createPlanPattern = createPlanPattern;
exports.editGlobalPlan = editGlobalPlan;
exports.editHotelPlan = editHotelPlan;
exports.editPlanPattern = editPlanPattern;