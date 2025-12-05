const { getPool } = require('../../config/database');

const selectGlobalPlans = async (requestId) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM plans_global ORDER BY name ASC';

    try {
        const result = await pool.query(query);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving global plans:', err);
        throw new Error('Database error');
    }
};

const selectGlobalPatterns = async (requestId) => {
    const pool = getPool(requestId);
    const query = `SELECT *, 'global' as template_type FROM plan_templates WHERE hotel_id IS NULL ORDER BY name ASC`;
    
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving global patterns:', err);
        throw new Error('Database error');
    }
};

module.exports = {
    selectGlobalPlans,
    selectGlobalPatterns,
}