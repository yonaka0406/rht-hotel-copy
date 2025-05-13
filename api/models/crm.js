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
            created_by
        ) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9, $10 )
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
        userId
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

  const query = `
    UPDATE crm_actions SET
      action_datetime = $1,
      subject = $2,
      details = $3,
      outcome = $4,
      assigned_to = $5,
      due_date = $6,
      status = $7,
      updated_by = $8
    WHERE id = $9
    RETURNING *;
  `;

  const values = [    
    actionFields.action_datetime || null,
    actionFields.subject,
    actionFields.details || null,
    actionFields.outcome || null,
    actionFields.assigned_to || null,
    actionFields.due_date || null,
    actionFields.status || 'pending',
    userId,
    actionId
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating action:', error);
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
  selectAllActions,  
  insertAction,
  updateAction,
  deleteAction,
};
