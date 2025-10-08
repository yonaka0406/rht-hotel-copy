const { getPool } = require('../../config/database');

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
        ,COALESCE(clients.name_kanji, clients.name_kana, clients.name) as client_name
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
          ,COALESCE(clients.name_kanji, clients.name_kana, clients.name) as client_name
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

module.exports = {
  selectUserActions,
  selectClientActions,
  selectAllActions,
  getActionById,
};