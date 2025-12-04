let getPool = require('../../config/database').getPool;

const updateReservationDetailStatus = async (requestId, reservationData) => {
  const pool = getPool(requestId);
  // Get a client from the pool to run multiple queries in a single transaction
  const client = await pool.connect();

  const { id, hotel_id, status, updated_by, billable } = reservationData;

  try {
    // Start the transaction
    await client.query('BEGIN');

    // First, get the parent reservation_id from the detail being updated
    const getReservationIdQuery = 'SELECT reservation_id FROM reservation_details WHERE id = $1::UUID AND hotel_id = $2';
    const reservationIdResult = await client.query(getReservationIdQuery, [id, hotel_id]);
    const reservationId = reservationIdResult.rows[0]?.reservation_id;

    if (!reservationId) {
      throw new Error('Could not find reservation associated with the detail.');
    }

    // Get the current status of the main reservation to determine billable status on recovery
    const getReservationStatusQuery = 'SELECT status FROM reservations WHERE id = $1::UUID AND hotel_id = $2';
    const reservationStatusResult = await client.query(getReservationStatusQuery, [reservationId, hotel_id]);
    const currentReservationStatus = reservationStatusResult.rows[0]?.status;

    let detailQuery = '';
    let detailValues = [];

    // Get the current rates for this reservation detail
    const ratesQuery = `
      SELECT * FROM reservation_rates 
      WHERE reservation_details_id = $1 AND hotel_id = $2
    `;
    const ratesResult = await client.query(ratesQuery, [id, hotel_id]);
    const rates = Array.isArray(ratesResult.rows) ? ratesResult.rows : Object.values(ratesResult.rows);

    let ratesToUse = [];
    let calculatedPrice;

    if (status === 'cancelled') {
      // When cancelling, only include rates that are flagged to be included.
      ratesToUse = rates.filter(rate => rate.include_in_cancel_fee);
      logger.debug(`[updateReservationDetailStatus] Status is 'cancelled'. Filtered ratesToUse: ${JSON.stringify(ratesToUse)}`);
      calculatedPrice = calculatePriceFromRates(ratesToUse, false);
    } else {
      // When recovering, use all rates for price calculation      
      logger.debug(`[updateReservationDetailStatus] Status is '${status}'. Using all rates: ${JSON.stringify(rates)}`);
      calculatedPrice = calculatePriceFromRates(rates, false);
    }
    logger.debug(`[updateReservationDetailStatus] Calculated price for detail ${id}: ${calculatedPrice}`);

    // 1. Update the reservation_details table based on the status
    if (status === 'cancelled') {
      detailQuery = `
        UPDATE reservation_details
        SET
          cancelled = gen_random_uuid(),
          billable = $4,
          updated_by = $1,
          price = $5
        WHERE id = $2::UUID AND hotel_id = $3
        RETURNING *;
      `;
      detailValues = [updated_by, id, hotel_id, billable, calculatedPrice];

    } else if (status === 'recovered') {
      // If the reservation is on hold or provisory, recovering a detail should not make it billable.
      const isBillable = !(currentReservationStatus === 'provisory' || currentReservationStatus === 'hold');
      detailQuery = `
        UPDATE reservation_details
        SET
          cancelled = NULL,
          billable = $1,
          updated_by = $2,
          price = $5
        WHERE id = $3::UUID AND hotel_id = $4
        RETURNING *;
      `;
      detailValues = [isBillable, updated_by, id, hotel_id, calculatedPrice];

    } else {
      // If the status is not recognized, abort the transaction.
      throw new Error('Invalid status for reservation detail update.');
    }

    const result = await client.query(detailQuery, detailValues);

    // 2. Update the associated reservation_parking records
    let parkingQuery = '';
    const parkingValues = [updated_by, id, hotel_id];

    if (status === 'cancelled') {
      // Cancel any associated parking reservations
      parkingQuery = `
        UPDATE reservation_parking
        SET
          cancelled = gen_random_uuid(),
          updated_by = $1
        WHERE reservation_details_id = $2::UUID AND hotel_id = $3;
      `;
    } else if (status === 'recovered') {
      // "Recover" any associated parking reservations by removing the cancelled flag
      parkingQuery = `
        UPDATE reservation_parking
        SET
          cancelled = NULL,
          updated_by = $1
        WHERE reservation_details_id = $2::UUID AND hotel_id = $3;
      `;
    }

    // Only execute the parking query if it was set
    if (parkingQuery) {
      await client.query(parkingQuery, parkingValues);
    }

    // 3. Check remaining details and update the main reservation accordingly
    const remainingDetailsQuery = `
      SELECT
          MIN(date) as new_check_in,
          MAX(date) + INTERVAL '1 day' as new_check_out
      FROM reservation_details
      WHERE reservation_id = $1 AND hotel_id = $2 AND cancelled IS NULL
    `;
    const remainingDetailsResult = await client.query(remainingDetailsQuery, [reservationId, hotel_id]);
    const { new_check_in, new_check_out } = remainingDetailsResult.rows[0];

    if (new_check_in === null) {
      // If no active details remain, cancel the entire reservation
      const cancelReservationQuery = `
        UPDATE reservations
        SET
            status = 'cancelled',
            updated_by = $1
        WHERE id = $2 AND hotel_id = $3;
      `;
      await client.query(cancelReservationQuery, [updated_by, reservationId, hotel_id]);
    } else {
      // Otherwise, update the check-in/out dates and potentially the status
      let updateQuery = `
        UPDATE reservations
        SET
            check_in = $1,
            check_out = $2,
            updated_by = $3
      `;
      const updateParams = [new_check_in, new_check_out, updated_by, reservationId, hotel_id];

      if (status === 'recovered' && currentReservationStatus === 'cancelled') {
        updateQuery += ", status = 'confirmed'";
      }

      updateQuery += ` WHERE id = $4 AND hotel_id = $5;`;
      await client.query(updateQuery, updateParams);
    }

    // If all queries were successful, commit the transaction
    await client.query('COMMIT');

    return result.rows[0];
  } catch (err) {
    // If any query fails, roll back the entire transaction
    await client.query('ROLLBACK');
    logger.error('Error in transaction, rolling back changes:', err);
    throw new Error('Database transaction failed');
  } finally {
    // Always release the client back to the pool
    client.release();
  }
};

module.exports = {  
  updateReservationDetailStatus
}