/**
 * Debug script to investigate the real gap using the actual reservation times found
 * We found 山本塗装店 reservations at 2026-01-16T02:04:36.187Z and 2026-01-16T02:05:07.301Z
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function debugRealGap() {
    const client = await pool.connect();
    try {
        console.log('🔍 Investigating Real Gap with Actual Reservation Times...');
        console.log('=' .repeat(80));
        
        const hotelId = 25;
        
        // From our previous investigation, we found these actual times:
        const actualReservationTimes = [
            '2026-01-16T02:04:36.187Z',
            '2026-01-16T02:05:07.301Z'
        ];
        
        console.log('\n📊 Actual Reservation Times Found:');
        actualReservationTimes.forEach((time, index) => {
            const utc = new Date(time);
            const jst = new Date(utc.getTime() + (9 * 60 * 60 * 1000)); // Add 9 hours for JST
            console.log(`   ${index + 1}. UTC: ${utc.toISOString()} | JST: ${jst.toISOString()}`);
        });
        
        // 1. For each reservation time, check for OTA requests within 5-10 minutes
        console.log('\n📊 Step 1: Checking OTA requests after each reservation...');
        
        for (let i = 0; i < actualReservationTimes.length; i++) {
            const reservationTime = actualReservationTimes[i];
            console.log(`\n   Checking after reservation ${i + 1}: ${reservationTime}`);
            
            const otaQuery = `
                SELECT 
                    id,
                    service_name,
                    created_at,
                    created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo' as jst_time,
                    processed_at,
                    status,
                    current_request_id,
                    EXTRACT(EPOCH FROM (created_at - $2::timestamp))/60 as minutes_after_reservation
                FROM ota_xml_queue 
                WHERE 
                    hotel_id = $1
                    AND created_at > $2::timestamp
                    AND created_at <= $2::timestamp + interval '15 minutes'
                    AND service_name LIKE '%Stock%'
                ORDER BY created_at ASC
                LIMIT 5
            `;
            
            const otaResult = await client.query(otaQuery, [hotelId, reservationTime]);
            
            if (otaResult.rows.length > 0) {
                console.log(`     Found ${otaResult.rows.length} OTA requests:`);
                otaResult.rows.forEach(entry => {
                    console.log(`     ${entry.created_at.toISOString()} (+${Math.round(entry.minutes_after_reservation)} min) - ID: ${entry.current_request_id} - Status: ${entry.status}`);
                });
            } else {
                console.log(`     ❌ NO OTA requests found within 15 minutes`);
            }
        }
        
        // 2. Check the broader pattern around those times
        console.log('\n📊 Step 2: Checking broader OTA pattern around reservation times...');
        
        const broadOTAQuery = `
            SELECT 
                id,
                service_name,
                created_at,
                created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo' as jst_time,
                status,
                current_request_id
            FROM ota_xml_queue 
            WHERE 
                hotel_id = $1
                AND created_at >= '2026-01-16T02:00:00'::timestamp
                AND created_at <= '2026-01-16T02:30:00'::timestamp
                AND service_name LIKE '%Stock%'
            ORDER BY created_at ASC
        `;
        
        const broadResult = await client.query(broadOTAQuery, [hotelId]);
        
        console.log(`   Found ${broadResult.rows.length} OTA requests in 30-minute window:`);
        broadResult.rows.forEach(entry => {
            const jst = new Date(entry.created_at.getTime() + (9 * 60 * 60 * 1000));
            console.log(`   ${entry.created_at.toISOString()} (JST: ${jst.toISOString().split('T')[1].split('.')[0]}) - ID: ${entry.current_request_id}`);
        });
        
        // 3. Check what reservations were actually inserted
        console.log('\n📊 Step 3: Checking actual reservation details inserted...');
        
        const reservationDetailsQuery = `
            SELECT 
                lr.log_time,
                lr.log_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo' as jst_time,
                lr.action,
                lr.record_id,
                lr.changes->>'date' as reservation_date,
                lr.changes->>'room_id' as room_id,
                lr.changes->>'cancelled' as cancelled,
                r.room_number,
                COALESCE(c.name_kanji, c.name_kana, c.name) as guest_name
            FROM logs_reservation lr
            LEFT JOIN rooms r ON (lr.changes->>'room_id')::integer = r.id
            LEFT JOIN reservations res ON (lr.changes->>'reservation_id')::uuid = res.id
            LEFT JOIN clients c ON res.reservation_client_id = c.id
            WHERE 
                lr.table_name = $1
                AND lr.action = 'INSERT'
                AND lr.log_time >= '2026-01-16T02:04:00'::timestamp
                AND lr.log_time <= '2026-01-16T02:06:00'::timestamp
                AND COALESCE(c.name_kanji, c.name_kana, c.name) ILIKE '%山本塗装%'
            ORDER BY lr.log_time ASC
        `;
        
        const tableName = `reservation_details_${hotelId}`;
        const detailsResult = await client.query(reservationDetailsQuery, [tableName]);
        
        console.log(`   Found ${detailsResult.rows.length} 山本塗装店 reservation insertions:`);
        detailsResult.rows.forEach(log => {
            const jst = new Date(log.log_time.getTime() + (9 * 60 * 60 * 1000));
            console.log(`   ${log.log_time.toISOString()} (JST: ${jst.toISOString().split('T')[1].split('.')[0]}) - Room ${log.room_number} - Date: ${log.reservation_date}`);
        });
        
        // 4. Gap analysis
        console.log('\n📊 Step 4: Gap Analysis...');
        
        let gapsFound = 0;
        
        for (const reservationTime of actualReservationTimes) {
            const reservationDate = new Date(reservationTime);
            
            // Find the next OTA request after this reservation
            const nextOTAQuery = `
                SELECT 
                    created_at,
                    current_request_id,
                    EXTRACT(EPOCH FROM (created_at - $2::timestamp))/60 as minutes_gap
                FROM ota_xml_queue 
                WHERE 
                    hotel_id = $1
                    AND created_at > $2::timestamp
                    AND service_name LIKE '%Stock%'
                ORDER BY created_at ASC
                LIMIT 1
            `;
            
            const nextOTAResult = await client.query(nextOTAQuery, [hotelId, reservationTime]);
            
            if (nextOTAResult.rows.length > 0) {
                const gap = Math.round(nextOTAResult.rows[0].minutes_gap);
                const jstReservation = new Date(reservationDate.getTime() + (9 * 60 * 60 * 1000));
                const jstOTA = new Date(nextOTAResult.rows[0].created_at.getTime() + (9 * 60 * 60 * 1000));
                
                console.log(`   Reservation: ${jstReservation.toISOString().split('T')[1].split('.')[0]} JST`);
                console.log(`   Next OTA:    ${jstOTA.toISOString().split('T')[1].split('.')[0]} JST`);
                console.log(`   Gap: ${gap} minutes`);
                
                if (gap > 5) {
                    console.log(`   🚨 GAP DETECTED: ${gap} minutes (expected ≤5 minutes)`);
                    gapsFound++;
                } else {
                    console.log(`   ✅ NORMAL: Gap within acceptable range`);
                }
            } else {
                console.log(`   ❌ NO SUBSEQUENT OTA REQUEST FOUND`);
                gapsFound++;
            }
            console.log('');
        }
        
        // 5. Summary
        console.log('💡 Investigation Summary:');
        console.log(`   - Reservation events analyzed: ${actualReservationTimes.length}`);
        console.log(`   - Gaps found: ${gapsFound}`);
        console.log(`   - OTA requests in window: ${broadResult.rows.length}`);
        
        if (gapsFound > 0) {
            console.log('\n🚨 CONCLUSION: Gap confirmed!');
            console.log('   The 山本塗装店 reservations did not trigger immediate OTA stock adjustments');
            console.log('   This explains the gap detected in the Stock Investigation Tool');
            
            console.log('\n🔧 NEXT STEPS:');
            console.log('   1. Check OTA trigger configuration');
            console.log('   2. Verify if manual OTA sync was performed later');
            console.log('   3. Review OTA service logs for errors during this period');
            console.log('   4. Check if there are any conditions that prevent automatic OTA updates');
        } else {
            console.log('\n✅ CONCLUSION: No significant gaps found');
        }
        
        return {
            reservationEvents: actualReservationTimes.length,
            gapsFound,
            otaRequestsInWindow: broadResult.rows.length
        };
        
    } catch (error) {
        console.error('Error during real gap investigation:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the investigation
if (require.main === module) {
    debugRealGap()
        .then(result => {
            console.log('\n📊 Real Gap Investigation Complete!');
            console.log('Final Result:', result);
            console.log('\n' + '='.repeat(80));
        })
        .catch(error => {
            console.error('Investigation failed:', error);
            process.exit(1);
        });
}

module.exports = { debugRealGap };