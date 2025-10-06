const addonModel = require('../models/addon');

// GET
const getAllAddons = async (req, res) => {
    const hotel_id = parseInt(req.params.hotel_id);
    
    try {
        const addons = await addonModel.getAddons(req.requestId, hotel_id);
        res.json(addons);
    } catch (error) {
        console.error('Error getting global addons:', error);
        res.status(500).json({ error: error.message });
    }
};

const getGlobalAddons = async (req, res) => {
    try {
        const addons = await addonModel.getAllGlobalAddons(req.requestId);
        res.json(addons);
    } catch (error) {
        console.error('Error getting global addons:', error);
        res.status(500).json({ error: error.message });
    }
};

const getHotelsAddons = async (req, res) => {
    try {
        const addons = await addonModel.getAllHotelsAddons(req.requestId);
        res.json(addons);
    } catch (error) {
        console.error('Error getting hotel addons:', error);
        res.status(500).json({ error: error.message });
    }
};

const getHotelAddons = async (req, res) => {
    const hotel_id = parseInt(req.params.hotel_id);

    if (!hotel_id) {
        return res.status(400).json({ error: 'Hotel ID is required' });
    }

    try {
        const addons = await addonModel.getAllHotelAddons(req.requestId, hotel_id);
        res.json(addons);
    } catch (error) {
        console.error('Error getting hotel addons:', error);
        res.status(500).json({ error: error.message });
    }
};

// POST
const createGlobalAddon = async (req, res) => {
    const { name, description, addon_type, price, tax_type_id, tax_rate } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    try {
        const newAddon = await addonModel.newGlobalAddon(req.requestId, name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by);
        res.json(newAddon);
    } catch (err) {
        console.error('Error creating global addon:', err);
        res.status(500).json({ error: 'Failed to create global addon' });
    }
};

const createHotelAddon = async (req, res) => {
    const { hotel_id, addons_global_id, name, description, addon_type, price, tax_type_id, tax_rate } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    try {
        const newAddon = await addonModel.newHotelAddon(req.requestId, hotel_id, name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by, addons_global_id);
        res.json(newAddon);
    } catch (err) {
        console.error('Error creating hotel addon:', err);
        res.status(500).json({ error: 'Failed to create hotel addon' });
    }
};

// PUT
const editGlobalAddon = async (req, res) => {
    const { id } = req.params;
    const { name, description, addon_type, price, tax_type_id, tax_rate, visible } = req.body;
    const updated_by = req.user.id;

    try {
        const updatedAddon = await addonModel.updateGlobalAddon(req.requestId, id, name, description, addon_type, price, tax_type_id, tax_rate, visible, updated_by);
        res.json(updatedAddon);
    } catch (err) {
        console.error('Error updating global addon:', err);
        res.status(500).json({ error: 'Failed to update global addon' });
    }
};

const editHotelAddon = async (req, res) => {
    const { id } = req.params;
    const { hotel_id, addons_global_id, name, description, price, visible } = req.body;
    const updated_by = req.user.id;

    try {
        const updatedAddon = await addonModel.updateHotelAddon(req.requestId, id, hotel_id, addons_global_id, name, description, price, visible, updated_by);
        res.json(updatedAddon);
    } catch (err) {
        console.error('Error updating hotel addon:', err);
        res.status(500).json({ error: 'Failed to update hotel addon' });
    }
};

module.exports = {
    getAllAddons,
    getGlobalAddons,
    getHotelsAddons,
    getHotelAddons,
    createGlobalAddon,
    createHotelAddon,
    editGlobalAddon,
    editHotelAddon,
};