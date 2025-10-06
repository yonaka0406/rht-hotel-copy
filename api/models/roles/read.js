const { getPool } = require('../../config/database');

async function getAllRoles(requestId, dbClient = null) {
  const client = dbClient || await getPool(requestId).connect();
  try {
    const result = await client.query('SELECT * FROM user_roles ORDER BY id ASC');
    return result.rows;
  } finally {
    if (!dbClient) client.release();
  }
}

async function getRoleByName(requestId, role_name, dbClient = null) {
  const client = dbClient || await getPool(requestId).connect();
  try {
    const result = await client.query(
      "SELECT * FROM user_roles WHERE role_name = $1",
      [role_name]
    );
    return result.rows[0];
  } finally {
    if (!dbClient) client.release();
  }
}

module.exports = {
  getAllRoles,
  getRoleByName,
};