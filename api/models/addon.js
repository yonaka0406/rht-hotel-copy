const { getPool } = require('../config/database');
const pool = getPool();

// Return all
const getAllGlobalAddons = async () => {
    const query = 'SELECT * FROM addons_global ORDER BY visible DESC, name ASC';

    try {
        const result = await pool.query(query);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving global addons:', err);
        throw new Error('Database error');
    }
};

const getAllHotelsAddons = async () => {
    const query = 'SELECT * FROM addons_hotel ORDER BY hotel_id ASC, visible DESC, name ASC';    

    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving hotels addons:', err);
        throw new Error('Database error');
    }
};

const getAddons = async (hotel_id) => {
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


const getAllHotelAddons = async (hotel_id) => {
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
const getGlobalAddonById = async (id) => {
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

const getHotelAddonById = async (hotel_id, id) => {
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
const newGlobalAddon = async (name, description, price, created_by, updated_by) => {
    const query = `
        INSERT INTO addons_global (name, description, price, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const values = [name, description, price, created_by, updated_by];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error adding global addon:', err);
        throw new Error('Database error');
    }
};

const newHotelAddon = async (hotel_id, name, description, price, created_by, updated_by, addons_global_id) => {
    const query = `
        INSERT INTO addons_hotel (hotel_id, addons_global_id, name, description, price, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
    `;
    const values = [hotel_id, addons_global_id, name, description, price, created_by, updated_by];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error adding hotel addon:', err);
        throw new Error('Database error');
    }
};

// Update entry
const updateGlobalAddon = async (id, name, description, price, visible, updated_by) => {
    const query = `
        UPDATE addons_global
        SET name = $1, description = $2, price = $3, visible = $4, updated_by = $5
        WHERE id = $6
        RETURNING *;
    `;
    const values = [name, description, price, visible, updated_by, id];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error updating global addon:', err);
        throw new Error('Database error');
    }
};

const updateHotelAddon = async (id, hotel_id, addons_global_id, name, description, price, visible, updated_by) => {
    const query = `
        UPDATE addons_hotel
        SET addons_global_id = $1, name = $2, description = $3, price = $4, visible = $5, updated_by = $6 
        WHERE hotel_id = $7 AND id = $8
        RETURNING *;
    `;
    const values = [addons_global_id, name, description, price, visible, updated_by, hotel_id, id];

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