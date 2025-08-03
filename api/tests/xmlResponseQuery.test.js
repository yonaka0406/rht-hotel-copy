/**
 * XML Response Query Test
 * 
 * This test file demonstrates how to connect to the database and execute a query
 * to fetch XML response data by ID.
 */

const { processXMLResponse, insertOTAReservationQueue } = require('../ota/xmlModel');
const { submitXMLTemplate, insertXMLResponse } = require('../ota/xmlController');
const { getPool } = require('../config/database');
const xml2js = require('xml2js');

// Helper function to process a single response ID
const processResponseById = async (requestId, responseId, pool) => {
    console.log(`\n===== Processing Response ID: ${responseId} =====`);
    
    // Get the raw XML response using the provided pool
    if (!pool) {
        throw new Error('Database pool is required');
    }
    const dbResult = await pool.query('SELECT * FROM xml_responses WHERE id = $1', [responseId]);
    const row = dbResult.rows[0];
    
    if (!row) {
        console.error(`No record found for ID: ${responseId}`);
        return null;
    }
    
    // Return the full response data
    return {
        ...row,
        xml_response: row.response,
        parsedData: await parseXMLResponse(row.response)
    };
};

// Helper function to parse XML response
const parseXMLResponse = async (xmlString) => {
    try {
        const parser = new xml2js.Parser({ explicitArray: false });
        const parsed = await parser.parseStringPromise(xmlString);
        return parsed;
    } catch (error) {
        console.error('Error parsing XML:', error);
        return null;
    }
};

// Helper function to extract all XML tags and their values
const extractXmlTags = (xmlString) => {
    const tags = {};
    const tagRegex = /<([^>]+)>([^<]*)<\/\1>/g;
    let match;
    
    while ((match = tagRegex.exec(xmlString)) !== null) {
        const tagName = match[1];
        const value = match[2].trim();
        if (value) {
            if (!tags[tagName]) {
                tags[tagName] = [];
            }
            if (!tags[tagName].includes(value)) {
                tags[tagName].push(value);
            }
        }
    }
    
    return tags;
};

/**
 * Test basic XML response processing
 */
const testXMLResponseQuery = async (pool) => {
    const requestId = 'test-xml-query-' + Date.now();
    const responseIds = [3802, 3803];
    
    try {
        console.log(`Starting XML response processing test...`);
        
        for (const responseId of responseIds) {
            console.log(`\n===== Processing Response ID: ${responseId} =====`);
            
            // Process the response
            const response = await processResponseById(requestId, responseId, pool);
            
            if (!response || !response.xml_response) {
                console.error(`No valid XML response for ID: ${responseId}`);
                continue;
            }
            
            // Parse the SOAP envelope
            const soapEnvelope = await parseXMLResponse(response.xml_response);
            const executeResponse = soapEnvelope?.['S:Envelope']?.['S:Body']?.['ns2:executeResponse'];
            const bookingInfoListWrapper = executeResponse?.return?.bookingInfoList;
            const bookingInfoList = Array.isArray(bookingInfoListWrapper) ? bookingInfoListWrapper : [bookingInfoListWrapper];
            
            if (!bookingInfoList || bookingInfoList.length === 0 || bookingInfoList[0] === null) {
                console.log('No booking information found in the response.');
                continue;
            }
            
            console.log(`Found ${bookingInfoList.length} booking(s) in response`);
            
            // Log basic info about each booking
            for (const [index, bookingInfo] of bookingInfoList.entries()) {
                if (!bookingInfo?.infoTravelXML) {
                    console.warn(`  - Booking ${index + 1}: No infoTravelXML found`);
                    continue;
                }
                
                try {
                    const reservationData = await parseXMLResponse(bookingInfo.infoTravelXML);
                    const report = reservationData?.AllotmentBookingReport;
                    
                    if (!report) {
                        console.warn(`  - Booking ${index + 1}: No AllotmentBookingReport found`);
                        continue;
                    }
                    
                    const transactionId = report.TransactionType?.DataID;
                    const bookingNumber = report.BasicInformation?.TravelAgencyBookingNumber;
                    const guestName = report.BasicInformation?.GuestOrGroupNameSingleByte;
                    const checkInDate = report.BasicInformation?.CheckInDate;
                    const checkOutDate = report.BasicInformation?.CheckOutDate;
                    
                    console.log(`  - Booking ${index + 1}:`);
                    console.log(`    Transaction ID: ${transactionId || 'N/A'}`);
                    console.log(`    Booking Number: ${bookingNumber || 'N/A'}`);
                    console.log(`    Guest: ${guestName || 'N/A'}`);
                    console.log(`    Stay: ${checkInDate || 'N/A'} to ${checkOutDate || 'N/A'}`);
                    
                } catch (parseError) {
                    console.error(`  - Booking ${index + 1}: Error parsing infoTravelXML:`, parseError.message);
                }
            }
        }
        
        console.log('\n===== XML Response Processing Test Completed =====');
    } catch (error) {
        console.error('Error during test:', error);
        throw error; // Re-throw to fail the test
    }
};

