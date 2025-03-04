const pool = require('../config/database');

// Return all users
const selectPaymentTypes = async () => {
  const query = `
    SELECT * FROM payment_types
    ORDER BY transaction, id ASC
  `;

  try {
    const result = await pool.query(query);    
    return result.rows; // Return all
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};

const insertPaymentType = async (newData, userId) => {
  const query = `
      INSERT INTO payment_types (hotel_id, name, description, transaction, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
  `;
  const values = [newData.hotel_id, newData.name, newData.description, newData.transaction, userId, userId];

  try {
      const result = await pool.query(query, values);
      return result.rows[0];
  } catch (err) {
      console.error('Error:', err);
      throw new Error('Database error');
  }
}

module.exports = {
  selectPaymentTypes,
  insertPaymentType,  
};
