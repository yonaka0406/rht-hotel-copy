const { getPool } = require('../../config/database');
const logger = require('../../config/logger');



const getAllHotelsAddons = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM addons_hotel ORDER BY hotel_id ASC, visible DESC, name ASC';

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving hotels addons:', err);
        throw new Error(`Failed to retrieve hotels addons: ${err.message}`, { cause: err });
    } finally {
        if (!dbClient) client.release();
    }
};

const getAddons = async (requestId, hotel_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    // This function now specifically gets addons for a single hotel.
    // The concept of global addons is deprecated.
    if (!hotel_id) {
        // To get all addons for all hotels, use getAllHotelsAddons.
        // This function is intended for a specific hotel context.
        logger.warn('getAddons called without hotel_id. Returning empty array.');
        return [];
    }

    const query = `
        SELECT
            ah.hotel_id,
            ah.id,
            ah.name AS addon_name,
            ah.description,
            ah.price,
            ah.tax_type_id,
            ti.name AS tax_type,
            ah.tax_rate,
            ah.net_price,
            ah.visible,
            ah.display_order,
            ac.id AS addon_category_id,
            ac.name AS addon_category_name,
            ac.addon_type,
            ac.color AS addon_category_color
        FROM
            addons_hotel ah
        JOIN
            tax_info ti ON ah.tax_type_id = ti.id
        LEFT JOIN
            addon_categories ac ON ah.addon_category_id = ac.id
        WHERE
            ah.hotel_id = $1 AND ah.is_active = TRUE
        ORDER BY
            ah.display_order ASC, ah.name ASC;
    `;
    const values = [hotel_id];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving addons for hotel:', err);
        throw new Error(`Failed to retrieve addons: ${err.message}`, { cause: err });
    } finally {
        if (!dbClient) client.release();
    }
};
const getAddonsByHotelId = async (requestId, hotel_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        SELECT
            ah.hotel_id,
            ah.id,
            ah.name,
            ah.description,
            ah.price,
            ah.tax_type_id,
            ti.name AS tax_type,
            ah.tax_rate,
            ah.net_price,
            ah.visible,
            ah.display_order,
            ah.addon_category_id,
            ac.name AS addon_category_name,
            ac.addon_type,
            ac.color AS addon_category_color,
            ah.created_at,
            ah.created_by,
            ah.updated_by,
            ah.is_active
        FROM
            addons_hotel ah
        LEFT JOIN
            tax_info ti ON ah.tax_type_id = ti.id
        LEFT JOIN
            addon_categories ac ON ah.addon_category_id = ac.id
        WHERE
            ah.hotel_id = $1
        ORDER BY
            ah.visible DESC, ah.display_order ASC, ah.name ASC;
    `;
    const values = [hotel_id];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving hotel addons:', err);
        throw new Error(`Failed to retrieve hotel addons: ${err.message}`, { cause: err });
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
        logger.error('Error finding hotel addon:', err);
        throw new Error(`Failed to find hotel addon: ${err.message}`, { cause: err });
    } finally {
        if (!dbClient) client.release();
    }
};

const updateHotelAddon = async (requestId, id, hotel_id, addon_category_id, name, description, price, tax_type_id, tax_rate, visible, updated_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        UPDATE addons_hotel
        SET 
            addon_category_id = $1,
            name = $2,
            description = $3,
            price = $4, 
            tax_type_id = $5, 
            tax_rate = $6, 
            visible = $7, 
            updated_by = $8 
        WHERE hotel_id = $9 AND id = $10
        RETURNING *;
    `;
    const values = [addon_category_id, name, description, price, tax_type_id, tax_rate, visible, updated_by, hotel_id, id];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        logger.error('Error updating hotel addon:', err);
        throw new Error(`Failed to update hotel addon: ${err.message}`, { cause: err });
    } finally {
        if (!dbClient) client.release();
    }
};

const getAllAddonCategories = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT id, name, addon_type, color, display_order FROM addon_categories ORDER BY display_order ASC';

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving addon categories:', err);
        throw new Error(`Failed to retrieve addon categories: ${err.message}`, { cause: err });
    } finally {
        if (!dbClient) client.release();
    }
};

module.exports = {
    getAllHotelsAddons,
    getAddons,
    getAddonsByHotelId,
    getHotelAddonById,
    updateHotelAddon,
    getAllAddonCategories
};