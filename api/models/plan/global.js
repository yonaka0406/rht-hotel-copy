const { getPool } = require('../../config/database');

const selectGlobalPlans = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plans_global ORDER BY name ASC';

    try {
        const result = await client.query(query);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving global plans:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const insertGlobalPlan = async (requestId, name, description, plan_type, color, created_by, updated_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        INSERT INTO plans_global (name, description, plan_type, color, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;
    const values = [name, description, plan_type, color, created_by, updated_by];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error adding global Plan:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const updateGlobalPlan = async (requestId, id, name, description, plan_type, color, updated_by, dbClient = null) => {    
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        UPDATE plans_global
        SET name = $1, description = $2, plan_type = $3, color = $4, updated_by = $5
        WHERE id = $6
        RETURNING *;
    `;
    const values = [name, description, plan_type, color, updated_by, id];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error updating global Plan:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const selectGlobalPatterns = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `SELECT *, 'global' as template_type FROM plan_templates WHERE hotel_id IS NULL ORDER BY name ASC`;
    
    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving global patterns:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

module.exports = {
    selectGlobalPlans,
    insertGlobalPlan,
    updateGlobalPlan,
    selectGlobalPatterns,    
}