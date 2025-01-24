const { getAllGlobalPlans, getAllHotelsPlans, getAllHotelPlans, getAllPlansByHotel, 
    newGlobalPlan, newHotelPlan, updateGlobalPlan, updateHotelPlan } = require('../models/plan');

// GET
const getGlobalPlans = async (req, res) => {
    try {
        const Plans = await getAllGlobalPlans();
        res.json(Plans);
    } catch (error) {
        console.error('Error getting global Plans:', error);
        res.status(500).json({ error: error.message });
    }
};

const getHotelsPlans = async (req, res) => {
    try {
        const Plans = await getAllHotelsPlans();
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
        const Plans = await getAllHotelPlans(hotel_id);
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
        const Plans = await getAllPlansByHotel(hotel_id);
        res.json(Plans);
    } catch (error) {
        console.error('Error getting hotel Plans:', error);
        res.status(500).json({ error: error.message });
    }
};

// POST
const createGlobalPlan = async (req, res) => {
    const { name, description, plan_type } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    try {
        const newPlan = await newGlobalPlan(name, description, plan_type, created_by, updated_by);
        res.json(newPlan);
    } catch (err) {
        console.error('Error creating global Plan:', err);
        res.status(500).json({ error: 'Failed to create global Plan' });
    }
};

const createHotelPlan = async (req, res) => {
    const { hotel_id, plans_global_id, name, description, plan_type } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    try {
        const newPlan = await newHotelPlan(hotel_id, plans_global_id, name, description, plan_type, created_by, updated_by);
        res.json(newPlan);
    } catch (err) {
        console.error('Error creating hotel Plan:', err);
        res.status(500).json({ error: 'Failed to create hotel Plan' });
    }
};

// PUT
const editGlobalPlan = async (req, res) => {
    const { id } = req.params;
    const { name, description, plan_type } = req.body;
    const updated_by = req.user.id;

    try {
        const updatedPlan = await updateGlobalPlan(id, name, description, plan_type, updated_by);
        res.json(updatedPlan);
    } catch (err) {
        console.error('Error updating global Plan:', err);
        res.status(500).json({ error: 'Failed to update global Plan' });
    }
};

const editHotelPlan = async (req, res) => {
    const { id } = req.params;
    const { hotel_id, plans_global_id, name, description, plan_type } = req.body;
    const updated_by = req.user.id;

    try {
        const updatedPlan = await updateHotelPlan(id, hotel_id, plans_global_id, name, description, plan_type, updated_by);
        res.json(updatedPlan);
    } catch (err) {
        console.error('Error updating hotel Plan:', err);
        res.status(500).json({ error: 'Failed to update hotel Plan' });
    }
};

module.exports = {
    getGlobalPlans,
    getHotelsPlans,
    getHotelPlans,
    fetchAllHotelPlans,
    createGlobalPlan,
    createHotelPlan,
    editGlobalPlan,
    editHotelPlan,
};