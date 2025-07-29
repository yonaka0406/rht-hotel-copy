require("dotenv").config();
const xml2js = require('xml2js');
const { selectXMLTemplate, selectXMLRecentResponses, insertXMLRequest, insertXMLResponse, selectTLRoomMaster, insertTLRoomMaster, selectTLPlanMaster, insertTLPlanMaster } = require('../ota/xmlModel');
const { getAllHotelSiteController } = require('../models/hotel');
const { addOTAReservation, editOTAReservation, cancelOTAReservation } = require('../models/reservations');
const { getPool } = require('../config/database');
const logger = require('../config/logger'); // Winston logger

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

    // console.log('postXMLResponse', req.params, xml);

    try {
        const parser = new xml2js.Parser();
        parser.parseString(xml, async (err, result) => {
            if (err) {
                console.error('Error parsing XML:', err);
                return res.status(400).json({ error: 'Invalid XML' });
            }
            // console.log('Parsed XML:', result);

            try {
                const responseXml = await submitXMLTemplate(req, res, hotel_id, name, xml);
                // console.log('XML response added successfully', responseXml);
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
    // console.log('submitXMLTemplate', name, xml);    
    
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
        // console.log('Response XML:', responseXml);
        // console.log('Inserting XML response into database...');
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

    try {
        const hotels = await getAllHotelSiteController(req.requestId);
        if (!hotels || hotels.length === 0) {
            logger.warn('No hotels found.');
            return res.status(404).send({ error: 'No hotels found.' });
        }

        for (const hotel of hotels) {
            const hotel_id = hotel.hotel_id;

            // Get the template with credentials already injected
            let template = await selectXMLTemplate(req.requestId, hotel_id, name);
            if (!template) {
                logger.warn(`XML template not found for hotel_id: ${hotel_id}`);
                continue;
            }

            // Fetch the data
            const reservations = await submitXMLTemplate(req, res, hotel_id, name, template);
            // logger.debug('getOTAReservations reservations', reservations);

            const executeResponse = reservations['S:Envelope']['S:Body']['ns2:executeResponse'];
            // logger.debug('getOTAReservations executeResponse', executeResponse);

            const bookingInfoListWrapper = executeResponse?.return?.bookingInfoList;
            const bookingInfoList = Array.isArray(bookingInfoListWrapper) ? bookingInfoListWrapper : [bookingInfoListWrapper];
            // logger.debug('getOTAReservations bookingInfoList', bookingInfoList);

            if (!bookingInfoList || bookingInfoList.length === 0 || bookingInfoList[0] === null) {
                logger.info('No booking information found in the response.');
                return [];
            }

            const formattedReservations = [];
            // Process each bookingInfo to parse the inner infoTravelXML
            for (const [idx, bookingInfo] of (Array.isArray(bookingInfoList) ? bookingInfoList : [bookingInfoList]).entries()) {
                // Diagnostic: Log the index and value if bookingInfo is falsy
                if (!bookingInfo) {
                    logger.warn(
                        `Skipping undefined or null bookingInfo object at index ${idx}.`,
                        { bookingInfoList, executeResponse }
                    );
                    // Possible causes:
                    // - The API response did not include bookingInfo objects for this hotel.
                    // - bookingInfoList contains null/undefined entries (possibly due to empty bookings).
                    // - The XML structure changed or is malformed.
                    continue; // Skip to the next iteration
                }
                // Diagnostic: Log the bookingInfo object if needed
                // logger.debug(`Processing bookingInfo at index ${idx}:`, bookingInfo);

                const infoTravelXML = bookingInfo.infoTravelXML;
                // logger.debug('getOTAReservations infoTravelXML', infoTravelXML);

                if (infoTravelXML) {
                    try {
                        const parsedXML = await new Promise((resolve, reject) => {
                            xml2js.parseString(infoTravelXML, { explicitArray: false }, (err, result) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(result);
                                }
                            });
                        });

                        const allotmentBookingReport = parsedXML?.AllotmentBookingReport;

                        if (allotmentBookingReport) {
                            const reservationData = {};

                            function processValue(value, level = 0, keyPath = '') {
                                // logger.debug(`${'  '.repeat(level)}[Level ${level}] Processing key: ${keyPath} - Type: ${typeof value}, isArray: ${Array.isArray(value)}`);

                                if (typeof value === 'object' && value !== null) {
                                    const innerData = {};
                                    for (const innerKey in value) {
                                        if (Object.hasOwnProperty.call(value, innerKey)) {
                                            innerData[innerKey] = processValue(value[innerKey], level + 1, keyPath ? `${keyPath}.${innerKey}` : innerKey);
                                        }
                                    }
                                    return innerData;
                                } else if (Array.isArray(value) && value.length === 1) {
                                    // logger.debug(`${'  '.repeat(level + 1)}[Level ${level + 1}] Single element array - unwrapping`);
                                    return processValue(value[0], level + 1, keyPath + '[0]');
                                } else {
                                    return value;
                                }
                            }

                            for (const key in allotmentBookingReport) {
                                if (Object.hasOwnProperty.call(allotmentBookingReport, key)) {
                                    // logger.debug(`[Level 0] Starting processing for key: ${key}`);
                                    reservationData[key] = processValue(allotmentBookingReport[key], 1, key);
                                    // logger.debug(`[Level 0] Finished processing for key: ${key} - Result type: ${typeof reservationData[key]}, isArray: ${Array.isArray(reservationData[key])}`);
                                }
                            }

                            formattedReservations.push(reservationData);
                            
                            // Add reservation to OTA queue
                            try {
                                const transactionId = reservationData.TransactionType?.DataID;
                                if (!transactionId) {
                                    logger.warn('Skipping queue insertion - Missing transaction ID', { reservationData });
                                } else {
                                    await insertOTAReservationQueue(req.requestId, {
                                        hotelId: hotel_id,
                                        otaReservationId: reservationData.BasicInformation?.TravelAgencyBookingNumber || `temp_${Date.now()}`,
                                        transactionId: transactionId,
                                        reservationData: reservationData,
                                        status: 'pending',
                                        conflictDetails: null
                                    });
                                    logger.debug('Successfully added reservation to OTA queue', { 
                                        transactionId,
                                        hotelId: hotel_id 
                                    });
                                }
                            } catch (queueError) {
                                // Log the error but don't stop processing other reservations
                                logger.error('Error adding reservation to OTA queue:', {
                                    error: queueError.message,
                                    transactionId: reservationData.TransactionType?.DataID,
                                    hotelId: hotel_id
                                });
                            }
                        }
                    } catch (parseError) {
                        logger.error('Error parsing infoTravelXML:', parseError);
                    }
                }
            }
            // logger.debug('Formatted Reservations:', formattedReservations);

            let allReservationsSuccessful = true;
            let unsupportedClassifications = 0;
            let failedProcessing = 0;
            let exceptions = 0;
            let successfulProcessing = 0;
            logger.info(`Processing ${formattedReservations.length} reservations for hotel_id: ${hotel_id}`);

            // Get database client for transaction
            const pool = getPool(req.requestId);
            const client = await pool.connect();

            try {
                // Begin transaction
                await client.query('BEGIN');
                logger.debug(`Started transaction for hotel_id: ${hotel_id}`);

                // Function for each formatted reservation
                for (const reservation of formattedReservations) {
                    try {
                        const classification = reservation.TransactionType.DataClassification;
                        // logger.debug('Type of OTA transaction:', classification);
                        if (!['NewBookReport', 'ModificationReport', 'CancellationReport'].includes(classification)) {
                            unsupportedClassifications++;
                            logger.warn(`Unsupported DataClassification: ${classification}. Setting allReservationsSuccessful to false.`, {
                                reservationId: reservation.UniqueID?.ID || 'No ID',
                                classification,
                                hotel_id,
                                requestId: req.requestId,
                            });
                            allReservationsSuccessful = false;
                            continue; // Continue checking other reservations
                        }

                        let result = { success: false };
                        if (reservation.TransactionType.DataClassification === 'NewBookReport'){
                            result = await addOTAReservation(req.requestId, hotel_id, reservation, client);
                            // logger.debug(result);
                        }
                        else if (reservation.TransactionType.DataClassification === 'ModificationReport'){
                            result = await editOTAReservation(req.requestId, hotel_id, reservation, client);
                            // logger.debug(result);
                        }
                        else if (reservation.TransactionType.DataClassification === 'CancellationReport'){
                            result = await cancelOTAReservation(req.requestId, hotel_id, reservation, client);
                            // logger.debug(result);
                        }

                        // If any reservation fails, mark the entire batch as unsuccessful
                        if (!result.success) {
                            failedProcessing++;
                            logger.warn(`Failed to process OTA reservation. Setting allReservationsSuccessful to false.`, {
                                reservationId: reservation.UniqueID?.ID || 'No ID',
                                classification,
                                hotel_id,
                                requestId: req.requestId,
                                result,
                            });
                            allReservationsSuccessful = false;
                            break; // Break out of loop on first failure to rollback transaction
                        } else {
                            successfulProcessing++;
                        }

                    } catch (dbError) {
                        exceptions++;
                        logger.warn('Exception during OTA reservation processing. Setting allReservationsSuccessful to false.', {
                            reservationId: reservation.UniqueID?.ID || 'No ID',
                            classification: reservation.TransactionType?.DataClassification || 'Unknown Classification',
                            hotel_id,
                            requestId: req.requestId,
                            error: dbError.message,
                            stack: dbError.stack,
                        });
                        allReservationsSuccessful = false; // Mark as unsuccessful if any error occurs
                        break; // Break out of loop on exception to rollback transaction
                    }
                }

                // Commit or rollback transaction based on success
                if (allReservationsSuccessful) {
                    await client.query('COMMIT');
                    logger.info(`Transaction committed successfully for hotel_id: ${hotel_id}`);
                } else {
                    await client.query('ROLLBACK');
                    logger.warn(`Transaction rolled back due to failures for hotel_id: ${hotel_id}`);
                }

            } catch (transactionError) {
                // Rollback transaction on any error
                try {
                    await client.query('ROLLBACK');
                    logger.error(`Transaction rolled back due to error for hotel_id: ${hotel_id}`, {
                        error: transactionError.message,
                        stack: transactionError.stack,
                        requestId: req.requestId
                    });
                } catch (rollbackError) {
                    logger.error(`Failed to rollback transaction for hotel_id: ${hotel_id}`, {
                        rollbackError: rollbackError.message,
                        originalError: transactionError.message,
                        requestId: req.requestId
                    });
                }
                allReservationsSuccessful = false;
            } finally {
                // Always release the client back to the pool
                client.release();
            }

            // Send OK to OTA server
            logger.info(`Processing summary for hotel_id ${hotel_id}:`, {
                totalReservations: formattedReservations.length,
                successfulProcessing,
                failedProcessing,
                unsupportedClassifications,
                exceptions,
                allReservationsSuccessful
            });
            if(!allReservationsSuccessful) {
                logger.warn('Some reservations failed processing for hotel_id:', hotel_id, 'Skipping OutputCompleteService');
                continue; // Skip to next hotel
            }else{
                const outputId =  executeResponse?.return?.configurationSettings?.outputId;
                if (outputId) {
                    await successOTAReservations(req, res, hotel_id, outputId);
                    logger.info('All reservations successfully processed for hotel_id:', hotel_id);
                } else {
                    logger.error('No outputId found in response for hotel_id:', hotel_id);
                }
            }

        }

        return res.status(200).send({ message: 'Processed all hotels.' });
    } catch (error) {
        logger.error('Error in getOTAReservations:', error);
        return res.status(500).send({ error: 'An error occurred while processing hotels.' });
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

    const template = await selectXMLTemplate(req.requestId, hotel_id, name);
    if (!template) {
        throw new Error('XML template not found.');
    }

    const formatYYYYMMDD = (dateString) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is 0-indexed
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}${month}${day}`;
    };
    const formattedStartDate = formatYYYYMMDD(startDate);
    const formattedEndDate = formatYYYYMMDD(endDate);
    
    let xmlBody = template
        .replace('{{extractionProcedure}}', 2)
        .replace('{{searchDurationFrom}}', formattedStartDate)
        .replace('{{searchDurationTo}}', formattedEndDate);

    try {
        const apiResponse = await submitXMLTemplate(req, res, hotel_id, name, xmlBody);
        const executeResponse = apiResponse['S:Envelope']['S:Body']['ns2:executeResponse']['return']['netRmTypeGroupAndDailyStockStatusList'];

        // Check if executeResponse is an array, if not, make it an array
        const executeResponseArray = Array.isArray(executeResponse) ? executeResponse : [executeResponse];

        // Transform the data into the desired array format
        const transformedResponse = executeResponseArray.map(item => ({
            netRmTypeGroupCode: item.netRmTypeGroupCode,
            saleDate: item.saleDate,
            salesCount: item.salesCount,
            remainingCount: item.remainingCount
        }));

        // Return the transformed data
        return transformedResponse;
    } catch (error) {        
        console.error('Error submitting XML template:', error);        
        throw error; // Re-throw to be handled by the caller
    }

};
const updateInventoryMultipleDays = async (req, res) => {
    const hotel_id = req.params.hotel_id;
    const log_id = req.params.log_id;
    const inventory = req.body;
    if (!Array.isArray(inventory)) {
        return res.status(400).send({ error: 'Inventory data must be an array.' });
    }
    // console.log('updateInventoryMultipleDays triggered')

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

    // console.log('updateInventoryMultipleDays:', hotel_id, name);

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

        // console.log('itemDate:', itemDate, itemDate >= currentDate);

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
    // console.log('getInventoryDateRange', minDate, maxDate);
    
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

        // console.log('needsUpdate check', lookupKey, 'count', expectedRemainingCount)

        const currentRemainingStock = stockCheckMap.get(lookupKey);

        // Compare only if stock data exists for this room type and date
        if (currentRemainingStock !== undefined) {
             // Check if calculated remaining count from inventory matches current stock
            if (expectedRemainingCount < 0) { // Ensure expectedRemainingCount is not negative
                 if (currentRemainingStock !== 0) {
                     needsUpdate = true;
                     // console.log(`Mismatch found for ${lookupKey}: Inventory calculated ${0}, Stock is ${currentRemainingStock}`);
                     break; // Found a mismatch, no need to check further
                 }
            } else {
                 if (currentRemainingStock !== expectedRemainingCount) {
                     needsUpdate = true;
                     // console.log(`Mismatch found for ${lookupKey}: Inventory calculated ${expectedRemainingCount}, Stock is ${currentRemainingStock}`);
                     break; // Found a mismatch, no need to check further
                 }
            }
        } else {             
             console.warn(`No stock data found for ${lookupKey}. Cannot compare.`);             
        }
    }

    // If no mismatch was found, skip the update process
    if (!needsUpdate) {
        // console.log('Inventory matches current stock. No update needed.');
        return res.status(200).send({ message: 'Inventory already matches current stock. No update needed.' });
    }

    // --- Proceed with batch processing if an update is needed ---

    const processInventoryBatch = async (batch, batch_no) => {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        await delay(1000); // 1-second pause

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
    // console.log('manualUpdateInventoryMultipleDays triggered')

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
    // console.log('getInventoryDateRange', minDate, maxDate);

    // --- Proceed with batch ---

    const processInventoryBatch = async (batch, batch_no) => {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        await delay(1000); // 1-second pause

        let adjustmentTargetXml = '';
        batch.forEach((item) => {
            const adjustmentDate = item.saleDate;
            const netRmTypeGroupCode = parseInt(item.netRmTypeGroupCode);
            const remainingCount = parseInt(item.pmsRemainingCount);
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

        // console.log('updateInventoryMultipleDays xmlBody:', xmlBody);

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

module.exports = {
    getXMLTemplate,
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
};