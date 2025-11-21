let getPool = require('../../config/database').getPool;
const logger = require('../../config/logger');

const updateReservationType = async (requestId, reservationData) => {
  const { id, hotel_id, type, updated_by } = reservationData;
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    // Start the transaction
    await client.query('BEGIN');

    // 1. Get the current status from the database to use in our logic.
    const currentReservation = await client.query(
      `SELECT status FROM reservations WHERE id = $1::UUID AND hotel_id = $2`,
      [id, hotel_id]
    );

    if (currentReservation.rows.length === 0) {
      const error = new Error(`Reservation with ID ${id} and Hotel ID ${hotel_id} not found.`);
      error.statusCode = 404; // Not Found
      throw error;
    }

    const { status } = currentReservation.rows[0];

    // 2. Update the reservation type and status (if applicable) in one query.
    const result = await client.query(
      `UPDATE reservations
       SET type = $1,
           updated_by = $2,
           status = CASE WHEN $1 = 'employee' THEN 'confirmed' ELSE status END
       WHERE id = $3::UUID AND hotel_id = $4
       RETURNING *`,
      [type, updated_by, id, hotel_id]
    );

    // 3. Calculate the billable status based on the new type and the original status.
    const billable = type !== 'employee' && !['hold', 'provisory'].includes(status);

    // 4. Update the billable status in reservation_details.
    await client.query(
      `UPDATE reservation_details
       SET billable = $1,
           updated_by = $2
       WHERE reservation_id = $3::UUID AND hotel_id = $4`,
      [billable, updated_by, id, hotel_id]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    // Differentiate between expected business errors (e.g., 400, 404) and unexpected system errors
    if (err.statusCode && err.statusCode < 500) {
      throw err; // Re-throw business errors without logging as system failures
    } else {
      // Log unexpected system errors (500+ or missing statusCode)
      logger.error(`[${requestId}] System Error updating reservation type for reservation ${id}, hotel ${hotel_id}:`, err.message, err.stack);
      throw new Error('Database transaction failed during reservation type update.');
    }
  } finally {
    client.release();
  }
};

const updateReservationResponsible = async (requestId, id, updatedFields, user_id) => {
  const pool = getPool(requestId);
  const query = `
      UPDATE reservations
      SET
        reservation_client_id = $1,          
        updated_by = $2          
      WHERE id = $3::UUID AND hotel_id = $4
      RETURNING *;
  `;
  const values = [
    updatedFields.client_id,
    user_id,
    id,
    updatedFields.hotel_id,
  ];

  try {
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      const error = new Error(`Reservation with ID ${id} and Hotel ID ${updatedFields.hotel_id} not found or no change was made.`);
      error.statusCode = 404; // Not Found
      throw error;
    }

    return result.rows[0];
  } catch (err) {
    // Differentiate between expected business errors (e.g., 400, 404) and unexpected system errors
    if (err.statusCode && err.statusCode < 500) {
      throw err; // Re-throw business errors without logging as system failures
    } else {
      // Log unexpected system errors (500+ or missing statusCode)
      logger.error(`[${requestId}] System Error updating reservation responsible for reservation ${id}, hotel ${updatedFields.hotel_id}:`, err.message, err.stack);
      throw new Error('Database error during reservation responsible update.');
    }
  }
};

const updatePaymentTiming = async (requestId, reservationId, hotelId, paymentTiming, userId) => {
  const pool = getPool(requestId);

  // Whitelist of allowed paymentTiming values
  const allowedPaymentTimings = ['not_set', 'prepaid', 'on-site', 'postpaid'];

  // 1. Validate incoming paymentTiming
  if (!allowedPaymentTimings.includes(paymentTiming)) {
    const error = new Error(`Invalid paymentTiming value: ${paymentTiming}. Allowed values are: ${allowedPaymentTimings.join(', ')}`);
    error.statusCode = 400; // Bad Request
    throw error;
  }

  const query = `
    UPDATE reservations
    SET
      payment_timing = $1,
      updated_by = $2
    WHERE id = $3::UUID AND hotel_id = $4
    RETURNING *;
  `;
  const values = [paymentTiming, userId, reservationId, hotelId];

  try {
    const result = await pool.query(query, values);

    // 2. Check if a row was updated
    if (result.rowCount === 0) {
      const error = new Error(`Reservation with ID ${reservationId} and Hotel ID ${hotelId} not found or no change was made.`);
      error.statusCode = 404; // Not Found
      throw error;
    }

    return result.rows[0];
  } catch (err) {
    // Differentiate between expected business errors (e.g., 400, 404) and unexpected system errors
    if (err.statusCode && err.statusCode < 500) {
      throw err; // Re-throw business errors without logging as system failures
    } else {
      // Log unexpected system errors (500+ or missing statusCode)
      logger.error(`[${requestId}] System Error updating payment timing for reservation ${reservationId}, hotel ${hotelId}:`, err.message, err.stack);
      throw new Error('Database error during payment timing update.');
    }
  }
};

module.exports = {
    updateReservationType,
    updateReservationResponsible,
    updatePaymentTiming
}