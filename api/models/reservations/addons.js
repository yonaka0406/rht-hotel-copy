let getPool = require('../../config/database').getPool;
const logger = require('../../config/logger');

const addReservationAddon = async (requestId, addon, client = null) => {
  const pool = getPool(requestId);
  let dbClient = client;
  let shouldReleaseClient = false;
  let shouldManageTransaction = (client === null);

  if (!dbClient) {
    dbClient = await pool.connect();
    shouldReleaseClient = true;    
  }  

  try {
    if (shouldManageTransaction) {
      await dbClient.query('BEGIN');
    }

    const query = `
        INSERT INTO reservation_addons (
        hotel_id, reservation_detail_id, addons_global_id, addons_hotel_id, addon_name, addon_type, quantity, price, tax_type_id, tax_rate, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
    `;

    const values = [
        addon.hotel_id,
        addon.reservation_detail_id,
        addon.addons_global_id,
        addon.addons_hotel_id,
        addon.addon_name,
        addon.addon_type,
        addon.quantity,
        addon.price,
        addon.tax_type_id,
        addon.tax_rate,
        addon.created_by,
        addon.updated_by
    ];

    const result = await dbClient.query(query, values);

    if (shouldManageTransaction) {
      await dbClient.query('COMMIT');
    }

    return result.rows[0]; // Return the inserted reservation addon
  } catch (err) {
    if (shouldManageTransaction) {
        try {
            await dbClient.query('ROLLBACK');
        } catch (rbErr) {
            logger.error('Error rolling back transaction:', rbErr);
        }
    }
    logger.error('Error adding reservation addon:', err);
    throw err;
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
};

module.exports = {
  addReservationAddon
}