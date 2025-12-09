const { getPool } = require('../../config/database');
const logger = require('../../config/logger');


const selectHotelPlanById = async (requestId, hotel_id, id, client = null) => {
    const pool = getPool(requestId);
    const dbClient = client || await pool.connect();
    const shouldReleaseClient = !client;
    const query = 'SELECT * FROM plans_hotel WHERE hotel_id = $1 AND id = $2';
    const values = [hotel_id, id];

    try {
        const result = await dbClient.query(query, values);
        return result.rows[0];
    } catch (err) {
        logger.error('Error finding hotel Plan:', err);
        throw new Error('Database error');
    } finally {
        if (shouldReleaseClient) {
            dbClient.release();
        }
    }
};

const selectAllHotelsPlans = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plans_hotel ORDER BY hotel_id ASC, name ASC';

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving hotels plans:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};
const selectHotelPlans = async (requestId, hotel_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plans_hotel WHERE hotel_id = $1 ORDER BY name ASC';
    const values = [hotel_id];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving hotel plans:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};
const selectAvailablePlansByHotel = async (requestId, hotel_id, target_date = null, includeInactive = false, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    // Default to current date if not provided
    const date = target_date || new Date().toLocaleDateString('en-CA');

    const query = `SELECT * FROM get_available_plans_with_rates_and_addons($1, $2::date, NULL, $3)
                   ORDER BY display_order, plan_id;`;
    const values = [hotel_id, date, includeInactive];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving hotel plans:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const selectAvailablePlansByHotelPeriod = async (requestId, hotel_id, start_date, end_date, includeInactive = false, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();

    const query = `SELECT * FROM get_available_plans_with_rates_and_addons($1, $2::date, $3::date, $4)
                   ORDER BY display_order, plan_id;`;
    const values = [hotel_id, start_date, end_date, includeInactive];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving hotel plans by period:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};
const selectAllHotelPatterns = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `SELECT *, 'hotel' as template_type FROM plan_templates WHERE hotel_id IS NOT NULL ORDER BY name ASC`;

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving hotel patterns:', err);
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
        logger.error('Error retrieving patterns for hotel:', err);
        throw err;
    } finally {
        if (!dbClient) client.release();
    }
};




const insertHotelPlan = async (requestId, hotel_id, plan_type_category_id, plan_package_category_id, name, description, plan_type, color, display_order, is_active, available_from, available_until, created_by, updated_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        INSERT INTO plans_hotel (
            hotel_id, plan_type_category_id, plan_package_category_id, 
            name, description, plan_type, color, display_order, is_active, available_from, available_until, 
            created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *;
    `;
    const values = [
        hotel_id, plan_type_category_id, plan_package_category_id,
        name, description, plan_type, color, display_order, is_active, available_from, available_until,
        created_by, updated_by
    ];

    logger.debug(`[DB] insertHotelPlan values:`, values);
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        logger.error('Error adding hotel Plan:', err);
        throw new Error('Database error');
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
        logger.error('Error inserting plan template:', { hotel_id, name, error: err });
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const updateHotelPlan = async (requestId, id, hotel_id, plan_type_category_id, plan_package_category_id, name, description, plan_type, color, display_order, is_active, available_from, available_until, updated_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        UPDATE plans_hotel
        SET plan_type_category_id = $1, plan_package_category_id = $2, name = $3, description = $4, plan_type = $5, color = $6, display_order = $7, is_active = $8, available_from = $9, available_until = $10, updated_by = $11
        WHERE hotel_id = $12 AND id = $13
        RETURNING *;
    `;
    const values = [plan_type_category_id || null, plan_package_category_id || null, name, description, plan_type, color, display_order, is_active, available_from, available_until, updated_by, hotel_id, id];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        logger.error('Error updating hotel Plan:', err);
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
        return result.rows[0];
    } catch (err) {
        logger.error('Error updating plan pattern:', err);
        throw err;
    } finally {
        if (!dbClient) client.release();
    }
};

const updatePlansOrderBulk = async (requestId, hotelId, plans, updated_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const shouldReleaseClient = !client;

    try {
        await client.query('BEGIN');
        for (const plan of plans) {
            const query = `
                UPDATE plans_hotel
                SET display_order = $1, updated_by = $2
                WHERE hotel_id = $3 AND id = $4
            `;
            const values = [plan.display_order, updated_by, hotelId, plan.id];
            await client.query(query, values);
        }
        await client.query('COMMIT');
        return { success: true };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating plan display order in bulk:', err);
        throw new Error('Database error');
    } finally {
        if (shouldReleaseClient) {
            client.release();
        }
    }
};

module.exports = {
    selectHotelPlanById,
    selectAllHotelsPlans,
    selectHotelPlans,
    selectAvailablePlansByHotel,
    selectAvailablePlansByHotelPeriod,
    selectAllHotelPatterns,
    selectPatternsByHotel,
    insertHotelPlan,
    insertPlanPattern,
    updateHotelPlan,
    updatePlanPattern,
    updatePlansOrderBulk,
};