const { getPool } = require('../../config/database');
const pgFormat = require('pg-format');

const insertPaymentType = async (requestId, newData, userId, dbClient = null) => {
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();

  try {
    if (isTransactionOwner) {
      await client.query('BEGIN');
    }

    const query = `
      INSERT INTO payment_types (hotel_id, name, description, transaction, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [newData.hotel_id, newData.name, newData.description, newData.transaction, userId, userId];

    const result = await client.query(query, values);

    if (isTransactionOwner) {
      await client.query('COMMIT');
    }
    return result.rows[0];
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK');
    }
    console.error('Error:', err);
    throw new Error('Database error');
  } finally {
    if (isTransactionOwner) {
      client.release();
    }
  }
};
const updatePaymentTypeVisibility = async (requestId, id, visible, userId, dbClient = null) => {
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();

  try {
    if (isTransactionOwner) {
      await client.query('BEGIN');
    }

    const query = `
      UPDATE payment_types SET 
        visible = $1
        ,updated_by = $2
      WHERE id = $3
      RETURNING *;
    `;
    const values = [visible, userId, id];

    const result = await client.query(query, values);

    if (isTransactionOwner) {
      await client.query('COMMIT');
    }
    return result.rows[0];
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK');
    }
    console.error('Error:', err);
    throw new Error('Database error');
  } finally {
    if (isTransactionOwner) {
      client.release();
    }
  }
};
const updatePaymentTypeDescription = async (requestId, id, description, userId, dbClient = null) => {
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();

  try {
    if (isTransactionOwner) {
      await client.query('BEGIN');
    }

    const query = `
      UPDATE payment_types SET 
        description = $1
        ,updated_by = $2
      WHERE id = $3
      RETURNING *;
    `;
    const values = [description, userId, id];

    const result = await client.query(query, values);

    if (isTransactionOwner) {
      await client.query('COMMIT');
    }
    return result.rows[0];
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK');
    }
    console.error('Error:', err);
    throw new Error('Database error');
  } finally {
    if (isTransactionOwner) {
      client.release();
    }
  }
};

const insertTaxType = async (requestId, newData, userId, dbClient = null) => {
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();

  try {
    if (isTransactionOwner) {
      await client.query('BEGIN');
    }

    const query = `
      INSERT INTO tax_info (name, percentage, description, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [newData.name, newData.percentage, newData.description, userId, userId];

    const result = await client.query(query, values);

    if (isTransactionOwner) {
      await client.query('COMMIT');
    }
    return result.rows[0];
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK');
    }
    console.error('Error:', err);
    throw new Error('Database error');
  } finally {
    if (isTransactionOwner) {
      client.release();
    }
  }
};
const updateTaxTypeVisibility = async (requestId, id, visible, userId, dbClient = null) => {
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();

  try {
    if (isTransactionOwner) {
      await client.query('BEGIN');
    }

    const query = `
      UPDATE tax_info SET 
        visible = $1
        ,updated_by = $2
      WHERE id = $3
      RETURNING *;
    `;
    const values = [visible, userId, id];

    const result = await client.query(query, values);

    if (isTransactionOwner) {
      await client.query('COMMIT');
    }
    return result.rows[0];
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK');
    }
    console.error('Error:', err);
    throw new Error('Database error');
  } finally {
    if (isTransactionOwner) {
      client.release();
    }
  }
};
const updateTaxTypeDescription = async (requestId, id, description, userId, dbClient = null) => {
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();

  try {
    if (isTransactionOwner) {
      await client.query('BEGIN');
    }

    const query = `
      UPDATE tax_info SET 
        description = $1
        ,updated_by = $2
      WHERE id = $3
      RETURNING *;
    `;
    const values = [description, userId, id];

    const result = await client.query(query, values);

    if (isTransactionOwner) {
      await client.query('COMMIT');
    }
    return result.rows[0];
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK');
    }
    console.error('Error:', err);
    throw new Error('Database error');
  } finally {
    if (isTransactionOwner) {
      client.release();
    }
  }
};

const upsertLoyaltyTier = async (requestId, tierData, userId, dbClient = null) => {
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();

  try {
    if (isTransactionOwner) {
      await client.query('BEGIN');
    }

    const {
      tier_name,
      hotel_id,
      min_bookings,
      min_spending,
      time_period_months,
      logic_operator
    } = tierData;

    const actualHotelId = (tier_name === 'REPEATER' || tier_name === 'BRAND_LOYAL') ? null : hotel_id;

    const query = pgFormat(`
      INSERT INTO loyalty_tiers (
          tier_name, hotel_id, min_bookings, min_spending,
          time_period_months, logic_operator,
          created_by, updated_by, created_at, updated_at
      )
      VALUES (%L, %L, %L, %L, %L, %L, %L, %L, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (tier_name, hotel_id) DO UPDATE SET
          min_bookings = EXCLUDED.min_bookings,
          min_spending = EXCLUDED.min_spending,
          time_period_months = EXCLUDED.time_period_months,
          logic_operator = EXCLUDED.logic_operator,
          updated_by = %L,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `, tier_name, actualHotelId, min_bookings, min_spending,
       time_period_months, logic_operator,
       userId, userId,
       userId        
    );

    const result = await client.query(query);

    if (isTransactionOwner) {
      await client.query('COMMIT');
    }
    return result.rows[0];
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK');
    }
    console.error('Error upserting loyalty tier:', err);
    throw new Error('Database error while upserting loyalty tier');
  } finally {
    if (isTransactionOwner) {
      client.release();
    }
  }
};

module.exports = {
  insertPaymentType,
  updatePaymentTypeVisibility,
  updatePaymentTypeDescription,
  insertTaxType,
  updateTaxTypeVisibility,
  updateTaxTypeDescription,
  upsertLoyaltyTier,
};
