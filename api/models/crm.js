const { getPool } = require('../config/database');

const selectUserActions = async (requestId, id) => {
  const pool = getPool(requestId);
  const query = `
      SELECT 
        crm_actions.*
        ,COALESCE(clients.name_kanji, clients.name) as client_name
        ,users.name as assigned_to_name
      FROM 
        crm_actions  
            JOIN
        clients    
            ON clients.id = crm_actions.client_id
            JOIN
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
        ,COALESCE(clients.name_kanji, clients.name) as client_name
        ,users.name as assigned_to_name
      FROM 
        crm_actions  
            JOIN
        clients    
            ON clients.id = crm_actions.client_id
            JOIN
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
          ,COALESCE(clients.name_kanji, clients.name) as client_name
          ,users.name as assigned_to_name
      FROM 
        crm_actions
            JOIN
        clients    
            ON clients.id = crm_actions.client_id
            JOIN
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

const insertAction = async (requestId, actionFields, userId) => {
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
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Error inserting action:', error);
        throw error;
    }
};

const updateAction = async (requestId, actionId, actionFields, userId) => {
  const pool = getPool(requestId);

  // Dynamically build SET clause for flexibility, only updating fields that are actually provided
  // However, for this task, we'll assume relevant fields are passed and update them.
  // A more robust solution would check actionFields for each property.
  
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  // Helper to add to SET clause and values array
  const addUpdateField = (fieldName, value, isBoolean = false) => {
    // Check if the field is provided in actionFields or if it's a direct value like updated_by
    // For this task, we are less strict and assume if it's a calendar field, it might be explicitly set to null
    if (actionFields.hasOwnProperty(fieldName) || 
        ['google_calendar_event_id', 'google_calendar_html_link', 'synced_with_google_calendar'].includes(fieldName)) {
        
      setClauses.push(`${fieldName} = $${paramIndex++}`);
      if (isBoolean) {
        values.push(actionFields[fieldName] || false); // Default to false for booleans if undefined
      } else {
        values.push(actionFields[fieldName] || null); // Default to null for others if undefined
      }
    } else if (fieldName === 'updated_by') { // Special case for updated_by
        setClauses.push(`updated_by = $${paramIndex++}`);
        values.push(userId);
    }
    // Allow explicit nulling for optional fields like outcome, details, etc.
    else if (actionFields[fieldName] === null) {
        setClauses.push(`${fieldName} = $${paramIndex++}`);
        values.push(null);
    }
  };

  // Define fields that can be updated. Order matters for paramIndex if not building dynamically.
  // For simplicity as per task, we list them. A truly dynamic build is more complex.
  // Required fields for an action might be enforced at validation layer.
  if (actionFields.action_datetime !== undefined) {
    setClauses.push(`action_datetime = $${paramIndex++}`);
    values.push(actionFields.action_datetime || null);
  }
  if (actionFields.subject !== undefined) {
    setClauses.push(`subject = $${paramIndex++}`);
    values.push(actionFields.subject);
  }
   if (actionFields.details !== undefined) {
    setClauses.push(`details = $${paramIndex++}`);
    values.push(actionFields.details || null);
  }
  if (actionFields.outcome !== undefined) {
    setClauses.push(`outcome = $${paramIndex++}`);
    values.push(actionFields.outcome || null);
  }
  if (actionFields.assigned_to !== undefined) {
    setClauses.push(`assigned_to = $${paramIndex++}`);
    values.push(actionFields.assigned_to || null);
  }
  if (actionFields.due_date !== undefined) {
    setClauses.push(`due_date = $${paramIndex++}`);
    values.push(actionFields.due_date || null);
  }
  if (actionFields.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(actionFields.status || 'pending');
  }
  
  // Add Google Calendar fields
  // These can be explicitly set to null to clear them, or updated with new values.
  if (actionFields.hasOwnProperty('google_calendar_event_id')) {
    setClauses.push(`google_calendar_event_id = $${paramIndex++}`);
    values.push(actionFields.google_calendar_event_id || null);
  }
  if (actionFields.hasOwnProperty('google_calendar_html_link')) {
    setClauses.push(`google_calendar_html_link = $${paramIndex++}`);
    values.push(actionFields.google_calendar_html_link || null);
  }
  if (actionFields.hasOwnProperty('synced_with_google_calendar')) {
    setClauses.push(`synced_with_google_calendar = $${paramIndex++}`);
    values.push(actionFields.synced_with_google_calendar || false);
  }

  // Always update updated_by
  setClauses.push(`updated_by = $${paramIndex++}`);
  values.push(userId);

  if (setClauses.length === 0) {
    // Or fetch current and return that if no actual update is to be made.
    console.warn("No fields to update for actionId:", actionId);
    // For now, try to fetch and return the existing record.
    const currentActionQuery = 'SELECT * FROM crm_actions WHERE id = $1';
    const currentResult = await pool.query(currentActionQuery, [actionId]);
    return currentResult.rows[0];
  }
  
  values.push(actionId); // For WHERE id = $N

  const query = `
    UPDATE crm_actions SET
      ${setClauses.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *;
  `;
  
  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating action:', error);
    console.error('Query:', query);
    console.error('Values:', values);
    throw error;
  }
};

const deleteAction = async (requestId, actionId) => {
  const pool = getPool(requestId);

  const query = `
    DELETE FROM crm_actions
    WHERE id = $1
    RETURNING *;
  `;

  try {
    const result = await pool.query(query, [actionId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error deleting action:', error);
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
  getActionById, // Added getActionById
};
