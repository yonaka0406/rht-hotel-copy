let getPool = require('../../config/database').getPool;
const logger = require('../../config/logger');
const format = require('pg-format');

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

const selectReservationAddonByDetail = async (requestId, reservationDetailId, client = null) => {
  const pool = client || getPool(requestId);
  const query = `
    SELECT * FROM reservation_addons
    WHERE reservation_detail_id = $1;
  `;
  const values = [reservationDetailId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error('Error selecting reservation addon by detail:', err);
    throw new Error('Database error');
  }
};

const updateReservationDetailAddon = async (requestId, id, hotel_id, addons, user_id, client = null) => {
  if (!Array.isArray(addons)) {
    addons = [];
  }
  const pool = getPool(requestId);
  let dbClient = client;
  let shouldReleaseClient = false;

  const shouldManageTransaction = !client;

  if (!dbClient) {
    dbClient = await pool.connect();
    shouldReleaseClient = true;
  }

  try {
    if (shouldManageTransaction) {
      await dbClient.query('BEGIN'); // Start transaction here to ensure atomicity
    }

    // Set session user_id for logging
    await dbClient.query(format(`SET SESSION "my_app.user_id" = %L;`, user_id));
    // Filter out any parking addons from incoming list. 
    // Existing parking addons are preserved because deleteReservationAddonsByDetailId excludes them.
    const allAddonsToProcess = addons.filter(addon => addon.addon_type !== 'parking');
    await deleteReservationAddonsByDetailId(requestId, id, hotel_id, user_id, dbClient);


    const addedAddons = [];
    for (const addon of allAddonsToProcess) {
      const newAddon = await addReservationAddon(requestId, {
        hotel_id: hotel_id,
        reservation_detail_id: id,
        addons_global_id: addon.addons_global_id,
        addons_hotel_id: addon.addons_hotel_id,
        addon_name: addon.addon_name,
        addon_type: addon.addon_type, // Preserve addon_type
        quantity: addon.quantity,
        price: addon.price ?? 0,
        tax_type_id: addon.tax_type_id,
        tax_rate: addon.tax_rate,
        created_by: user_id,
        updated_by: user_id,
      }, dbClient); // Pass the client here
      addedAddons.push(newAddon);
    }

    if (shouldManageTransaction) {
      await dbClient.query('COMMIT'); // Commit transaction here
    }
  } catch (err) {
    if (shouldManageTransaction) {
      await dbClient.query('ROLLBACK'); // Rollback on error
    }
    logger.error(`[${requestId}] Error updating reservation detail addon for detail ${id}:`, err);
    throw err;
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
};

const deleteReservationAddonsByDetailId = async (requestId, reservation_detail_id, hotel_id, updated_by, client = null) => {
  const pool = getPool(requestId);
  let dbClient = client;
  let shouldReleaseClient = false;

  if (!dbClient) {
    dbClient = await pool.connect();
    shouldReleaseClient = true;
    // If this function acquired the client, it's responsible for setting the session
    await dbClient.query(format(`SET SESSION "my_app.user_id" = %L;`, updated_by));
  }

  const query = format(`
    DELETE FROM reservation_addons
    WHERE reservation_detail_id = %L 
      AND hotel_id = %L 
      AND (addon_type IS NULL OR addon_type = '' OR addon_type <> 'parking')
    RETURNING *;
  `, reservation_detail_id, hotel_id);

  try {
    const result = await dbClient.query(query);
    return result.rowCount;
  } catch (err) {
    logger.error('Error deleting reservation addon:', err);
    throw new Error('Database error');
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
};

module.exports = {
  addReservationAddon,
  selectReservationAddonByDetail,
  updateReservationDetailAddon,
  deleteReservationAddonsByDetailId
}