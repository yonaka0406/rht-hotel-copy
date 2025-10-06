const { getPool } = require('../../config/database');

const selectPaymentTypes = async (requestId, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = `
    SELECT * FROM payment_types
    ORDER BY transaction, id ASC
  `;

  try {
    const result = await client.query(query);    
    return result.rows; // Return all
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

const selectTaxTypes = async (requestId, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = `
    SELECT * FROM tax_info
    ORDER BY percentage, name ASC
  `;

  try {
    const result = await client.query(query);    
    return result.rows; // Return all
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

// Loyalty Tier functions
const getLoyaltyTiers = async (requestId, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = 'SELECT * FROM loyalty_tiers ORDER BY tier_name, hotel_id;';
  try {
    const result = await client.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving loyalty tiers:', err);
    throw new Error('Database error while fetching loyalty tiers');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

module.exports = {
  selectPaymentTypes,
  selectTaxTypes,
  getLoyaltyTiers,
};
