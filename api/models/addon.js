const { getPool } = require('../config/database');

// Return all
const getAllGlobalAddons = async (requestId) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM addons_global ORDER BY visible DESC, name ASC';

    try {
        const result = await pool.query(query);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving global addons:', err);
        throw new Error('Database error');
    }
};

const getAllHotelsAddons = async (requestId) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM addons_hotel ORDER BY hotel_id ASC, visible DESC, name ASC';    

    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving hotels addons:', err);
        throw new Error('Database error');
    }
};

const getAddons = async (requestId, hotel_id) => {
    const pool = getPool(requestId);
    let query;
    let values = [];

    if(hotel_id === 0) {
        query = `
            SELECT 
                NULL as hotel_id, 
                id::TEXT as id, 
                NULL AS addons_hotel_id,
				id AS addons_global_id,
                name, 
                description, 
                price
            FROM addons_global 
            WHERE visible = TRUE
            ORDER BY visible DESC, name ASC
        `;
    } else {    
        query = `
            SELECT 
                hotel_id, 
                CASE WHEN hotel_id IS NULL THEN id::TEXT ELSE 'H' || id::TEXT END as id,
                addons_hotel_id,
				addons_global_id,
                name, 
                description, 
                price
            FROM (
                SELECT 
                    COALESCE(hotel.id, global.id) AS id,
                    hotel.id AS addons_hotel_id,
					global.id AS addons_global_id,
                    COALESCE(hotel.name, global.name) AS name,
                    COALESCE(hotel.description, global.description) AS description,
                    COALESCE(hotel.price, global.price) AS price,
                    COALESCE(hotel.visible, global.visible) AS visible,
                    COALESCE(hotel.created_at, global.created_at) AS created_at,
                    COALESCE(hotel.created_by, global.created_by) AS created_by,
                    COALESCE(hotel.updated_by, global.updated_by) AS updated_by,
                    hotel.hotel_id
                FROM 
                    addons_global AS global
                FULL OUTER JOIN 
                    addons_hotel AS hotel
                ON 
                    global.id = hotel.addons_global_id
                WHERE 
                    (hotel.hotel_id = $1 OR hotel.hotel_id IS NULL)
                ) AS ALL_DATA
            WHERE visible = TRUE
            ORDER BY 
            name ASC;
        `;
        values = [hotel_id];
    }

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving addons:', err);
        throw new Error('Database error');
    }
};


const getAllHotelAddons = async (requestId, hotel_id) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM addons_hotel WHERE hotel_id = $1 ORDER BY visible DESC, name ASC';
    const values = [hotel_id];

    try {
        const result = await pool.query(query, values);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving hotel addons:', err);
        throw new Error('Database error');
    }
};

// Return one
const getGlobalAddonById = async (requestId, id) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM addons_global WHERE id = $1';
    const values = [id];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error finding global addon:', err);
        throw new Error('Database error');
    }
};

const getHotelAddonById = async (requestId, hotel_id, id) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM addons_hotel WHERE hotel_id = $1 AND id = $2';
    const values = [hotel_id, id];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error finding hotel addon:', err);
        throw new Error('Database error'); 
    }
};

// Add entry
const newGlobalAddon = async (requestId, name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by) => {
    const pool = getPool(requestId);
    const query = `
        INSERT INTO addons_global (name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
    `;
    const values = [name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error adding global addon:', err);
        throw new Error('Database error');
    }
};

const newHotelAddon = async (requestId, hotel_id, name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by, addons_global_id) => {
    const pool = getPool(requestId);
    const query = `
        INSERT INTO addons_hotel (hotel_id, addons_global_id, name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
    `;
    const values = [hotel_id, addons_global_id, name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error adding hotel addon:', err);
        throw new Error('Database error');
    }
};

// Update entry
const updateGlobalAddon = async (requestId, id, name, description, addon_type, price, tax_type_id, tax_rate, visible, updated_by) => {
    const pool = getPool(requestId);
    const query = `
        UPDATE addons_global
        SET 
            name = $1, 
            description = $2, 
            addon_type = $3,
            price = $4,
            tax_type_id = $5,
            tax_rate = $6,
            visible = $7, 
            updated_by = $8
        WHERE id = $9
        RETURNING *;
    `;
    const values = [name, description, addon_type, price, tax_type_id, tax_rate, visible, updated_by, id];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error updating global addon:', err);
        throw new Error('Database error');
    }
};

const updateHotelAddon = async (requestId, id, hotel_id, addons_global_id, name, description, addon_type, price, tax_type_id, tax_rate, visible, updated_by) => {
    const pool = getPool(requestId);
    const query = `
        UPDATE addons_hotel
        SET 
            addons_global_id = $1, 
            name = $2,
            description = $3,
            addon_type = $4, 
            price = $5, 
            tax_type_id = $6, 
            tax_rate = $7, 
            visible = $8, 
            updated_by = $9 
        WHERE hotel_id = $10 AND id = $11
        RETURNING *;
    `;
    const values = [addons_global_id, name, description, addon_type, price, tax_type_id, tax_rate, visible, updated_by, hotel_id, id];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error updating hotel addon:', err);
        throw new Error('Database error');
    }
};

module.exports = {
    getAllGlobalAddons,
    getAllHotelsAddons,
    getAddons,
    getAllHotelAddons,
    getGlobalAddonById,
    getHotelAddonById,
    newGlobalAddon,
    newHotelAddon,
    updateGlobalAddon,
    updateHotelAddon
};