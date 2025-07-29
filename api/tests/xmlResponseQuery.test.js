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

// Function to find unique identifiers in reservation data
const findUniqueIdentifiers = (parsedData) => {
    const identifiers = {};
    
    // Extract potential unique identifiers
    if (parsedData.TransactionType) {
        if (parsedData.TransactionType.DataID) {
            identifiers.transactionId = parsedData.TransactionType.DataID;
        }
        if (parsedData.TransactionType.SystemDate) {
            identifiers.transactionDate = parsedData.TransactionType.SystemDate;
        }
    }
    
    if (parsedData.BasicInformation) {
        const basic = parsedData.BasicInformation;
        if (basic.TravelAgencyBookingNumber) {
            identifiers.bookingNumber = basic.TravelAgencyBookingNumber;
        }
        if (basic.TravelAgencyBookingDate && basic.TravelAgencyBookingTime) {
            identifiers.bookingDateTime = `${basic.TravelAgencyBookingDate} ${basic.TravelAgencyBookingTime}`;
        }
        if (basic.GuestOrGroupNameSingleByte) {
            identifiers.guestName = basic.GuestOrGroupNameSingleByte;
        }
        if (basic.CheckInDate && basic.CheckOutDate) {
            identifiers.stayPeriod = `${basic.CheckInDate} to ${basic.CheckOutDate}`;
        }
    }
    
    return identifiers;
};

// Function to compare two responses with deep XML comparison
const compareResponses = async (requestId, response1, response2, pool) => {
    if (!response1 || !response2) {
        return {
            areEqual: false,
            differences: ['One or both responses are invalid'],
            uniqueIdentifiers: {}
        };
    }
    
    if (response1.error || response2.error) {
        return {
            areEqual: false,
            differences: [
                response1.error ? `Response 1 error: ${response1.error}` : null,
                response2.error ? `Response 2 error: ${response2.error}` : null
            ].filter(Boolean),
            uniqueIdentifiers: {}
        };
    }
    
    const differences = [];
    const keys1 = Object.keys(response1);
    const keys2 = Object.keys(response2);
    const allKeys = new Set([...keys1, ...keys2]);
    
    // Get raw XML for both responses using the provided pool
    const [raw1, raw2] = await Promise.all([
        pool.query('SELECT response FROM xml_responses WHERE id = $1', [response1.responseId]),
        pool.query('SELECT response FROM xml_responses WHERE id = $1', [response2.responseId])
    ]);
    
    const xml1 = raw1.rows[0]?.response;
    const xml2 = raw2.rows[0]?.response;
    
    // Extract all tags from both XMLs
    const tags1 = xml1 ? extractXmlTags(xml1) : {};
    const tags2 = xml2 ? extractXmlTags(xml2) : {};
    
    // Compare XML tags
    const allTags = new Set([...Object.keys(tags1), ...Object.keys(tags2)]);
    const xmlDifferences = [];
    
    for (const tag of allTags) {
        if (!tags1[tag] && tags2[tag]) {
            xmlDifferences.push(`Tag '${tag}' exists only in response 2`);
        } else if (tags1[tag] && !tags2[tag]) {
            xmlDifferences.push(`Tag '${tag}' exists only in response 1`);
        } else if (JSON.stringify(tags1[tag]) !== JSON.stringify(tags2[tag])) {
            xmlDifferences.push(`Tag '${tag}' values differ:`);
            xmlDifferences.push(`  Response 1: ${JSON.stringify(tags1[tag])}`);
            xmlDifferences.push(`  Response 2: ${JSON.stringify(tags2[tag])}`);
        }
    }
    
    // Find unique identifiers from parsed data
    const identifiers1 = response1.parsedData ? findUniqueIdentifiers(response1.parsedData) : {};
    const identifiers2 = response2.parsedData ? findUniqueIdentifiers(response2.parsedData) : {};
    
    // Compare high-level fields
    for (const key of allKeys) {
        if (key === 'rawResponse' || key === 'parsedData') continue;
        
        if (!(key in response1)) {
            differences.push(`Field '${key}' exists in response 2 but not in response 1`);
        } else if (!(key in response2)) {
            differences.push(`Field '${key}' exists in response 1 but not in response 2`);
        } else if (JSON.stringify(response1[key]) !== JSON.stringify(response2[key])) {
            differences.push(`Field '${key}' differs:`);
            differences.push(`  Response 1: ${JSON.stringify(response1[key])}`);
            differences.push(`  Response 2: ${JSON.stringify(response2[key])}`);
        }
    }
    
    // Combine all differences
    const allDifferences = [
        ...differences,
        ...xmlDifferences
    ];
    
    return {
        areEqual: allDifferences.length === 0,
        differences: allDifferences,
        uniqueIdentifiers: {
            response1: identifiers1,
            response2: identifiers2
        }
    };
};


