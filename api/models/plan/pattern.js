const { getPool } = require('../../config/database');

const selectAllHotelPatterns = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `SELECT *, 'hotel' as template_type FROM plan_templates WHERE hotel_id IS NOT NULL ORDER BY name ASC`;

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving hotel patterns:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const selectPatternsByHotel = async (requestId, hotel_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `        
        SELECT *, 'global' as template_type FROM plan_templates WHERE hotel_id IS NULL
        UNION ALL
        SELECT *, 'hotel' as template_type FROM plan_templates WHERE hotel_id = $1
        ORDER BY hotel_id, name            
    `;
    const values = [hotel_id];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving patterns for hotel:', err);
        throw err;
    } finally {
        if (!dbClient) client.release();
    }
};

const insertPlanPattern = async (requestId, hotel_id, name, template, user_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        INSERT INTO plan_templates (hotel_id, name, template, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $4)
        RETURNING *;
    `;
    const values = [hotel_id, name, template, user_id];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error inserting plan template:', { hotel_id, name, error: err });
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const updatePlanPattern = async (requestId, id, name, template, user_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        UPDATE plan_templates
        SET name = $1, template = $2, updated_by = $3
        WHERE id = $4
        RETURNING *;
    `;
    const values = [name, template, user_id, id];

    try {
        const result = await client.query(query, values);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    } catch (err) {
        console.error(`[${requestId}] Error updating plan pattern id=${id}:`, err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

module.exports = {
    selectAllHotelPatterns,
    selectPatternsByHotel,
    insertPlanPattern,
    updatePlanPattern,
};
