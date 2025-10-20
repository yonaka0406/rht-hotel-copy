let getPool = require('../../config/database').getPool;
const format = require('pg-format');
const { formatDate } = require('../../utils/reportUtils');

// Vehicle Category
const getVehicleCategories = async (requestId) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM vehicle_categories ORDER BY capacity_units_required, name';
    const result = await pool.query(query);
    return result.rows;
};

const createVehicleCategory = async (requestId, { name, capacity_units_required }) => {
    // Validate name
    const trimmedName = name ? String(name).trim() : '';
    if (trimmedName.length === 0) {
        throw new Error('Vehicle category name cannot be empty.');
    }

    // Validate capacity_units_required
    const parsedCapacity = Number(capacity_units_required);
    if (isNaN(parsedCapacity) || parsedCapacity <= 0 || !Number.isInteger(parsedCapacity)) {
        throw new Error('Capacity units required must be a positive integer.');
    }

    const pool = getPool(requestId);
    const query = 'INSERT INTO vehicle_categories (name, capacity_units_required) VALUES ($1, $2) RETURNING *';
    const values = [trimmedName, parsedCapacity];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const updateVehicleCategory = async (requestId, id, { name, capacity_units_required }) => {
    // Validate id
    if (!id) {
        throw new Error('Vehicle category ID must be provided.');
    }

    // Validate name
    const trimmedName = name ? String(name).trim() : '';
    if (trimmedName.length === 0) {
        throw new Error('Vehicle category name cannot be empty.');
    }

    // Validate capacity_units_required
    const parsedCapacity = Number(capacity_units_required);
    if (isNaN(parsedCapacity) || parsedCapacity <= 0 || !Number.isInteger(parsedCapacity)) {
        throw new Error('Capacity units required must be a positive integer.');
    }

    const pool = getPool(requestId);
    const query = 'UPDATE vehicle_categories SET name = $1, capacity_units_required = $2 WHERE id = $3 RETURNING *';
    const values = [trimmedName, parsedCapacity, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new Error(`Vehicle category with ID ${id} not found.`);
    }

    return result.rows[0];
};

const deleteVehicleCategory = async (requestId, id) => {
    const pool = getPool(requestId);
    const client = await pool.connect();
    try {
        // Check for references in reservation_parking
        const reservationParkingQuery = 'SELECT COUNT(*) FROM reservation_parking WHERE vehicle_category_id = $1';
        const reservationParkingResult = await client.query(reservationParkingQuery, [id]);
        if (parseInt(reservationParkingResult.rows[0].count, 10) > 0) {
            throw new Error('Cannot delete vehicle category: it is referenced by existing parking reservations.');
        }

        // If no references, proceed with deletion
        const deleteQuery = 'DELETE FROM vehicle_categories WHERE id = $1';
        const deleteValues = [id];
        await client.query(deleteQuery, deleteValues);
    } finally {
        client.release();
    }
};

module.exports = {
    getVehicleCategories,
    createVehicleCategory,
    updateVehicleCategory,
    deleteVehicleCategory,
};