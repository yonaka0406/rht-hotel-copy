const { getPool } = require('../../config/database');
const bcrypt = require('bcryptjs');

// Update a user's password hash
const updatePasswordHash = async (requestId, email, passwordHash, updated_by, dbClient = null) => {
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();
  
  try {
    if (isTransactionOwner) {
      await client.query('BEGIN');
    }

    const query = 'UPDATE users SET password_hash = $1, updated_by = $2 WHERE email = $3 RETURNING *';
    const values = [passwordHash, updated_by, email];
    
    const result = await client.query(query, values);

    if (isTransactionOwner) {
      await client.query('COMMIT');
    }
    return result.rows[0]; // Return the updated user
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK');
    }
    console.error('Error updating password:', err);
    throw new Error('Database error');
  } finally {
    if (isTransactionOwner) {
      client.release();
    }
  }
};

// Update a user's status or role
const updateUserInfo = async (requestId, user_id, name, status_id, role_id, updated_by, dbClient = null) => {
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();

  try {
    if (isTransactionOwner) {
      await client.query('BEGIN');
    }

    const query = 'UPDATE users SET name = $1, status_id = $2, role_id = $3, updated_by = $4 WHERE id = $5 RETURNING *';
    const values = [name, status_id, role_id, updated_by, user_id];  

    const result = await client.query(query, values);

    if (isTransactionOwner) {
      await client.query('COMMIT');
    }
    return result.rows[0]; // Return the updated user
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK');
    }
    console.error('Error updating user info:', err);
    throw new Error('Database error');
  } finally {
    if (isTransactionOwner) {
      client.release();
    }
  }
};

// Create a user 
const createUser = async (requestId, email, name, password, role_id, created_by, updated_by, dbClient = null) => {  
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();

  try {
    if (isTransactionOwner) {
      await client.query('BEGIN');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (email, name, password_hash, role_id, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `;
    const values = [email, name, hashedPassword, role_id, created_by, updated_by];

    const result = await client.query(query, values);

    if (isTransactionOwner) {
      await client.query('COMMIT');
    }
    return result.rows[0]; // Return the newly created user
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK');
    }
    console.error('Error creating user:', err);
    throw new Error('Database error');
  } finally {
    if (isTransactionOwner) {
      client.release();
    }
  }
};

// Update user's Google OAuth tokens
const updateUserGoogleTokens = async (requestId, userId, accessToken, refreshToken, expiryDateTimestampMs, dbClient = null) => {
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();

  try {
    if (isTransactionOwner) {
      await client.query('BEGIN');
    }

    let expiryDate;
    if (expiryDateTimestampMs) {
      expiryDate = new Date(expiryDateTimestampMs);
    } else {
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
    const values = [accessToken, refreshToken, expiryDate, userId, userId];

    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('User not found or token update failed.');
    }

    if (isTransactionOwner) {
      await client.query('COMMIT');
    }
    return result.rows[0]; // Return the updated user row
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK');
    }
    console.error(`Error updating Google tokens for user ${userId}:`, err);
    throw new Error('Database error during token update');
  } finally {
    if (isTransactionOwner) {
      client.release();
    }
  }
};

// Link a Google account to an existing user
const linkGoogleAccount = async (requestId, userId, googleUserId, dbClient = null) => {
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();

  try {
    if (isTransactionOwner) {
      await client.query('BEGIN');
    }

    const query = 'UPDATE users SET auth_provider = \'google\', provider_user_id = $1, password_hash = NULL WHERE id = $2 RETURNING *';
    const values = [googleUserId, userId];

    const result = await client.query(query, values);

    if (isTransactionOwner) {
      await client.query('COMMIT');
    }
    return result.rows[0]; // Return the updated user row
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK');
    }
    console.error('Error linking Google account:', err);
    throw new Error('Database error');
  } finally {
    if (isTransactionOwner) {
      client.release();
    }
  }
};

// Create a new user with Google authentication
const createUserWithGoogle = async (requestId, googleUserId, email, name, roleId = 5, statusId = 1, dbClient = null) => {
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();

  try {
    if (isTransactionOwner) {
      await client.query('BEGIN');
    }

    const query = 'INSERT INTO users (email, name, auth_provider, provider_user_id, status_id, role_id, password_hash) VALUES ($1, $2, \'google\', $3, $4, $5, NULL) RETURNING *';
    const values = [email, name, googleUserId, statusId, roleId];

    const result = await client.query(query, values);

    if (isTransactionOwner) {
      await client.query('COMMIT');
    }
    return result.rows[0]; // Return the newly created user row
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK');
    }
    console.error('Error creating user with Google:', err);
    throw new Error('Database error');
  } finally {
    if (isTransactionOwner) {
      client.release();
    }
  }
};

// Update user's calendar specific settings
const updateUserCalendarSettings = async (requestId, userId, settings, dbClient = null) => {
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();

  try {
    if (isTransactionOwner) {
      await client.query('BEGIN');
    }

    // Fields that can be updated by this function
    const updatableFields = ['google_calendar_id', 'last_successful_google_sync'];
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

    if (setClauses.length === 0) {
        // If no specific settings fields are being updated, just return early or handle as needed.
        // For now, we'll throw an error if no valid settings are provided for update.
        throw new Error("No valid calendar settings provided for update.");
    }

    // Always update the 'updated_by' field.
    setClauses.push(`updated_by = $${paramIndex++}`);
    values.push(userId); 

    values.push(userId); // For WHERE id = $N (this N should be paramIndex after all SET clauses)

    const query = `
      UPDATE users 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex} 
      RETURNING *; 
    `;

    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('User not found or calendar settings update failed.');
    }

    if (isTransactionOwner) {
      await client.query('COMMIT');
    }
    return result.rows[0]; // Return the updated user row
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK');
    }
    console.error(`[UserStore][updateUserCalendarSettings] Error updating calendar settings for user ${userId}:`, err.message, { stack: err.stack, query, values });
    throw new Error('Database error during calendar settings update.');
  } finally {
    if (isTransactionOwner) {
      client.release();
    }
  }
};

module.exports = {
  updatePasswordHash,
  updateUserInfo,
  createUser,
  linkGoogleAccount,
  createUserWithGoogle,
  updateUserGoogleTokens,
  updateUserCalendarSettings,
};
