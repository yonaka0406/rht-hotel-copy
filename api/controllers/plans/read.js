const plansModel = require('../../models/plan');
const { validateNumericParam, validateUuidParam } = require('../../utils/validationUtils');

// Helper function to handle common error responses
const handleError = (res, message, error, statusCode = 500) => {
  console.error(message, error);
  res.status(statusCode).json({ message });
};

const getGlobalPlans = async (req, res) => {
    try {
        const Plans = await plansModel.getAllGlobalPlans(req.requestId);
        res.json(Plans);
    } catch (error) {
        console.error('Error getting global Plans:', error);
        res.status(500).json({ error: error.message });
    }
};

// Fetch all plans
const getAllPlans = async (req, res) => {
  try {
    const plans = await plansModel.getAllPlans(req.requestId);
    res.status(200).json(plans);
  } catch (error) {
    handleError(res, 'Failed to retrieve plans', error);
  }
};

// Fetch a single plan by ID
const getPlanById = async (req, res) => {
  const { id } = req.params;
  if (!validateNumericParam(id, 'Plan ID')) {
    return res.status(400).json({ message: 'Invalid Plan ID' });
  }

  try {
    const plan = await plansModel.getPlanById(req.requestId, id);
    if (plan) {
      res.status(200).json(plan);
    } else {
      res.status(404).json({ message: 'Plan not found' });
    }
  } catch (error) {
    handleError(res, 'Failed to retrieve plan', error);
  }
};

const getHotelsPlans = async (req, res) => {
    try {
        const Plans = await plansModel.getAllHotelsPlans(req.requestId);
        res.json(Plans);
    } catch (error) {
        console.error('Error getting hotel Plans:', error);
        res.status(500).json({ error: error.message });
    }
};

const getHotelPlans = async (req, res) => {
    const hotel_id = parseInt(req.params.hotel_id);

    if (!hotel_id) {
        return res.status(400).json({ error: 'Hotel ID is required' });
    }

    try {
        const Plans = await plansModel.getAllHotelPlans(req.requestId, hotel_id);
        res.json(Plans);
    } catch (error) {
        console.error('Error getting hotel Plans:', error);
        res.status(500).json({ error: error.message });
    }
};

const fetchAllHotelPlans = async (req, res) => {
    const hotel_id = parseInt(req.params.hotel_id);

    if (!hotel_id) {
        return res.status(400).json({ error: 'Hotel ID is required' });
    }

    try {
        const Plans = await plansModel.getAllPlansByHotel(req.requestId, hotel_id);
        res.json(Plans);
    } catch (error) {
        console.error('Error getting hotel Plans:', error);
        res.status(500).json({ error: error.message });
    }
};

const getGlobalPatterns = async (req, res) => {
    try {
        const patterns = await plansModel.getAllGlobalPatterns(req.requestId);
        res.json(patterns);
    } catch (error) {
        console.error('Error getting global patterns:', error);
        res.status(500).json({ error: error.message });
    }
};

const getHotelPatterns = async (req, res) => {
    try {
        const patterns = await plansModel.getAllHotelPatterns(req.requestId);
        res.json(patterns);
    } catch (error) {
        console.error('Error getting hotel patterns:', error);
        res.status(500).json({ error: error.message });
    }
};

const fetchAllHotelPatterns = async (req, res) => {
    const hotel_id = parseInt(req.params.hotel_id);

    if (!hotel_id) {
        return res.status(400).json({ error: 'Hotel ID is required' });
    }

    try {
        const Plans = await plansModel.getAllPatternsByHotel(req.requestId, hotel_id);
        res.json(Plans);
    } catch (error) {
        console.error('Error getting hotel patterns:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getGlobalPlans = getGlobalPlans;
exports.getAllPlans = getAllPlans;
exports.getPlanById = getPlanById;
exports.getHotelsPlans = getHotelsPlans;
exports.getHotelPlans = getHotelPlans;
exports.fetchAllHotelPlans = fetchAllHotelPlans;
exports.getGlobalPatterns = getGlobalPatterns;
exports.getHotelPatterns = getHotelPatterns;
exports.fetchAllHotelPatterns = fetchAllHotelPatterns;