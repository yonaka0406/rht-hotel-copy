require('dotenv').config({ path: './api/.env' });
const { getPool } = require('../config/database');
const { addOTAReservation } = require('../models/reservations'); 
const logger = require('../config/logger');

const BAD_OTA_ID = 'RYa0m6e3zw';
const GOOD_OTA_ID = 'RYa0kay7fr_3';

// Mock logger to avoid cluttering console with excessive debug logs if not needed, 
// or let it pass through. Since we want to see debug logs, we might just let it be.
// But standard logger might log to file. We want console output.
// The app uses Winston.

async function runTest() {
    const requestId = 'test-repro-req-id';
    const pool = getPool(requestId);
    
    console.log('Starting reproduction test...');

    // Connect to database
    const client = await pool.connect();
    
    try {
        await runScenario(client, requestId, BAD_OTA_ID, 'BAD (Missing Rates)');
        await runScenario(client, requestId, GOOD_OTA_ID, 'GOOD (Has Rates)');
    } catch (error) {
        console.error('Test failed with error:', error);
    } finally {
        client.release();
        await pool.end(); // Close pool to exit script
    }
}

async function runScenario(client, requestId, otaReservationId, label) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Running Scenario: ${label}`);
    console.log(`Fetching data for OTA Reservation ID: ${otaReservationId}`);
    console.log(`--------------------------------------------------`);

    try {
        // 1. Fetch JSON data
        const resQueue = await client.query(
            `SELECT reservation_data, hotel_id FROM ota_reservation_queue WHERE ota_reservation_id = $1 LIMIT 1`,
            [otaReservationId]
        );

        if (resQueue.rows.length === 0) {
            console.error(`No queue entry found for ${otaReservationId}`);
            return;
        }

        const { reservation_data, hotel_id } = resQueue.rows[0];
        console.log(`Found queue entry. Hotel ID: ${hotel_id}`);
        // console.log(`Data keys: ${Object.keys(reservation_data)}`);

        // 2. Start Transaction (Rolled back later)
        await client.query('BEGIN');
        console.log('Transaction started (will roll back).');

        // 3. Call addOTAReservation
        console.log('Calling addOTAReservation...');
        
        // Pass the client to ensure it uses our transaction and we can roll it back
        const result = await addOTAReservation(requestId, hotel_id, reservation_data, client);
        console.log('addOTAReservation returned:', result.success ? 'SUCCESS' : 'FAILURE');
        if (!result.success) {
             console.log('Message:', result.message);
        }

        if (result.success) {
             // 4. Query results
             const resResult = await client.query(
                 `SELECT id, number_of_people FROM reservations WHERE ota_reservation_id = $1 AND hotel_id = $2 ORDER BY created_at DESC LIMIT 1`,
                 [otaReservationId, hotel_id]
             );
             
             if (resResult.rows.length > 0) {
                 const resId = resResult.rows[0].id;
                 console.log(`\nReservation Created:`);
                 console.log(`  ID: ${resId}`);
                 // console.log(`  Total Price (Header): ${resResult.rows[0].total_price}`);
                 
                 const detailsResult = await client.query(
                     `SELECT id, date, price, plans_hotel_id, plans_global_id FROM reservation_details WHERE reservation_id = $1 ORDER BY date`,
                     [resId]
                 );
                 console.log(`\nReservation Details (${detailsResult.rows.length} nights):`);
                 
                 let totalRatesFound = 0;
                 for (const detail of detailsResult.rows) {
                     const ratesResult = await client.query(
                         `SELECT * FROM reservation_rates WHERE reservation_details_id = $1`,
                         [detail.id]
                     );
                     
                     const dateStr = new Date(detail.date).toISOString().split('T')[0];
                     console.log(`  [${dateStr}] Plan Hotel ID: ${detail.plans_hotel_id || 'N/A'}, Detail Price: ${detail.price}`);
                     console.log(`    Rates Count: ${ratesResult.rows.length}`);
                     
                     if (ratesResult.rows.length > 0) {
                         ratesResult.rows.forEach(r => {
                             console.log(`      - Type: ${r.adjustment_type}, Price: ${r.price}, Tax: ${r.tax_rate}`);
                         });
                     } else {
                         console.log(`      !! NO RATES !!`);
                     }
                     totalRatesFound += ratesResult.rows.length;
                 }
                 
                 if (totalRatesFound === 0) {
                     console.error('\nResult: FAIL - No rates found for this reservation!');
                 } else {
                     console.log('\nResult: SUCCESS - Rates found.');
                 }

             } else {
                 console.error('Reservation record not found after success return!');
             }
        } else {
            console.error('addOTAReservation failed execution.');
        }

    } catch (e) {
        console.error('Error in scenario:', e);
    } finally {
        // 5. Rollback
        await client.query('ROLLBACK');
        console.log('Transaction rolled back.');
    }
}

runTest();
