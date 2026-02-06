const { getPool } = require('../../config/database');

// Return all users
const selectAllUsers = async (requestId, dbClient = null) => {
    const client = dbClient || getPool(requestId);
    // Explicitly select columns to avoid leaking sensitive data like password_hash or OAuth tokens
    const query = `
        SELECT
            users.id,
            users.email,
            users.name,
            users.status_id,
            users.role_id,
            users.auth_provider,
            users.created_at,
            user_roles.role_name,
            user_roles.permissions
        FROM
            users
        INNER JOIN
            user_roles ON users.role_id = user_roles.id
        ORDER BY
            status_id, role_id, email, id ASC`;

    try {
        const result = await client.query(query);
        return result.rows; // Return all
    } catch (err) {
        console.error('Error retrieving all users:', err);
        throw new Error('Database error');
    }
};

const selectUserByID = async (requestId, id, dbClient = null) => {
    const client = dbClient || getPool(requestId);
    try {
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

        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving user by id:', err);
        throw new Error('Database error');
    }
};

// Find a user by email
const selectUserByEmail = async (requestId, email, dbClient = null) => {
    const client = dbClient || getPool(requestId);
    const query = 'SELECT users.*, user_roles.role_name, user_roles.permissions FROM users, user_roles WHERE users.email = $1 AND users.role_id = user_roles.id ORDER BY status_id, role_id, email, id ASC';
    const values = [email];

    try {
        const result = await client.query(query, values);
        return result.rows[0]; // Return the first user found (or null if none)
    } catch (err) {
        console.error('Error finding user by email:', err);
        throw new Error('Database error');
    }
};

// Find a user by provider ID
async function selectUserByProviderId(requestId, provider, providerUserId, dbClient = null) {
    const client = dbClient || getPool(requestId);
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
    }
}

module.exports = {
    selectAllUsers,
    selectUserByID,
    selectUserByEmail,
    selectUserByProviderId,
};