// Helper function to clean up test data
const cleanupTestData = async (requestId, pool) => {
    if (!pool) {
        console.warn('No pool provided for cleanup');
        return;
    }
    try {
        await pool.query('DELETE FROM ota_reservation_queue WHERE request_id = $1', [requestId]);
        console.log('Cleaned up test data from ota_reservation_queue');
    } catch (error) {
        console.error('Error cleaning up test data:', error);
    }
};

const testXMLResponseQuery = async (pool) => {
    const requestId = 'test-xml-query-' + Date.now();
    const responseId1 = 3803; // First response ID to compare
    const responseId2 = 3802; // Second response ID to compare
    
    try {
        console.log(`Starting XML response comparison test...`);
        
        // Process both responses
        const identifiers1 = await findUniqueIdentifiers(await processResponseById(requestId, responseId1, pool));
        const identifiers2 = await findUniqueIdentifiers(await processResponseById(requestId, responseId2, pool));
        
        // Compare the responses using the shared pool
        console.log('\n===== Comparing Responses =====');
        const comparison = await compareResponses(requestId, identifiers1, identifiers2, pool);
        
        // Display unique identifiers
        console.log('\n===== Unique Identifiers =====');
        console.log('Response 1:');
        console.log(JSON.stringify(comparison.uniqueIdentifiers.response1, null, 2));
        console.log('\nResponse 2:');
        console.log(JSON.stringify(comparison.uniqueIdentifiers.response2, null, 2));
        
        // Display differences
        if (comparison.areEqual) {
            console.log('\nThe responses are identical in all compared aspects');
        } else {
            console.log('\n===== Differences Found =====');
            comparison.differences.forEach((diff, index) => {
                console.log(`${index + 1}. ${diff}`);
            });
            
            // Suggest a unique key based on the data
            const suggestUniqueKey = () => {
                const id1 = comparison.uniqueIdentifiers.response1;
                const id2 = comparison.uniqueIdentifiers.response2;
                
                // Check if transaction ID and booking number match
                if (id1.transactionId && id1.transactionId === id2.transactionId) {
                    return 'transactionId';
                }
                
                // Check if booking number matches
                if (id1.bookingNumber && id1.bookingNumber === id2.bookingNumber) {
                    return 'bookingNumber';
                }
                
                // If we have guest name and stay period, that's a good composite key
                if (id1.guestName && id1.stayPeriod && 
                    id1.guestName === id2.guestName && 
                    id1.stayPeriod === id2.stayPeriod) {
                    return 'guestName + stayPeriod';
                }
                
                return 'No reliable unique identifier found - consider using a composite key';
            };
            
            console.log('\n===== Suggested Unique Key =====');
            console.log(suggestUniqueKey());
        }
        
        console.log('\n===== Test completed successfully =====');
    } catch (error) {
        console.error('Error during test:', error);
        
        // If the error is from processXMLResponse, it might have its own error details
        if (error.response) {
            console.error('Response error details:', error.response);
        }
        
        // Log the full error stack for debugging
        console.error('Error stack:', error.stack);
        throw error; // Re-throw to fail the test
    } finally {
        console.log('\n===== Test completed =====');
    }
}

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
        // Clean up test data but don't close the pool here
        // await cleanupTestData(requestId, pool);  // Temporarily disabled as per user request
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
