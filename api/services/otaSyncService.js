
const logger = require('../config/logger');
const { getProdPool } = require('../config/database');
const { selectReservationInventoryChange, selectReservationGoogleInventoryChange } = require('../models/log');
const { selectReservationsInventory } = require('../models/report');
const { updateInventoryMultipleDays } = require('../ota/xmlController');

/**
 * Syncs reservation inventory with OTA and Google Sheets.
 * This function handles the entire flow triggered by a reservation log entry,
 * using a single database connection to prevent connection spikes.
 *
 * @param {string} requestId Request ID for tracing.
 * @param {number} logId The ID from logs_reservation.
 */
async function syncReservationInventory(requestId, logId) {
    let dbClient = null;
    try {
        const pool = getProdPool();
        dbClient = await pool.connect();

        logger.info(`[otaSyncService] Starting sync for logId: ${logId}`, { requestId });

        // 1. Google Sheets sync (enqueue task)
        try {
            // SAFETY CHECK: Only enqueue Google Sheets updates in production environment.
            if (process.env.NODE_ENV === 'production') {
                const googleData = await selectReservationGoogleInventoryChange(requestId, logId, dbClient);
                for (const row of googleData) {
                    await dbClient.query(
                        `INSERT INTO google_sheets_queue (hotel_id, check_in, check_out, status)
                        VALUES ($1, $2, $3, 'pending')
                        ON CONFLICT (hotel_id, check_in, check_out) WHERE status = 'pending'
                        DO NOTHING`,
                        [row.hotel_id, row.check_in, row.check_out]
                    );
                    logger.debug(`[otaSyncService] Queued Google Sheets update for hotel ${row.hotel_id}`, { requestId, logId, checkIn: row.check_in, checkOut: row.check_out });
                }
            } else {
                logger.info(`[otaSyncService] Skipping Google Sheets enqueue for logId ${logId} (not in production environment)`, { requestId });
            }
        } catch (googleError) {
            logger.error(`[otaSyncService] Failed to queue Google Sheets update`, { error: googleError.message, logId, requestId });
        }

        // 2. Site Controller (OTA) sync
        try {
            // SAFETY CHECK: Only perform real OTA updates in production environment.
            if (process.env.NODE_ENV === 'production') {
                const scLogs = await selectReservationInventoryChange(requestId, logId, dbClient);

                // Iterate over all affected segments to ensure consistency (e.g. in multi-row cascade deletes)
                for (const logRow of scLogs) {
                    const { hotel_id, check_in, check_out } = logRow;

                    // Get inventory data for this segment
                    const inventory = await selectReservationsInventory(requestId, hotel_id, check_in, check_out, dbClient);

                    if (inventory && inventory.length > 0) {
                        // Call the controller logic directly.
                        // We mimic req/res but pass the existing dbClient.
                        const dummyReq = {
                            requestId,
                            params: { hotel_id, log_id: logId },
                            body: inventory
                        };
                        const dummyRes = {
                            status: () => dummyRes,
                            send: () => dummyRes,
                            json: () => dummyRes,
                            headersSent: false
                        };

                        await updateInventoryMultipleDays(dummyReq, dummyRes, dbClient, { skipStockCheck: true });
                        logger.info(`[otaSyncService] Successfully initiated OTA sync for hotel ${hotel_id} segment ${check_in}-${check_out}`, { requestId, logId });
                    }
                }
            } else {
                logger.info(`[otaSyncService] Skipping real OTA sync for logId ${logId} (not in production environment)`, { requestId });
            }
        } catch (otaError) {
            logger.error(`[otaSyncService] Failed OTA sync process`, { error: otaError.message, logId, requestId });
        }

    } catch (error) {
        logger.error(`[otaSyncService] Critical error in syncReservationInventory`, { error: error.message, stack: error.stack, logId, requestId });
    } finally {
        if (dbClient) {
            try {
                dbClient.release();
            } catch (releaseErr) {
                logger.error(`[otaSyncService] Error releasing connection:`, releaseErr);
            }
        }
    }
}

module.exports = {
    syncReservationInventory
};
