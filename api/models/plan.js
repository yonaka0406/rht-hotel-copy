const pool = require('../config/database');

// Return all
const getAllGlobalPlans = async () => {
    const query = 'SELECT * FROM plans_global ORDER BY name ASC';

    try {
        const result = await pool.query(query);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving global plans:', err);
        throw new Error('Database error');
    }
};

const getAllHotelsPlans = async () => {
    const query = 'SELECT * FROM plans_hotel ORDER BY hotel_id ASC, name ASC';    

    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving hotels plans:', err);
        throw new Error('Database error');
    }
};

const getAllHotelPlans = async (hotel_id) => {
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

const getAllPlansByHotel = async (hotel_id) => {
    const query = `
        SELECT
            CASE WHEN ph.plans_global_id = pg.id THEN NULL ELSE pg.id END as plans_global_id
            ,ph.id as plans_hotel_id
            ,COALESCE(ph.name, pg.name) as name
            ,COALESCE(ph.description, pg.description) as description
            ,COALESCE(ph.plan_type, pg.plan_type) as plan_type	
        FROM 
            plans_global AS pg 
                FULL JOIN 
            (SELECT * FROM plans_hotel WHERE hotel_id = $1) AS ph on pg.id = ph.plans_global_id
        ORDER BY
            COALESCE(ph.plan_type, pg.plan_type)
            ,COALESCE(ph.name, pg.name)
    `;
    const values = [hotel_id];

    try {
        const result = await pool.query(query, values);    
        return result.rows;
    } catch (err) {
        console.error('Error retrieving hotel plans:', err);
        throw new Error('Database error');
    }
}

// Return one
const getGlobalPlanById = async (id) => {
    const query = 'SELECT * FROM plans_global WHERE id = $1';
    const values = [id];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error finding global Plan:', err);
        throw new Error('Database error');
    }
};

const getHotelPlanById = async (hotel_id, id) => {
    const query = 'SELECT * FROM plans_hotel WHERE hotel_id = $1 AND id = $2';
    const values = [hotel_id, id];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error finding hotel Plan:', err);
        throw new Error('Database error'); 
    }
};

// Add entry
const newGlobalPlan = async (name, description, plan_type, created_by, updated_by) => {
    const query = `
        INSERT INTO plans_global (name, description, plan_type, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const values = [name, description, plan_type, created_by, updated_by];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error adding global Plan:', err);
        throw new Error('Database error');
    }
};

const newHotelPlan = async (hotel_id, plans_global_id, name, description, plan_type, created_by, updated_by) => {
    const query = `
        INSERT INTO plans_hotel (hotel_id, plans_global_id, name, description, plan_type, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
    `;
    const values = [hotel_id, plans_global_id, name, description, plan_type, created_by, updated_by];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error adding hotel Plan:', err);
        throw new Error('Database error');
    }
};

// Update entry
const updateGlobalPlan = async (id, name, description, plan_type, updated_by) => {
    const query = `
        UPDATE plans_global
        SET name = $1, description = $2, plan_type = $3, updated_by = $4
        WHERE id = $5
        RETURNING *;
    `;
    const values = [name, description, plan_type, updated_by, id];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error updating global Plan:', err);
        throw new Error('Database error');
    }
};

const updateHotelPlan = async (id, hotel_id, plans_global_id, name, description, plan_type, updated_by) => {
    const query = `
        UPDATE plans_hotel
        SET plans_global_id = $1, name = $2, description = $3, plan_type = $4, updated_by = $5
        WHERE hotel_id = $6 AND id = $7
        RETURNING *;
    `;
    const values = [plans_global_id, name, description, plan_type, updated_by, hotel_id, id];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error updating hotel Plan:', err);
        throw new Error('Database error');
    }
};

module.exports = {
    getAllGlobalPlans,
    getAllHotelsPlans,
    getAllHotelPlans,
    getAllPlansByHotel,
    getGlobalPlanById,
    getHotelPlanById,
    newGlobalPlan,
    newHotelPlan,
    updateGlobalPlan,
    updateHotelPlan
};