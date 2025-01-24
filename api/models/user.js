const pool = require('../config/database');
const bcrypt = require('bcrypt');

// Return all users
const getAllUsers = async () => {
  const query = 'SELECT users.*, user_roles.role_name, user_roles.permissions FROM users, user_roles WHERE users.role_id = user_roles.id ORDER BY status_id, role_id, email, id ASC';

  try {
    const result = await pool.query(query);    
    return result.rows; // Return all
  } catch (err) {
    console.error('Error retrieving all users:', err);
    throw new Error('Database error');
  }
};

// Find a user by email
const findUserByEmail = async (email) => {
  const query = 'SELECT users.*, user_roles.role_name, user_roles.permissions FROM users, user_roles WHERE users.email = $1 AND users.role_id = user_roles.id ORDER BY status_id, role_id, email, id ASC';
  const values = [email];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the first user found (or null if none)
  } catch (err) {
    console.error('Error finding user by email:', err);
    throw new Error('Database error');
  }
};

// Update a user's password hash
const updatePasswordHash = async (email, passwordHash, updated_by) => {
    const query = 'UPDATE users SET password_hash = $1, updated_by = $2 WHERE email = $3 RETURNING *';
    const values = [passwordHash, updated_by, email];
  
    try {
      const result = await pool.query(query, values);
      return result.rows[0]; // Return the updated user
    } catch (err) {
      console.error('Error updating password:', err);
      throw new Error('Database error');
    }
};

// Update a user's status or role
const updateStatusAndRole = async (user_id, status_id, role_id, updated_by) => {
  const query = 'UPDATE users SET status_id = $1, role_id = $2, updated_by = $3 WHERE id = $4 RETURNING *';
  const values = [status_id, role_id, updated_by, user_id];  

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the updated user
  } catch (err) {
    console.error('Error updating role and/or status:', err);
    throw new Error('Database error');
  }
};

// Create a user 
const createUser = async (email, password, role_id, created_by, updated_by) => {  
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = `
    INSERT INTO users (email, password_hash, role_id, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5) RETURNING *`;
  const values = [email, hashedPassword, role_id, created_by, updated_by];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the newly created user
  } catch (err) {
    console.error('Error creating user:', err);
    throw new Error('Database error');
  }
};

module.exports = {
  getAllUsers,
  findUserByEmail,
  updatePasswordHash,
  updateStatusAndRole,
  createUser,
};
