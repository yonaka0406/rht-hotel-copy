let getPool = require('../../config/database').getPool;
const format = require('pg-format');

// Parking Lot
const getParkingLots = async (requestId, hotel_id) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM parking_lots WHERE hotel_id = $1 ORDER BY id';
    const values = [hotel_id];
    const result = await pool.query(query, values);
    return result.rows;
};

const createParkingLot = async (requestId, { hotel_id, name, description }) => {
    const pool = getPool(requestId);
    const query = 'INSERT INTO parking_lots (hotel_id, name, description) VALUES ($1, $2, $3) RETURNING *';
    const values = [hotel_id, name, description];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const updateParkingLot = async (requestId, id, { name, description }) => {
    const pool = getPool(requestId);
    const query = 'UPDATE parking_lots SET name = $1, description = $2 WHERE id = $3 RETURNING *';
    const values = [name, description, id];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const deleteParkingLot = async (requestId, id) => {
    const pool = getPool(requestId);
    const query = 'DELETE FROM parking_lots WHERE id = $1';
    const values = [id];
    await pool.query(query, values);
};

module.exports = {
    getParkingLots,
    createParkingLot,
    updateParkingLot,
    deleteParkingLot,
};