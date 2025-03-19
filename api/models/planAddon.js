const { getPool } = require('../config/database');

// Return all plan_addons
const getAllPlanAddons = async (requestId, plans_global_id, plans_hotel_id, hotel_id) => {
    const pool = getPool(requestId);
    const query = `        
        SELECT pa.*, COALESCE(ag.name, ah.name) AS name
        FROM 
            plan_addons AS pa
                LEFT OUTER JOIN
            addons_global AS ag
                ON pa.addons_global_id = ag.id
                LEFT OUTER JOIN
            addons_hotel AS ah
                ON pa.addons_hotel_id = ah.id
        WHERE 
            (pa.plans_global_id = $1 AND pa.plans_hotel_id IS NULL) OR             
            (pa.plans_hotel_id = $2 AND pa.hotel_id = $3 AND pa.plans_global_id IS NULL)
        ORDER BY name ASC
    `;

    try {        
        const result = await pool.query(query, [
            plans_global_id || null,
            plans_hotel_id || null,
            hotel_id || null,
        ]);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving plan addons:', err);
        throw new Error('Database error');
    }
};

// Get plan_addon by ID
const getPlanAddonById = async (requestId, id) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM plan_addons WHERE id = $1';

    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Plan addon not found');
        }
        return result.rows[0];
    } catch (err) {
        console.error(`Error retrieving plan addon with ID ${id}:`, err);
        throw err;
    }
};

// Create a new plan_addon
const createPlanAddon = async (requestId, planAddon) => {
    const pool = getPool(requestId);
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
            price, 
            date_start, 
            date_end, 
            created_by,
            updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
    `;

    const values = [
        hotel_id,
        plans_global_id,
        plans_hotel_id,
        addons_global_id,
        addons_hotel_id,
        planAddon.price,
        planAddon.date_start,
        planAddon.date_end,
        planAddon.created_by,
        planAddon.updated_by
    ];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error creating plan addon:', err);
        throw new Error('Database error');
    }
};

// Update an existing plan_addon
const updatePlanAddon = async (requestId, id, planAddon) => {
    const pool = getPool(requestId);
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
            updated_by = $9
        WHERE id = $10
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
        id
    ];

    try {
        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Plan addon not found');
        }
        return result.rows[0];
    } catch (err) {
        console.error(`Error updating plan addon with ID ${id}:`, err);
        throw err;
    }
};

// Delete a plan_addon by ID
const deletePlanAddon = async (requestId, id) => {
    const pool = getPool(requestId);
    const query = 'DELETE FROM plan_addons WHERE id = $1 RETURNING *';

    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Plan addon not found');
        }
        return result.rows[0];
    } catch (err) {
        console.error(`Error deleting plan addon with ID ${id}:`, err);
        throw err;
    }
};

module.exports = {
    getAllPlanAddons,
    getPlanAddonById,
    createPlanAddon,
    updatePlanAddon,
    deletePlanAddon
};