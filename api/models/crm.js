const { getPool } = require('../config/database');
const defaultLogger = require('../config/logger');

const selectUserActions = async (requestId, id) => {
  const pool = getPool(requestId);
  const query = `
      SELECT 
        crm_actions.*
        ,COALESCE(clients.name_kanji, clients.name_kana, clients.name) as client_name
        ,users.name as assigned_to_name
      FROM 
        crm_actions  
            JOIN
        clients    
            ON clients.id = crm_actions.client_id
            LEFT JOIN
        users
            on users.id = crm_actions.assigned_to
      WHERE crm_actions.assigned_to = $1
      ORDER BY 
          crm_actions.action_datetime DESC
  `;
  const values = [id];
  try {      
      const result = await pool.query(query, values);      
      return result.rows;
  } catch (err) {
      console.error('Error retrieving actions by user id:', err);
      throw new Error('Database error');
  }
};
const selectClientActions = async (requestId, id) => {
  const pool = getPool(requestId);
  const query = `
      SELECT 
        crm_actions.*
        ,COALESCE(clients.name_kanji, clients.name_kana, clients.name) as client_name
        ,users.name as assigned_to_name
      FROM 
        crm_actions  
            JOIN
        clients    
            ON clients.id = crm_actions.client_id
            LEFT JOIN
        users
            on users.id = crm_actions.assigned_to
      WHERE crm_actions.client_id = $1 AND crm_actions.action_datetime IS NOT NULL
      ORDER BY 
          crm_actions.action_datetime DESC
  `;
  const values = [id];
  try {      
      const result = await pool.query(query, values);      
      return result.rows;
  } catch (err) {
      console.error('Error retrieving actions by client id:', err);
      throw new Error('Database error');
  }
};
const selectAllActions = async (requestId) => {
  const pool = getPool(requestId);
  const query = `
      SELECT 
          crm_actions.*
          ,COALESCE(clients.name_kanji, clients.name_kana, clients.name) as client_name
          ,users.name as assigned_to_name
      FROM 
        crm_actions
            JOIN
        clients    
            ON clients.id = crm_actions.client_id
            LEFT JOIN
        users
            ON users.id = crm_actions.assigned_to
      ORDER BY 
          crm_actions.action_datetime DESC;
  `;  
  try {
      const result = await pool.query(query);
      return result.rows;
  } catch (err) {
      console.error('Error retrieving actions:', err);
      throw new Error('Database error');
  }
};