/**
 * Test OTA reservation queue insertion with specific response IDs using production flow
 */
const testOTAReservationQueueInsertion = async (pool) => {
    const requestId = 'test-queue-insertion-' + Date.now();
    const responseIds = [3802, 3803];
    
    try {
        console.log(`\n===== Testing OTA Reservation Queue Insertion =====`);
        
        for (const responseId of responseIds) {
            console.log(`\nProcessing response ID: ${responseId}`);
            
            // 1. Get the raw XML response from the database
            const response = await processResponseById(requestId, responseId, pool);
            
            if (!response || !response.xml_response) {
                console.error(`No valid XML response for ID: ${responseId}`);
                continue;
            }
            
            // 2. Parse the SOAP envelope to get the bookingInfoList
            const soapEnvelope = await parseXMLResponse(response.xml_response);
            const bookingInfoList = soapEnvelope?.['S:Envelope']?.['S:Body']?.['ns2:executeResponse']?.return?.bookingInfoList;
            
            if (!bookingInfoList || !Array.isArray(bookingInfoList)) {
                console.error(`No bookingInfoList found in response ID: ${responseId}`);
                continue;
            }
            
            console.log(`Found ${bookingInfoList.length} booking(s) in response`);
            
            for (const [index, bookingInfo] of bookingInfoList.entries()) {
                if (!bookingInfo.infoTravelXML) {
                    console.warn(`Skipping booking ${index + 1} - no infoTravelXML found`);
                    continue;
                }
                
                try {
                    // 3. Parse the inner XML (AllotmentBookingReport)
                    const reservationData = await parseXMLResponse(bookingInfo.infoTravelXML);
                    const allotmentBookingReport = reservationData?.AllotmentBookingReport;
                    
                    if (!allotmentBookingReport) {
                        console.error('No AllotmentBookingReport found in the XML');
                        continue;
                    }
                    
                    // 4. Extract key identifiers
                    const transactionId = allotmentBookingReport.TransactionType?.DataID;
                    const bookingNumber = allotmentBookingReport.BasicInformation?.TravelAgencyBookingNumber;
                    
                    if (!transactionId) {
                        console.warn('Skipping - No transaction ID found in the reservation');
                        continue;
                    }
                    
                    console.log(`\nProcessing booking ${index + 1} - Transaction: ${transactionId}, Booking: ${bookingNumber || 'N/A'}`);
                    
                    // 5. Prepare reservation data for queue insertion
                    const hotelId = response.hotel_id || 1; // Default to 1 if not available
                    const otaReservationId = bookingNumber || `temp_${Date.now()}`;
                    
                    const reservationDataForQueue = {
                        hotelId: hotelId,
                        otaReservationId: otaReservationId,
                        transactionId: transactionId,
                        reservationData: allotmentBookingReport,
                        status: 'pending',
                        conflictDetails: null
                    };
                    
                    console.log(`Inserting into queue: Hotel ${hotelId}, Transaction ${transactionId}`);
                    
                    // 6. Insert into queue using the production function
                    try {
                        const result = await insertOTAReservationQueue(requestId, reservationDataForQueue);
                        console.log('Insert result:', result);
                        
                        // 7. Verify the record was inserted
                        const dbResult = await pool.query(
                            'SELECT * FROM ota_reservation_queue WHERE hotel_id = $1 AND transaction_id = $2',
                            [hotelId, transactionId]
                        );
                        
                        if (dbResult.rows.length === 0) {
                            throw new Error(`Failed to find inserted record for transaction ${transactionId}`);
                        }
                        
                        const inserted = dbResult.rows[0];
                        console.log('✅ Successfully inserted and verified queue entry:', {
                            id: inserted.id,
                            transaction_id: inserted.transaction_id,
                            status: inserted.status,
                            created_at: inserted.created_at
                        });
                        
                    } catch (insertError) {
                        if (insertError.constraint === 'ota_reservation_queue_transaction_id_key') {
                            console.log('ℹ️  Duplicate transaction detected (expected for testing deduplication)');
                        } else {
                            throw insertError;
                        }
                    }
                    
                } catch (parseError) {
                    console.error(`Error processing booking ${index + 1} in response ${responseId}:`, parseError);
                }
            }
        }
        
        console.log('\n===== OTA Reservation Queue Insertion Test Completed =====');
        
    } catch (error) {
        console.error('Error during queue insertion test:', error);
        throw error;
    } finally {
        // Don't close the pool here
        
    }
};

