let getPool = require('../../config/database').getPool;
const logger = require('../../config/logger');

const selectFailedOtaReservations = async (requestId) => {
    const pool = getPool(requestId);
    const query = `
    SELECT
      f.id,
      f.ota_reservation_id,
      f.reservation_data->'TransactionType'->>'SystemDate' AS date_received,
      f.reservation_data->'TransactionType'->>'DataClassification' AS transaction_type,
      f.reservation_data->'BasicInformation'->>'CheckInDate' AS check_in_date,
      f.reservation_data->'BasicInformation'->>'CheckOutDate' AS check_out_date,
      f.created_at,
      h.id AS hotel_id,
      h.name AS hotel_name
    FROM 
      ota_reservation_queue f
      JOIN hotels h ON f.hotel_id = h.id
    WHERE      
      f.status = 'failed'
    ORDER BY 
      f.created_at;
  `;

    try {
        const result = await pool.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error fetching failed OTA reservations:', err);
        throw new Error('Database error');
    }
};

module.exports = {
    selectFailedOtaReservations,
};