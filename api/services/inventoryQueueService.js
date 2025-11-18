// api/services/inventoryQueueService.js
const logger = require('../config/logger');
const { submitXMLTemplate, selectXMLTemplate } = require('../ota/xmlController'); // We will need this function
const inventoryQueueModel = require('../models/inventoryQueueModel'); // Import the new model

let isProcessing = false;
const PROCESS_INTERVAL_MS = 5000; // 5 seconds delay between processing each item
const MAX_RETRIES = 3; // Maximum number of retries for a failed queue item

/**
 * Adds an inventory update request to the queue.
 * @param {string} requestId - The request ID for logging.
 * @param {number} hotelId - The ID of the hotel.
 * @param {number} logId - The log ID associated with the request.
 * @param {Array<object>} inventory - The inventory data to update.
 * @param {string} name - The service name (e.g., 'NetStockBulkAdjustmentService').
 * @param {object} template - The XML template for the request.
 */
const addToQueue = async (requestId, hotelId, logId, inventory, name, template) => {
    try {
        const newItem = await inventoryQueueModel.addQueueItem(requestId, hotelId, logId, name, template, inventory);
        logger.info(`[InventoryQueueService] Added request to persistent queue. Queue item ID: ${newItem.id}`, { requestId, hotelId, logId });
        startProcessing(); // Ensure processing starts if not already running
    } catch (error) {
        logger.error('[InventoryQueueService] Failed to add item to persistent queue', { requestId, hotelId, logId, error: error.message, stack: error.stack });
        throw error; // Re-throw to indicate failure to the caller
    }
};

/**
 * Processes a single item from the queue.
 * @param {object} item - The item to process from the queue.
 * @returns {Promise<void>}
 */
