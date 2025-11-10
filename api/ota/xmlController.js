require("dotenv").config();
const xml2js = require('xml2js');
const { 
    selectXMLTemplate, 
    selectXMLRecentResponses, 
    insertXMLRequest, 
    insertXMLResponse, 
    selectTLRoomMaster, 
    insertTLRoomMaster, 
    selectTLPlanMaster, 
    insertTLPlanMaster,
    insertOTAReservationQueue,
    updateOTAReservationQueue,
    getOTAReservationsByTransaction,
    selectOTAReservationQueue
} = require('../ota/xmlModel');
const { getAllHotelSiteController } = require('../models/hotel');
const { addOTAReservation, editOTAReservation, cancelOTAReservation } = require('../models/reservations');
const { getPool } = require('../config/database');
const logger = require('../config/logger'); // Winston logger

/**
 * Process reservation data and add to OTA queue
 * @param {string} requestId - The request ID for logging
 * @param {object} reservationData - The parsed reservation data
 * @param {number} hotelId - The hotel ID
 * @returns {Promise<object>} - The processed reservation data
 */
/**
 * Process queued reservations within a transaction
 * @param {string} requestId - The request ID for logging
 * @param {Array} reservations - Array of queued reservations
 * @param {object} client - Database client with active transaction
 * @returns {Promise<object>} - Processing results
 */
