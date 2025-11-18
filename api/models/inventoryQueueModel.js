// api/models/inventoryQueueModel.js
const { getPool } = require('../config/database');
const logger = require('../config/logger');

/**
 * Adds an item to the inventory_update_queue table.
 * @param {string} requestId - The request ID for logging.
 * @param {number} hotelId - The ID of the hotel.
 * @param {number} logId - The log ID associated with the request.
 * @param {string} serviceName - The name of the service (e.g., 'NetStockBulkAdjustmentService').
 * @param {string} templateXml - The XML template used for the request.
 * @param {object} payload - The inventory data (JSONB).
 * @returns {Promise<object>} - The newly inserted queue item.
 */
const addQueueItem = async (requestId, hotelId, logId, serviceName, templateXml, payload) => {
    const pool = getPool(requestId);
    const client = await pool.connect();
    try {
        const result = await client.query(
            `INSERT INTO inventory_update_queue (hotel_id, log_id, service_name, template_xml, payload)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [hotelId, logId, serviceName, templateXml, payload]
        );
        logger.debug('[inventoryQueueModel] Added item to queue', { requestId, hotelId, logId, queueId: result.rows[0].id });
        return result.rows[0];
    } catch (error) {
        logger.error('[inventoryQueueModel] Error adding item to queue', { requestId, hotelId, logId, error: error.message, stack: error.stack });
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Fetches a single pending item from the queue and marks it as 'processing'.
 * This helps prevent multiple workers from processing the same item.
 * @param {string} requestId - The request ID for logging.
 * @returns {Promise<object|null>} - The pending queue item, or null if none found.
 */
const getAndLockPendingItem = async (requestId) => {
    const pool = getPool(requestId);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Select a pending item and lock it for update
        const selectResult = await client.query(
            `SELECT * FROM inventory_update_queue
             WHERE status = 'pending'
             ORDER BY created_at ASC
             FOR UPDATE SKIP LOCKED
             LIMIT 1`
        );

        if (selectResult.rows.length > 0) {
            const item = selectResult.rows[0];
            // Update status to 'processing'
            const updateResult = await client.query(
                `UPDATE inventory_update_queue
                 SET status = 'processing', last_attempt = CURRENT_TIMESTAMP
                 WHERE id = $1
                 RETURNING *`,
                [item.id]
            );
            await client.query('COMMIT');
            logger.debug('[inventoryQueueModel] Fetched and locked pending item', { requestId, queueId: item.id });
            return updateResult.rows[0];
        } else {
            await client.query('COMMIT'); // Commit the BEGIN even if no row was found
            return null;
        }
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('[inventoryQueueModel] Error fetching and locking pending item', { requestId, error: error.message, stack: error.stack });
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Updates the status of a queue item.
 * @param {string} requestId - The request ID for logging.
 * @param {number} itemId - The ID of the queue item.
 * @param {string} status - The new status ('completed', 'failed').
 * @param {string} [errorMessage=null] - Error message if status is 'failed'.
 * @returns {Promise<object>} - The updated queue item.
 */
const updateQueueItemStatus = async (requestId, itemId, status, errorMessage = null) => {
    const pool = getPool(requestId);
    const client = await pool.connect();
    try {
        let query;
        let params;
        if (status === 'failed') {
            query = `UPDATE inventory_update_queue
                     SET status = $1, error_message = $2, retries = retries + 1, processed_at = CURRENT_TIMESTAMP
                     WHERE id = $3
                     RETURNING *`;
            params = [status, errorMessage, itemId];
        } else {
            query = `UPDATE inventory_update_queue
                     SET status = $1, processed_at = CURRENT_TIMESTAMP
                     WHERE id = $2
                     RETURNING *`;
            params = [status, itemId];
        }
        const result = await client.query(query, params);
        logger.debug('[inventoryQueueModel] Updated queue item status', { requestId, queueId: itemId, newStatus: status });
        return result.rows[0];
    } catch (error) {
        logger.error('[inventoryQueueModel] Error updating queue item status', { requestId, queueId: itemId, newStatus: status, error: error.message, stack: error.stack });
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Updates a queue item for retry, changing service name and template if applicable.
 * @param {string} requestId - The request ID for logging.
 * @param {number} itemId - The ID of the queue item.
 * @param {string} newServiceName - The new service name for retry.
 * @param {string} newTemplateXml - The new XML template for retry.
 * @param {string} [errorMessage=null] - Error message from the failed attempt.
 * @returns {Promise<object>} - The updated queue item.
 */
const updateQueueItemForRetry = async (requestId, itemId, newServiceName, newTemplateXml, errorMessage = null) => {
    const pool = getPool(requestId);
    const client = await pool.connect();
    try {
        const result = await client.query(
            `UPDATE inventory_update_queue
             SET status = 'pending',
                 service_name = $1,
                 template_xml = $2,
                 error_message = $3,
                 retries = retries + 1,
                 last_attempt = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [newServiceName, newTemplateXml, errorMessage, itemId]
        );
        logger.debug('[inventoryQueueModel] Updated queue item for retry', { requestId, queueId: itemId, newServiceName });
        return result.rows[0];
    } catch (error) {
        logger.error('[inventoryQueueModel] Error updating queue item for retry', { requestId, queueId: itemId, error: error.message, stack: error.stack });
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    addQueueItem,
    getAndLockPendingItem,
    updateQueueItemStatus,
    updateQueueItemForRetry
};
