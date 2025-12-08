const planModels = require('../../models/plan');
const planCategoriesModel = require('../../models/plan/categories');

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

const getGlobalPatterns = async (req, res) => {
    try {
        const patterns = await planModels.selectGlobalPatterns(req.requestId);
        res.json(patterns);
    } catch (error) {
        console.error('Error getting global patterns:', error);
        res.status(500).json({ error: error.message });
    }
};
const getHotelPatterns = async (req, res) => {
    try {
        const patterns = await planModels.selectAllHotelPatterns(req.requestId);
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
        const Plans = await planModels.selectPatternsByHotel(req.requestId, hotel_id);
        res.json(Plans);
    } catch (error) {
        console.error('Error getting hotel patterns:', error);
        res.status(500).json({ error: error.message });
    }
};

// Plan Type Categories
const getTypeCategories = async (req, res) => {
    try {
        const categories = await planCategoriesModel.selectAllPlanTypeCategories(req.requestId);
        res.json(categories);
    } catch (error) {
        console.error('Error getting plan type categories:', error);
        res.status(500).json({ error: error.message });
    }
};

const createTypeCategory = async (req, res) => {
    const { name, description, color, display_order } = req.body;
    const created_by = req.user.id;

    try {
        const newCategory = await planCategoriesModel.insertPlanTypeCategory(req.requestId, name, description, color, display_order, created_by);
        res.status(201).json(newCategory);
    } catch (error) {
        console.error('Error creating plan type category:', error);
        res.status(500).json({ error: error.message });
    }
};

const updateTypeCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description, color, display_order } = req.body;
    const updated_by = req.user.id;

    try {
        const updatedCategory = await planCategoriesModel.updatePlanTypeCategory(req.requestId, id, name, description, color, display_order, updated_by);
        res.json(updatedCategory);
    } catch (error) {
        console.error('Error updating plan type category:', error);
        res.status(500).json({ error: error.message });
    }
};

// Plan Package Categories
const getPackageCategories = async (req, res) => {
    try {
        const categories = await planCategoriesModel.selectAllPlanPackageCategories(req.requestId);
        res.json(categories);
    } catch (error) {
        console.error('Error getting plan package categories:', error);
        res.status(500).json({ error: error.message });
    }
};

const createPackageCategory = async (req, res) => {
    const { name, description, color, display_order } = req.body;
    const created_by = req.user.id;

    try {
        const newCategory = await planCategoriesModel.insertPlanPackageCategory(req.requestId, name, description, color, display_order, created_by);
        res.status(201).json(newCategory);
    } catch (error) {
        console.error('Error creating plan package category:', error);
        res.status(500).json({ error: error.message });
    }
};

const updatePackageCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description, color, display_order } = req.body;
    const updated_by = req.user.id;

    try {
        const updatedCategory = await planCategoriesModel.updatePlanPackageCategory(req.requestId, id, name, description, color, display_order, updated_by);
        res.json(updatedCategory);
    } catch (error) {
        console.error('Error updating plan package category:', error);
        res.status(500).json({ error: error.message });
    }
};

// Plan Display Order
const updatePlanDisplayOrder = async (req, res) => {
    const { hotelId } = req.params;
    const { planId, newDisplayOrder } = req.body;
    const updated_by = req.user.id;

    try {
        const existingPlan = await planModels.selectHotelPlanById(req.requestId, hotelId, planId);
        if (!existingPlan) {
            return res.status(404).json({ error: 'Plan not found.' });
        }

        const updatedPlan = await planModels.updateHotelPlan(
            req.requestId,
            planId,
            hotelId,
            existingPlan.plan_type_category_id,
            existingPlan.plan_package_category_id,
            existingPlan.name,
            existingPlan.description,
            existingPlan.plan_type,
            existingPlan.color,
            newDisplayOrder, // New value
            existingPlan.is_active,
            existingPlan.available_from,
            existingPlan.available_until,
            updated_by
        );
        res.json(updatedPlan);
    } catch (error) {
        console.error('Error updating plan display order:', error);
        res.status(500).json({ error: error.message });
    }
};

// Plan Copy Between Hotels
const copyPlanToHotel = async (req, res) => {
    const { sourcePlanId, sourceHotelId, targetHotelId, options } = req.body;
    const userId = req.user.id;

    try {
        const newPlan = await planModels.copyPlanToHotel(req.requestId, sourcePlanId, sourceHotelId, targetHotelId, { ...options, userId });
        res.status(201).json(newPlan);
    } catch (error) {
        console.error('Error copying plan to hotel:', error);
        res.status(500).json({ error: 'Failed to copy plan to hotel' });
    }
};

const bulkCopyPlansToHotel = async (req, res) => {
    const { sourcePlanIds, sourceHotelId, targetHotelId, options } = req.body;
    const userId = req.user.id;

    try {
        const copiedPlans = await planModels.bulkCopyPlansToHotel(req.requestId, sourcePlanIds, sourceHotelId, targetHotelId, { ...options, userId });
        res.status(201).json(copiedPlans);
    } catch (error) {
        console.error('Error bulk copying plans to hotel:', error);
        res.status(500).json({ error: 'Failed to bulk copy plans to hotel' });
    }
};

// POST
const createGlobalPlan = async (req, res) => {
    const { name, description, plan_type, colorHEX } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    const color = '#' + colorHEX;

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
        colorHEX, 
        display_order, 
        is_active, 
        available_from, 
        available_until 
    } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    const color = '#' + colorHEX;

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
const createPlanPattern = async (req, res) => {
    const { hotel_id, name, template } = req.body;
    const user_id = req.user.id;    

    try {
        const newData = await planModels.insertPlanPattern(req.requestId, hotel_id, name, template, user_id);
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
        name, 
        description, 
        plan_type, 
        colorHEX, 
        display_order, 
        is_active, 
        available_from, 
        available_until 
    } = req.body;
    const updated_by = req.user.id;

    const color = '#' + colorHEX;

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
const editPlanPattern = async (req, res) => {
    const { id } = req.params;
    const { name, template } = req.body;
    const user_id = req.user.id;    

    try {
        const newData = await planModels.editPlanPattern(req.requestId, id, name, template, user_id);
        res.json(newData);
    } catch (err) {
        console.error('Error editing plan pattern:', err);
        res.status(500).json({ error: 'Failed to edit plan pattern' });
    }
};

module.exports = {
    getGlobalPlans,
    getHotelsPlans,
    getHotelPlans,
    fetchAllHotelPlans,
    getGlobalPatterns,
    getHotelPatterns,
    fetchAllHotelPatterns,
    createGlobalPlan,
    createHotelPlan,
    createPlanPattern,
    editGlobalPlan,
    editHotelPlan,
    editPlanPattern,
    getTypeCategories,
    createTypeCategory,
    updateTypeCategory,
    getPackageCategories,
    createPackageCategory,
    updatePackageCategory,
    updatePlanDisplayOrder,
    copyPlanToHotel,
    bulkCopyPlansToHotel,
};