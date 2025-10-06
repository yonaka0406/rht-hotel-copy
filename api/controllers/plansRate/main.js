const planRateModel = require('../../models/planRate');
const { validateNumericParam, validateUuidParam } = require('../../utils/validationUtils');

// Helper function to handle common error responses
const handleError = (res, message, error, statusCode = 500) => {
  console.error(message, error);
  res.status(statusCode).json({ message });
};

// GET all plan rates
const getPlanRates = async (req, res) => {
    
    const plans_global_id = req.params.gid;
    const plans_hotel_id = req.params.hid;
    const hotel_id = req.params.hotel_id;
    
    try {
        const rates = await planRateModel.getAllPlansRates(req.requestId, plans_global_id, plans_hotel_id, hotel_id);
        
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
        const rate = await planRateModel.getPlansRateById(req.requestId, rateId);
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
        const rates = await planRateModel.getPriceForReservation(req.requestId, plans_global_id, plans_hotel_id, hotel_id, date);                
        res.json(rates);
    } catch (error) {
        console.error('Error getting plan rate:', error);
        res.status(500).json({ error: error.message });
    }
};
const getPlanRatesByDay = async (req, res) => {
    const plans_global_id = req.params.gid;
    const plans_hotel_id = req.params.hid;
    const hotel_id = req.params.hotel_id;
    const date = req.params.date;

    try {
        const rates = await planRateModel.getRatesForTheDay(req.requestId, plans_global_id, plans_hotel_id, hotel_id, date);                
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
        const newRate = await planRateModel.createPlansRate(req.requestId, planRate);
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
        const updatedRate = await planRateModel.updatePlansRate(req.requestId, rateId, planRate);
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
        const deletedRate = await planRateModel.deletePlansRate(req.requestId, rateId);
        res.json(deletedRate);
    } catch (error) {
        console.error(`Error deleting plan rate with ID ${rateId}:`, error);
        res.status(500).json({ error: error.message });
    }
};

// Add a rate to a plan
const addPlanRate = async (req, res) => {
  const { planId } = req.params;
  const { rate_name, price, start_date, end_date } = req.body;

  if (!validateNumericParam(planId, 'Plan ID')) {
    return res.status(400).json({ message: 'Invalid Plan ID' });
  }
  if (!rate_name || !price || !start_date || !end_date) {
    return res.status(400).json({ message: 'Missing required rate fields' });
  }

  try {
    const newRate = await planRateModel.addPlanRate(req.requestId, planId, { rate_name, price, start_date, end_date });
    res.status(201).json(newRate);
  } catch (error) {
    handleError(res, 'Failed to add plan rate', error);
  }
};

// Update a plan rate
const updatePlanRate = async (req, res) => {
  const { rateId } = req.params;
  if (!validateNumericParam(rateId, 'Rate ID')) {
    return res.status(400).json({ message: 'Invalid Rate ID' });
  }

  try {
    const updatedRate = await planRateModel.updatePlanRate(req.requestId, rateId, req.body);
    if (updatedRate) {
      res.status(200).json(updatedRate);
    } else {
      res.status(404).json({ message: 'Plan rate not found' });
    }
  } catch (error) {
    handleError(res, 'Failed to update plan rate', error);
  }
};

module.exports = {
    getPlanRates,
    getPlanRate,
    getPlanRateByDay,
    getPlanRatesByDay,
    createNewPlanRate,
    updateExistingPlanRate,
    deletePlanRate,
    addPlanRate,
    updatePlanRate
};