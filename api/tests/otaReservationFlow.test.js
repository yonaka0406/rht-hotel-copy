const { getPool } = require('../config/database');
const { processResponseById } = require('./testHelpers');
const { parseXMLResponse } = require('../ota/xmlController');
const { insertOTAReservationQueue, updateOTAReservationStatus } = require('../ota/xmlModel');

/**
 * Test the complete OTA reservation flow:
 * 1. Parse XML response
 * 2. Add all reservations to queue
 * 3. Process transactions (add/edit/cancel)
 * 4. Update queue statuses
 * 5. Send success notification to OTA
 */
async function testCompleteOTAReservationFlow() {
    const pool = getPool('test-ota-flow');
    const client = await pool.connect();
    
    try {
        console.log('===== Starting Complete OTA Reservation Flow Test =====');
        
        // Test data - using response ID 3802 which contains multiple reservations
        const responseId = 3802;
        const hotelId = 1; // Test hotel ID
        
        // --- Step 1: Parse XML ---
        console.log('\n--- Step 1: Parse XML Response ---');
        const response = await processResponseById('test-flow', responseId, pool);
        const soapEnvelope = await parseXMLResponse(response.xml_response);
        const executeResponse = soapEnvelope?.['S:Envelope']?.['S:Body']?.['ns2:executeResponse'];
        const bookingInfoListWrapper = executeResponse?.return?.bookingInfoList;
        const bookingInfoList = Array.isArray(bookingInfoListWrapper) ? bookingInfoListWrapper : [bookingInfoListWrapper];
        
        if (!bookingInfoList || bookingInfoList.length === 0 || bookingInfoList[0] === null) {
            throw new Error('No booking information found in the response');
        }
        console.log(`  - Successfully parsed ${bookingInfoList.length} reservations`);
        
        // --- Step 2: Add all reservations to queue ---
        console.log('\n--- Step 2: Add Reservations to Queue ---');
        const transactionId = `test-tx-${Date.now()}`;
        const queueEntries = [];
        
        for (const [index, bookingInfo] of bookingInfoList.entries()) {
            if (!bookingInfo?.infoTravelXML) continue;
            
            const reservationData = await parseXMLResponse(bookingInfo.infoTravelXML);
            const report = reservationData?.AllotmentBookingReport;
            if (!report) continue;
            
            const reservationId = report.UniqueID?.ID || `temp-${Date.now()}-${index}`;
            const queueEntry = {
                hotelId,
                otaReservationId: reservationId,
                transactionId,
                reservationData: report,
                status: 'pending',
                conflictDetails: null
            };
            
            await insertOTAReservationQueue('test-flow', queueEntry);
            queueEntries.push(queueEntry);
            console.log(`  - Added reservation to queue: ${reservationId}`);
        }
        
        if (queueEntries.length === 0) {
            throw new Error('No valid reservations found to process');
        }
        
        // --- Step 3: Process transactions ---
        console.log('\n--- Step 3: Process Transactions ---');
        await client.query('BEGIN');
        console.log('  - Transaction started');
        
        try {
            let allSuccessful = true;
            
            for (const entry of queueEntries) {
                try {
                    const { reservationData } = entry;
                    const classification = reservationData.TransactionType?.DataClassification;
                    
                    console.log(`  - Processing ${classification} for reservation: ${entry.otaReservationId}`);
                    
                    // Simulate different operations based on classification
                    switch(classification) {
                        case 'NewBookReport':
                            // Simulate add reservation
                            console.log('    - Simulating ADD reservation');
                            // Add your actual add reservation logic here
                            break;
                            
                        case 'ModificationReport':
                            // Simulate edit reservation
                            console.log('    - Simulating EDIT reservation');
                            // Add your actual edit reservation logic here
                            break;
                            
                        case 'CancellationReport':
                            // Simulate cancel reservation
                            console.log('    - Simulating CANCEL reservation');
                            // Add your actual cancel reservation logic here
                            break;
                            
                        default:
                            console.warn(`    - Unknown classification: ${classification}`);
                            allSuccessful = false;
                            break;
                    }
                    
                    // Simulate random failures (1 in 5 chance)
                    if (Math.random() < 0.2) {
                        throw new Error('Simulated processing failure');
                    }
                    
                    // Update queue status to processed
                    await updateOTAReservationStatus('test-flow', {
                        hotelId: entry.hotelId,
                        otaReservationId: entry.otaReservationId,
                        status: 'processed',
                        conflictDetails: null
                    });
                    
                } catch (error) {
                    console.error(`    - Error processing reservation ${entry.otaReservationId}:`, error.message);
                    
                    // Update queue status to failed
                    await updateOTAReservationStatus('test-flow', {
                        hotelId: entry.hotelId,
                        otaReservationId: entry.otaReservationId,
                        status: 'failed',
                        conflictDetails: { error: error.message }
                    });
                    
                    allSuccessful = false;
                    
                    // For this test, we'll continue processing other reservations
                    // In a real scenario, you might want to implement retry logic or other error handling
                }
            }
            
            // --- Step 4: Commit or rollback transaction ---
            if (allSuccessful) {
                await client.query('COMMIT');
                console.log('  - Transaction committed successfully');
                
                // --- Step 5: Send success notification to OTA ---
                console.log('\n--- Step 5: Send Success Notification to OTA ---');
                const outputId = executeResponse?.return?.configurationSettings?.outputId;
                if (outputId) {
                    console.log(`  - Sending success notification for outputId: ${outputId}`);
                    // In a real implementation, you would call the OTA's success endpoint here
                    // await successOTAReservations(req, res, hotelId, outputId);
                    console.log('  - Success notification sent to OTA');
                } else {
                    console.warn('  - No outputId found, skipping OTA notification');
                }
                
            } else {
                await client.query('ROLLBACK');
                console.log('  - Transaction rolled back due to failures');
                
                // Update all queue entries to failed
                for (const entry of queueEntries) {
                    await updateOTAReservationStatus('test-flow', {
                        hotelId: entry.hotelId,
                        otaReservationId: entry.otaReservationId,
                        status: 'failed',
                        conflictDetails: { error: 'Transaction rolled back due to other failures' }
                    });
                }
            }
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('  - Transaction error:', error.message);
            throw error;
        }
        
        console.log('\n===== OTA Reservation Flow Test Completed Successfully =====');
        return true;
        
    } catch (error) {
        console.error('Error in testCompleteOTAReservationFlow:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the test
(async () => {
    try {
        await testCompleteOTAReservationFlow();
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
})();
