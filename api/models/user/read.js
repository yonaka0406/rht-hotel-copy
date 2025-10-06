const { getPool } = require('../../config/database');

// Return all users
const getAllUsers = async (requestId, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = 'SELECT users.*, user_roles.role_name, user_roles.permissions FROM users, user_roles WHERE users.role_id = user_roles.id ORDER BY status_id, role_id, email, id ASC';

  try {
    const result = await client.query(query);    
    return result.rows; // Return all
  } catch (err) {
    console.error('Error retrieving all users:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

const getUsersByID = async (requestId, id, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = `
      SELECT 
          users.id, 
          users.email, 
          users.name,
          users.status_id, 
          users.role_id, 
          users.auth_provider,
          users.provider_user_id,
          users.google_calendar_id,
          users.google_access_token,
          users.google_refresh_token,
          users.google_token_expiry_date,
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
      const result = await client.query(query, values);
      return result.rows;
  } catch (err) {
      console.error('Error retrieving user by id:', err);
      throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

// Find a user by email
const findUserByEmail = async (requestId, email, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = 'SELECT users.*, user_roles.role_name, user_roles.permissions FROM users, user_roles WHERE users.email = $1 AND users.role_id = user_roles.id ORDER BY status_id, role_id, email, id ASC';
  const values = [email];

  try {
    const result = await client.query(query, values);
    return result.rows[0]; // Return the first user found (or null if none)
  } catch (err) {
    console.error('Error finding user by email:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

// Find a user by provider ID
const findUserByProviderId = async (requestId, provider, providerUserId, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = `
    SELECT users.*, user_roles.role_name, user_roles.permissions 
    FROM 
      users 
        INNER JOIN 
      user_roles ON users.role_id = user_roles.id
    WHERE auth_provider = $1 AND provider_user_id = $2
  `;
  const values = [provider, providerUserId];

  try {
    const result = await client.query(query, values);
    return result.rows[0] || null; // Return the user row or null
  } catch (err) {
    console.error('Error finding user by provider ID:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

module.exports = {
  getAllUsers,
  getUsersByID,
  findUserByEmail,
  findUserByProviderId,
};
