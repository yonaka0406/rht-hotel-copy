let getPool = require('../../config/database').getPool;

const deleteEmptyReservationById = async (requestId, reservationId, dbClient = null) => {
  const isTransactionOwner = !dbClient;
  const client = dbClient || await getPool(requestId).connect();

  try {
    if (isTransactionOwner) {
      await client.query('BEGIN'); // Start the transaction if we own it
    }

    // First, check if there are any associated reservation_details
    const checkDetailsQuery = `
      SELECT COUNT(*)
      FROM reservation_details
      WHERE reservation_id = $1;
    `;
    const checkDetailsResult = await client.query(checkDetailsQuery, [reservationId]);
    const detailsCount = parseInt(checkDetailsResult.rows[0].count, 10);

    if (detailsCount > 0) {
      throw new Error('Reservation cannot be deleted: it has associated reservation details.');
    }

    // If no details, proceed with deletion
    const deleteQuery = `
      DELETE FROM reservations
      WHERE id = $1
      RETURNING id;
    `;
    const values = [reservationId];

    const result = await client.query(deleteQuery, values);

    if (isTransactionOwner) {
      await client.query('COMMIT'); // Commit the transaction if we own it
    }

    return result.rows[0]; // Return the ID of the deleted reservation
  } catch (err) {
    if (isTransactionOwner) {
      await client.query('ROLLBACK'); // Rollback on error if we own the transaction
    }
    console.error('Error deleting reservation:', err);
    // Re-throw the original error to be handled by the caller
    throw err;
  } finally {
    if (isTransactionOwner) {
      client.release(); // Release the client only if we created it
    }
  }
};

module.exports = {
  deleteEmptyReservationById,
};
