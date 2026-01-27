let getPool = require('../../config/database').getPool;
const logger = require('../../config/logger');

const updateParkingReservationCancelledStatus = async (requestId, reservationId = null, reservationDetailsId = null, hotelId, status, updatedBy, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  try {
    let query = '';
    let values = [];
    let whereClause = '';

    const liveDetailsOnly = status === 'recovered' ? ' AND cancelled IS NULL' : '';

    if (reservationId) {
      // If reservationId is provided, update all parking reservations associated with that main reservation
      values = [updatedBy, reservationId, hotelId];
      whereClause = `
        WHERE reservation_details_id IN (
          SELECT id FROM reservation_details WHERE reservation_id = $2::UUID AND hotel_id = $3${liveDetailsOnly}
        ) AND hotel_id = $3
      `;
      logger.debug(`[updateParkingReservationCancelledStatus] Updating parking for all details of reservation_id: ${reservationId}`);
    } else {
      // Otherwise, update only the parking for the specific reservationDetailsId
      values = [updatedBy, reservationDetailsId, hotelId];
      whereClause = `
        WHERE reservation_details_id = $2::UUID AND hotel_id = $3
        ${status === 'recovered' ? 'AND EXISTS (SELECT 1 FROM reservation_details WHERE id = $2::UUID AND hotel_id = $3 AND cancelled IS NULL)' : ''}
      `;
      logger.debug(`[updateParkingReservationCancelledStatus] Updating parking for reservation_details_id: ${reservationDetailsId}`);
    }


    if (status === 'cancelled') {
      query = `
        UPDATE reservation_parking
        SET
          cancelled = gen_random_uuid(),
          updated_by = $1
        ${whereClause};
      `;
    } else if (status === 'recovered') {
      query = `
        UPDATE reservation_parking
        SET
          cancelled = NULL,
          updated_by = $1
        ${whereClause};
      `;
    } else {
      logger.warn(`[updateParkingReservationCancelledStatus] Invalid status '${status}' for parking update for reservation_details_id: ${reservationDetailsId}. No action taken.`);
      return; // No action needed for other statuses
    }

    if (query) {
      await client.query(query, values);
    }
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

const insertReservationParking = async (requestId, parkingData, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  const shouldReleaseClient = !dbClient;

  const {
    hotel_id,
    reservation_details_id,
    reservation_addon_id,
    vehicle_category_id,
    parking_spot_id,
    date,
    status,
    comment,
    cancelled,
    price,
    created_by,
    updated_by,
  } = parkingData;

  const query = `
    INSERT INTO reservation_parking (
      hotel_id,
      reservation_details_id,
      reservation_addon_id,
      vehicle_category_id,
      parking_spot_id,
      date,
      status,
      comment,
      cancelled,
      price,
      created_by,
      updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `;

  const values = [
    hotel_id,
    reservation_details_id,
    reservation_addon_id,
    vehicle_category_id,
    parking_spot_id,
    date,
    status,
    comment,
    cancelled,
    price,
    created_by,
    updated_by,
  ];

  try {
    const result = await client.query(query, values);
    return result.rows[0];
  } catch (err) {
    logger.error(`[insertReservationParking] Error inserting reservation parking: ${err.message}`, {
      requestId,
      parkingData,
      error: err.stack
    });
    throw new Error('Database error during reservation parking insertion.');
  } finally {
    if (shouldReleaseClient) {
      client.release();
    }
  }
};

module.exports = {
  updateParkingReservationCancelledStatus,
  insertReservationParking,
};