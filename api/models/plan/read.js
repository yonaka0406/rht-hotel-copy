const { getPool } = require('../../config/database');

// Return all
const getAllGlobalPlans = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plans_global ORDER BY name ASC';

    try {
        const result = await client.query(query);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving global plans:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};
const getAllHotelsPlans = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plans_hotel ORDER BY hotel_id ASC, name ASC';    

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving hotels plans:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};
const getAllHotelPlans = async (requestId, hotel_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plans_hotel WHERE hotel_id = $1 ORDER BY name ASC';
    const values = [hotel_id];

    try {
        const result = await client.query(query, values);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving hotel plans:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};
const getAllPlansByHotel = async (requestId, hotel_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `SELECT * FROM get_available_plans_for_hotel($1)
ORDER BY plan_type, name;`;
    const values = [hotel_id];

    try {
        const result = await client.query(query, values);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving hotel plans:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};

const getAllGlobalPatterns = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `SELECT *, 'global' as template_type FROM plan_templates WHERE hotel_id IS NULL ORDER BY name ASC`;
    
    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving global patterns:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};
const getAllHotelPatterns = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `SELECT *, 'hotel' as template_type FROM plan_templates WHERE hotel_id IS NOT NULL ORDER BY name ASC`;
    
    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving global patterns:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};
const getAllPatternsByHotel = async (requestId, hotel_id, dbClient = null) => {
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
        console.error('Error retrieving hotel plans:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};

// Return one
const getPlanByKey = async (requestId, hotel_id, plan_key, dbClient = null) => {
    const defaultResult = {
        plans_global_id: null,
        plans_hotel_id: null,
        name: '',
        plan_type: 'per_room'
    };
    
    if (!plan_key) {
        console.debug('getPlanByKey: No plan_key provided, returning default result');
        return defaultResult;
    }

    const parts = plan_key.split('h');

    try {
        const globalId = parts[0] ? parseInt(parts[0]) : null;
        const hotelId = parts[1] ? parseInt(parts[1]) : null;

        if (parts.length > 1 && parts[1] && !isNaN(parseInt(parts[1]))) {
            const hotelPlanId = parseInt(parts[1]);
            // Pass dbClient to nested read functions
            const hotelPlan = await getHotelPlanById(requestId, hotel_id, hotelPlanId, dbClient);
            
            if (hotelPlan) {
                return {
                    plans_global_id: globalId && !isNaN(globalId) ? globalId : null,
                    plans_hotel_id: hotelPlanId,
                    name: hotelPlan.name,
                    plan_type: hotelPlan.plan_type
                };
            }
        }

        if (parts[0] && !isNaN(parseInt(parts[0]))) {
            const globalPlanId = parseInt(parts[0]);
            // Pass dbClient to nested read functions
            const globalPlan = await getGlobalPlanById(requestId, globalPlanId, dbClient);
            
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
        console.error('Error in getPlanByKey:', err);
        throw err;
    }

    return defaultResult;
};
const getGlobalPlanById = async (requestId, id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plans_global WHERE id = $1';
    const values = [id];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error finding global Plan:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};
const getHotelPlanById = async (requestId, hotel_id, id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plans_hotel WHERE hotel_id = $1 AND id = $2';
    const values = [hotel_id, id];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error finding hotel Plan:', err);
        throw new Error('Database error'); 
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};

module.exports = {
    getAllGlobalPlans,
    getAllHotelsPlans,
    getAllHotelPlans,
    getAllPlansByHotel,
    getAllGlobalPatterns,
    getAllHotelPatterns,
    getAllPatternsByHotel,
    getPlanByKey,
    getGlobalPlanById,
    getHotelPlanById,
};
