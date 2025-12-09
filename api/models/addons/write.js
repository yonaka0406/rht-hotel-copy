const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const newHotelAddon = async (requestId, hotel_id, addon_category_id, name, description, price, tax_type_id, tax_rate, created_by, updated_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        INSERT INTO addons_hotel (hotel_id, addon_category_id, name, description, price, tax_type_id, tax_rate, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
    `;
    const values = [hotel_id, addon_category_id, name, description, price, tax_type_id, tax_rate, created_by, updated_by];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        logger.error('Error adding hotel addon:', err);
        throw new Error(`Failed to add hotel addon: ${err.message}`, { cause: err });
    } finally {
        if (!dbClient) client.release();
    }
};

module.exports = {
    newHotelAddon
};