async function processQueuedReservations(requestId, reservations, client) {
    const results = {
        total: reservations.length,
        processed: 0,
        failed: 0,
        details: []
    };

    logger.debug('[processQueuedReservations] Starting to process queued reservations', {
        requestId,
        totalReservations: reservations.length,
        sampleReservation: JSON.stringify(reservations[0], null, 2) // Log first reservation as sample
    });

    for (const [index, reservation] of reservations.entries()) {
        logger.debug(`[processQueuedReservations] Processing reservation ${index + 1}/${reservations.length}`, {
            requestId,
            reservationId: reservation._otaReservationId,
            queueId: reservation._queueId,
            transactionId: reservation._transactionId,
            reservationKeys: Object.keys(reservation).filter(k => !k.startsWith('_')),
            hasTransactionType: !!reservation.TransactionType,
            transactionInProgress: client ? 'Using provided transaction' : 'No transaction provided'
        });
        
        // Log the actual transaction status
        try {
            const txStatus = await client.query('SELECT txid_current_if_assigned() as txid');
            logger.debug(`[processQueuedReservations] Transaction status`, {
                requestId,
                transactionId: reservation._transactionId,
                txid: txStatus.rows[0].txid
            });
        } catch (txErr) {
            logger.error(`[processQueuedReservations] Error checking transaction status`, {
                requestId,
                error: txErr.message
            });
        }
        
        // Log detailed reservation data structure
        logger.debug('[processQueuedReservations] Full reservation data:', {
            requestId,
            reservation: JSON.stringify(reservation, null, 2).substring(0, 1000) // Limit size
        });
        
        try {
            // Use the reservation object directly since it already contains the data at the top level
            const { _queueId, _otaReservationId, _transactionId, ...reservationData } = reservation;
            const hotelId = reservationData.hotelId; // This should be set from processAndQueueReservation
            
            // Log reservation data structure
            logger.debug('[processQueuedReservations] Reservation data structure:', {
                requestId,
                hasTransactionType: !!reservation.TransactionType,
                transactionTypeKeys: reservation.TransactionType ? Object.keys(reservation.TransactionType) : 'none',
                dataClassification: reservation.TransactionType?.DataClassification || 'none',
                topLevelKeys: Object.keys(reservation).filter(k => !k.startsWith('_'))
            });
            
            const classification = reservation.TransactionType?.DataClassification;
            
            if (!classification) {
                logger.error('[processQueuedReservations] Missing classification in reservation data', {
                    requestId,
                    reservationData: JSON.stringify(reservationData, null, 2).substring(0, 1000)
                });
                throw new Error('Missing transaction type classification in reservation data');
            }
            
            logger.debug(`[processQueuedReservations] Processing ${classification} for reservation`, {
                requestId,
                hotelId,
                otaReservationId: reservation._otaReservationId,
                transactionId: reservation._transactionId
            });

            let result = { success: false };
            
            // Process based on reservation type
            logger.debug(`[processQueuedReservations] Processing reservation type: ${classification}`, {
                requestId,
                reservationId: reservation._otaReservationId,
                transactionId: reservation._transactionId
            });

            try {
                switch(classification) {
                    case 'NewBookReport':
                        logger.debug(`[processQueuedReservations] Calling addOTAReservation`, {
                            requestId,
                            reservationId: reservation._otaReservationId,
                            hotelId,
                            hasClient: !!client
                        });
                        result = await addOTAReservation(requestId, hotelId, reservationData, client);
                        break;
                        
                    case 'ModificationReport':
                        logger.debug(`[processQueuedReservations] Calling editOTAReservation`, {
                            requestId,
                            reservationId: reservation._otaReservationId,
                            hotelId,
                            hasClient: !!client
                        });
                        result = await editOTAReservation(requestId, hotelId, reservationData, client);
                        break;
                        
                    case 'CancellationReport':
                        logger.debug(`[processQueuedReservations] Calling cancelOTAReservation`, {
                            requestId,
                            reservationId: reservation._otaReservationId,
                            hotelId,
                            hasClient: !!client
                        });
                        result = await cancelOTAReservation(requestId, hotelId, reservationData, client);
                        break;
                        
                    default:
                        throw new Error(`Unsupported reservation type: ${classification}`);
                }
                
                logger.debug(`[processQueuedReservations] Reservation processed successfully`, {
                    requestId,
                    reservationId: reservation._otaReservationId,
                    result: result
                });
            } catch (processErr) {
                logger.error(`[processQueuedReservations] Error processing reservation`, {
                    requestId,
                    reservationId: reservation._otaReservationId,
                    error: processErr.message,
                    stack: processErr.stack
                });
                throw processErr; // Re-throw to be caught by the outer try-catch
            }

            // Update queue status
            if (result.success) {
                await updateOTAReservationQueue(
                    requestId,
                    reservation._queueId,  // The queue entry ID
                    'processed',           // Status
                    null                   // conflictDetails
                );
                results.processed++;
                results.details.push({
                    otaReservationId: reservation._otaReservationId,
                    status: 'success',
                    message: result.message
                });
            } else {
                throw new Error(result.message || 'Failed to process reservation');
            }
            
        } catch (error) {
            const { hotelId, otaReservationId, transactionId } = reservation;
            const errorMessage = error.message || 'Unknown error processing reservation';
            
            // Update each queue entry individually to ensure all are marked as failed
            logger.debug('[processQueuedReservations] Marking queue entries as failed', {
                requestId,
                transactionId,
                otaReservationId,
                error: errorMessage
            });
            
            // Get all queue entries for this transaction
            const queueEntries = await client.query(
                'SELECT id, status, ota_reservation_id FROM ota_reservation_queue WHERE transaction_id = $1',
                [transactionId]
            );
            
            logger.debug('[processQueuedReservations] Found queue entries to update', {
                requestId,
                transactionId,
                entryCount: queueEntries.rowCount
            });
            
            // Update each entry individually
            const updatePromises = queueEntries.rows.map(async (entry) => {
                try {
                    await updateOTAReservationQueue(
                        requestId,
                        entry.id,
                        'failed',
                        { error: errorMessage }
                    );
                    logger.debug('[processQueuedReservations] Updated queue entry', {
                        requestId,
                        queueId: entry.id,
                        otaReservationId: entry.ota_reservation_id,
                        status: 'failed'
                    });
                    return true;
                } catch (updateError) {
                    logger.error('[processQueuedReservations] Failed to update queue entry', {
                        requestId,
                        queueId: entry.id,
                        otaReservationId: entry.ota_reservation_id,
                        error: updateError.message
                    });
                    return false;
                }
            });
            
            // Wait for all updates to complete
            const updateResults = await Promise.all(updatePromises);
            const successfulUpdates = updateResults.filter(Boolean).length;
            
            logger.debug('[processQueuedReservations] Queue entries update summary', {
                requestId,
                transactionId,
                totalEntries: queueEntries.rowCount,
                successfulUpdates,
                failedUpdates: queueEntries.rowCount - successfulUpdates
            });
            
            if (successfulUpdates === 0 && queueEntries.rowCount > 0) {
                throw new Error('Failed to update any queue entries to failed status');
            }
            
            results.failed++;
            results.details.push({
                otaReservationId: otaReservationId || 'unknown',
                status: 'failed',
                message: errorMessage
            });

            // --- START: Custom logic to set dates to not-for-sale on failure ---
            try {
                logger.info('[processQueuedReservations] Initiating not-for-sale process for transaction.', {
                    requestId,
                    hotelId,
                    transactionId
                });

                if (reservations.length > 0) {
                    const allDates = new Set();
                    const allGroupCodes = new Set();

                    for (const res of reservations) {
                        const resData = res.reservationData || res;
                        if (resData && resData.BasicInformation && resData.RisaplsInformation?.RisaplsCommonInformation?.RoomAndRoomRateInformation) {
                            const { CheckInDate: checkIn, CheckOutDate: checkOut } = resData.BasicInformation;
                            const roomAndRateInfo = resData.RisaplsInformation.RisaplsCommonInformation.RoomAndRoomRateInformation;

                            // Collect group codes
                            let groupCodes = [];
                            if (Array.isArray(roomAndRateInfo)) {
                                groupCodes = roomAndRateInfo.map(item => item.RoomInformation?.NetRmTypeGroupCode);
                            } else if (typeof roomAndRateInfo === 'object' && roomAndRateInfo !== null) {
                                groupCodes = Object.values(roomAndRateInfo).map(item => item.RoomInformation?.NetRmTypeGroupCode);
                            }
                            groupCodes.filter(Boolean).forEach(code => allGroupCodes.add(code));

                            // Collect dates
                            if (checkIn && checkOut) {
                                try {
                                    const startDate = new Date(checkIn.slice(0,4), checkIn.slice(4,6) - 1, checkIn.slice(6,8));
                                    const endDate = new Date(checkOut.slice(0,4), checkOut.slice(4,6) - 1, checkOut.slice(6,8));
                                    for (let d = startDate; d < endDate; d.setDate(d.getDate() + 1)) {
                                        const saleDate = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
                                        allDates.add(saleDate);
                                    }
                                } catch(dateError){
                                    logger.error("Error parsing dates in not-for-sale logic", { checkIn, checkOut, dateError });
                                }
                            }
                        }
                    }

                    const uniqueDates = Array.from(allDates);
                    const uniqueGroupCodes = Array.from(allGroupCodes);

                    if (uniqueDates.length > 0 && uniqueGroupCodes.length > 0) {
                        const inventoryToUpdate = [];
                        for (const saleDate of uniqueDates) {
                            for (const groupCode of uniqueGroupCodes) {
                                inventoryToUpdate.push({
                                    saleDate: saleDate,
                                    netRmTypeGroupCode: groupCode
                                });
                            }
                        }
                        
                        if (inventoryToUpdate.length > 0) {
                            await setDatesNotForSale({ requestId }, null, hotelId, inventoryToUpdate);
                        }
                    }
                }
            } catch (nfsError) {
                logger.error('[processQueuedReservations] Failed to execute transaction-wide not-for-sale logic.', {
                    requestId,
                    hotelId,
                    transactionId,
                    error: nfsError.message,
                    stack: nfsError.stack
                });
            }
            // --- END: Custom logic ---

            
            // Re-throw to trigger transaction rollback
            throw error;
        }
    }
    
    return results;
}

/**
 * Process and queue a single reservation
 * @param {string} requestId - The request ID for logging
 * @param {object} reservationData - The parsed reservation data
 * @param {number} hotelId - The hotel ID
 * @returns {Promise<object>} - The processed reservation data
 */
