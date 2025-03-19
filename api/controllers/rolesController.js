const { getPool } = require('../config/database');
const pool = getPool();

const roles = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_roles ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createRole = async (req, res) => {
  const { role_name, permissions, description } = req.body;

  if (!role_name || !permissions) {
    return res.status(400).json({ error: "Role name and permissions are required" });
  }

  try {
    // Check if the role already exists
    const existingRole = await pool.query(
      "SELECT * FROM user_roles WHERE role_name = $1",
      [role_name]
    );
    if (existingRole.rowCount > 0) {
      return res.status(409).json({ error: "Role with this name already exists" });
    }

    const insertQuery = `
      INSERT INTO user_roles (role_name, permissions, description)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [
      role_name,
      JSON.stringify(permissions),
      description
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateRole = async (req, res) => {
  const { id, role_name, permissions, description } = req.body;
  
  try {
    const updateQuery = `
      UPDATE user_roles 
      SET role_name = $1, permissions = $2, description = $3
      WHERE id = $4
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, [
      role_name, 
      JSON.stringify(permissions),
      description,
      id
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const deleteRole = async (req, res) => {
  const { id } = req.params;

  // Prevent deletion of roles with ID 1 and 5
  if (id === '1' || id === '5') {
    return res.status(403).json({ error: 'This role cannot be deleted.' });
  }

  try {
    const deleteQuery = `
      DELETE FROM user_roles 
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(deleteQuery, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({ message: 'Role deleted successfully', role: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { roles, createRole, updateRole, deleteRole };