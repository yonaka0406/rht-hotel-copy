const { getPool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const TABLE = 'user_saved_search';

async function getAllByUser(requestId, userId) {
  const pool = getPool(requestId);
  const result = await pool.query(
    `SELECT * FROM ${TABLE} WHERE user_id = $1 ORDER BY favorite DESC, name ASC`,
    [userId]
  );
  return result.rows;
}

async function getById(requestId, id, userId) {
  const pool = getPool(requestId);
  const result = await pool.query(
    `SELECT * FROM ${TABLE} WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0];
}

async function create(requestId, userId, { name, category, filters, favorite }) {
  const pool = getPool(requestId);
  const id = uuidv4();
  const result = await pool.query(
    `INSERT INTO ${TABLE} (id, user_id, name, category, filters, favorite) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [id, userId, name, category, JSON.stringify(filters), !!favorite]
  );
  return result.rows[0];
}

async function update(requestId, id, userId, { name, category, filters, favorite }) {
  const pool = getPool(requestId);
  const result = await pool.query(
    `UPDATE ${TABLE} SET name = $1, category = $2, filters = $3, favorite = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND user_id = $6 RETURNING *`,
    [name, category, JSON.stringify(filters), !!favorite, id, userId]
  );
  return result.rows[0];
}

async function remove(requestId, id, userId) {
  const pool = getPool(requestId);
  await pool.query(
    `DELETE FROM ${TABLE} WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return true;
}

module.exports = {
  getAllByUser,
  getById,
  create,
  update,
  remove
}; 