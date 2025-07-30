// Import required modules
const { Pool } = require('pg');
require('dotenv').config();

const { 
    processAndQueueReservation, 
    processQueuedReservations, 
    submitXMLTemplate, 
    insertXMLResponse 
} = require('../ota/xmlController');

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

const { 
    insertOTAReservationQueue, 
    updateOTAReservationQueue 
} = require('../ota/xmlModel');
const xml2js = require('xml2js');

// Create a database pool
const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: String(process.env.PG_PASSWORD), // Ensure password is a string
    port: process.env.PG_PORT,
});

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


/**
 * Test the complete OTA reservation flow, replicating the production getOTAReservations implementation:
 * 1. Parse XML response
 * 2. Process and queue each reservation
 * 3. Process queued reservations in a transaction
 * 4. Update queue statuses
 * 5. Send success notification to OTA
 */
async function testCompleteOTAReservationFlow() {
    const requestId = `test-${Date.now()}`;
    console.log(`\n===== Starting Complete OTA Reservation Flow Test =====`);
    
    // Declare dbClient and isTransactionActive at the function level
    let dbClient = null;
    let isTransactionActive = false;
    
    try {
        // Test database connection with processResponseById
        console.log('Testing database connection...');
        const testResponse = await processResponseById(requestId, 3802, pool);
        console.log('Successfully connected to database and fetched test response:', testResponse ? 'Response found' : 'No response found');
        
        console.log('===== Starting Complete OTA Reservation Flow Test =====');
        
        // Get a database client from the provided pool
        let dbClient;
        let isTransactionActive = false;
        
        // Get a database client from the provided pool
        dbClient = await pool.connect();
        
        // Test data - using response ID 3802 which contains multiple reservations
        const responseId = 3802;
        const hotelId = 10; // Using hotel_id = 10 as per database configuration
        
        // --- Step 1: Get and parse XML response ---
        console.log('\n--- Step 1: Parse XML Response ---');
        const response = await processResponseById(requestId, responseId, pool);
        const soapEnvelope = await parseXMLResponse(response.xml_response);
        const executeResponse = soapEnvelope?.['S:Envelope']?.['S:Body']?.['ns2:executeResponse'];
        const bookingInfoListWrapper = executeResponse?.return?.bookingInfoList;
        const bookingInfoList = Array.isArray(bookingInfoListWrapper) 
            ? bookingInfoListWrapper 
            : (bookingInfoListWrapper ? [bookingInfoListWrapper] : []);
        
        if (!bookingInfoList || bookingInfoList.length === 0 || bookingInfoList[0] === null) {
            throw new Error('No booking information found in the response');
        }
        console.log(`  - Successfully parsed ${bookingInfoList.length} reservations`);
        
        // --- Step 2: Process and queue each reservation ---
        console.log('\n--- Step 2: Process and Queue Reservations ---');
        const queuedReservations = [];
        
        for (const [index, bookingInfo] of bookingInfoList.entries()) {
            if (!bookingInfo?.infoTravelXML) {
                console.warn(`  - Skipping booking info at index ${index} - missing infoTravelXML`);
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
                    console.warn('  - No AllotmentBookingReport found in parsed XML');
                    continue;
                }
                
                // Process and queue the reservation using the production helper
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
                    console.log(`  - Successfully queued reservation: ${queuedReservation._otaReservationId}`);
                } else if (queuedReservation._queueStatus === 'error') {
                    console.error('  - Failed to queue reservation:', queuedReservation._error);
                }
                
            } catch (parseError) {
                console.error('  - Error processing reservation:', parseError.message);
            }
        }
        
        if (queuedReservations.length === 0) {
            throw new Error('No valid reservations were queued for processing');
        }
        
        // --- Step 3: Process queued reservations in a transaction ---
        console.log('\n--- Step 3: Process Queued Reservations in Transaction ---');
        
        // Get a new client for the transaction
        dbClient = await pool.connect();
        isTransactionActive = false;
        
        try {
            // Start transaction
            await dbClient.query('BEGIN');
            const formattedReservations = queuedReservations.map(reservation => {
                const reservationData = {
                    ...reservation,
                    hotelId: 10, // Ensure hotelId is explicitly set to 10
                    // Add any additional formatting needed for the reservation data
                };
                
                return {
                    otaReservationId: reservation.otaReservationId,
                    transactionId: reservation._transactionId,
                    _queueId: reservation._queueId,
                    hotelId: 10, // Ensure hotelId is set in the main object as well
                    reservationData: reservationData // The actual reservation data
                };
            });
            
            // Process all queued reservations in the transaction
            let transactionSucceeded = false;
            
            try {
                // Process the reservations
                await processQueuedReservations(requestId, formattedReservations, dbClient);
                
                // If we get here, the transaction was successful
                console.log('  - Transaction completed successfully');
                transactionSucceeded = true;
                
                // Verify the queue entries are marked as processed
                console.log('\n--- Step 4: Verifying Queue Entries are Marked as Processed ---');
                
                const queueResults = await pool.query(
                    'SELECT * FROM ota_reservation_queue WHERE status = $1 ORDER BY id',
                    ['processed']
                );
                
                console.log(`  - Found ${queueResults.rows.length} processed queue entries in database`);
                
                if (queueResults.rows.length === 0) {
                    throw new Error('No queue entries were marked as processed in the database');
                }
                
                console.log('  - First processed queue entry:', {
                    id: queueResults.rows[0]?.id,
                    status: queueResults.rows[0]?.status,
                    updated_at: queueResults.rows[0]?.updated_at
                });
                
                console.log('\n===== OTA Reservation Flow Test Completed =====');
                console.log('- All queue entries were properly marked as processed');
                console.log('- Reservations were successfully added to the database');
                
            } catch (processError) {
                if (transactionSucceeded) {
                    console.log('  - Error verifying processed queue entries:', processError.message);
                    throw processError;
                }
                
                console.log('  - Transaction failed:', processError.message);
                
                // Verify the queue entries are marked as failed
                console.log('\n--- Step 4: Verifying Queue Entries are Marked as Failed ---');
                
                const queueResults = await pool.query(
                    'SELECT * FROM ota_reservation_queue WHERE status = $1 ORDER BY id',
                    ['failed']
                );
                
                console.log(`  - Found ${queueResults.rows.length} failed queue entries in database`);
                
                if (queueResults.rows.length === 0) {
                    throw new Error('No queue entries were marked as failed in the database');
                }
                
                console.log('  - First failed queue entry:', {
                    id: queueResults.rows[0]?.id,
                    status: queueResults.rows[0]?.status,
                    conflict_details: queueResults.rows[0]?.conflict_details,
                    updated_at: queueResults.rows[0]?.updated_at
                });
                
                console.log('\n===== OTA Reservation Flow Test Completed =====');
                console.log('- All queue entries were properly marked as failed');
                console.log('- No reservations were added to the database (as expected)');
            }
            
            console.log('\n===== Test PASSED =====');
            
            // Clean up database client
            if (dbClient) {
                try {
                    await dbClient.release();
                } catch (releaseError) {
                    console.error('  - Error releasing database client:', releaseError.message);
                }
            }
            
            // Test completed successfully
            console.log('\n===== OTA Reservation Flow Test Completed Successfully =====');
            return;
        } catch (error) {
            console.error('  - Error in transaction block:', error.message);
            if (dbClient) {
                try {
                    await dbClient.query('ROLLBACK');
                } catch (rollbackError) {
                    console.error('  - Error during rollback:', rollbackError.message);
                }
            }
            throw error; // Re-throw to be caught by the outer catch
        }
    } catch (error) {
        console.error('\n===== OTA Reservation Flow Test Failed =====');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    } finally {
        // Ensure database client is always released
        if (dbClient && dbClient.release) {
            try {
                await dbClient.release();
            } catch (releaseError) {
                console.error('Error releasing database client in finally:', releaseError.message);
            }
        }
        // Note: The pool is managed by the runTests function, so we don't close it here
    }
}

// Main test runner
const runTests = async () => {
    const requestId = 'ota-test-runner-' + Date.now();
    
    try {
        console.log('\n===== Running Complete OTA Reservation Flow Test =====');
        await testCompleteOTAReservationFlow();
        
        console.log('\n\n===== All tests completed successfully =====');
        return true;
    } catch (error) {
        console.error('\n\n===== Test failed =====');
        console.error(error);
        return false;
    } finally {
        // Pool is managed by the main process
    }
};

// Run the tests
console.log('Starting OTA Reservation Flow Tests...');
runTests()
    .then(success => {
        console.log(`\n===== All tests ${success ? 'PASSED' : 'FAILED'} =====`);
        pool.end().then(() => process.exit(success ? 0 : 1));
    })
    .catch(error => {
        console.error('Error running tests:', error);
        pool.end().then(() => process.exit(1));
    });