async function processAndQueueReservation(requestId, reservationData, hotelId) {
    try {
        const transactionId = reservationData.TransactionType?.DataID;
        const otaReservationId = reservationData.BasicInformation?.TravelAgencyBookingNumber || `temp_${Date.now()}`;
        
        if (!transactionId) {
            logger.warn('Skipping queue insertion - Missing transaction ID', { 
                requestId,
                hotelId,
                otaReservationId 
            });
            return { ...reservationData, _queueStatus: 'skipped' };
        }
        
        // Add to OTA queue
        const queueResult = await insertOTAReservationQueue(requestId, {
            hotelId,
            otaReservationId,
            transactionId,
            reservationData,
            status: 'pending',
            conflictDetails: null
        });
        
        const queueEntryId = queueResult?.id;
        
        logger.debug('Successfully added reservation to OTA queue', { 
            requestId,
            hotelId,
            transactionId,
            otaReservationId,
            queueEntryId
        });
        
        return { 
            ...reservationData, 
            _queueStatus: 'queued',
            _transactionId: transactionId,
            _otaReservationId: otaReservationId,
            _queueId: queueEntryId,
            hotelId: hotelId
        };
        
    } catch (error) {
        logger.error('Error processing and queuing reservation:', {
            requestId,
            hotelId,
            error: error.message,
            stack: error.stack
        });
        
        return { 
            ...reservationData, 
            _queueStatus: 'error',
            _error: error.message
        };
    }
}

// GET
const getXMLTemplate = async (req, res) => {
    const hotel_id = req.params.hotel_id;
    const name = req.params.name;
    
    try {
        const template = await selectXMLTemplate(req.requestId, hotel_id, name);
        res.send(template);
    } catch (error) {
        console.error('Error getting xml template:', error);
        res.status(500).json({ error: error.message });
    }
};

const getRecentQueuedReservations = async (req, res) => {
    try {
        const queue = await selectOTAReservationQueue(req.requestId);
        res.json(queue);
    } catch (error) {
        console.error('Error getting ota queue:', error);
        res.status(500).json({ error: error.message });
    }
};
const getXMLRecentResponses = async (req, res) => {
    try {
        const responses = await selectXMLRecentResponses(req.requestId);
        res.json(responses);        
    } catch (error) {
        console.error('Error getting xml responses:', error);
        res.status(500).json({ error: error.message });
    }
};

// POST
const postXMLResponse = async (req, res) => {    
    const { hotel_id, name } = req.params;
    const xml = req.body.toString('utf8');

    // logger.debug('postXMLResponse', req.params, xml);

    try {
        const parser = new xml2js.Parser();
        parser.parseString(xml, async (err, result) => {
            if (err) {
                console.error('Error parsing XML:', err);
                return res.status(400).json({ error: 'Invalid XML' });
            }
            // logger.debug('Parsed XML:', result);

            try {
                const responseXml = await submitXMLTemplate(req, res, hotel_id, name, xml);
                // logger.debug('XML response added successfully', responseXml);
                res.json({ response: 'XML response added successfully', data: responseXml });
            } catch (error) {
                console.error('Error in submitXMLTemplate:', error);
                res.status(500).json({ error: error.message });
            }

        });
    } catch (error) {
        console.error('Error getting xml template:', error);
        res.status(500).json({ error: error.message });
    }
};

