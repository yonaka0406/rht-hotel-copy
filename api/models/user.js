const { getPool } = require('../config/database');
//const bcrypt = require('bcrypt');
const bcrypt = require('bcryptjs');

// Return all users
const getAllUsers = async (requestId) => {
  const pool = getPool(requestId);
  const query = 'SELECT users.*, user_roles.role_name, user_roles.permissions FROM users, user_roles WHERE users.role_id = user_roles.id ORDER BY status_id, role_id, email, id ASC';

  try {
    const result = await pool.query(query);    
    return result.rows; // Return all
  } catch (err) {
    console.error('Error retrieving all users:', err);
    throw new Error('Database error');
  }
};

const getUsersByID = async (requestId, id) => {
  const pool = getPool(requestId);
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
const findUserByEmail = async (requestId, email) => {
  const pool = getPool(requestId);
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
const updatePasswordHash = async (requestId, email, passwordHash, updated_by) => {
  const pool = getPool(requestId);
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
const updateUserInfo = async (requestId, user_id, name, status_id, role_id, updated_by) => {
  const pool = getPool(requestId);
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
const createUser = async (requestId, email, name, password, role_id, created_by, updated_by) => {  
  const pool = getPool(requestId);
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

// Find a user by provider ID
async function findUserByProviderId(requestId, provider, providerUserId) {
  const pool = getPool(requestId);
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
    const result = await pool.query(query, values);
    return result.rows[0] || null; // Return the user row or null
  } catch (err) {
    console.error('Error finding user by provider ID:', err);
    throw new Error('Database error');
  }
}

// Update user's Google OAuth tokens
async function updateUserGoogleTokens(requestId, userId, accessToken, refreshToken, expiryDateTimestampMs) {
  const pool = getPool(requestId);
  
  let expiryDate;
  if (expiryDateTimestampMs) {
    expiryDate = new Date(expiryDateTimestampMs);
  } else {
    // Default to null if not provided, or could set a default like 1 hour from now
    // For now, strictly using the provided value or null.
    expiryDate = null; 
  }

  const query = `
    UPDATE users 
    SET 
      google_access_token = $1,
      google_refresh_token = $2,
      google_token_expiry_date = $3,
      updated_by = $4, 
      auth_provider = 'google' -- Ensure auth_provider is set to google
    WHERE id = $5 
    RETURNING *;
  `;
  // Using userId also for updated_by, assuming the user is performing this action for themselves
  const values = [accessToken, refreshToken, expiryDate, userId, userId];

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('User not found or token update failed.');
    }
    return result.rows[0]; // Return the updated user row
  } catch (err) {
    console.error(`Error updating Google tokens for user ${userId}:`, err);
    // Consider logging requestId as well if available in this scope directly
    // For now, just logging the error and userId.
    throw new Error('Database error during token update');
  }
}

// Link a Google account to an existing user
async function linkGoogleAccount(requestId, userId, googleUserId) {
  const pool = getPool(requestId);
  // Assuming updated_at is handled by a database trigger or default value
  const query = 'UPDATE users SET auth_provider = \'google\', provider_user_id = $1, password_hash = NULL WHERE id = $2 RETURNING *';
  const values = [googleUserId, userId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the updated user row
  } catch (err) {
    console.error('Error linking Google account:', err);
    throw new Error('Database error');
  }
}

// Create a new user with Google authentication
async function createUserWithGoogle(requestId, googleUserId, email, name, roleId = 5, statusId = 1) {
  const pool = getPool(requestId);
  const query = 'INSERT INTO users (email, name, auth_provider, provider_user_id, status_id, role_id, password_hash) VALUES ($1, $2, \'google\', $3, $4, $5, NULL) RETURNING *';
  const values = [email, name, googleUserId, statusId, roleId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the newly created user row
  } catch (err) {
    console.error('Error creating user with Google:', err);
    throw new Error('Database error');
  }
}

module.exports = {
  getAllUsers,
  getUsersByID,
  findUserByEmail,
  updatePasswordHash,
  updateUserInfo,
  createUser,
  findUserByProviderId,
  linkGoogleAccount,
  createUserWithGoogle,
  updateUserGoogleTokens,
  updateUserCalendarSettings,
};

// Update user's calendar specific settings
async function updateUserCalendarSettings(requestId, userId, settings) {
  const pool = getPool(requestId);
  
  // Fields that can be updated by this function
  const updatableFields = ['sync_google_calendar', 'google_calendar_id', 'last_successful_google_sync'];
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const field of updatableFields) {
    if (settings.hasOwnProperty(field)) {
      setClauses.push(`${field} = $${paramIndex++}`);
      // For 'last_successful_google_sync', ensure it's a valid timestamp or null
      if (field === 'last_successful_google_sync' && settings[field] !== null) {
        values.push(new Date(settings[field]));
      } else {
        values.push(settings[field]);
      }
    }
  }

  // If no specific settings fields are being updated, at least update 'updated_by' and 'updated_at'
  // However, the primary purpose of this function is settings, so ensure at least one setting is changing.
  if (setClauses.length === 0) {
    // Optionally, if you want to prevent calls that don't change any of the specified settings:
    // console.warn(`[UserStore][updateUserCalendarSettings] No valid settings provided for user ${userId}.`);
    // return findUserById or throw error. For now, let it proceed if other logic relies on it touching updated_by.
    // To be more strict and ensure it only runs for its designated fields:
    // throw new Error("No valid calendar settings provided for update.");
    // For now, we'll let it pass to only update updated_by if nothing else matches.
  }

  // Always update the 'updated_by' field.
  // Assuming an 'updated_at' field that automatically updates on row change via a DB trigger is preferred.
  // If not, 'updated_at = CURRENT_TIMESTAMP' should be added here.
  setClauses.push(`updated_by = $${paramIndex++}`);
  values.push(userId); 

  if (setClauses.length === 1 && setClauses[0].startsWith('updated_by')) {
      // This means no actual calendar settings were in the 'settings' object.
      // Depending on desired behavior, one might return early or proceed to only update 'updated_by'.
      // For this function, it's better to require at least one actual setting.
      // However, the dynamic nature means if only 'updated_by' is set, the query is still valid.
      // Let's refine: if ONLY updated_by is set because no other settings were provided, it's not an "error" but maybe not the intended use.
      // The check "if (setClauses.length === 0)" before adding updated_by would be more strict.
      // The current structure will always include updated_by.
  }


  values.push(userId); // For WHERE id = $N (this N should be paramIndex after all SET clauses)

  const query = `
    UPDATE users 
    SET ${setClauses.join(', ')}
    WHERE id = $${paramIndex} 
    RETURNING *; 
  `;
  // Note: The RETURNING * clause will include all user fields, including potentially sensitive ones.
  // It's often better to return specific, non-sensitive fields or just a success status.
  // For consistency with other update functions in this model, RETURNING * is kept.

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      // This case should ideally not be hit if userId is coming from req.user.id (authenticated user)
      // but good to have as a safeguard.
      console.error(`[UserStore][updateUserCalendarSettings] User not found for ID: ${userId} during update.`);
      throw new Error('User not found or calendar settings update failed.');
    }
    return result.rows[0]; // Return the updated user row
  } catch (err) {
    console.error(`[UserStore][updateUserCalendarSettings] Error updating calendar settings for user ${userId}:`, err.message, { stack: err.stack, query, values });
    throw new Error('Database error during calendar settings update.');
  }
}
