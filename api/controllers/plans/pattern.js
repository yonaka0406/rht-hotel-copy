const planModels = require('../../models/plan');

const getHotelPatterns = async (req, res) => {
    try {
        const patterns = await planModels.selectAllHotelPatterns(req.requestId);
        res.json(patterns);
    } catch (error) {
        console.error('Error getting hotel patterns:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const fetchAllHotelPatterns = async (req, res) => {
const hotel_id_str = req.params.hotel_id;
    const hotel_id = Number(hotel_id_str);

    if (!Number.isInteger(hotel_id)) {
        return res.status(400).json({ error: 'Hotel ID must be a valid integer' });
    }

    try {
        const Plans = await planModels.selectPatternsByHotel(req.requestId, hotel_id);
        res.json(Plans);
    } catch (error) {
        console.error('Error getting hotel patterns:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createPlanPattern = async (req, res) => {
    const { hotel_id, name, template } = req.body;
    const user_id = req.user?.id;
    
    if (!user_id) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hotel_id || !name || !template) {
        return res.status(400).json({ error: 'Missing required fields: hotel_id, name, template' });
    }

    try {
        const newData = await planModels.insertPlanPattern(req.requestId, hotel_id, name, template, user_id);
        res.json(newData);
    } catch (err) {
        console.error('Error creating plan pattern:', err);
        res.status(500).json({ error: 'Failed to create plan pattern' });
    }
};

const editPlanPattern = async (req, res) => {
    const { id } = req.params;
    const { name, template } = req.body;
    
    if (!req.user || !req.user.id) {
        console.warn(`${req.requestId} - Unauthorized attempt to edit plan pattern: user not authenticated.`);
        return res.status(401).json({ error: 'Authentication required to edit plan pattern' });
    }
    const user_id = req.user.id;    

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        console.warn(`${req.requestId} - Validation Error: 'name' is required and must be a non-empty string.`);
        return res.status(400).json({ error: 'Name is required and must be a non-empty string.' });
    }

    if (!template || typeof template !== 'string' || template.trim().length === 0) {
        console.warn(`${req.requestId} - Validation Error: 'template' is required and must be a non-empty string.`);
        return res.status(400).json({ error: 'Template is required and must be a non-empty string.' });
    }

    try {
        const newData = await planModels.updatePlanPattern(req.requestId, id, name, template, user_id);
        res.json(newData);
    } catch (err) {
        console.error('Error editing plan pattern:', err);
        res.status(500).json({ error: 'Failed to edit plan pattern' });
    }
};

module.exports = {
    getHotelPatterns,
    fetchAllHotelPatterns,
    createPlanPattern,
    editPlanPattern,
};