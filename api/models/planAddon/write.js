const { getPool } = require('../../config/database');

// Create a new plan_addon
const createPlanAddon = async (requestId, planAddon, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        let hotel_id = null;
        let plans_global_id = null;
        let plans_hotel_id = null;
        let addons_hotel_id = null;
        let addons_global_id = null;

        if (planAddon.addons_id && typeof planAddon.addons_id === 'string') {
            if (planAddon.addons_id.startsWith('H')) {
                addons_hotel_id = parseInt(planAddon.addons_id.slice(1), 10); // Extract and convert hotel ID
            } else {
                addons_global_id = parseInt(planAddon.addons_id, 10); // Convert global ID to integer
            }
        } else {
            console.error('Invalid addons_id:', planAddon.addons_id);
        }

        if (planAddon.plans_global_id === 0 || !planAddon.plans_global_id) {
            plans_global_id = null;
        } else {
            plans_global_id = planAddon.plans_global_id;
        }

        if (planAddon.plans_hotel_id === 0 || !planAddon.plans_hotel_id) {
            plans_hotel_id = null;
        } else {
            plans_hotel_id = planAddon.plans_hotel_id;
        }

        if (planAddon.hotel_id === 0 || !planAddon.hotel_id) {
            hotel_id = null;
        } else {
            hotel_id = planAddon.hotel_id;
        }

        const query = `
            INSERT INTO plan_addons (
                hotel_id, 
                plans_global_id, 
                plans_hotel_id, 
                addons_global_id, 
                addons_hotel_id, 
                addon_type,
                price, 
                tax_type_id,
                tax_rate,
                date_start, 
                date_end, 
                created_by,
                updated_by,
                sales_category
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const values = [
            hotel_id,
            plans_global_id,
            plans_hotel_id,
            addons_global_id,
            addons_hotel_id,
            planAddon.addon_type,
            planAddon.price,
            planAddon.tax_type_id,
            planAddon.tax_rate,
            planAddon.date_start,
            planAddon.date_end,
            planAddon.created_by,
            planAddon.updated_by,
            planAddon.sales_category || 'accommodation'
        ];

        const result = await client.query(query, values);

        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error('Error creating plan addon:', err);
        throw err;
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};

// Update an existing plan_addon
const updatePlanAddon = async (requestId, id, planAddon, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        const query = `
            UPDATE plan_addons
            SET 
                hotel_id = $1,
                plans_global_id = $2,
                plans_hotel_id = $3,
                addons_global_id = $4,
                addons_hotel_id = $5,
                price = $6,
                date_start = $7,
                date_end = $8,
                updated_by = $9,
                sales_category = $10
            WHERE id = $11
            RETURNING *
        `;

        const values = [
            planAddon.hotel_id,
            planAddon.plans_global_id,
            planAddon.plans_hotel_id,
            planAddon.addons_global_id,
            planAddon.addons_hotel_id,
            planAddon.price,
            planAddon.date_start,
            planAddon.date_end,
            planAddon.updated_by,
            planAddon.sales_category || 'accommodation',
            id
        ];

        const result = await client.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Plan addon not found');
        }

        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error(`Error updating plan addon with ID ${id}:`, err);
        throw err;
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};

// Delete a plan_addon by ID
const deletePlanAddon = async (requestId, id, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        const query = 'DELETE FROM plan_addons WHERE id = $1 RETURNING *';

        const result = await client.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Plan addon not found');
        }

        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error(`Error deleting plan addon with ID ${id}:`, err);
        throw err;
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};

module.exports = {
    createPlanAddon,
    updatePlanAddon,
    deletePlanAddon
};