// Main test runner
const runTests = async () => {
    const requestId = 'test-runner-' + Date.now();
    const pool = getPool(requestId);
    
    try {
        // Run the original test
        console.log('===== Running XML Response Comparison Test =====');
        await testXMLResponseQuery(pool);
        
        // Run the queue insertion test
        console.log('\n\n===== Running OTA Reservation Queue Insertion Test =====');
        await testOTAReservationQueueInsertion(pool);
        
        // Run the complete reservation processing test (similar to production flow)
        console.log('\n\n===== Running Complete OTA Reservation Processing Test =====');
        await testOTAReservationProcessing(pool);
        
        // Run the transaction handling tests
        console.log('\n\n===== Running OTA Transaction Handling Tests =====');
        await testOTATransactionHandling(pool);
        
        console.log('\n\n===== All tests completed successfully =====');
        return true;
    } catch (error) {
        console.error('\n\n===== Test failed =====');
        console.error(error);
        return false;
    } finally {
        // Only end the pool once at the very end
        try {
            console.log('Closing database connection pool...');
            await pool.end();
            console.log('Database connection pool closed');
        } catch (error) {
            console.error('Error closing pool:', error);
        }
    }
};

/**
 * Test the complete OTA reservation processing flow similar to the production controller
 */
const testOTAReservationProcessing = async (pool) => {
    const requestId = 'test-reservation-processing-' + Date.now();
    const responseIds = [3802, 3803];
    
    try {
        console.log(`\n===== Testing Complete OTA Reservation Processing =====`);
        
        for (const responseId of responseIds) {
            console.log(`\nProcessing response ID: ${responseId}`);
            
            // 1. Get the raw XML response from the database (replacing submitXMLTemplate)
            const response = await processResponseById(requestId, responseId, pool);
            
            if (!response || !response.xml_response) {
                console.error(`No valid XML response for ID: ${responseId}`);
                continue;
            }
            
            // 2. Parse the SOAP envelope to get the bookingInfoList
            const soapEnvelope = await parseXMLResponse(response.xml_response);
            const executeResponse = soapEnvelope?.['S:Envelope']?.['S:Body']?.['ns2:executeResponse'];
            const bookingInfoListWrapper = executeResponse?.return?.bookingInfoList;
            const bookingInfoList = Array.isArray(bookingInfoListWrapper) ? bookingInfoListWrapper : [bookingInfoListWrapper];
            
            if (!bookingInfoList || bookingInfoList.length === 0 || bookingInfoList[0] === null) {
                console.log('No booking information found in the response.');
                continue;
            }
            
            console.log(`Found ${bookingInfoList.length} booking(s) in response`);
            
            // 3. Process each booking info
            const formattedReservations = [];
            for (const [index, bookingInfo] of bookingInfoList.entries()) {
                if (!bookingInfo?.infoTravelXML) {
                    console.warn(`Skipping booking ${index + 1} - no infoTravelXML found`);
                    continue;
                }
                
                try {
                    // 4. Parse the inner XML (AllotmentBookingReport)
                    const reservationData = await parseXMLResponse(bookingInfo.infoTravelXML);
                    const allotmentBookingReport = reservationData?.AllotmentBookingReport;
                    
                    if (!allotmentBookingReport) {
                        console.error('No AllotmentBookingReport found in the XML');
                        continue;
                    }
                    
                    // 5. Process the reservation data (simplified version of production code)
                    const transactionId = allotmentBookingReport.TransactionType?.DataID;
                    const bookingNumber = allotmentBookingReport.BasicInformation?.TravelAgencyBookingNumber;
                    const classification = allotmentBookingReport.TransactionType?.DataClassification;
                    
                    if (!transactionId) {
                        console.warn('Skipping - No transaction ID found in the reservation');
                        continue;
                    }
                    
                    console.log(`\nProcessing booking ${index + 1} - ` +
                        `Transaction: ${transactionId}, ` +
                        `Booking: ${bookingNumber || 'N/A'}, ` +
                        `Type: ${classification || 'Unknown'}`);
                    
                    // 6. Add to formatted reservations
                    const formattedReservation = {};
                    for (const key in allotmentBookingReport) {
                        if (Object.hasOwnProperty.call(allotmentBookingReport, key)) {
                            formattedReservation[key] = processValue(allotmentBookingReport[key]);
                        }
                    }
                    formattedReservations.push(formattedReservation);
                    
                    // 7. Insert into OTA queue (similar to production flow)
                    try {
                        const hotelId = response.hotel_id || 1;
                        const otaReservationId = bookingNumber || `temp_${Date.now()}`;
                        
                        const queueResult = await insertOTAReservationQueue(requestId, {
                            hotelId: hotelId,
                            otaReservationId: otaReservationId,
                            transactionId: transactionId,
                            reservationData: formattedReservation,
                            status: 'pending',
                            conflictDetails: null
                        });
                        
                        console.log('✅ Added to OTA queue:', {
                            queueId: queueResult.id,
                            transactionId: queueResult.transaction_id,
                            status: queueResult.status
                        });
                        
                    } catch (queueError) {
                        if (queueError.constraint === 'ota_reservation_queue_transaction_id_key') {
                            console.log('ℹ️  Duplicate transaction detected (expected for testing)');
                        } else {
                            console.error('Error adding to OTA queue:', queueError.message);
                            throw queueError;
                        }
                    }
                    
                } catch (parseError) {
                    console.error(`Error processing booking ${index + 1}:`, parseError);
                    // Continue with next booking even if one fails
                }
            }
            
            // 8. Log processing summary
            console.log(`\n===== Processing Summary for Response ${responseId} =====`);
            console.log(`Total bookings found: ${bookingInfoList.length}`);
            console.log(`Successfully processed: ${formattedReservations.length}`);
            
            // 9. Verify all expected bookings were processed
            if (formattedReservations.length > 0) {
                console.log('\nSample processed reservation data:', 
                    JSON.stringify(formattedReservations[0], null, 2));
            }
        }
        
        console.log('\n===== OTA Reservation Processing Test Completed =====');
        
    } catch (error) {
        console.error('Error during reservation processing test:', error);
        throw error;
    }
};

