const { 
    getAddons, 
    getAllHotelsAddons, 
    getAddonsByHotelId, 
    newHotelAddon, 
    updateHotelAddon,
    getAllAddonCategories
} = require('../../models/addons');

// GET
const getAddonCategories = async (req, res) => {
    try {
        const categories = await getAllAddonCategories(req.requestId);
        res.json(categories);
    } catch (error) {
        console.error('Error getting addon categories:', error);
        res.status(500).json({ error: error.message });
    }
};

const getAllAddons = async (req, res) => {
    const hotel_id = parseInt(req.params.hotel_id);
    
    try {
        const addons = await getAddons(req.requestId, hotel_id);
        res.json(addons);
    } catch (error) {
        console.error('Error getting addons:', error);
        res.status(500).json({ error: error.message });
    }
};

const getHotelsAddons = async (req, res) => {
    try {
        const addons = await getAllHotelsAddons(req.requestId);
        res.json(addons);
    } catch (error) {
        console.error('Error getting all hotels addons:', error);
        res.status(500).json({ error: error.message });
    }
};

const getHotelAddons = async (req, res) => {
    const hotel_id = parseInt(req.params.hotel_id);

    if (!hotel_id) {
        return res.status(400).json({ error: 'Hotel ID is required' });
    }

    try {
        // Corrected to call the renamed function
        const addons = await getAddonsByHotelId(req.requestId, hotel_id);
        res.json(addons);
    } catch (error) {
        console.error('Error getting hotel addons:', error);
        res.status(500).json({ error: error.message });
    }
};

// POST
const createHotelAddon = async (req, res) => {
    const { hotel_id, addon_category_id, name, description, price, tax_type_id, tax_rate } = req.body;
    const created_by = req.user.id;
    const updated_by = req.user.id;

    try {
        const newAddon = await newHotelAddon(req.requestId, hotel_id, addon_category_id, name, description, price, tax_type_id, tax_rate, created_by, updated_by);
        res.status(201).json(newAddon);
    } catch (err) {
        console.error('Error creating hotel addon:', err);
        res.status(500).json({ error: 'Failed to create hotel addon' });
    }
};

// PUT
const editHotelAddon = async (req, res) => {
    const { id } = req.params;
    const { hotel_id, addon_category_id, name, description, price, tax_type_id, tax_rate, visible } = req.body;
    const updated_by = req.user.id;

    if (!hotel_id) {
        return res.status(400).json({ error: 'Hotel ID is required for this operation' });
    }

    try {
        const updatedAddon = await updateHotelAddon(req.requestId, id, hotel_id, addon_category_id, name, description, price, tax_type_id, tax_rate, visible, updated_by);
        res.json(updatedAddon);
    } catch (err) {
        console.error('Error updating hotel addon:', err);
        res.status(500).json({ error: 'Failed to update hotel addon' });
    }
};

module.exports = {
    getAllAddons,
    getHotelsAddons,
    getHotelAddons,
    createHotelAddon,
    editHotelAddon,
    getAddonCategories
};
