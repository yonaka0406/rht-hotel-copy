const { getPool } = require('../../config/database');

// Add entry
const newGlobalPlan = async (requestId, name, description, plan_type, color, created_by, updated_by, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        const query = `
            INSERT INTO plans_global (name, description, plan_type, color, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const values = [name, description, plan_type, color, created_by, updated_by];

        const result = await client.query(query, values);

        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error('Error adding global Plan:', err);
        throw err;
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};
const newHotelPlan = async (requestId, hotel_id, plans_global_id, name, description, plan_type, color, created_by, updated_by, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        const query = `
            INSERT INTO plans_hotel (hotel_id, plans_global_id, name, description, plan_type, color, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const values = [hotel_id, plans_global_id, name, description, plan_type, color, created_by, updated_by];

        const result = await client.query(query, values);

        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error('Error adding hotel Plan:', err);
        throw err;
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};
const newPlanPattern = async (requestId, hotel_id, name, template, user_id, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        const query = `
            INSERT INTO plan_templates (hotel_id, name, template, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $4)
            RETURNING *;
        `;
        const values = [hotel_id, name, template, user_id];

        const result = await client.query(query, values);

        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error('Error adding global pattern:', err);
        throw err;
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};

// Update entry
const updateGlobalPlan = async (requestId, id, name, description, plan_type, color, updated_by, dbClient = null) => {    
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        const query = `
            UPDATE plans_global
            SET name = $1, description = $2, plan_type = $3, color = $4, updated_by = $5
            WHERE id = $6
            RETURNING *;
        `;
        const values = [name, description, plan_type, color, updated_by, id];

        const result = await client.query(query, values);

        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error('Error updating global Plan:', err);
        throw err;
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};
const updateHotelPlan = async (requestId, id, hotel_id, plans_global_id, name, description, plan_type, color, updated_by, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        const query = `
            UPDATE plans_hotel
            SET plans_global_id = $1, name = $2, description = $3, plan_type = $4, color = $5, updated_by = $6
            WHERE hotel_id = $7 AND id = $8
            RETURNING *;
        `;
        const values = [plans_global_id, name, description, plan_type, color, updated_by, hotel_id, id];

        const result = await client.query(query, values);

        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error('Error updating hotel Plan:', err);
        throw err;
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};
const updatePlanPattern = async (requestId, id, name, template, user_id, dbClient = null) => {    
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        const query = `
            UPDATE plan_templates
            SET name = $1, template = $2, updated_by = $3
            WHERE id = $4
            RETURNING *;
        `;
        const values = [name, template, user_id, id];

        const result = await client.query(query, values);

        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error('Error updating global Plan:', err);
        throw err;
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};

module.exports = {
    newGlobalPlan,
    newHotelPlan,
    newPlanPattern,
    updateGlobalPlan,
    updateHotelPlan,
    updatePlanPattern,
};
