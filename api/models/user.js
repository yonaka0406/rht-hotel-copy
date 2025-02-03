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

const getUsersByID = async (id) => {
  const query = `
      SELECT 
          users.id, 
          users.email, 
          users.name,
          users.status_id, 
          users.role_id, 
          user_roles.role_name,
          user_roles.permissions,
          user_status.status_name      
      FROM 
          users
      INNER JOIN 
          user_roles ON users.role_id = user_roles.id
      INNER JOIN 
          user_status ON users.status_id = user_status.id
      WHERE users.id = $1
      ORDER BY 
          users.id ASC
  `;
  const values = [id];
  try {      
      const result = await pool.query(query, values);
      return result.rows;
  } catch (err) {
      console.error('Error retrieving user by id:', err);
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
const updateUserInfo = async (user_id, name, status_id, role_id, updated_by) => {
  const query = 'UPDATE users SET name = $1, status_id = $2, role_id = $3, updated_by = $4 WHERE id = $5 RETURNING *';
  const values = [name, status_id, role_id, updated_by, user_id];  

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the updated user
  } catch (err) {
    console.error('Error updating user info:', err);
    throw new Error('Database error');
  }
};

// Create a user 
const createUser = async (email, name, password, role_id, created_by, updated_by) => {  
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = `
    INSERT INTO users (email, name, password_hash, role_id, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
  const values = [email, name, hashedPassword, role_id, created_by, updated_by];

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
  getUsersByID,
  findUserByEmail,
  updatePasswordHash,
  updateUserInfo,
  createUser,
};
