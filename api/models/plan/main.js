const { getPool } = require('../../config/database');

const selectPlanByKey = async (requestId, hotel_id, plan_key, client = null) => {
    const defaultResult = {
        plans_global_id: null,
        plans_hotel_id: null,
        name: '',
        plan_type: 'per_room'
    };
    
    if (!plan_key) {
        console.debug('selectPlanByKey: No plan_key provided, returning default result');
        return defaultResult;
    }

    const parts = plan_key.split('h');
    //console.log('plan_key:', plan_key, 'parts:', parts);

    try {
        // Extract IDs from parts
        const globalId = parts[0] ? parseInt(parts[0]) : null;
        const hotelId = parts[1] ? parseInt(parts[1]) : null;

        // Case 1: Hotel plan exists (parts[1] has value)
        if (parts.length > 1 && parts[1] && !isNaN(parseInt(parts[1]))) {
            const hotelPlanId = parseInt(parts[1]);
            const hotelPlan = await selectHotelPlanById(requestId, hotel_id, hotelPlanId, client);
            
            if (hotelPlan) {
                return {
                    plans_global_id: globalId && !isNaN(globalId) ? globalId : null,
                    plans_hotel_id: hotelPlanId,
                    name: hotelPlan.name,
                    plan_type: hotelPlan.plan_type
                };
            }
        }

        // Case 2: Global plan exists (parts[0] has value)
        if (parts[0] && !isNaN(parseInt(parts[0]))) {
            const globalPlanId = parseInt(parts[0]);
            const globalPlan = await selectGlobalPlanById(requestId, globalPlanId, client);
            
            if (globalPlan) {
                return {
                    plans_global_id: globalPlanId,
                    plans_hotel_id: hotelId && !isNaN(hotelId) ? hotelId : null,
                    name: globalPlan.name,
                    plan_type: globalPlan.plan_type
                };
            }
        }

    } catch (err) {
        console.error('Error in selectPlanByKey:', err);
        throw err;
    }

    return defaultResult;
};
const selectGlobalPlanById = async (requestId, id, client = null) => {
    const pool = getPool(requestId);
    const dbClient = client || await pool.connect();
    const shouldReleaseClient = !client;
    const query = 'SELECT * FROM plans_global WHERE id = $1';
    const values = [id];

    try {
        const result = await dbClient.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error finding global Plan:', err);
        throw new Error('Database error');
    } finally {
        if (shouldReleaseClient) {
            dbClient.release();
        }
    }
};
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
        console.error('Error finding hotel Plan:', err);
        throw new Error('Database error'); 
    } finally {
        if (shouldReleaseClient) {
            dbClient.release();
        }
    }
};

const selectAllHotelsPlans = async (requestId) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM plans_hotel ORDER BY hotel_id ASC, name ASC';    

    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving hotels plans:', err);
        throw new Error('Database error');
    }
};
const selectHotelPlans = async (requestId, hotel_id) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM plans_hotel WHERE hotel_id = $1 ORDER BY name ASC';
    const values = [hotel_id];

    try {
        const result = await pool.query(query, values);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving hotel plans:', err);
        throw new Error('Database error');
    }
};
const selectAvailablePlansByHotel = async (requestId, hotel_id) => {
    const pool = getPool(requestId);
    const query = `SELECT * FROM get_available_plans_for_hotel($1)
ORDER BY plan_type, name;`;
    const values = [hotel_id];

    try {
        const result = await pool.query(query, values);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving hotel plans:', err);
        throw new Error('Database error');
    }
};

const selectAllHotelPatterns = async (requestId) => {
    const pool = getPool(requestId);
    const query = `SELECT *, 'hotel' as template_type FROM plan_templates WHERE hotel_id IS NOT NULL ORDER BY name ASC`;
    
    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving global patterns:', err);
        throw new Error('Database error');
    }
};
const selectPatternsByHotel = async (requestId, hotel_id) => {
    const pool = getPool(requestId);
    const query = `        
        SELECT *, 'global' as template_type FROM plan_templates WHERE hotel_id IS NULL
        UNION ALL
        SELECT *, 'hotel' as template_type FROM plan_templates WHERE hotel_id = $1
        ORDER BY hotel_id, name            
    `;
    const values = [hotel_id];

    try {
        const result = await pool.query(query, values);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving patterns for hotel:', err);
        throw err;
    }
};




const insertHotelPlan = async (requestId, hotel_id, plans_global_id, name, description, plan_type, color, created_by, updated_by) => {
    const pool = getPool(requestId);
    const query = `
        INSERT INTO plans_hotel (hotel_id, plans_global_id, name, description, plan_type, color, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
    `;
    const values = [hotel_id, plans_global_id, name, description, plan_type, color, created_by, updated_by];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error adding hotel Plan:', err);
        throw new Error('Database error');
    }
};
const insertPlanPattern = async (requestId, hotel_id, name, template, user_id) => {
    const pool = getPool(requestId);
    const query = `
        INSERT INTO plan_templates (hotel_id, name, template, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $4)
        RETURNING *;
    `;
    const values = [hotel_id, name, template, user_id];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error adding global pattern:', err);
        throw new Error('Database error');
    }
};

const updateHotelPlan = async (requestId, id, hotel_id, plans_global_id, name, description, plan_type, color, updated_by) => {
    const pool = getPool(requestId);
    const query = `
        UPDATE plans_hotel
        SET plans_global_id = $1, name = $2, description = $3, plan_type = $4, color = $5, updated_by = $6
        WHERE hotel_id = $7 AND id = $8
        RETURNING *;
    `;
    const values = [plans_global_id, name, description, plan_type, color, updated_by, hotel_id, id];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error updating hotel Plan:', err);
        throw new Error('Database error');
    }
};
const updatePlanPattern = async (requestId, id, name, template, user_id) => {    
    const pool = getPool(requestId);
    const query = `
        UPDATE plan_templates
        SET name = $1, template = $2, updated_by = $3
        WHERE id = $4
        RETURNING *;
    `;
    const values = [name, template, user_id, id];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error updating plan pattern:', err);
        throw err;
    }
};

module.exports = {
    selectPlanByKey,
    selectGlobalPlanById,
    selectHotelPlanById,
    selectAllHotelsPlans,
    selectHotelPlans,
    selectAvailablePlansByHotel,
    selectAllHotelPatterns,
    selectPatternsByHotel,
    insertHotelPlan,
    insertPlanPattern,
    updateHotelPlan,
    updatePlanPattern,
};