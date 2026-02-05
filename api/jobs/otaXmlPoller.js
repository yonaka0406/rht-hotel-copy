const { DatabaseError } = require('pg');
const { getPool, getProdPool } = require('../config/database');
const logger = require('../config/logger');
const { submitXMLTemplate, selectXMLTemplate } = require('../ota/xmlController'); // We will need a modified submitXMLTemplate
const { OtaApiError } = require('../ota/xmlController'); // Assuming OtaApiError is exported
const { updateOTAXmlQueue } = require('../ota/xmlModel');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 5; // Max retries for a queued item
const POLL_INTERVAL = 2000; // Poll every 2 seconds
const BATCH_SIZE = 3; // Process up to 3 items per poll cycle

/**
 * Helper to detect if an error is related to a database connection or a serious Postgres failure
 * that warrants connection recovery.
 */
const isDbError = (error) => {
    const pgConnectionErrors = ['57P01', '57P02', '08006', '08003', '08000', '08001', '08004', '08007', '08P01'];
    return error instanceof DatabaseError ||
           error.name === 'DatabaseError' ||
           pgConnectionErrors.includes(error.code) ||
           (error.code && typeof error.code === 'string' && error.code.startsWith('ECONN'));
};

async function fetchPendingRequests(dbClient, limit) {
    const fetchRequestId = `ota-poller-fetch-${Date.now()}`;
    try {
        // Select pending requests, ordered by creation time, and mark them as processing
        // Also include items stuck in 'processing' for more than 10 minutes
        const result = await dbClient.query(
            `UPDATE ota_xml_queue
             SET status = 'processing', processed_at = CURRENT_TIMESTAMP
             WHERE id IN (
                 SELECT id FROM ota_xml_queue
                 WHERE status = 'pending'
                    OR (status = 'failed' AND retries < $1)
                    OR (status = 'processing' AND processed_at < CURRENT_TIMESTAMP - INTERVAL '10 minutes')
                 ORDER BY created_at ASC
                 LIMIT $2
                 FOR UPDATE SKIP LOCKED
             )
             RETURNING *`,
            [MAX_RETRIES, limit]
        );
        return result.rows;
    } catch (error) {
        logger.error('Error fetching pending OTA XML requests:', { requestId: fetchRequestId, error: error.message, stack: error.stack });

        // If it's a database error, re-throw so the main loop can handle connection recovery
        if (isDbError(error)) {
            throw error;
        }

        return [];
    }
}



async function processQueueItem(dbClient, item) {
    const requestId = `ota-poller-${item.id}`; // Generate a unique requestId for poller's internal logging
    logger.warn(`Processing queued item ID: ${item.id} for hotel ${item.hotel_id} with service ${item.service_name}`, {
        queueId: item.id,
        hotelId: item.hotel_id,
        serviceName: item.service_name,
        currentRequestId: item.current_request_id,
        retries: item.retries
    });

    let success = false;
    let errorMessage = null;

    try {
        // We need a dummy req and res object for submitXMLTemplate
        const dummyReq = { requestId: requestId };
        const dummyRes = {
            statusCode: 200, // Default status code
            _headersSent: false, // Mimic headersSent flag

            status: function (code) {
                this.statusCode = code;
                return this; // Allow chaining
            },
            json: function (obj) {
                // Record the JSON response if needed for debugging, or just no-op
                // logger.debug('dummyRes.json called', { response: obj });
                this._jsonResponse = obj;
                this._headersSent = true;
            },
            send: function (body) {
                // Record the body if needed, or just no-op
                // logger.debug('dummyRes.send called', { response: body });
                this._body = body;
                this._headersSent = true;
            },
            end: function () {
                // No-op, just to prevent errors
                this._headersSent = true;
            },
            // Add headersSent property for checks
            get headersSent() {
                return this._headersSent;
            }
        }; // submitXMLTemplate doesn't actually use res for sending response, only for error handling

        const randomDelay = Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000; // Random between 1000 and 3000 ms
        await delay(randomDelay); // Use the global delay helper

        // Call the original submitXMLTemplate directly
        logger.warn('Calling submitXMLTemplate from poller', {
            queueId: item.id,
            hotelId: item.hotel_id,
            serviceName: item.service_name,
            currentRequestId: item.current_request_id,
            xmlBodySnippet: item.xml_body.substring(0, 200) // Log a snippet of the XML body
        });
        // Pass dbClient to submitXMLTemplate (which we will modify next)
        await submitXMLTemplate(dummyReq, dummyRes, item.hotel_id, item.service_name, item.xml_body, dbClient);
        success = true;
    } catch (error) {
        errorMessage = error.message;
        logger.error(`Failed to process queued item ID: ${item.id}. Error: ${errorMessage}`, {
            queueId: item.id,
            hotelId: item.hotel_id,
            serviceName: item.service_name,
            currentRequestId: item.current_request_id,
            error: errorMessage,
            stack: error.stack
        });
    }

    if (success) {
        try {
            await updateOTAXmlQueue(null, item.id, 'completed', null, dbClient);
            logger.info(`Successfully processed queued item ID: ${item.id}`, { queueId: item.id });
        } catch (error) {
            logger.error(`Failed to update queue item ID: ${item.id} to completed`, { queueId: item.id, error: error.message });
        }
    } else {
        const newStatus = (item.retries + 1 >= MAX_RETRIES) ? 'failed' : 'pending'; // Mark as pending for retry
        try {
            await updateOTAXmlQueue(null, item.id, newStatus, errorMessage, dbClient);
            logger.warn(`Queued item ID: ${item.id} marked as ${newStatus}. Retries: ${item.retries + 1}`, { queueId: item.id, newStatus });
        } catch (error) {
            logger.error(`Failed to update queue item ID: ${item.id} to ${newStatus}`, { queueId: item.id, error: error.message });
        }
    }
}