const processQueueItem = async (item) => {
    const { id: queueItemId, hotel_id, log_id, service_name, template_xml, payload, retries } = item;
    const requestId = `queue-${queueItemId}`; // Generate a unique requestId for this queue item processing
    logger.info(`[InventoryQueueService] Processing item from queue for hotel ${hotel_id}, log ${log_id}, attempt ${retries + 1}`, { requestId, queueItemId, hotel_id, log_id });

    let status = 'failed';
    let errorMessage = null;

    try {
        // Helper function to format date to YYYYMMDD
        const formatYYYYMMDD = (dateString) => {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return null;
            }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}${month}${day}`;
        };

        let adjustmentTargetXml = '';
        payload.forEach((invItem) => {
            const adjustmentDate = formatYYYYMMDD(invItem.date || invItem.saleDate); // Handle both date and saleDate
            const netRmTypeGroupCode = invItem.netrmtypegroupcode || invItem.netRmTypeGroupCode; // Handle both casings
            let remainingCount = parseInt(invItem.total_rooms) - parseInt(invItem.room_count);
            remainingCount = remainingCount < 0 ? 0 : remainingCount;

            let salesStatus = 3; // Default to no change
            if (invItem.salesStatus !== undefined) { // For manual updates
                salesStatus = parseInt(invItem.salesStatus);
                if (salesStatus === 0) {
                    salesStatus = 3; // No change
                } else if (salesStatus === 1) {
                    salesStatus = 1; // Start sales
                } else {
                    salesStatus = 2; // Stop sales
                }
            }

            adjustmentTargetXml += `
                <adjustmentTarget>
                    <adjustmentProcedureCode>1</adjustmentProcedureCode>
                    <netRmTypeGroupCode>${netRmTypeGroupCode}</netRmTypeGroupCode>
                    <adjustmentDate>${adjustmentDate}</adjustmentDate>
                    <remainingCount>${remainingCount}</remainingCount>
                    <salesStatus>${salesStatus}</salesStatus>
                </adjustmentTarget>
            `;
        });

        let xmlBody = template_xml.replace(
            `<adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode}}</adjustmentProcedureCode>
               <netRmTypeGroupCode>{{netRmTypeGroupCode}}</netRmTypeGroupCode>
               <adjustmentDate>{{adjustmentDate}}</adjustmentDate>
               <remainingCount>{{remainingCount}}</remainingCount>
               <salesStatus>{{salesStatus}}</salesStatus>               
            </adjustmentTarget>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode2}}</adjustmentProcedureCode>
               <netRmTypeGroupCode>{{netRmTypeGroupCode2}}</netRmTypeGroupCode>
               <adjustmentDate>{{adjustmentDate2}}</adjustmentDate>
               <remainingCount>{{remainingCount2}}</remainingCount>
               <salesStatus>{{salesStatus2}}</salesStatus>               
            </adjustmentTarget>`,
            adjustmentTargetXml
        );

        // Replace requestId placeholder if it exists in the template
        if (xmlBody.includes('{{requestId}}')) {
            let reqId = requestId.toString();
            if (reqId.length > 8) {
                reqId = reqId.slice(-8);
            }
            xmlBody = xmlBody.replace('{{requestId}}', reqId);
        }

        // submitXMLTemplate expects req, res, hotel_id, name, xml
        // We need to mock req and res for this context
        const mockReq = { requestId: requestId };
        const mockRes = {}; // submitXMLTemplate doesn't use res for sending responses in this context

        await submitXMLTemplate(mockReq, mockRes, hotel_id, service_name, xmlBody);
        logger.info(`[InventoryQueueService] Successfully processed inventory update for hotel ${hotel_id}, log ${log_id}`, { requestId, queueItemId, hotel_id, log_id });
        status = 'completed';
    } catch (error) {
        errorMessage = error.message;
        logger.error(`[InventoryQueueService] Failed to process inventory update for hotel ${hotel_id}, log ${log_id}, attempt ${retries + 1}`, {
            requestId,
            queueItemId,
            hotel_id,
            log_id,
            error: error.message,
            stack: error.stack
        });

        if (retries < MAX_RETRIES) {
            // If the original service was NetStockBulkAdjustmentService, switch to resend service for retry
            if (service_name === 'NetStockBulkAdjustmentService') {
                const resendServiceName = 'NetStockBulkAdjustmentResponseResendService';
                try {
                    const resendTemplate = await selectXMLTemplate(requestId, hotel_id, resendServiceName);
                    if (resendTemplate) {
                        // Update the queue item with the new service name and template for retry
                        await inventoryQueueModel.updateQueueItemForRetry(
                            requestId,
                            queueItemId,
                            resendServiceName,
                            resendTemplate,
                            errorMessage
                        );
                        status = 'pending'; // Mark as pending for retry
                        logger.warn(`[InventoryQueueService] Retrying item ${queueItemId} using ${resendServiceName}. Attempt ${retries + 1} of ${MAX_RETRIES}.`, { requestId, queueItemId, hotel_id, log_id });
                    } else {
                        logger.error(`[InventoryQueueService] Resend template not found for ${resendServiceName}. Marking item as failed.`, { requestId, queueItemId, hotel_id, log_id });
                        status = 'failed'; // Cannot retry with resend service if template is missing
                    }
                } catch (templateError) {
                    logger.error(`[InventoryQueueService] Error fetching resend template for ${resendServiceName}. Marking item as failed.`, { requestId, queueItemId, hotel_id, log_id, error: templateError.message });
                    status = 'failed'; // Cannot retry if template fetching fails
                }
            } else {
                // For other services, simply retry with the same service name
                status = 'pending'; // Mark as pending for retry
                logger.warn(`[InventoryQueueService] Retrying item ${queueItemId}. Attempt ${retries + 1} of ${MAX_RETRIES}.`, { requestId, queueItemId, hotel_id, log_id });
            }
        } else {
            status = 'failed'; // Max retries reached, mark as failed
            logger.error(`[InventoryQueueService] Item ${queueItemId} failed after ${MAX_RETRIES} retries.`, { requestId, queueItemId, hotel_id, log_id });
        }
    } finally {
        try {
            // Only update status if it's not already handled by updateQueueItemForRetry
            if (status !== 'pending' || retries >= MAX_RETRIES) { // If it's failed or max retries reached
                await inventoryQueueModel.updateQueueItemStatus(requestId, queueItemId, status, errorMessage);
            }
        } catch (updateError) {
            logger.error('[InventoryQueueService] Failed to update queue item status in DB', { requestId, queueItemId, status, updateError: updateError.message, stack: updateError.stack });
        }
    }
};

/**
 * Starts the queue processing loop.
 */
const startProcessing = () => {
    if (isProcessing) {
        return;
    }

    isProcessing = true;
    logger.info('[InventoryQueueService] Starting queue processing loop.');

    const processNext = async () => {
        let item = null;
        try {
            item = await inventoryQueueModel.getAndLockPendingItem('system-queue-processor'); // Use a system requestId
            if (item) {
                await processQueueItem(item);
                // If an item was processed, schedule the next processing after the interval
                setTimeout(processNext, PROCESS_INTERVAL_MS);
            } else {
                // If no item was found, wait a bit longer before checking again to avoid busy-waiting
                isProcessing = false; // Allow it to be re-triggered by addToQueue
                logger.info('[InventoryQueueService] No pending items found. Stopping processing loop until new items are added.');
            }
        } catch (error) {
            logger.error('[InventoryQueueService] Error fetching or processing queue item', { error: error.message, stack: error.stack });
            // In case of an error during fetching or initial processing, still wait before retrying
            setTimeout(processNext, PROCESS_INTERVAL_MS);
        }
    };

    // Start the first processing cycle immediately
    processNext();
};

module.exports = {
    addToQueue,
    startProcessing
};
