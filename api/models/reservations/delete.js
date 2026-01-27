let getPool = require('../../config/database').getPool;
const format = require('pg-format');
const logger = require('../../config/logger');

const deleteHoldReservationById = async (requestId, reservation_id, hotel_id, updated_by) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const setSessionQuery = `SET SESSION "my_app.user_id" = '${updated_by}';`;
    await client.query(setSessionQuery);
    
    // Explicitly delete reservation details first
    const deleteDetailsQuery = {
      text: `DELETE FROM reservation_details WHERE reservation_id = $1 AND hotel_id = $2`,
      values: [reservation_id, hotel_id]
    };
    await client.query(deleteDetailsQuery);

    // Perform the delete operation
    const deleteQuery = {
      text: `
        WITH deleted AS (
          DELETE FROM reservations
          WHERE id = $1 AND hotel_id = $2
          RETURNING *
        )
        SELECT
          COALESCE((SELECT COUNT(*) > 0 FROM deleted), false) AS success,
          COALESCE((SELECT COUNT(*) FROM deleted), 0) AS count;
      `,
      values: [reservation_id, hotel_id],
    };
    const result = await client.query(deleteQuery);

    await client.query('COMMIT');

    return result.rows[0] || { success: false, count: 0 };

  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`[${requestId}] Transaction failed. Rolling back. Error:`, {
      error: err.message,
      stack: err.stack
    });
    throw err;
  } finally {
    client.release();
  }
};

const deleteReservationClientsByDetailId = async (requestId, reservation_detail_id, updated_by) => {
  const pool = getPool(requestId);
  const query = format(`
    -- Set the updated_by value in a session variable
    SET SESSION "my_app.user_id" = %L;

    DELETE FROM reservation_clients
    WHERE reservation_details_id = %L
    RETURNING *;
  `, updated_by, reservation_detail_id);

  try {
    const result = await pool.query(query);
    return result.rowCount;
  } catch (err) {
    logger.error('Error deleting reservation clients:', err);
    throw new Error('Database error');
  }
};

const deleteReservationRoom = async (requestId, hotelId, roomId, reservationId, numberOfPeople, updated_by) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    // logger.debug('Starting transaction...');
    await client.query('BEGIN');

    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, updated_by);
    await client.query(setSessionQuery);

    // Update the number_of_people field in the reservations table
    const updateQuery = `
      UPDATE reservations
      SET number_of_people = number_of_people - $1
      WHERE id = $2 and hotel_id = $3
      RETURNING number_of_people;
    `;
    const updateResult = await client.query(updateQuery, [numberOfPeople, reservationId, hotelId]);

    // Check if the number_of_people is now <= 0
    if (updateResult.rows.length === 0 || updateResult.rows[0].number_of_people <= 0) {
      await client.query('ROLLBACK');
      console.warn('Rollback: number_of_people is <= 0');
      return { success: false, message: 'Invalid operation: number_of_people would be zero or negative' };
    }

    // Delete the reservation details

    const deleteQuery = `
      DELETE FROM reservation_details
      WHERE reservation_id = $1 and room_id = $2
      RETURNING *;
    `;
    const deleteResults = await client.query(deleteQuery, [reservationId, roomId]);

    // Commit the transaction
    await client.query('COMMIT');

    return { success: true };

  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error deleting room:', err);
    throw new Error('Database error');
  } finally {
    client.release();
  }
};

const deleteReservationPayment = async (requestId, id, userId) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, userId);
    await client.query(setSessionQuery);

    const reservationPaymentResult = await client.query(`
        SELECT *
        FROM reservation_payments
        WHERE id = $1;
      `, [id]
    );
    const reservationPayment = reservationPaymentResult.rows[0];

    if (!reservationPayment) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Payment not found' };
    }

    const existingInvoiceResult = await client.query(
      `
        SELECT * 
        FROM reservation_payments
        WHERE invoice_id = $1 AND hotel_id = $2 AND date = $3 AND client_id = $4;
      `,
      [reservationPayment.invoice_id, reservationPayment.hotel_id, reservationPayment.date, reservationPayment.client_id]
    );

    // Delete the invoice if it exists only for this payment
    if (existingInvoiceResult.rows.length === 1) {
      const invoiceId = existingInvoiceResult.rows[0].invoice_id;

      const deleteInvoiceQuery = `
        DELETE FROM invoices
        WHERE id = $1 AND hotel_id = $2
        RETURNING *;
      `;
      await client.query(deleteInvoiceQuery, [invoiceId, reservationPayment.hotel_id]);
    }

    // Delete the payment record itself
    const deleteQuery = `
      DELETE FROM reservation_payments
      WHERE id = $1
      RETURNING *;
    `;
    const deleteResults = await client.query(deleteQuery, [id]);

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`[${requestId}] Transaction failed during payment deletion. Rolling back. Error:`, {
      error: err.message,
      stack: err.stack
    });
    throw err;
  } finally {
    client.release();
  }
};

const deleteParkingReservation = async (requestId, id, userId) => {
  const pool = getPool(requestId);
  // Changed the query from UPDATE to a direct DELETE.
  // The RETURNING * clause ensures the deleted row is returned, maintaining consistency with the front end's expectations.
  const query = `
    DELETE FROM reservation_parking
    WHERE id = $1
    RETURNING *;
  `;

  // The userId is no longer needed for the query itself.
  const values = [id];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    logger.error('Error deleting parking reservation:', error);
    throw new Error('Database error while deleting parking reservation');
  }
};

const deleteBulkParkingReservations = async (requestId, ids, userId) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('No parking reservation IDs provided for deletion');
  }

  const pool = getPool(requestId);
  // Changed the query from UPDATE to a direct DELETE.
  // The RETURNING * clause ensures the deleted rows are returned.
  const query = `
    DELETE FROM reservation_parking
    WHERE id = ANY($1::uuid[])
    RETURNING *;
  `;

  // The userId is no longer needed for the query itself.
  const values = [ids];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    logger.error('Error bulk deleting parking reservations:', error);
    throw new Error('Database error while bulk deleting parking reservations');
  }
};

module.exports = {
    deleteHoldReservationById,
    deleteReservationClientsByDetailId,
    deleteReservationRoom,
    deleteReservationPayment,
    deleteParkingReservation,
    deleteBulkParkingReservations
}