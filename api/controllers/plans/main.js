const planModels = require('../../models/plan');

const getHotelsPlans = async (req, res) => {
    try {
        const Plans = await planModels.selectAllHotelsPlans(req.requestId);
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
        const Plans = await planModels.selectHotelPlans(req.requestId, hotel_id);
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
        const Plans = await planModels.selectAvailablePlansByHotel(req.requestId, hotel_id);
        res.json(Plans);
    } catch (error) {
        console.error('Error getting hotel Plans:', error);
        res.status(500).json({ error: error.message });
    }
};

const createHotelPlan = async (req, res) => {
    const {
        hotel_id,
        plan_type_category_id,
        plan_package_category_id,
        name,
        description,
        plan_type,
        color: receivedColor, // Destructure 'color' and rename to avoid shadowing
        display_order,
        is_active,
        available_from,
        available_until
    } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    // Ensure color has a '#' prefix
    let color = receivedColor;
    if (color && !color.startsWith('#')) {
        color = '#' + color;
    }

    try {
        const newPlan = await planModels.insertHotelPlan(
            req.requestId,
            hotel_id,
            plan_type_category_id,
            plan_package_category_id,
            name,
            description,
            plan_type,
            color,
            display_order,
            is_active,
            available_from,
            available_until,
            created_by,
            updated_by
        );
        res.json(newPlan);
    } catch (err) {
        console.error('Error creating hotel Plan:', err);
        res.status(500).json({ error: 'Failed to create hotel Plan' });
    }
};

const editHotelPlan = async (req, res) => {
    const { id } = req.params;
    const {
        hotel_id,
        plan_type_category_id,
        plan_package_category_id,
        plan_name,
        description,
        plan_type,
        color: receivedColor,
        display_order,
        is_active,
        available_from,
        available_until
    } = req.body;
    const updated_by = req.user.id;

    // Ensure color has a '#' prefix
    let color = receivedColor;
    if (color && !color.startsWith('#')) {
        color = '#' + color;
    }

    // Map plan_name to name for consistency with model function
    const name = plan_name;

    // Ensure name is not empty or null
    if (name === undefined || name === null || (typeof name === 'string' && name.trim() === '')) {
        return res.status(400).json({ error: 'Plan name cannot be empty.' });
    }

    try {
        const updatedPlan = await planModels.updateHotelPlan(
            req.requestId,
            id,
            hotel_id,
            plan_type_category_id,
            plan_package_category_id,
            name,
            description,
            plan_type,
            color,
            display_order,
            is_active,
            available_from,
            available_until,
            updated_by
        );
        res.json(updatedPlan);
    } catch (err) {
        console.error('Error updating hotel Plan:', err);
        res.status(500).json({ error: 'Failed to update hotel Plan' });
    }
};

const updatePlansOrderBulk = async (req, res) => {
    const { hotelId } = req.params;
    const plans = req.body;
    const updated_by = req.user.id;

    try {
        const updatedPlans = await planModels.updatePlansOrderBulk(
            req.requestId,
            hotelId,
            plans,
            updated_by
        );
        res.json(updatedPlans);
    } catch (error) {
        console.error('Error updating plan display order:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getHotelsPlans,
    getHotelPlans,
    fetchAllHotelPlans,
    createHotelPlan,
    editHotelPlan,
    updatePlansOrderBulk,
};