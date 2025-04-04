const { getAllGlobalPlans, getAllHotelsPlans, getAllHotelPlans, getAllPlansByHotel, getAllGlobalPatterns, getAllHotelPatterns, 
    newGlobalPlan, newHotelPlan, newPlanPattern, updateGlobalPlan, updateHotelPlan, updatePlanPattern } = require('../models/plan');

// GET
const getGlobalPlans = async (req, res) => {
    try {
        const Plans = await getAllGlobalPlans(req.requestId);
        res.json(Plans);
    } catch (error) {
        console.error('Error getting global Plans:', error);
        res.status(500).json({ error: error.message });
    }
};
const getHotelsPlans = async (req, res) => {
    try {
        const Plans = await getAllHotelsPlans(req.requestId);
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
        const Plans = await getAllHotelPlans(req.requestId, hotel_id);
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
        const Plans = await getAllPlansByHotel(req.requestId, hotel_id);
        res.json(Plans);
    } catch (error) {
        console.error('Error getting hotel Plans:', error);
        res.status(500).json({ error: error.message });
    }
};

const getGlobalPatterns = async (req, res) => {
    try {
        const patterns = await getAllGlobalPatterns(req.requestId);
        res.json(patterns);
    } catch (error) {
        console.error('Error getting global patterns:', error);
        res.status(500).json({ error: error.message });
    }
};
const getHotelPatterns = async (req, res) => {
    try {
        const patterns = await getAllHotelPatterns(req.requestId);
        res.json(patterns);
    } catch (error) {
        console.error('Error getting hotel patterns:', error);
        res.status(500).json({ error: error.message });
    }
};


// POST
const createGlobalPlan = async (req, res) => {
    const { name, description, plan_type, colorHEX } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    const color = '#' + colorHEX;

    try {
        const newPlan = await newGlobalPlan(req.requestId, name, description, plan_type, color, created_by, updated_by);
        res.json(newPlan);
    } catch (err) {
        console.error('Error creating global Plan:', err);
        res.status(500).json({ error: 'Failed to create global Plan' });
    }
};
const createHotelPlan = async (req, res) => {
    const { hotel_id, plans_global_id, name, description, plan_type, colorHEX } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    const color = '#' + colorHEX;

    try {
        const newPlan = await newHotelPlan(req.requestId, hotel_id, plans_global_id, name, description, plan_type, color, created_by, updated_by);
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
        const newData = await newPlanPattern(req.requestId, hotel_id, name, template, user_id);
        res.json(newData);
    } catch (err) {
        console.error('Error creating plan pattern:', err);
        res.status(500).json({ error: 'Failed to create plan pattern' });
    }
};

// PUT
const editGlobalPlan = async (req, res) => {    
    const { id } = req.params;
    const { name, description, plan_type, colorHEX } = req.body;
    const updated_by = req.user.id;

    const color = '#' + colorHEX;

    try {
        const updatedPlan = await updateGlobalPlan(req.requestId, id, name, description, plan_type, color, updated_by);
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
        const updatedPlan = await updateHotelPlan(req.requestId, id, hotel_id, plans_global_id, name, description, plan_type, color, updated_by);
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
        const newData = await updatePlanPattern(req.requestId, id, name, template, user_id);
        res.json(newData);
    } catch (err) {
        console.error('Error edit global pattern:', err);
        res.status(500).json({ error: 'Failed to edit global pattern' });
    }
};

module.exports = {
    getGlobalPlans,
    getHotelsPlans,
    getHotelPlans,
    fetchAllHotelPlans,
    getGlobalPatterns,
    getHotelPatterns,
    createGlobalPlan,
    createHotelPlan,
    createPlanPattern,
    editGlobalPlan,
    editHotelPlan,
    editPlanPattern,
};