// Lincoln
const submitXMLTemplate = async (req, res, hotel_id, name, xml) => {
    // logger.debug('submitXMLTemplate', name, xml);    
    
    try {        
        // Save the request in the database
        await insertXMLRequest(req.requestId, hotel_id, name, xml);

        const url = `${process.env.XML_REQUEST_URL}${name}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {                
                'Content-Type': 'text/xml',
            },
            body: xml,
        });
        if (!response.ok) {
            const errorText = await response.text(); // Get the error response body
            logger.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                errorText,
                serviceName: name,
                hotelId: hotel_id,
                requestId: req.requestId,
            });
            throw new Error(`Failed to submit XML template for ${name}: ${response.status} ${response.statusText}`);
        }

        // Save the response using insertXMLResponse
        const responseXml = await response.text();
        // logger.debug('Response XML:', responseXml);
        // logger.debug('Inserting XML response into database...');
        await insertXMLResponse(req.requestId, hotel_id, name, responseXml);

        // Parse the XML response using xml2js
        const parsedJson = new Promise((resolve, reject) => {
            xml2js.parseString(responseXml, { explicitArray: false }, (err, result) => {
                if (err) {
                  logger.error('Error parsing XML response:', {
                    error: err,
                    serviceName: name,
                    hotelId: hotel_id,
                    requestId: req.requestId,
                    xmlResponse: responseXml, // Log the problematic XML
                  });
                  reject(err);
                } else {
                    // Check for isSuccess tag
                    const isSuccess = result?.['S:Envelope']?.['S:Body']?.['ns2:executeResponse']?.['return']?.['commonResponse']?.['isSuccess'];
                    if (isSuccess === 'false') {
                        const errorDescription = result?.['S:Envelope']?.['S:Body']?.['ns2:executeResponse']?.['return']?.['commonResponse']?.['errorDescription'];
                        logger.error('API Call Failed (isSuccess=false):', {
                            serviceName: name,
                            hotelId: hotel_id,
                            requestId: req.requestId,
                            errorDescription: errorDescription || 'No error description provided.',
                            xmlResponse: responseXml,
                        });
                        reject(new Error(`API call to ${name} failed: ${errorDescription || 'isSuccess is false'}`));
                    }
                    resolve(result);
                }
            });
        });
        return parsedJson;        
    } catch (error) {
        logger.error('Failed to submit XML template', {
            error: error.message,
            serviceName: name,
            hotelId: hotel_id,
            requestId: req.requestId,
            stack: error.stack,
        });
        throw error; // Re-throw the error to be caught by the caller
    } 
};
const getTLRoomMaster = async (req, res) => {
    const hotel_id = req.params.hotel_id;

    try {
        const master = await selectTLRoomMaster(req.requestId, hotel_id);
        res.send(master);
    } catch (error) {
        console.error('Error getting TL data:', error);
        res.status(500).json({ error: error.message });
    }
};
const createTLRoomMaster = async (req, res) => {    
    const data = req.body;
    
    try {
        const master = await insertTLRoomMaster(req.requestId, data);
        res.json(master);
    } catch (err) {
        console.error('Error creating master:', err);
        res.status(500).json({ error: 'Failed to create master' });
    }
};
const getTLPlanMaster = async (req, res) => {
    const hotel_id = req.params.hotel_id;

    try {
        const master = await selectTLPlanMaster(req.requestId, hotel_id);
        res.send(master);
    } catch (error) {
        console.error('Error getting TL data:', error);
        res.status(500).json({ error: error.message });
    }
};
const createTLPlanMaster = async (req, res) => {    
    const data = req.body;
    
    try {
        const master = await insertTLPlanMaster(req.requestId, data);
        res.json(master);
    } catch (err) {
        console.error('Error creating master:', err);
        res.status(500).json({ error: 'Failed to create master' });
    }
};

const getOTAReservations = async (req, res) => {
    const name = 'BookingInfoOutputService';
    const requestId = req.requestId || 'no-request-id';
    let hotels = [];
    let queuedReservations = [];

    logger.debug(`[${requestId}] Starting getOTAReservations`);

    try {
        // Get hotels with retry logic for database connection
        try {
            logger.debug(`[${requestId}] Attempting to fetch hotels using getAllHotelSiteController`);
            hotels = await getAllHotelSiteController(requestId);
            logger.debug(`[${requestId}] getAllHotelSiteController returned ${hotels?.length || 0} hotels`);
            
            if (!hotels || hotels.length === 0) {
                const errorMsg = 'No hotels found.';
                console.error(`[${requestId}] ${errorMsg}`);
                logger.warn(errorMsg);
                return res.status(404).send({ error: errorMsg });
            }
        } catch (hotelError) {
            const errorMsg = `Error fetching hotels: ${hotelError.message}`;
            console.error(`[${requestId}] ${errorMsg}`, { stack: hotelError.stack });
            logger.error('Error fetching hotels:', {
                requestId,
                error: hotelError.message,
                stack: hotelError.stack
            });
            return res.status(500).send({ 
                error: 'Database connection error',
                details: 'Could not connect to the database server. Please check if PostgreSQL is running.',
                originalError: hotelError.message
            });
        }

        // Process each hotel's reservations
        logger.debug(`[${requestId}] Starting to process ${hotels.length} hotels`);
        
        for (const [index, hotel] of hotels.entries()) {
            const hotelId = hotel.hotel_id;
            let dbClient;
            let isTransactionActive = false;

            logger.debug(`[${requestId}] [${index+1}/${hotels.length}] Processing hotel ID: ${hotelId}`);

            try {
                // Get database pool and client with error handling
                logger.debug(`[${requestId}] [Hotel ${hotelId}] Getting database pool`);
                const pool = getPool(requestId);
                
                try {
                    logger.debug(`[${requestId}] [Hotel ${hotelId}] Attempting to connect to database`);
                    dbClient = await pool.connect();
                    logger.debug(`[${requestId}] [Hotel ${hotelId}] Successfully connected to database`);
                } catch (connectError) {
                    const errorMsg = `Database connection error for hotel ${hotelId}: ${connectError.message}`;
                    console.error(`[${requestId}] ${errorMsg}`, { stack: connectError.stack });
                    logger.error('Database connection error:', {
                        requestId,
                        hotelId,
                        error: connectError.message,
                        stack: connectError.stack
                    });
                    continue; // Skip to next hotel if we can't connect
                }

                // Get the template with credentials already injected
                const template = await selectXMLTemplate(requestId, hotelId, name);
                if (!template) {
                    logger.warn(`XML template not found for hotel_id: ${hotelId}`, { requestId });
                    continue;
                }
                logger.debug(`[${requestId}] [Hotel ${hotelId}] selectXMLTemplate response: ${template}`);

                // Fetch the OTA reservations
                const reservations = await submitXMLTemplate(req, res, hotelId, name, template);
                const executeResponse = reservations?.['S:Envelope']?.['S:Body']?.['ns2:executeResponse'];
                const bookingInfoListWrapper = executeResponse?.return?.bookingInfoList;
                const bookingInfoList = Array.isArray(bookingInfoListWrapper) ? 
                    bookingInfoListWrapper : 
                    (bookingInfoListWrapper ? [bookingInfoListWrapper] : []);

                if (!bookingInfoList || bookingInfoList.length === 0 || bookingInfoList[0] === null) {
                    logger.info('No booking information found in the response.', { requestId, hotelId });
                    continue;
                }

                // Process each bookingInfo to parse the inner infoTravelXML and add to queue
                queuedReservations = []; // Reset for each hotel
                for (const [idx, bookingInfo] of bookingInfoList.entries()) {
                    if (!bookingInfo?.infoTravelXML) {
                        logger.warn(`Skipping booking info at index ${idx} - missing infoTravelXML`, { 
                            requestId,
                            hotelId,
                            index: idx 
                        });
                        continue;
                    }

                    try {
                        // Parse the inner XML
                        const parsedXML = await new Promise((resolve, reject) => {
                            xml2js.parseString(bookingInfo.infoTravelXML, { explicitArray: false }, (err, result) => {
                                if (err) reject(err);
                                else resolve(result);
                            });
                        });

                        const allotmentBookingReport = parsedXML?.AllotmentBookingReport;
                        if (!allotmentBookingReport) {
                            logger.warn('No AllotmentBookingReport found in parsed XML', { 
                                requestId,
                                hotelId,
                                index: idx 
                            });
                            continue;
                        }

                        // Process and queue the reservation
                        const queuedReservation = await processAndQueueReservation(
                            requestId, 
                            allotmentBookingReport, 
                            hotelId
                        );
                        
                        if (queuedReservation._queueStatus === 'queued') {
                            queuedReservations.push({
                                ...queuedReservation,
                                _originalBookingInfo: bookingInfo
                            });
                        } else if (queuedReservation._queueStatus === 'error') {
                            logger.error('Failed to queue reservation', {
                                requestId,
                                hotelId,
                                error: queuedReservation._error,
                                reservation: queuedReservation
                            });
                        }
                        
                    } catch (parseError) {
                        logger.error('Error parsing infoTravelXML:', {
                            requestId,
                            hotelId,
                            index: idx,
                            error: parseError.message,
                            stack: parseError.stack
                        });
                    }
                }

                // Skip if no valid reservations were queued
                if (queuedReservations.length === 0) {
                    logger.info('No valid reservations to process', { requestId, hotelId });
                    continue;
                }

                logger.info(`Successfully queued ${queuedReservations.length} reservations for processing`, { 
                    requestId, 
                    hotelId 
                });

                // Start transaction for processing reservations
                try {
                    await dbClient.query('BEGIN');
                    isTransactionActive = true;
                    logger.debug(`Started transaction for hotel_id: ${hotelId}`, { requestId });

                    // Process all queued reservations in the transaction
                    const processResults = await processQueuedReservations(
                        requestId,
                        queuedReservations,
                        dbClient
                    );

                    // If we get here, all reservations were processed successfully
                    await dbClient.query('COMMIT');
                    isTransactionActive = false;
                    logger.info(`Successfully processed ${processResults.processed} reservations for hotel_id: ${hotelId}`, {
                        requestId,
                        ...processResults
                    });

                    // Send success notification to OTA
                    const outputId = executeResponse?.return?.configurationSettings?.outputId;
                    if (outputId) {
                        try {
                            await successOTAReservations(req, res, hotelId, outputId);
                            logger.info('Successfully notified OTA of completed processing', {
                                requestId,
                                hotelId,
                                outputId
                            });
                        } catch (notifyError) {
                            logger.error('Error notifying OTA of completed processing', {
                                requestId,
                                hotelId,
                                outputId,
                                error: notifyError.message,
                                stack: notifyError.stack
                            });
                            // Don't fail the entire process if notification fails
                        }
                    } else {
                        logger.warn('No outputId found for OTA notification', { requestId, hotelId });
                    }

                } catch (processError) {
                    // Log the error and attempt to rollback if needed
                    logger.error('Error processing reservations:', {
                        requestId,
                        hotelId,
                        error: processError.message,
                        stack: processError.stack
                    });

                    if (isTransactionActive) {
                        try {
                            await dbClient.query('ROLLBACK');
                            isTransactionActive = false;
                            logger.info('Transaction rolled back due to error', { requestId, hotelId });
                        } catch (rollbackError) {
                            logger.error('Error rolling back transaction:', {
                                requestId,
                                hotelId,
                                error: rollbackError.message,
                                originalError: processError.message
                            });
                        }
                    }

                    // Update all reservations in this batch to failed status
                    await Promise.all(queuedReservations.map(async (reservation) => {
                        if (reservation._queueStatus === 'queued') {
                            try {
                                await updateOTAReservationQueue(
                                    requestId,
                                    reservation._queueId,
                                    'failed',
                                    { 
                                        error: 'Batch processing failed',
                                        details: processError.message 
                                    }
                                );
                            } catch (updateError) {
                                logger.error('Error updating reservation status after failure:', {                                    
                                    otaReservationId: reservation._otaReservationId,
                                    error: updateError.message
                                });
                            }
                        }
                    }));
                } finally {
                    if (isTransactionActive) {
                        try {
                            await dbClient.query('ROLLBACK');
                            logger.warn('Transaction was still active in finally block - rolled back', { 
                                requestId, 
                                hotelId 
                            });
                        } catch (rollbackError) {
                            logger.error('Error in final rollback:', {
                                requestId,
                                hotelId,
                                error: rollbackError.message
                            });
                        }
                    }
                }
            } catch (hotelError) {
                logger.error('Error processing hotel reservations:', {
                    requestId,
                    hotelId: hotel?.hotel_id || 'unknown',
                    error: hotelError.message,
                    stack: hotelError.stack
                });
            } finally {
                // Make sure client is released even if an error occurs
                if (dbClient) {
                    try {
                        logger.debug(`[${requestId}] [Hotel ${hotelId}] Releasing database client`);
                        await dbClient.release();
                        logger.debug(`[${requestId}] [Hotel ${hotelId}] Database client released`);
                    } catch (releaseError) {
                        const errorMsg = `Error releasing database client for hotel ${hotelId}: ${releaseError.message}`;
                        console.error(`[${requestId}] ${errorMsg}`);
                        logger.error('Error releasing database client:', {
                            requestId,
                            hotelId: hotel?.hotel_id || 'unknown',
                            error: releaseError.message
                        });
                    }
                }
            }
        }

        logger.debug(`[${requestId}] Completed processing all hotels`);
        return res.status(200).send({ message: 'Processed all hotels.' });
        
    } catch (error) {
        const errorMsg = `Unexpected error in getOTAReservations: ${error.message}`;
        console.error(`[${requestId}] ${errorMsg}`, { stack: error.stack });
        logger.error('Error in getOTAReservations:', {
            requestId,
            error: error.message,
            stack: error.stack
        });
        return res.status(500).send({ 
            error: 'An unexpected error occurred while processing hotels.',
            details: error.message 
        });
    }
};
const successOTAReservations = async (req, res, hotel_id, outputId) => {
    const name = 'OutputCompleteService';

    logger.info(`Calling OutputCompleteService for hotel_id: ${hotel_id}, outputId: ${outputId}`);
    
    try {
        let template = await selectXMLTemplate(req.requestId, hotel_id, name);
        
        template = template.replace("{{outputId}}", outputId);

        const response = await submitXMLTemplate(req, res, hotel_id, name, template);
        logger.info(`OutputCompleteService completed successfully for hotel_id: ${hotel_id}, outputId: ${outputId}`);
        return response;
    } catch (error) {        
        logger.error('Error in successOTAReservations:', {
            error: error.message,
            hotel_id,
            outputId,
            requestId: req.requestId,
            stack: error.stack
        });
        return res.status(500).send({ error: 'An error occurred while processing hotel response.' });
    }
};
const checkOTAStock = async (req, res, hotel_id, startDate, endDate) => {
    const name = 'NetStockSearchService';

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);

    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
        const errorMsg = `Invalid date provided to checkOTAStock. startDate: ${startDate}, endDate: ${endDate}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    if (sDate > eDate) {
        console.warn(`Start date ${startDate} is after end date ${endDate}. Returning empty result.`);
        return [];
    }

    const template = await selectXMLTemplate(req.requestId, hotel_id, name);
    if (!template) {
        throw new Error('XML template not found.');
    }

    const formatYYYYMMDD = (dateString) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}${month}${day}`;
    };

    const dateRanges = [];
    let currentStartDate = new Date(sDate);

    while (currentStartDate <= eDate) {
        let currentEndDate = new Date(currentStartDate);
        currentEndDate.setDate(currentEndDate.getDate() + 29); // 30 days inclusive

        if (currentEndDate > eDate) {
            currentEndDate = new Date(eDate);
        }

        dateRanges.push({
            start: formatYYYYMMDD(currentStartDate),
            end: formatYYYYMMDD(currentEndDate)
        });

        currentStartDate = new Date(currentEndDate);
        currentStartDate.setDate(currentStartDate.getDate() + 1);
    }



    let allResponses = [];

    for (const range of dateRanges) {
        let xmlBody = template
            .replace('{{extractionProcedure}}', 2)
            .replace('{{searchDurationFrom}}', range.start)
            .replace('{{searchDurationTo}}', range.end);

        try {
            const apiResponse = await submitXMLTemplate(req, res, hotel_id, name, xmlBody);
            const executeResponse = apiResponse['S:Envelope']['S:Body']['ns2:executeResponse']['return']['netRmTypeGroupAndDailyStockStatusList'];

            const executeResponseArray = Array.isArray(executeResponse) ? executeResponse : (executeResponse ? [executeResponse] : []);
            
            const transformedResponse = executeResponseArray.map(item => ({
                netRmTypeGroupCode: item.netRmTypeGroupCode,
                saleDate: item.saleDate,
                salesCount: item.salesCount,
                remainingCount: item.remainingCount
            }));

            allResponses = allResponses.concat(transformedResponse);
        } catch (error) {
            console.error(`Error submitting XML template for date range ${range.start} - ${range.end}:`, error);
            throw error;
        }
    }

    return allResponses;
};
const updateInventoryMultipleDays = async (req, res) => {
    const hotel_id = req.params.hotel_id;
    const log_id = req.params.log_id;
    const inventory = req.body;
    if (!Array.isArray(inventory)) {
        return res.status(400).send({ error: 'Inventory data must be an array.' });
    }
    // logger.debug('updateInventoryMultipleDays triggered')

    const name = 'NetStockBulkAdjustmentService';

    // Helper function to format date to YYYYMMDD
    const formatYYYYMMDD = (dateString) => {
        const date = new Date(dateString);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            return null; // Return null for invalid dates
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    // logger.debug('updateInventoryMultipleDays:', hotel_id, name);

    const template = await selectXMLTemplate(req.requestId, hotel_id, name);
    if (!template) {
        return res.status(500).send({ error: 'XML template not found.' });
    }
    
    // Filter out entries older than the current date and format dates for comparison
    const currentDateYYYYMMDD = formatYYYYMMDD(new Date());
    
    if (!inventory) {
        return res.status(500).send({ error: 'Inventory data not found.' });
    }    
    let filteredInventory = inventory.filter((item) => {
        const itemDateYYYYMMDD = formatYYYYMMDD(item.date);
        // Only include items with valid dates on or after the current date
        return itemDateYYYYMMDD !== null && itemDateYYYYMMDD >= currentDateYYYYMMDD;
    });

    /*
    const currentDate = (() => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    })();    
    
    let filteredInventory = inventory.filter((item) => {
        const itemDate = (() => {
            const date = new Date(item.date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}${month}${day}`;
        })();

        // logger.debug('itemDate:', itemDate, itemDate >= currentDate);

        return itemDate >= currentDate;
    });
    */
    if (filteredInventory.length === 0) {
        return res.status(200).send({ message: 'No valid inventory entries found. All dates are in the past.' });
    }
    
    // Get the date range of the filtered inventory
    const getInventoryDateRange = (inventory) => {
        if (inventory.length === 0) return { minDate: null, maxDate: null };

        const dates = inventory.map((item) => new Date(item.date)).filter(date => !isNaN(date.getTime())); 
        if (dates.length === 0) return { minDate: null, maxDate: null };

        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        return { minDate, maxDate };
    };
    const { minDate, maxDate } = getInventoryDateRange(filteredInventory);
    // If minDate or maxDate is null after filtering, it means no valid dates were found.
    if (!minDate || !maxDate) {
        return res.status(200).send({ message: 'No valid date range could be determined from inventory.' });
    }
    // logger.debug('getInventoryDateRange', minDate, maxDate);
    
    // Check current stock using checkOTAStock for the relevant date range
    let stockCheckResults;
    try {
        stockCheckResults = await checkOTAStock(req, res, hotel_id, minDate, maxDate);        
        if (!Array.isArray(stockCheckResults)) {
             console.error('checkOTAStock did not return an array:', stockCheckResults);             
             stockCheckResults = [];
        }
    } catch (error) {
        console.error('Error during checkOTAStock:', error);        
         return res.status(500).send({ error: 'Failed to retrieve current stock information.' });
    }
    // Create a map for quick lookup of stock check results by room type group and date
    const stockCheckMap = new Map();
    stockCheckResults.forEach(item => {        
        const key = `${item.netRmTypeGroupCode}-${item.saleDate}`;
        stockCheckMap.set(key, parseInt(item.remainingCount));
    });

    // Compare filteredInventory with stockCheckResults
    let needsUpdate = false;
    for (const item of filteredInventory) {
        const itemDateYYYYMMDD = formatYYYYMMDD(item.date);
        const expectedRemainingCount = parseInt(item.total_rooms) - parseInt(item.room_count);
        const lookupKey = `${item.netrmtypegroupcode}-${itemDateYYYYMMDD}`;

        // logger.debug('needsUpdate check', lookupKey, 'count', expectedRemainingCount)

        const currentRemainingStock = stockCheckMap.get(lookupKey);

        // Compare only if stock data exists for this room type and date
        if (currentRemainingStock !== undefined) {
             // Check if calculated remaining count from inventory matches current stock
            if (expectedRemainingCount < 0) { // Ensure expectedRemainingCount is not negative
                 if (currentRemainingStock !== 0) {
                     needsUpdate = true;
                     // logger.debug(`Mismatch found for ${lookupKey}: Inventory calculated ${0}, Stock is ${currentRemainingStock}`);
                     break; // Found a mismatch, no need to check further
                 }
            } else {
                 if (currentRemainingStock !== expectedRemainingCount) {
                     needsUpdate = true;
                     // logger.debug(`Mismatch found for ${lookupKey}: Inventory calculated ${expectedRemainingCount}, Stock is ${currentRemainingStock}`);
                     break; // Found a mismatch, no need to check further
                 }
            }
        } else {             
             console.warn(`No stock data found for ${lookupKey}. Cannot compare.`);             
        }
    }

    // If no mismatch was found, skip the update process
    if (!needsUpdate) {
        // logger.debug('Inventory matches current stock. No update needed.');
        return res.status(200).send({ message: 'Inventory already matches current stock. No update needed.' });
    }

    // --- Proceed with batch processing if an update is needed ---

    const processInventoryBatch = async (batch, batch_no) => {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        await delay(2000); // 2-second pause

        let adjustmentTargetXml = '';
        batch.forEach((item) => {
            const adjustmentDate = (() => {
                const date = new Date(item.date);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}${month}${day}`;
            })();
            let remainingCount = parseInt(item.total_rooms) - parseInt(item.room_count);
            remainingCount = remainingCount < 0 ? 0 : remainingCount;

            let target = `
                <adjustmentTarget>
                    <adjustmentProcedureCode>1</adjustmentProcedureCode>
                    <netRmTypeGroupCode>${item.netrmtypegroupcode}</netRmTypeGroupCode>
                    <adjustmentDate>${adjustmentDate}</adjustmentDate>
                    <remainingCount>${remainingCount}</remainingCount>
                    <salesStatus>3</salesStatus>
                </adjustmentTarget>
            `;
            adjustmentTargetXml += target;
        });

        let xmlBody = template.replace(
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

        let requestId = log_id + (batch_no / 100);
        requestId = requestId.toString();
        if (requestId.length > 8) {
            requestId = requestId.slice(-8); // keep the last 8 characters
        }
        xmlBody = xmlBody.replace('{{requestId}}', requestId);

        // Do not send a response here!
        try {
            const apiResponse = await submitXMLTemplate(req, res, hotel_id, name, xmlBody);
            return apiResponse;
        } catch (error) {
            console.error(`Error in processInventoryBatch for batch ${batch_no}:`, error);
            throw error; // Let the main function handle the response
        }
    };
    
    // Check if the date range exceeds 30 days for batching decision
    const dateRangeExceeds30Days = (minDate, maxDate) => {
        if (!minDate || !maxDate) return false;
        const timeDiff = Math.abs(maxDate.getTime() - minDate.getTime());
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysDiff > 30;
    };    
    const exceeds30Days = dateRangeExceeds30Days(minDate, maxDate);
    
    // Determine batch size and process inventory in batches or as a single request
    try {
        if (filteredInventory.length > 1000 || exceeds30Days) {        
            const batchSize = 30;
            let requestNumber = 0;
            for (let i = 0; i < filteredInventory.length; i += batchSize) {            
                const batch = filteredInventory.slice(i, i + batchSize);
                await processInventoryBatch(batch, requestNumber);
                requestNumber++;
            }
        } else {
            // Process all filtered inventory as a single batch
            await processInventoryBatch(filteredInventory, 0);
        }
        res.status(200).send({ message: 'Inventory update processed.' });
    } catch (error) {
        console.error('Error in updateInventoryMultipleDays:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Failed to process inventory update.' });
        }
    }                

};

const manualUpdateInventoryMultipleDays = async (req, res) => {
    const hotel_id = req.params.hotel_id;
    const log_id = req.params.log_id;
    const inventory = req.body;
    // logger.debug('manualUpdateInventoryMultipleDays triggered')

    const name = 'NetStockBulkAdjustmentService';

    // Helper function to format date to YYYYMMDD
    const formatYYYYMMDD = (dateString) => {
        const date = new Date(dateString);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            return null; // Return null for invalid dates
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    const template = await selectXMLTemplate(req.requestId, hotel_id, name);
    if (!template) {
        return res.status(500).send({ error: 'XML template not found.' });
    }
    
    // Filter out entries older than the current date and format dates for comparison
    const currentDateYYYYMMDD = formatYYYYMMDD(new Date());
    
    if (!inventory) {
        return res.status(500).send({ error: 'Inventory data not found.' });
    }    
    let filteredInventory = inventory.filter((item) => {
        const itemDateYYYYMMDD = item.saleDate;
        // Only include items with valid dates on or after the current date
        return itemDateYYYYMMDD !== null && itemDateYYYYMMDD >= currentDateYYYYMMDD;
    });
   
    if (filteredInventory.length === 0) {
        return res.status(200).send({ message: 'No valid inventory entries found. All dates are in the past.' });
    }
    
    // Get the date range of the filtered inventory
    const getInventoryDateRange = (inventory) => {
        if (inventory.length === 0) return { minDate: null, maxDate: null };

        const dates = inventory
            .map((item) => {
                const str = item.saleDate?.toString();
                if (!/^\d{8}$/.test(str)) return null; // Ensure it's in YYYYMMDD format

                const year = parseInt(str.slice(0, 4), 10);
                const month = parseInt(str.slice(4, 6), 10) - 1; // month is 0-indexed
                const day = parseInt(str.slice(6, 8), 10);

                return new Date(year, month, day);
            })
            .filter(date => date instanceof Date && !isNaN(date.getTime()));

        if (dates.length === 0) return { minDate: null, maxDate: null };

        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        return { minDate, maxDate };
    };
    const { minDate, maxDate } = getInventoryDateRange(filteredInventory);
    // If minDate or maxDate is null after filtering, it means no valid dates were found.
    if (!minDate || !maxDate) {
        return res.status(200).send({ message: 'No valid date range could be determined from inventory.' });
    }
    // logger.debug('getInventoryDateRange', minDate, maxDate);

    // --- Proceed with batch ---

    const processInventoryBatch = async (batch, batch_no) => {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        await delay(2000); // 2-second pause

        let adjustmentTargetXml = '';
        batch.forEach((item) => {
            const adjustmentDate = item.saleDate;
            const netRmTypeGroupCode = parseInt(item.netRmTypeGroupCode);
            let remainingCount = parseInt(item.pmsRemainingCount);
            if (remainingCount < 0) {
                remainingCount = 0;
            }
            let salesStatus = parseInt(item.salesStatus);
            if (salesStatus === 0) {
                salesStatus = 3; // No change
            } else if (salesStatus === 1) {
                salesStatus = 1; // Start sales
            } else {
                salesStatus = 2; // Stop sales
            }            

            let target = `
                <adjustmentTarget>
                    <adjustmentProcedureCode>1</adjustmentProcedureCode>
                    <netRmTypeGroupCode>${netRmTypeGroupCode}</netRmTypeGroupCode>
                    <adjustmentDate>${adjustmentDate}</adjustmentDate>
                    <remainingCount>${remainingCount}</remainingCount>
                    <salesStatus>${salesStatus}</salesStatus>
                </adjustmentTarget>
            `;
            adjustmentTargetXml += target;
        });

        let xmlBody = template.replace(
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

        let requestId = log_id + (batch_no / 100);
        requestId = requestId.toString();
        if (requestId.length > 8) {
            requestId = requestId.slice(-8); // keep the last 8 characters
        }
        xmlBody = xmlBody.replace('{{requestId}}', requestId);

        // logger.debug('updateInventoryMultipleDays xmlBody:', xmlBody);

        try {
            const apiResponse = await submitXMLTemplate(req, res, hotel_id, name, xmlBody);
            return apiResponse;
        } catch (error) {
            console.error(`Error in processInventoryBatch for batch ${batch_no}:`, error);
            throw error; // Re-throw to be handled by the main function
        }
        
    };
    
    // Check if the date range exceeds 30 days for batching decision
    const dateRangeExceeds30Days = (minDate, maxDate) => {
        if (!minDate || !maxDate) return false;

        const timeDiff = Math.abs(maxDate.getTime() - minDate.getTime());
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysDiff > 30;
    };    
    const exceeds30Days = dateRangeExceeds30Days(minDate, maxDate);
    
    // Determine batch size and process inventory in batches or as a single request
    try {
        if (filteredInventory.length > 1000 || exceeds30Days) {        
            const batchSize = 30;
            let requestNumber = 0;
            for (let i = 0; i < filteredInventory.length; i += batchSize) {            
                const batch = filteredInventory.slice(i, i + batchSize);
                await processInventoryBatch(batch, requestNumber);
                requestNumber++;
            }
        } else {
            // Process all filtered inventory as a single batch
            await processInventoryBatch(filteredInventory, 0);
        }
        res.status(200).send({ success: true, message: 'Inventory update processed.' });
    } catch (error) {
        console.error('Error in manualUpdateInventoryMultipleDays:', error);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Failed to process inventory update.' });
        }
    }

};

const setDatesNotForSale = async (req, res, hotel_id, inventory) => {
    const name = 'NetStockBulkAdjustmentService';
    const requestId = req.requestId || `failed-res-${Date.now()}`;

    logger.info('[setDatesNotForSale] Attempting to set dates as not for sale', {
        requestId,
        hotel_id,
        inventoryCount: inventory.length
    });

    if (!inventory || inventory.length === 0) {
        logger.warn('[setDatesNotForSale] Initial inventory is empty, skipping API call.', { requestId, hotel_id });
        return;
    }

    // Helper function to format date to YYYYMMDD
    const formatYYYYMMDD = (dateString) => {
        const date = new Date(dateString);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            return null; // Return null for invalid dates
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    const currentDateYYYYMMDD = formatYYYYMMDD(new Date());
    const filteredInventory = inventory.filter(item => item.saleDate >= currentDateYYYYMMDD);

    if (filteredInventory.length === 0) {
        logger.warn('[setDatesNotForSale] Inventory is empty after filtering past dates, skipping API call.', {
            requestId,
            hotel_id,
            originalCount: inventory.length
        });
        return;
    }

    try {
        const template = await selectXMLTemplate(requestId, hotel_id, name);
        if (!template) {
            throw new Error(`XML template not found for ${name}.`);
        }

        let adjustmentTargetXml = '';
        filteredInventory.forEach((item) => {
            adjustmentTargetXml += `
                <adjustmentTarget>
                    <adjustmentProcedureCode>1</adjustmentProcedureCode>
                    <netRmTypeGroupCode>${item.netRmTypeGroupCode}</netRmTypeGroupCode>
                    <adjustmentDate>${item.saleDate}</adjustmentDate>
                    <remainingCount>0</remainingCount>
                    <salesStatus>2</salesStatus>
                </adjustmentTarget>
            `;
        });

        let xmlBody = template.replace(
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
        
        // Replace request ID placeholder if it exists in the template
        if (xmlBody.includes('{{requestId}}')) {
            let reqId = (requestId).toString();
            if (reqId.length > 8) {
                reqId = reqId.slice(-8);
            }
            xmlBody = xmlBody.replace('{{requestId}}', reqId);
        }

        await submitXMLTemplate({ requestId }, null, hotel_id, name, xmlBody);

        logger.info('[setDatesNotForSale] Successfully sent request to set dates as not for sale.', {
            requestId,
            hotel_id
        });

    } catch (error) {
        logger.error('[setDatesNotForSale] Failed to set dates as not for sale.', {
            requestId,
            hotel_id,
            error: error.message,
            stack: error.stack,
        });
        // We log the error but don't re-throw, as this is a non-critical side-effect
        // of a failed reservation. The main error handling will continue.
    }
};

module.exports = {
    getXMLTemplate,
    getRecentQueuedReservations,
    getXMLRecentResponses,
    postXMLResponse,
    submitXMLTemplate,
    getTLRoomMaster,
    createTLRoomMaster,
    getTLPlanMaster,
    createTLPlanMaster,
    getOTAReservations,
    successOTAReservations,
    updateInventoryMultipleDays,
    manualUpdateInventoryMultipleDays,
    processAndQueueReservation,
    processQueuedReservations,
    setDatesNotForSale
};