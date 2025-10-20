let getPool = require('../../config/database').getPool;
const format = require('pg-format');

// Vehicle Category
const getVehicleCategories = async (requestId) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM vehicle_categories ORDER BY capacity_units_required, name';
    const result = await pool.query(query);
    return result.rows;
};

const createVehicleCategory = async (requestId, { name, capacity_units_required }) => {
    const pool = getPool(requestId);
    const query = 'INSERT INTO vehicle_categories (name, capacity_units_required) VALUES ($1, $2) RETURNING *';
    const values = [name, capacity_units_required];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const updateVehicleCategory = async (requestId, id, { name, capacity_units_required }) => {
    const pool = getPool(requestId);
    const query = 'UPDATE vehicle_categories SET name = $1, capacity_units_required = $2 WHERE id = $3 RETURNING *';
    const values = [name, capacity_units_required, id];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const deleteVehicleCategory = async (requestId, id) => {
    const pool = getPool(requestId);
    const query = 'DELETE FROM vehicle_categories WHERE id = $1';
    const values = [id];
    await pool.query(query, values);
};

module.exports = {
    getVehicleCategories,
    createVehicleCategory,
    updateVehicleCategory,
    deleteVehicleCategory,
};