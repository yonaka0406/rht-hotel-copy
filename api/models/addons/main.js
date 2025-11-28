const { getPool } = require('../../config/database');

// Return all
const getAllGlobalAddons = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM addons_global ORDER BY visible DESC, name ASC';

    try {
        const result = await client.query(query);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving global addons:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const getAllHotelsAddons = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM addons_hotel ORDER BY hotel_id ASC, visible DESC, name ASC';    

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving hotels addons:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const getAddons = async (requestId, hotel_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    let query;
    let values = [];

    if(hotel_id === 0) {
        query = `
            SELECT 
                NULL as hotel_id, 
                addons_global.id::TEXT as id, 
                NULL AS addons_hotel_id,
                addons_global.id AS addons_global_id,
                addons_global.name as addon_name,
                addons_global.addon_type,
                addons_global.description, 
                addons_global.price,
                addons_global.tax_type_id,
                tax_info.name as tax_type,
                addons_global.tax_rate,
                addons_global.net_price	
            FROM addons_global, tax_info
            WHERE addons_global.visible = TRUE AND addons_global.tax_type_id = tax_info.id
            ORDER BY addons_global.visible DESC, addons_global.name ASC
        `;
    } else {    
        query = `
            SELECT 
                NULL as hotel_id, 
                ag.id::TEXT as id, 
                NULL AS addons_hotel_id,
                ag.id AS addons_global_id,
                ag.name as addon_name,
                ag.addon_type,
                ag.description, 
                ag.price,
                ag.tax_type_id,
                ti.name as tax_type,
                ag.tax_rate,
                ag.net_price
            FROM 
                addons_global ag
            JOIN
                tax_info ti ON ag.tax_type_id = ti.id
            WHERE 
                ag.visible = TRUE
                AND NOT EXISTS (SELECT 1 FROM addons_hotel ah WHERE ah.addons_global_id = ag.id AND ah.hotel_id = $1)

            UNION ALL

            SELECT 
                ah.hotel_id, 
                'H' || ah.id::TEXT as id,
                ah.id AS addons_hotel_id,
                ah.addons_global_id,
                ah.name as addon_name, 
                ah.addon_type, 
                ah.description, 
                ah.price,
                ah.tax_type_id,
                ti.name as tax_type, 
                ah.tax_rate, 
                ah.net_price
            FROM 
                addons_hotel ah
            JOIN
                tax_info ti ON ah.tax_type_id = ti.id
            WHERE 
                ah.hotel_id = $1 AND ah.visible = TRUE
            ORDER BY 
                addon_name ASC;
        `;
        values = [hotel_id];
    }

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving addons:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};
const getAllHotelAddons = async (requestId, hotel_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM addons_hotel WHERE hotel_id = $1 ORDER BY visible DESC, name ASC';
    const values = [hotel_id];

    try {
        const result = await client.query(query, values);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving hotel addons:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

// Return one
const getGlobalAddonById = async (requestId, id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM addons_global WHERE id = $1';
    const values = [id];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error finding global addon:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const getHotelAddonById = async (requestId, hotel_id, id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM addons_hotel WHERE hotel_id = $1 AND id = $2';
    const values = [hotel_id, id];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error finding hotel addon:', err);
        throw new Error('Database error'); 
    } finally {
        if (!dbClient) client.release();
    }
};

// Add entry
const newGlobalAddon = async (requestId, name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        INSERT INTO addons_global (name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
    `;
    const values = [name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error adding global addon:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const newHotelAddon = async (requestId, hotel_id, name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by, addons_global_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        INSERT INTO addons_hotel (hotel_id, addons_global_id, name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
    `;
    const values = [hotel_id, addons_global_id, name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error adding hotel addon:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

// Update entry
const updateGlobalAddon = async (requestId, id, name, description, addon_type, price, tax_type_id, tax_rate, visible, updated_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
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
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error updating global addon:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const updateHotelAddon = async (requestId, id, hotel_id, addons_global_id, name, description, addon_type, price, tax_type_id, tax_rate, visible, updated_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
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
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error updating hotel addon:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
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