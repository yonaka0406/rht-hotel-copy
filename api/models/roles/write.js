const { getPool } = require('../../config/database');

async function createRole(requestId, role_name, permissions, description, dbClient = null) {
  const client = dbClient || await getPool(requestId).connect();
  try {
    const insertQuery = `
    INSERT INTO user_roles (role_name, permissions, description)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
    const result = await client.query(insertQuery, [
      role_name,
      JSON.stringify(permissions),
      description
    ]);
    return result.rows[0];
  } finally {
    if (!dbClient) client.release();
  }
}

async function updateRole(requestId, id, role_name, permissions, description, dbClient = null) {
  const client = dbClient || await getPool(requestId).connect();
  try {
    const updateQuery = `
    UPDATE user_roles 
    SET role_name = $1, permissions = $2, description = $3
    WHERE id = $4
    RETURNING *;
  `;
    const result = await client.query(updateQuery, [
      role_name, 
      JSON.stringify(permissions),
      description,
      id
    ]);
    return result.rows[0];
  } finally {
    if (!dbClient) client.release();
  }
}

async function deleteRole(requestId, id, dbClient = null) {
  const client = dbClient || await getPool(requestId).connect();
  try {
    const deleteQuery = `
    DELETE FROM user_roles 
    WHERE id = $1
    RETURNING *;
  `;
    const result = await client.query(deleteQuery, [id]);
    return result.rows[0];
  } finally {
    if (!dbClient) client.release();
  }
}

module.exports = {
  createRole,
  updateRole,
  deleteRole,
};