const { startLog, completeLog } = require('../models/cron_logs');

let isPollerRunning = false;
let stopRequested = false;

async function otaXmlPollerLoop() {
    if (isPollerRunning) return;
    isPollerRunning = true;
    stopRequested = false;

    logger.info('OTA XML Poller loop started.');

    let dbClient = null;

    while (!stopRequested) {
        const requestId = `ota-poller-${Date.now()}`;
        let logId = null;

        try {
            // 1. Ensure we have a working database connection
            if (!dbClient) {
                const pool = getProdPool();
                dbClient = await pool.connect();
                logger.info('OTA XML Poller acquired new database connection.');

                // Basic connection health check/setup
                dbClient.on('error', (err) => {
                    const pool = getProdPool();
                    logger.error('Persistent dbClient error in OTA XML Poller', {
                        error: err.message,
                        stack: err.stack,
                        processID: dbClient.processID,
                        poolStatus: {
                            totalCount: pool.totalCount,
                            idleCount: pool.idleCount,
                            waitingCount: pool.waitingCount
                        }
                    });
                    dbClient = null; // Mark for re-acquisition
                });
            }

            // 2. Fetch pending requests
            const pendingRequests = await fetchPendingRequests(dbClient, BATCH_SIZE);

            if (pendingRequests.length === 0) {
                // logger.debug('No pending OTA XML requests found.');
                await delay(1000); // Sleep 1s when empty
                continue;
            }

            // 3. Process requests sequentially
            logId = await startLog('OTA XML Poller', dbClient);
            logger.info(`Poller fetched ${pendingRequests.length} pending requests.`, { requestId });

            for (const item of pendingRequests) {
                if (stopRequested) break;
                await processQueueItem(dbClient, item);
            }

            try {
                await completeLog(logId, 'success', { processedItems: pendingRequests.length }, dbClient);
                logId = null; // Mark as completed to avoid duplicate logging in catch block
            } catch (logError) {
                // TODO: Implement a cleanup/retry strategy for orphaned logs
                logger.error('Failed to complete success log in OTA XML Poller:', {
                    logId,
                    originalError: logError.message,
                    originalErrorStack: logError
                });
            }

            // Small delay between batches to prevent tight loops
            await delay(POLL_INTERVAL);

        } catch (error) {
            logger.error('Error in OTA XML Poller loop:', { requestId, error: error.message, stack: error.stack });

            if (logId) {
                try {
                    await completeLog(logId, 'failed', { error: error.message }, dbClient);
                } catch (logError) {
                    // TODO: Implement a cleanup/retry strategy for orphaned logs
                    logger.error('Failed to complete failure log in OTA XML Poller:', {
                        logId,
                        originalError: logError.message,
                        originalErrorStack: logError
                    });
                    // Do not rethrow to avoid masking the original error
                }
            }

            // If it's a database error or connection issue, release the client and wait longer
            if (isDbError(error)) {
                if (dbClient) {
                    try {
                        dbClient.release();
                    } catch (releaseErr) {
                        logger.error('Error releasing dbClient after loop error:', releaseErr);
                    }
                    dbClient = null;
                }
                logger.warn('Database connection error detected in poller, waiting 5 seconds before retry...', { errorCode: error.code });
                await delay(5000);
            } else {
                await delay(POLL_INTERVAL);
            }
        }
    }

    // Cleanup on stop
    if (dbClient) {
        dbClient.release();
        dbClient = null;
    }
    isPollerRunning = false;
    logger.info('OTA XML Poller loop stopped.');
}

function startOtaXmlPoller() {
    if (isPollerRunning) {
        logger.warn('OTA XML Poller is already running. Skipping start.');
        return;
    }
    otaXmlPollerLoop().catch(err => {
        logger.error('Fatal error in OTA XML Poller Loop:', err);
        isPollerRunning = false;
    });
}

function stopOtaXmlPoller() {
    if (!isPollerRunning) {
        logger.warn('OTA XML Poller is not running. Skipping stop.');
        return;
    }
    logger.info('Stopping OTA XML Poller.');
    stopRequested = true;
}

// Export the start/stop functions
module.exports = {
    startOtaXmlPoller,
    stopOtaXmlPoller,
    POLL_INTERVAL // Still export POLL_INTERVAL for index.js
};