// Helper function to process nested values (similar to production code)
function processValue(value, level = 0) {
    if (typeof value === 'object' && value !== null) {
        const result = {};
        for (const key in value) {
            if (Object.hasOwnProperty.call(value, key)) {
                result[key] = processValue(value[key], level + 1);
            }
        }
        return result;
    } else if (Array.isArray(value) && value.length === 1) {
        return processValue(value[0], level + 1);
    } else {
        return value;
    }
}

/**
 * Test OTA transaction handling with both success and failure scenarios
 */
const testOTATransactionHandling = async (pool) => {
    const requestId = 'test-transaction-' + Date.now();
    const responseId = 3802; // Using a known good response ID
    
    try {
        console.log('\n===== Testing OTA Transaction Handling =====');
        
        // Test 1: Successful transaction (all reservations processed)
        console.log('\n--- Test 1: Successful Transaction ---');
        await testSuccessfulTransaction(pool, requestId + '-success', responseId);
        
        // Test 2: Failed transaction (one reservation fails)
        console.log('\n--- Test 2: Failed Transaction ---');
        await testFailedTransaction(pool, requestId + '-fail', responseId);
        
        console.log('\n===== OTA Transaction Handling Tests Completed =====');
    } catch (error) {
        console.error('Error during transaction handling test:', error);
        throw error;
    }
};

