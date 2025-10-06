const rolesModels = require('../../models/roles'); // Correct path from api/controllers/roles/main.js to api/models/roles/index.js

const roles = async (req, res) => {
  try {
    const result = await rolesModels.getAllRoles(req.requestId);
    res.json(result);
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
    const existingRole = await rolesModels.getRoleByName(req.requestId, role_name);
    if (existingRole) {
      return res.status(409).json({ error: "Role with this name already exists" });
    }

    const newRole = await rolesModels.createRole(req.requestId, role_name, permissions, description);
    res.status(201).json(newRole);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateRole = async (req, res) => {
  const { id, role_name, permissions, description } = req.body;
  
  try {
    const updatedRole = await rolesModels.updateRole(req.requestId, id, role_name, permissions, description);
    if (!updatedRole) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json(updatedRole);
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
    const deletedRole = await rolesModels.deleteRole(req.requestId, id);
    if (!deletedRole) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json({ message: 'Role deleted successfully', role: deletedRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { roles, createRole, updateRole, deleteRole };