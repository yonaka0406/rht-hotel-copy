const { getPool } = require('../../config/database');

/**
 * Get Profit & Loss summary for a specific hotel (PMS module)
 * @param {String} requestId - Request ID for logging
 * @param {Number} hotelId - Hotel ID
 * @param {String} startDate - Start date (YYYY-MM-DD)
 * @param {String} endDate - End date (YYYY-MM-DD)
 * @param {Object} dbClient - Optional database client
 * @returns {Promise<Array>} Aggregated P&L data
 */
async function selectAccountingProfitLoss(requestId, hotelId, startDate, endDate, dbClient = null) {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  const shouldRelease = !dbClient;

  try {
    const query = `
      SELECT
        month,
        management_group_id,
        management_group_name,
        management_group_display_order,
        SUM(net_amount) as net_amount
      FROM acc_profit_loss
      WHERE hotel_id = $1
        AND month >= $2
        AND month <= $3
      GROUP BY
        month,
        management_group_id,
        management_group_name,
        management_group_display_order
      ORDER BY
        month ASC,
        management_group_display_order ASC
    `;

    const values = [hotelId, startDate, endDate];
    const result = await client.query(query, values);
    return result.rows;
  } finally {
    if (shouldRelease) client.release();
  }
}

module.exports = {
  selectAccountingProfitLoss
};