const getActionById = async (requestId, actionId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT crm_actions.*,
           COALESCE(clients.name_kanji, clients.name_kana, clients.name) as client_name,
           users.name as assigned_to_name
    FROM crm_actions
    LEFT JOIN clients ON clients.id = crm_actions.client_id
    LEFT JOIN users ON users.id = crm_actions.assigned_to
    WHERE crm_actions.id = $1;
  `;
  try {
    const result = await pool.query(query, [actionId]);
    if (result.rows.length === 0) {
       console.warn(`[getActionById] Action not found for ID: ${actionId}, Request ID: ${requestId}`);
       return null; // Explicitly return null if not found
    }
    return result.rows[0];
  } catch (err) {
    console.error(`Error retrieving action by ID (${actionId}), Request ID (${requestId}):`, err);
    throw new Error('Database error when retrieving action by ID.');
  }
};
const insertAction = async (requestId, actionFields, userId) => {
    // Assume defaultLogger is accessible here, e.g., via module scope or passed in.
    // If not, you'd need to adjust how 'logger' is obtained.
    const logger = defaultLogger.child({ requestId, userId, function: 'insertAction' });
    logger.info('Attempting to insert new crm_action.');

    const pool = getPool(requestId);

    const query = `
        INSERT INTO crm_actions (
            client_id, action_type, action_datetime, subject, details, outcome, assigned_to, due_date, status,
            created_by, google_calendar_event_id, google_calendar_html_link, synced_with_google_calendar
        ) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13 )
        RETURNING *;
    `;

    const values = [
        actionFields.client_id,
        actionFields.action_type,
        actionFields.action_datetime || null,
        actionFields.subject,
        actionFields.details || null,
        actionFields.outcome || null,
        actionFields.assigned_to || null,
        actionFields.due_date || null,
        actionFields.status || 'pending',
        userId, // created_by
        actionFields.google_calendar_event_id || null,
        actionFields.google_calendar_html_link || null,
        actionFields.synced_with_google_calendar || false
    ];

    try {
        logger.debug('Executing insert crm_action query.', { query, values: anondbValues(values, [3,4,5]) }); // Anonymize sensitive values if needed
        const result = await pool.query(query, values);
        if (result.rows && result.rows.length > 0) {
            logger.info(`Successfully inserted crm_action with ID: ${result.rows[0].id}.`);
            return result.rows[0];
        } else {
            logger.warn('Insert crm_action query executed but no rows returned.');
            return null; // Or throw an error depending on expected behavior
        }
    } catch (error) {
        logger.error(`Error inserting crm_action: ${error.message}`, { 
            stack: error.stack, 
            query, 
            values: anondbValues(values, [3,4,5]) // Anonymize sensitive values
        });
        throw error;
    }
};
const updateAction = async (requestId, actionId, actionFields, userId) => {
    const logger = defaultLogger.child({ requestId, userId, actionId, function: 'updateAction' });
    logger.info('Attempting to update crm_action.');

    const pool = getPool(requestId);

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    // Helper to add to SET clause and values array (original helper was not fully used, adapting to current structure)
    const addFieldToUpdate = (dbFieldName, value) => {
        setClauses.push(`${dbFieldName} = $${paramIndex++}`);
        values.push(value);
    };
    
    // Fields from actionFields
    if (actionFields.hasOwnProperty('action_type')) addFieldToUpdate('action_type', actionFields.action_type);
    if (actionFields.hasOwnProperty('action_datetime')) addFieldToUpdate('action_datetime', actionFields.action_datetime || null);
    if (actionFields.hasOwnProperty('subject')) addFieldToUpdate('subject', actionFields.subject); // Assuming subject is required if passed
    if (actionFields.hasOwnProperty('details')) addFieldToUpdate('details', actionFields.details || null);
    if (actionFields.hasOwnProperty('outcome')) addFieldToUpdate('outcome', actionFields.outcome || null);
    if (actionFields.hasOwnProperty('assigned_to')) addFieldToUpdate('assigned_to', actionFields.assigned_to || null);
    if (actionFields.hasOwnProperty('due_date')) addFieldToUpdate('due_date', actionFields.due_date || null);
    if (actionFields.hasOwnProperty('status')) addFieldToUpdate('status', actionFields.status || 'pending');
    
    // Google Calendar specific fields
    if (actionFields.hasOwnProperty('google_calendar_event_id')) addFieldToUpdate('google_calendar_event_id', actionFields.google_calendar_event_id || null);
    if (actionFields.hasOwnProperty('google_calendar_html_link')) addFieldToUpdate('google_calendar_html_link', actionFields.google_calendar_html_link || null);
    if (actionFields.hasOwnProperty('synced_with_google_calendar')) addFieldToUpdate('synced_with_google_calendar', actionFields.synced_with_google_calendar || false);

    // Always update updated_by and updated_at
    if (setClauses.length > 0) { // Only add updated_by if other fields are being updated
        addFieldToUpdate('updated_by', userId);        
    }

    if (setClauses.length === 0) {
        logger.warn("No fields were provided to update crm_action. No update performed.");
        // Optionally, fetch and return the current record if that's the desired behavior
        // For now, returning null or indicating no update occurred.
        // const currentActionQuery = 'SELECT * FROM crm_actions WHERE id = $1';
        // const currentResult = await pool.query(currentActionQuery, [actionId]);
        // return currentResult.rows[0];
        return null; // Or an object indicating no update { updated: false, data: null }
    }
    
    values.push(actionId); // For WHERE id = $N

    const query = `
        UPDATE crm_actions SET
          ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *;
    `;
    
    try {
        logger.debug('Executing update crm_action query.', { query, values: anondbValues(values, [/* indices of sensitive values */]) });
        const result = await pool.query(query, values);
        if (result.rows && result.rows.length > 0) {
            logger.info(`Successfully updated crm_action with ID: ${result.rows[0].id}.`);
            return result.rows[0];
        } else {
            // This case might indicate the actionId did not exist
            logger.warn(`Update crm_action query executed for ID ${actionId}, but no rows returned (action might not exist or no change made if DB optimizes).`);
            return null; 
        }
    } catch (error) {
        logger.error(`Error updating crm_action ID ${actionId}: ${error.message}`, {
            stack: error.stack,
            query,
            values: anondbValues(values, [/* indices */])
        });
        throw error;
    }
};
const deleteAction = async (requestId, actionId) => {
    const logger = defaultLogger.child({ requestId, actionId, function: 'deleteAction' });
    logger.info('Attempting to delete crm_action.');

    const pool = getPool(requestId);

    const query = `
        DELETE FROM crm_actions
        WHERE id = $1
        RETURNING *; 
    `; // RETURNING * is useful to confirm what was deleted

    const values = [actionId];

    try {
        logger.debug('Executing delete crm_action query.', { query, values });
        const result = await pool.query(query, values);
        if (result.rows && result.rows.length > 0) {
            logger.info(`Successfully deleted crm_action with ID: ${result.rows[0].id}.`);
            return result.rows[0]; // Contains the deleted row
        } else {
            logger.warn(`Delete crm_action query executed for ID ${actionId}, but no rows returned (action might not have existed).`);
            return null; // Indicates action was not found or already deleted
        }
    } catch (error) {
        logger.error(`Error deleting crm_action ID ${actionId}: ${error.message}`, {
            stack: error.stack,
            query,
            values
        });
        throw error;
    }
};

module.exports = {
  selectUserActions,
  selectClientActions,
  selectAllActions,  
  insertAction,
  updateAction,
  deleteAction,
  getActionById,
};

/**
 * Helper function to anonymize sensitive data in log values.
 * Replace values at specified indices with a placeholder.
 * This is a basic example; you might want a more sophisticated approach.
 * @param {Array} originalValues - The array of values.
 * @param {Array<number>} sensitiveIndices - Array of 0-based indices to anonymize.
 * @returns {Array} - A new array with anonymized values.
 */
function anondbValues(originalValues, sensitiveIndices = []) {
    // return originalValues; // Uncomment this line if you don't want anonymization for now
    return originalValues.map((value, index) => {
        // Check if current index (1-based for SQL params, so index+1) is in sensitiveIndices.
        // Or if 0-based indices are passed for the array:
        if (sensitiveIndices.includes(index)) {
            return '[SENSITIVE_DATA]';
        }
        return value;
    });
}
