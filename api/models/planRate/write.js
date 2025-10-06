let actualGetPool = require('../../config/database').getPool;

// Create a new plans_rate
const createPlansRate = async (requestId, plansRate, dbClient = null) => {
        const isTransactionOwner = !dbClient;
        const client = dbClient || await actualGetPool(requestId).connect();
    
        try {
            if (isTransactionOwner) {
                await client.query('BEGIN');
            }
            const result = await client.query(query, values);
            if (isTransactionOwner) {
                await client.query('COMMIT');
            }
            return result.rows[0];
        } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error('Error creating plan rate:', err);
        throw new Error('Database error');
    } finally {
        if (isTransactionOwner) client.release();
    }
};

// Update an existing plans_rate
const updatePlansRate = async (requestId, id, plansRate, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await actualGetPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Plan rate not found');
        }
        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error(`Error updating plan rate with ID ${id}:`, err);
        throw err;
    } finally {
        if (isTransactionOwner) client.release();
    }
};

// Delete a plans_rate by ID
const deletePlansRate = async (requestId, id, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await actualGetPool(requestId).connect();
    const query = 'DELETE FROM plans_rates WHERE id = $1 RETURNING *';

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Plan rate not found');
        }
        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error(`Error deleting plan rate with ID ${id}:`, err);
        throw err;
    } finally {
        if (isTransactionOwner) client.release();
    }
};

module.exports = {
    createPlansRate,
    updatePlansRate,
    deletePlansRate,
};