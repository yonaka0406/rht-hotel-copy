const { getPool, getProdPool } = require('../config/database');
const logger = require('../config/logger');
const { submitXMLTemplate, selectXMLTemplate } = require('../ota/xmlController'); // We will need a modified submitXMLTemplate
const { OtaApiError } = require('../ota/xmlController'); // Assuming OtaApiError is exported
const { updateOTAXmlQueue } = require('../ota/xmlModel');

// Simple Semaphore implementation (copied from xmlController for now, could be shared)
class Semaphore {
    constructor(maxConcurrency) {
        this.maxConcurrency = maxConcurrency;
        this.currentConcurrency = 0;
        this.waiting = [];
    }

    async acquire() {
        if (this.currentConcurrency < this.maxConcurrency) {
            this.currentConcurrency++;
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.waiting.push(resolve);
        });
    }

    release() {
        this.currentConcurrency--;
        if (this.waiting.length > 0) {
            const resolve = this.waiting.shift();
            this.currentConcurrency++;
            resolve();
        }
    }
}

const apiCallSemaphore = new Semaphore(3); // Limit to 3 simultaneous API calls for the poller

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 5; // Max retries for a queued item
const POLL_INTERVAL = 2000; // Poll every 2 seconds
const BATCH_SIZE = 3; // Process up to 3 items per poll cycle

async function fetchPendingRequests(limit) {
    const pool = getProdPool();
    try {
        // Select pending requests, ordered by creation time, and mark them as processing
        const result = await pool.query(
            `UPDATE ota_xml_queue
             SET status = 'processing', processed_at = CURRENT_TIMESTAMP
             WHERE id IN (
                 SELECT id FROM ota_xml_queue
                 WHERE status = 'pending' OR (status = 'failed' AND retries < $1)
                 ORDER BY created_at ASC
                 LIMIT $2
                 FOR UPDATE SKIP LOCKED
             )
             RETURNING *`,
            [MAX_RETRIES, limit]
        );
        return result.rows;
    } catch (error) {
        logger.error('Error fetching pending OTA XML requests:', { requestId, error: error.message, stack: error.stack });
        return [];
    }
}



async function processQueueItem(item) {
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

        // Acquire semaphore before making the actual API call
        await apiCallSemaphore.acquire();
        try {
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
            await submitXMLTemplate(dummyReq, dummyRes, item.hotel_id, item.service_name, item.xml_body, getProdPool());
            success = true;
        } finally {
            apiCallSemaphore.release();
        }
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
            await updateOTAXmlQueue(null, item.id, 'completed');
            logger.info(`Successfully processed queued item ID: ${item.id}`, { queueId: item.id });
        } catch (error) {
            logger.error(`Failed to update queue item ID: ${item.id} to completed`, { queueId: item.id, error: error.message });
        }
    } else {
        const newStatus = (item.retries + 1 >= MAX_RETRIES) ? 'failed' : 'pending'; // Mark as pending for retry
        try {
            await updateOTAXmlQueue(null, item.id, newStatus, errorMessage);
            logger.warn(`Queued item ID: ${item.id} marked as ${newStatus}. Retries: ${item.retries + 1}`, { queueId: item.id, newStatus });
        } catch (error) {
            logger.error(`Failed to update queue item ID: ${item.id} to ${newStatus}`, { queueId: item.id, error: error.message });
        }
    }
}

const { startLog, completeLog } = require('../models/cron_logs');

let isPolling = false;
let pollerIntervalId = null; // Internal interval ID for this module

async function otaXmlPoller() {
    if (isPolling) {
        logger.debug('OTA XML Poller already running, skipping this cycle.');
        return;
    }

    isPolling = true;
    const requestId = `ota-poller-${Date.now()}`; // Unique requestId for this poller cycle
    logger.debug('Starting OTA XML Poller cycle', { requestId });

    let logId = null;

    try {
        const pendingRequests = await fetchPendingRequests(BATCH_SIZE);
        if (pendingRequests.length === 0) {
            logger.debug('No pending OTA XML requests found.', { requestId });
        } else {
            // Start logging only when there is work
            logId = await startLog('OTA XML Poller');

            logger.info(`Fetched ${pendingRequests.length} pending OTA XML requests.`, { requestId });
            // Process items in parallel, but submitXMLTemplate itself is rate-limited by semaphore
            await Promise.all(pendingRequests.map(processQueueItem));

            await completeLog(logId, 'success', { processedItems: pendingRequests.length });
        }
    } catch (error) {
        logger.error('Error in OTA XML Poller cycle:', { requestId, error: error.message, stack: error.stack });
        if (logId) {
            await completeLog(logId, 'failed', { error: error.message });
        } else {
            // If we failed before starting the log (e.g., fetchPendingRequests error), log it now
            const errLogId = await startLog('OTA XML Poller');
            await completeLog(errLogId, 'failed', { error: error.message, phase: 'initialization' });
        }
    } finally {
        isPolling = false;
        logger.debug('Finished OTA XML Poller cycle', { requestId });
    }
}

function startOtaXmlPoller() {
    if (pollerIntervalId) {
        logger.warn('OTA XML Poller is already running. Skipping start.');
        return;
    }
    logger.info('Starting OTA XML Poller.');
    pollerIntervalId = setInterval(otaXmlPoller, POLL_INTERVAL);
}

function stopOtaXmlPoller() {
    if (pollerIntervalId) {
        logger.info('Stopping OTA XML Poller.');
        clearInterval(pollerIntervalId);
        pollerIntervalId = null;
    } else {
        logger.warn('OTA XML Poller is not running. Skipping stop.');
    }
}

// Export the start/stop functions
module.exports = {
    startOtaXmlPoller,
    stopOtaXmlPoller,
    POLL_INTERVAL // Still export POLL_INTERVAL for index.js
};
