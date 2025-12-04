let getPool = require('../../config/database').getPool;
const logger = require('../../config/logger');
const { selectRatesByDetailsId } = require('./rates');
const { selectReservationById } = require('./select');
const { calculatePriceFromRatesService: calculatePriceFromRates } = require('./services/calculationService');
const { updateParkingReservationCancelledStatus } = require('./parking');

const selectReservationDetailsById = async (requestId, id, hotelId, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  try {
    const query = `
      SELECT * FROM reservation_details 
      WHERE id = $1::UUID AND hotel_id = $2
    `;
    const values = [id, hotelId];
    const result = await client.query(query, values);
    return result.rows[0]; // Assuming only one detail per ID
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

const updateDetailsCancelledStatus = async (requestId, id, hotelId, status, updatedBy, billable, price, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();

  try {
    let query = '';
    let values = [];

    // Standardizing parameter order: $1: billable, $2: updated_by, $3: price, $4: id, $5: hotel_id
    if (status === 'cancelled') {
      query = `
        UPDATE reservation_details
        SET
          cancelled = gen_random_uuid(),
          billable = $1,
          updated_by = $2,
          price = $3
        WHERE id = $4::UUID AND hotel_id = $5
        RETURNING *;
      `;
      values = [billable, updatedBy, price, id, hotelId];
    } else if (status === 'recovered') {
      query = `
        UPDATE reservation_details
        SET
          cancelled = NULL,
          billable = $1,
          updated_by = $2,
          price = $3
        WHERE id = $4::UUID AND hotel_id = $5
        RETURNING *;
      `;
      values = [billable, updatedBy, price, id, hotelId];
    } else {
      throw new Error('Invalid status for reservation detail update.');
    }

    const result = await client.query(query, values);
    return result.rows[0];
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

const updateReservationDetailStatus = async (requestId, reservationData) => {
  const pool = getPool(requestId);
  // Get a client from the pool to run multiple queries in a single transaction
  const client = await pool.connect();

  const { id, hotel_id, status, updated_by, billable } = reservationData;

  try {
    // Start the transaction
    await client.query('BEGIN');

    // First, get the parent reservation_id from the detail being updated
    const reservationDetail = await selectReservationDetailsById(requestId, id, hotel_id, client);
    const reservationId = reservationDetail?.reservation_id;

    if (!reservationId) {
      throw new Error('Could not find reservation associated with the detail.');
    }

    // Get the current status of the main reservation to determine billable status on recovery
    const mainReservation = await selectReservationById(requestId, reservationId, hotel_id, client);
    const currentReservationStatus = mainReservation?.status;

    // Get the current rates for this reservation detail
    const rates = await selectRatesByDetailsId(requestId, id, hotel_id, client);

    logger.debug(`[updateReservationDetailStatus] Processing detail ID: ${id}, Status: ${status}`);
    logger.debug(`[updateReservationDetailStatus] Fetched rates: ${JSON.stringify(rates)}`);

    let ratesToUse = [];
    let calculatedPrice;

    if (status === 'cancelled') {
      // When cancelling, only include rates that are flagged to be included.
      ratesToUse = rates.filter(rate => rate.include_in_cancel_fee);
      calculatedPrice = calculatePriceFromRates(ratesToUse, false);
      logger.debug(`[updateReservationDetailStatus] Status is 'cancelled'. Filtered ratesToUse: ${JSON.stringify(ratesToUse)}`);
      logger.debug(`[updateReservationDetailStatus] Calculated price for cancelled detail: ${calculatedPrice}`);
    } else {
      // When recovering, use all rates for price calculation      
      calculatedPrice = calculatePriceFromRates(rates, false);
      logger.debug(`[updateReservationDetailStatus] Status is '${status}'. Using all rates: ${JSON.stringify(rates)}`);
      logger.debug(`[updateReservationDetailStatus] Calculated price for recovered/other detail: ${calculatedPrice}`);
    }

    // 1. Update the reservation_details table based on the status
    let finalBillable = billable;
    if (status === 'recovered') {
      // If the reservation is on hold or provisory, recovering a detail should not make it billable.
      finalBillable = !(currentReservationStatus === 'provisory' || currentReservationStatus === 'hold');
    }

    const updatedDetail = await updateDetailsCancelledStatus(requestId, id, hotel_id, status, updated_by, finalBillable, calculatedPrice, client);

    // 2. Update the associated reservation_parking records
    await updateParkingReservationCancelledStatus(requestId, null, id, hotel_id, status, updated_by, client);

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

    return updatedDetail;
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
  selectReservationDetailsById,
  updateReservationDetailStatus,
  updateDetailsCancelledStatus,
}