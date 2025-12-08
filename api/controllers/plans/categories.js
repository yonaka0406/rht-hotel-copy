const planCategoriesModel = require('../../models/plan/categories');

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

module.exports = {
    getTypeCategories,
    createTypeCategory,
    updateTypeCategory,
    getPackageCategories,
    createPackageCategory,
    updatePackageCategory,
};
