const planCategoriesModel = require('../../models/plan/categories');

// Plan Type Categories
const getTypeCategories = async (req, res) => {
    try {
        const categories = await planCategoriesModel.selectAllPlanTypeCategories(req.requestId);
        res.json(categories);
    } catch (error) {
        console.error('Error getting plan type categories:', error);
        if (error.name === 'ValidationError' || error.statusCode === 400) {
            return res.status(400).json({ error: 'Bad Request' });
        }
        if (error.statusCode === 404) {
            return res.status(404).json({ error: 'Not Found' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createTypeCategory = async (req, res) => {
    const { name, description, color, display_order } = req.body;
    const created_by = req.user.id;

    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing name' });
    }

    try {
        const newCategory = await planCategoriesModel.insertPlanTypeCategory(req.requestId, name, description, color, display_order, created_by);
        res.status(201).json(newCategory);
    } catch (error) {
        console.error('Error creating plan type category:', error);
        if (error.name === 'ValidationError' || error.statusCode === 400) {
            return res.status(400).json({ error: 'Bad Request' });
        }
        if (error.statusCode === 404) {
            return res.status(404).json({ error: 'Not Found' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateTypeCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description, color, display_order } = req.body;
    const updated_by = req.user.id;

    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'Invalid category ID' });
    }
    if (name !== undefined && typeof name !== 'string') {
        return res.status(400).json({ error: 'Invalid name' });
    }

    try {
        const updatedCategory = await planCategoriesModel.updatePlanTypeCategory(req.requestId, id, name, description, color, display_order, updated_by);
        res.json(updatedCategory);
    } catch (error) {
        console.error('Error updating plan type category:', error);
        if (error.name === 'ValidationError' || error.statusCode === 400) {
            return res.status(400).json({ error: 'Bad Request' });
        }
        if (error.statusCode === 404) {
            return res.status(404).json({ error: 'Not Found' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Plan Package Categories
const getPackageCategories = async (req, res) => {
    try {
        const categories = await planCategoriesModel.selectAllPlanPackageCategories(req.requestId);
        res.json(categories);
    } catch (error) {
        console.error('Error getting plan package categories:', error);
        if (error.name === 'ValidationError' || error.statusCode === 400) {
            return res.status(400).json({ error: 'Bad Request' });
        }
        if (error.statusCode === 404) {
            return res.status(404).json({ error: 'Not Found' });
        }
        res.status(500).json({ error: 'Internal server error' });
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
        if (error.name === 'ValidationError' || error.statusCode === 400) {
            return res.status(400).json({ error: 'Bad Request' });
        }
        if (error.statusCode === 404) {
            return res.status(404).json({ error: 'Not Found' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updatePackageCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description, color, display_order } = req.body;

    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing name' });
    }

    const updated_by = req.user.id;

    try {
        const updatedCategory = await planCategoriesModel.updatePlanPackageCategory(req.requestId, id, name, description, color, display_order, updated_by);
        res.json(updatedCategory);
    } catch (error) {
        console.error('Error updating plan package category:', error);
        if (error.name === 'ValidationError' || error.statusCode === 400) {
            return res.status(400).json({ error: 'Bad Request' });
        }
        if (error.statusCode === 404) {
            return res.status(404).json({ error: 'Not Found' });
        }
        res.status(500).json({ error: 'Internal server error' });
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