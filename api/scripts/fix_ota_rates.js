require('dotenv').config({ path: './api/.env' });
const { getPool } = require('../config/database');
const { insertReservationRate } = require('../models/reservations/insert');
const logger = require('../config/logger');

const DRY_RUN = process.argv.includes('--dry-run');

async function fixMissingRates() {
    const requestId = 'fix-ota-rates-script';
    const pool = getPool(requestId);
    const client = await pool.connect();

    console.log(`Starting remediation script... (Dry Run: ${DRY_RUN})`);

    try {
        // 1. Identify bad reservations
        // Criteria: Type OTA, has plans, NO rates, not cancelled
        const query = `
            SELECT 
                r.id AS reservation_id, 
                r.hotel_id, 
                r.ota_reservation_id,
                rd.id AS reservation_detail_id, 
                rd.price AS detail_price,
                rd.date
            FROM reservations r 
            JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id 
            WHERE r.type = 'ota' 
            AND (rd.plans_hotel_id IS NOT NULL OR rd.plans_global_id IS NOT NULL) 
            AND NOT EXISTS (
                SELECT 1 FROM reservation_rates rr 
                WHERE rr.reservation_details_id = rd.id AND rr.hotel_id = rd.hotel_id
            ) 
            AND rd.cancelled IS NULL
            ORDER BY r.created_at DESC;
        `;

        const result = await client.query(query);
        console.log(`Found ${result.rows.length} reservation details missing rates.`);

        if (result.rows.length === 0) {
            console.log('No records to fix.');
            return;
        }

        // Group by reservation to minimize queue lookups
        const reservationsMap = {};
        for (const row of result.rows) {
            if (!reservationsMap[row.reservation_id]) {
                reservationsMap[row.reservation_id] = {
                    hotel_id: row.hotel_id,
                    ota_reservation_id: row.ota_reservation_id,
                    details: []
                };
            }
            reservationsMap[row.reservation_id].details.push(row);
        }

        console.log(`Processing ${Object.keys(reservationsMap).length} unique reservations.`);

        for (const resId in reservationsMap) {
            const resData = reservationsMap[resId];
            console.log(`Processing Reservation ${resId} (OTA: ${resData.ota_reservation_id})...`);

            try {
                await client.query('BEGIN');

                // 2. Fetch original OTA data
                // We need to know the 'TotalPerRoomRate' or simply use the 'reservation_details.price' 
                // since the detail price seems to be correct in the bad records (10000 in my test).
                // Using detail.price is safer and easier than parsing JSON again, 
                // assuming the bug only affected rate insertion, not detail insertion.
                // The bug in 'main.js' used 'roomDetail.TotalPerRoomRate' for both detail price and rate price.
                
                for (const detail of resData.details) {
                    const price = Number(detail.detail_price);
                    
                    const rateData = {
                        hotel_id: detail.hotel_id,
                        reservation_details_id: detail.reservation_detail_id,
                        adjustment_type: 'base_rate',
                        adjustment_value: price,
                        tax_type_id: 3, // Default as per main.js logic
                        tax_rate: 0.1,  // Default as per main.js logic
                        price: price,
                        include_in_cancel_fee: true,
                        created_by: 1 // System/Admin
                    };

                    console.log(`  -> Inserting rate for detail ${detail.reservation_detail_id} (${detail.date}): Price ${price}`);

                    if (!DRY_RUN) {
                        await insertReservationRate(requestId, rateData, client);
                    }
                }

                await client.query('COMMIT');
                if (!DRY_RUN) console.log('  Commit successful.');
                else console.log('  (Dry Run) Rollback implicit.');

            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`  Error processing reservation ${resId}:`, err.message);
            }
        }

    } catch (e) {
        console.error('Fatal error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

fixMissingRates();