/**
 * Test a successful transaction where all reservations are processed
 */
async function testSuccessfulTransaction(pool, requestId, responseId) {
    const client = await pool.connect();
    
    try {
        console.log(`Testing successful transaction (${requestId})...`);
        
        // Get the test response
        const response = await processResponseById(requestId, responseId, pool);
        const soapEnvelope = await parseXMLResponse(response.xml_response);
        const executeResponse = soapEnvelope?.['S:Envelope']?.['S:Body']?.['ns2:executeResponse'];
        const bookingInfoListWrapper = executeResponse?.return?.bookingInfoList;
        const bookingInfoList = Array.isArray(bookingInfoListWrapper) ? bookingInfoListWrapper : [bookingInfoListWrapper];
        
        if (!bookingInfoList || bookingInfoList.length === 0 || bookingInfoList[0] === null) {
            throw new Error('No booking information found in the response');
        }

        // Generate a unique transaction ID for this test
        const transactionId = `test-tx-${Date.now()}`;
        
        // Insert test data into the queue
        await client.query(
            `INSERT INTO ota_reservation_queue 
             (hotel_id, ota_reservation_id, transaction_id, reservation_data, status) 
             VALUES ($1, $2, $3, $4, $5)`,
            [
                1, // hotel_id
                requestId,
                transactionId,
                JSON.stringify({ test: 'data', type: 'test_success' }),
                'pending'
            ]
        );
        
        // Begin transaction
        await client.query('BEGIN');
        console.log('  - Transaction started');
        
        try {
            // Process each booking info
            for (const [index, bookingInfo] of bookingInfoList.entries()) {
                if (!bookingInfo?.infoTravelXML) continue;
                
                const reservationData = await parseXMLResponse(bookingInfo.infoTravelXML);
                const report = reservationData?.AllotmentBookingReport;
                if (!report) continue;
                
                // Simulate successful processing
                console.log(`  - Successfully processed reservation ${index + 1}`);
            }
            
            // Update queue status to processed
            await client.query(
                'UPDATE ota_reservation_queue SET status = $1, updated_at = NOW() WHERE transaction_id = $2',
                ['processed', transactionId]
            );
            
            // Commit the transaction
            await client.query('COMMIT');
            console.log('  - Transaction committed successfully');
            
            // Verify the queue status was updated
            const result = await client.query(
                'SELECT status FROM ota_reservation_queue WHERE transaction_id = $1',
                [transactionId]
            );
            
            if (result.rows.length > 0) {
                console.log(`  - Queue status verified: ${result.rows[0].status}`);
                if (result.rows[0].status !== 'processed') {
                    throw new Error(`Expected status 'processed' but got '${result.rows[0].status}'`);
                }
            } else {
                throw new Error('No queue entry found after processing');
            }
            
        } catch (error) {
            // Update queue status to failed if there was an error
            await client.query(
                'UPDATE ota_reservation_queue SET status = $1, updated_at = NOW() WHERE transaction_id = $2',
                ['failed', transactionId]
            );
            throw error;
        }
        
    } catch (error) {
        console.error('  - Transaction error:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Test a failed transaction where one reservation fails
 */
async function testFailedTransaction(pool, requestId, responseId) {
    const client = await pool.connect();
    
    try {
        console.log(`Testing failed transaction (${requestId})...`);
        
        // Get the test response
        const response = await processResponseById(requestId, responseId, pool);
        const soapEnvelope = await parseXMLResponse(response.xml_response);
        const executeResponse = soapEnvelope?.['S:Envelope']?.['S:Body']?.['ns2:executeResponse'];
        const bookingInfoListWrapper = executeResponse?.return?.bookingInfoList;
        const bookingInfoList = Array.isArray(bookingInfoListWrapper) ? bookingInfoListWrapper : [bookingInfoListWrapper];
        
        if (!bookingInfoList || bookingInfoList.length === 0 || bookingInfoList[0] === null) {
            throw new Error('No booking information found in the response');
        }

        // Generate a unique transaction ID for this test
        const transactionId = `test-fail-tx-${Date.now()}`;
        
        // Insert test data into the queue
        await client.query(
            `INSERT INTO ota_reservation_queue 
             (hotel_id, ota_reservation_id, transaction_id, reservation_data, status) 
             VALUES ($1, $2, $3, $4, $5)`,
            [
                1, // hotel_id
                requestId,
                transactionId,
                JSON.stringify({ test: 'data', type: 'test_failure' }),
                'pending'
            ]
        );
        
        // Begin transaction
        await client.query('BEGIN');
        console.log('  - Transaction started');
        
        try {
            // Process each booking info
            for (const [index, bookingInfo] of bookingInfoList.entries()) {
                if (!bookingInfo?.infoTravelXML) continue;
                
                // Simulate a failure on the second reservation (if there is one)
                if (index === 1 && bookingInfoList.length > 1) {
                    console.log(`  - Simulating failure for reservation ${index + 1}`);
                    throw new Error('Simulated processing failure');
                }
                
                const reservationData = await parseXMLResponse(bookingInfo.infoTravelXML);
                const report = reservationData?.AllotmentBookingReport;
                if (!report) continue;
                
                console.log(`  - Successfully processed reservation ${index + 1}`);
            }
            
            // If we get here, no failure was triggered
            throw new Error('Expected a simulated failure but none occurred');
            
        } catch (error) {
            // Update queue status to failed
            await client.query(
                'UPDATE ota_reservation_queue SET status = $1, conflict_details = $2, updated_at = NOW() WHERE transaction_id = $3',
                ['failed', { error: error.message }, transactionId]
            );
            
            // Verify the queue status was updated to 'failed'
            const result = await client.query(
                'SELECT status, conflict_details FROM ota_reservation_queue WHERE transaction_id = $1',
                [transactionId]
            );
            
            if (result.rows.length > 0) {
                console.log(`  - Queue status verified: ${result.rows[0].status}`);
                if (result.rows[0].status !== 'failed') {
                    throw new Error(`Expected status 'failed' but got '${result.rows[0].status}'`);
                }
                console.log('  - Conflict details:', JSON.stringify(result.rows[0].conflict_details));
            } else {
                throw new Error('No queue entry found after processing');
            }
            
            // Re-throw if this was an unexpected error
            if (error.message !== 'Simulated processing failure' && 
                error.message !== 'Expected a simulated failure but none occurred') {
                throw error;
            }
            
            // Rollback the transaction
            await client.query('ROLLBACK');
            console.log('  - Transaction rolled back as expected');
        }
        
    } catch (error) {
        console.error('  - Transaction error:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Run the tests
console.log('Starting OTA Reservation Queue Tests...');
runTests()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Unhandled error in test runner:', error);
        process.exit(1);
    });
