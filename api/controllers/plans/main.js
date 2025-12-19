const planModels = require('../../models/plan');

// GET
const getGlobalPlans = async (req, res) => {
    try {
        const Plans = await planModels.selectGlobalPlans(req.requestId);
        res.json(Plans);
    } catch (error) {
        console.error('Error getting global Plans:', error);
        res.status(500).json({ error: error.message });
    }
};
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
    const target_date = req.query.target_date || req.query.check_date; // Support both parameter names for backward compatibility
    const date_end = req.query.date_end || req.query.checkout_date; // Support both parameter names
    const include_inactive = req.query.include_inactive === 'true'; // Optional parameter to include inactive plans

    if (!hotel_id) {
        return res.status(400).json({ error: 'Hotel ID is required' });
    }

    // Validate date formats if provided
    if (target_date && !/^\d{4}-\d{2}-\d{2}$/.test(target_date)) {
        return res.status(400).json({ error: 'Invalid target_date format. Use YYYY-MM-DD' });
    }
    if (date_end && !/^\d{4}-\d{2}-\d{2}$/.test(date_end)) {
        return res.status(400).json({ error: 'Invalid date_end format. Use YYYY-MM-DD' });
    }

    // Validate date range if both dates are provided
    if (target_date && date_end && new Date(target_date) > new Date(date_end)) {
        return res.status(400).json({ error: 'target_date must be before or equal to date_end' });
    }

    try {
        const Plans = await planModels.selectAvailablePlansByHotel(req.requestId, hotel_id, target_date, date_end, include_inactive);
        res.json(Plans);
    } catch (error) {
        console.error('Error getting hotel Plans:', error);
        res.status(500).json({ error: error.message });
    }
};

const fetchAvailablePlansForDate = async (req, res) => {
    const hotel_id = parseInt(req.params.hotel_id);
    const target_date = req.params.check_date; // Using check_date from URL parameter for backward compatibility
    const date_end = req.query.date_end; // Optional end date from query parameter
    const include_inactive = req.query.include_inactive === 'true';

    if (!hotel_id) {
        return res.status(400).json({ error: 'Hotel ID is required' });
    }

    if (!target_date || !/^\d{4}-\d{2}-\d{2}$/.test(target_date)) {
        return res.status(400).json({ error: 'Valid check_date is required (YYYY-MM-DD format)' });
    }

    if (date_end && !/^\d{4}-\d{2}-\d{2}$/.test(date_end)) {
        return res.status(400).json({ error: 'Invalid date_end format. Use YYYY-MM-DD' });
    }

    // Validate date range if both dates are provided
    if (date_end && new Date(target_date) > new Date(date_end)) {
        return res.status(400).json({ error: 'check_date must be before or equal to date_end' });
    }

    try {
        const Plans = await planModels.selectAvailablePlansByHotel(req.requestId, hotel_id, target_date, date_end, include_inactive);
        res.json(Plans);
    } catch (error) {
        console.error('Error getting available plans for date:', error);
        res.status(500).json({ error: error.message });
    }
};

// POST
const createGlobalPlan = async (req, res) => {
    const { name, description, plan_type, colorHEX, color: receivedColor } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    // Handle both colorHEX (without #) and color (with #) formats
    let color;
    if (receivedColor) {
        // If color is provided, ensure it starts with #
        color = receivedColor.startsWith('#') ? receivedColor : '#' + receivedColor;
    } else if (colorHEX) {
        // If colorHEX is provided, add # prefix
        color = colorHEX.startsWith('#') ? colorHEX : '#' + colorHEX;
    } else {
        color = '#D3D3D3'; // Default color
    }

    // Ensure color is exactly 7 characters (#RRGGBB)
    if (color.length > 7) {
        color = color.substring(0, 7);
    }

    try {
        const newPlan = await planModels.insertGlobalPlan(req.requestId, name, description, plan_type, color, created_by, updated_by);
        res.json(newPlan);
    } catch (err) {
        console.error('Error creating global Plan:', err);
        res.status(500).json({ error: 'Failed to create global Plan' });
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

// PUT
const editGlobalPlan = async (req, res) => {
    const { id } = req.params;
    const { name, description, plan_type, colorHEX } = req.body;
    const updated_by = req.user.id;

    // Handle colorHEX format and ensure proper # prefix
    let color = colorHEX;
    if (color && !color.startsWith('#')) {
        color = '#' + color;
    }
    
    // Ensure color is exactly 7 characters (#RRGGBB)
    if (color && color.length > 7) {
        color = color.substring(0, 7);
    }

    try {
        const updatedPlan = await planModels.updateGlobalPlan(req.requestId, id, name, description, plan_type, color, updated_by);
        res.json(updatedPlan);
    } catch (err) {
        console.error('Error updating global Plan:', err);
        res.status(500).json({ error: 'Failed to update global Plan' });
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
    const { hotel_id } = req.params; // Correctly extract hotel_id from req.params
    let plans = req.body; // Incoming plans data
    const updated_by = req.user.id;

    // Ensure plans is an array, convert from object if necessary (happens with some body-parser setups)
    if (!Array.isArray(plans)) {
        plans = Object.values(plans);
    }

    try {
        const updatedPlans = await planModels.updatePlansOrderBulk(
            req.requestId,
            parseInt(hotel_id), // Ensure hotel_id is an integer
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
    getGlobalPlans,
    getHotelsPlans,
    getHotelPlans,
    fetchAllHotelPlans,
    fetchAvailablePlansForDate,
    createGlobalPlan,
    createHotelPlan,
    editGlobalPlan,
    editHotelPlan,
    updatePlansOrderBulk,
};