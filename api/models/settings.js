const { getPool } = require('../config/database');
const pgFormat = require('pg-format');

const selectPaymentTypes = async (requestId) => {
  const pool = getPool(requestId);
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
const insertPaymentType = async (requestId, newData, userId) => {
  const pool = getPool(requestId);
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
};
const updatePaymentTypeVisibility = async (requestId, id, visible, userId) => {
  const pool = getPool(requestId);
  const query = `
      UPDATE payment_types SET 
        visible = $1
        ,updated_by = $2
      WHERE id = $3
      RETURNING *;
  `;
  const values = [visible, userId, id];

  try {
      const result = await pool.query(query, values);
      // console.log('updatePaymentTypeVisibility:', result.rows);
      return result.rows[0];
  } catch (err) {
      console.error('Error:', err);
      throw new Error('Database error');
  }
};
const updatePaymentTypeDescription = async (requestId, id, description, userId) => {
  const pool = getPool(requestId);
  const query = `
      UPDATE payment_types SET 
        description = $1
        ,updated_by = $2
      WHERE id = $3
      RETURNING *;
  `;
  const values = [description, userId, id];

  try {
      const result = await pool.query(query, values);
      return result.rows[0];
  } catch (err) {
      console.error('Error:', err);
      throw new Error('Database error');
  }
};

const selectTaxTypes = async (requestId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT * FROM tax_info
    ORDER BY percentage, name ASC
  `;

  try {
    const result = await pool.query(query);    
    return result.rows; // Return all
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};
const insertTaxType = async (requestId, newData, userId) => {
  const pool = getPool(requestId);  
  const query = `
      INSERT INTO tax_info (name, percentage, description, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
  `;
  const values = [newData.name, newData.percentage, newData.description, userId, userId];

  try {
      const result = await pool.query(query, values);
      return result.rows[0];
  } catch (err) {
      console.error('Error:', err);
      throw new Error('Database error');
  }
};
const updateTaxTypeVisibility = async (requestId, id, visible, userId) => {
  const pool = getPool(requestId);
  const query = `
      UPDATE tax_info SET 
        visible = $1
        ,updated_by = $2
      WHERE id = $3
      RETURNING *;
  `;
  const values = [visible, userId, id];

  try {
      const result = await pool.query(query, values);
      // console.log('updateTaxTypeVisibility:', result.rows);
      return result.rows[0];
  } catch (err) {
      console.error('Error:', err);
      throw new Error('Database error');
  }
};
const updateTaxTypeDescription = async (requestId, id, description, userId) => {
  const pool = getPool(requestId);
  const query = `
      UPDATE tax_info SET 
        description = $1
        ,updated_by = $2
      WHERE id = $3
      RETURNING *;
  `;
  const values = [description, userId, id];

  try {
      const result = await pool.query(query, values);
      return result.rows[0];
  } catch (err) {
      console.error('Error:', err);
      throw new Error('Database error');
  }
};

module.exports = {
  selectPaymentTypes,
  insertPaymentType,
  updatePaymentTypeVisibility,
  updatePaymentTypeDescription,
  selectTaxTypes,
  insertTaxType,
  updateTaxTypeVisibility,
  updateTaxTypeDescription,
  getLoyaltyTiers,
  upsertLoyaltyTier,
};

// Loyalty Tier functions moved before module.exports
const getLoyaltyTiers = async (requestId) => {
  const pool = getPool(requestId);
  const query = 'SELECT * FROM loyalty_tiers ORDER BY tier_name, hotel_id;';
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving loyalty tiers:', err);
    throw new Error('Database error while fetching loyalty tiers');
  }
};

const upsertLoyaltyTier = async (requestId, tierData, userId) => {
  const pool = getPool(requestId);
  const {
    tier_name,
    hotel_id, // Can be null
    min_bookings,
    min_spending,
    time_period_value,
    time_period_unit,
    logic_operator
  } = tierData;

  // Ensure hotel_id is null if not provided or for global tiers, otherwise use provided value
  const actualHotelId = (tier_name === 'REPEATER' || tier_name === 'BRAND_LOYAL') ? null : hotel_id;

  const query = pgFormat(`
    INSERT INTO loyalty_tiers (
        tier_name, hotel_id, min_bookings, min_spending,
        time_period_value, time_period_unit, logic_operator, created_by, updated_by, updated_at
    )
    VALUES (%L, %L, %L, %L, %L, %L, %L, %L, %L, CURRENT_TIMESTAMP)
    ON CONFLICT (tier_name, hotel_id) DO UPDATE SET
        min_bookings = EXCLUDED.min_bookings,
        min_spending = EXCLUDED.min_spending,
        time_period_value = EXCLUDED.time_period_value,
        time_period_unit = EXCLUDED.time_period_unit,
        logic_operator = EXCLUDED.logic_operator,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `, tier_name, actualHotelId, min_bookings, min_spending, time_period_value, time_period_unit, logic_operator, userId, userId);

  try {
    const result = await pool.query(query);
    return result.rows[0];
  } catch (err) {
    console.error('Error upserting loyalty tier:', err);
    throw new Error('Database error while upserting loyalty tier');
  }
};
// End of Loyalty Tier functions
