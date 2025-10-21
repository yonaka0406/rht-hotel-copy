let getPool = require('../../config/database').getPool;
const { validateIntegerParam } = require('../../utils/validationUtils');

// Parking Lot
const getParkingLots = async (requestId, hotel_id) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM parking_lots WHERE hotel_id = $1 ORDER BY id';
    const values = [hotel_id];
    const result = await pool.query(query, values);
    return result.rows;
};

const createParkingLot = async (requestId, { hotel_id, name, description }) => {
    const parsedHotelId = validateIntegerParam(hotel_id, 'Hotel ID');

    // Validate name
    const trimmedName = name ? String(name).trim() : '';
    if (trimmedName.length === 0) {
        throw new Error('Parking lot name cannot be empty.');
    }

    // Validate description
    const trimmedDescription = description ? String(description).trim() : '';
    const MAX_DESCRIPTION_LENGTH = 1000; // Example max length
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
        throw new Error(`Parking lot description exceeds maximum length of ${MAX_DESCRIPTION_LENGTH} characters.`);
    }

    const pool = getPool(requestId);
    const query = 'INSERT INTO parking_lots (hotel_id, name, description) VALUES ($1, $2, $3) RETURNING *';
    const values = [parsedHotelId, trimmedName, trimmedDescription];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const updateParkingLot = async (requestId, id, { name, description }) => {
    // Validate id
    if (!id) {
        throw new Error('Parking lot ID must be provided.');
    }

    // Validate name
    const trimmedName = name ? String(name).trim() : '';
    if (trimmedName.length === 0) {
        throw new Error('Parking lot name cannot be empty.');
    }

    // Validate description
    const trimmedDescription = description ? String(description).trim() : '';

    const pool = getPool(requestId);
    const query = 'UPDATE parking_lots SET name = $1, description = $2 WHERE id = $3 RETURNING *';
    const values = [trimmedName, trimmedDescription, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new Error(`Parking lot with ID ${id} not found.`);
    }

    return result.rows[0];
};

const deleteParkingLot = async (requestId, id) => {
    const pool = getPool(requestId);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check for references in parking_spots
        const parkingSpotsQuery = 'SELECT COUNT(*) FROM parking_spots WHERE parking_lot_id = $1';
        const parkingSpotsResult = await client.query(parkingSpotsQuery, [id]);
        if (parseInt(parkingSpotsResult.rows[0].count, 10) > 0) {
            throw new Error('Cannot delete parking lot: it contains existing parking spots.');
        }

        // If no references, proceed with deletion
        const deleteQuery = 'DELETE FROM parking_lots WHERE id = $1';
        const deleteValues = [id];
        const result = await client.query(deleteQuery, deleteValues);

        if (result.rowCount === 0) {
            throw new Error(`Parking lot with ID ${id} not found.`);
        }

        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    getParkingLots,
    createParkingLot,
    updateParkingLot,
    deleteParkingLot,
};