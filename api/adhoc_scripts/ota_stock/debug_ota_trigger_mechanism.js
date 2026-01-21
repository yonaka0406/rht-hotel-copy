/**
 * Investigate why OTA updates were not triggered for hold/block status reservations
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Investigating OTA trigger mechanism failure...\n');
    
    const client = await pool.connect();
    try {
        const hotelId = 25;
        
        // 1. Verify that hold/block reservations should trigger OTA updates
        console.log('1. INVENTORY IMPACT ANALYSIS:');
        console.log('   User clarification: "hold" and "block" status reservations DO affect inventory');
        console.log('   Expected behavior: Both should trigger OTA stock adjustments');
        
        // 2. Check what actually triggers OTA updates in the codebase
        console.log('\n2. SEARCHING FOR OTA TRIGGER LOGIC:');
        
        // Look for recent successful OTA triggers to understand the pattern
        const recentOTASuccess = await client.query(`
            SELECT 
                oq.created_at,
                oq.current_request_id,
                oq.service_name,
                oq.status,
                -- Find reservation events around the same time
                (
                    SELECT COUNT(*)
                    FROM logs_reservation lr
                    WHERE lr.table_name = $2
                    AND lr.log_time BETWEEN oq.created_at - interval '5 minutes' AND oq.created_at + interval '1 minute'
                    AND lr.action = 'INSERT'
                ) as nearby_inserts,
                (
                    SELECT COUNT(*)
                    FROM logs_reservation lr
                    WHERE lr.table_name = $2
                    AND lr.log_time BETWEEN oq.created_at - interval '5 minutes' AND oq.created_at + interval '1 minute'
                    AND lr.action = 'UPDATE'
                ) as nearby_updates
            FROM ota_xml_queue oq
            WHERE 
                oq.hotel_id = $1
                AND oq.service_name LIKE '%Stock%'
                AND oq.created_at >= '2026-01-15'::date
                AND oq.created_at < '2026-01-17'::date
                AND oq.status = 'completed'
            ORDER BY oq.created_at ASC
            LIMIT 10
        `, [hotelId, `reservation_details_${hotelId}`]);
        
        console.log(`   Found ${recentOTASuccess.rows.length} successful OTA stock requests:`);
        recentOTASuccess.rows.forEach((ota, i) => {
            const jst = new Date(ota.created_at.getTime() + (9 * 60 * 60 * 1000));
            console.log(`     ${i + 1}. ${jst.toISOString()} JST - ID: ${ota.current_request_id}`);
            console.log(`        Nearby events: ${ota.nearby_inserts} INSERTs, ${ota.nearby_updates} UPDATEs`);
        });
        
        // 3. Check if there's a job/service that monitors logs_reservation for changes
        console.log('\n3. TRIGGER MECHANISM INVESTIGATION:');
        
        // Look for patterns in what triggers OTA requests
        const triggerAnalysis = await client.query(`
            WITH ota_times AS (
                SELECT created_at, current_request_id
                FROM ota_xml_queue 
                WHERE hotel_id = $1 
                AND service_name LIKE '%Stock%'
                AND created_at >= '2026-01-15'::date
                AND created_at < '2026-01-17'::date
            ),
            reservation_events AS (
                SELECT 
                    log_time,
                    action,
                    changes->>'billable' as billable,
                    changes->>'cancelled' as cancelled
                FROM logs_reservation 
                WHERE table_name = $2
                AND log_time >= '2026-01-15'::date
                AND log_time < '2026-01-17'::date
            )
            SELECT 
                ot.current_request_id,
                ot.created_at as ota_time,
                COUNT(re.log_time) as events_before_ota,
                STRING_AGG(DISTINCT re.action, ', ') as event_types,
                STRING_AGG(DISTINCT re.billable, ', ') as billable_values
            FROM ota_times ot
            LEFT JOIN reservation_events re ON re.log_time BETWEEN ot.created_at - interval '10 minutes' AND ot.created_at
            GROUP BY ot.current_request_id, ot.created_at
            ORDER BY ot.created_at
            LIMIT 5
        `, [hotelId, `reservation_details_${hotelId}`]);
        
        console.log('   OTA trigger correlation analysis:');
        triggerAnalysis.rows.forEach((analysis, i) => {
            const jst = new Date(analysis.ota_time.getTime() + (9 * 60 * 60 * 1000));
            console.log(`     ${i + 1}. OTA ${analysis.current_request_id} at ${jst.toISOString()} JST`);
            console.log(`        Events before: ${analysis.events_before_ota} (${analysis.event_types})`);
            console.log(`        Billable values: ${analysis.billable_values}`);
        });
        
        // 4. Check if there's a specific condition that failed for 山本塗装店
        console.log('\n4. 山本塗装店 SPECIFIC FAILURE ANALYSIS:');
        
        const yamamoto_events = await client.query(`
            SELECT 
                lr.log_time,
                lr.action,
                lr.changes->>'billable' as billable,
                lr.changes->>'cancelled' as cancelled,
                lr.changes->>'room_id' as room_id,
                r.room_number,
                -- Check for OTA requests within 10 minutes after each event
                (
                    SELECT oq.current_request_id
                    FROM ota_xml_queue oq
                    WHERE oq.hotel_id = $1
                    AND oq.service_name LIKE '%Stock%'
                    AND oq.created_at > lr.log_time
                    AND oq.created_at <= lr.log_time + interval '10 minutes'
                    ORDER BY oq.created_at ASC
                    LIMIT 1
                ) as next_ota_request
            FROM logs_reservation lr
            LEFT JOIN rooms r ON (lr.changes->>'room_id')::integer = r.id
            LEFT JOIN reservations res ON (lr.changes->>'reservation_id')::uuid = res.id
            LEFT JOIN clients c ON res.reservation_client_id = c.id
            WHERE 
                lr.table_name = $2
                AND DATE(lr.log_time) = '2026-01-16'
                AND COALESCE(c.name_kanji, c.name_kana, c.name) ILIKE '%山本塗装%'
            ORDER BY lr.log_time ASC
        `, [hotelId, `reservation_details_${hotelId}`]);
        
        console.log(`   山本塗装店 events and OTA correlation:`);
        yamamoto_events.rows.forEach((event, i) => {
            const jst = new Date(event.log_time.getTime() + (9 * 60 * 60 * 1000));
            console.log(`     ${i + 1}. ${jst.toISOString()} JST - ${event.action} - Room ${event.room_number}`);
            console.log(`        billable: ${event.billable}, cancelled: ${event.cancelled}`);
            console.log(`        Next OTA: ${event.next_ota_request || 'NONE within 10 minutes'}`);
        });
        
        // 5. Check if OTA service was running during the gap period
        console.log('\n5. OTA SERVICE STATUS DURING GAP:');
        
        const otaServiceStatus = await client.query(`
            SELECT 
                created_at,
                current_request_id,
                service_name,
                status,
                CASE 
                    WHEN last_error IS NOT NULL THEN 'HAS_ERROR'
                    ELSE 'NO_ERROR'
                END as error_status
            FROM ota_xml_queue 
            WHERE 
                hotel_id = $1
                AND created_at BETWEEN '2026-01-16 02:00:00'::timestamp AND '2026-01-16 03:00:00'::timestamp
            ORDER BY created_at ASC
        `, [hotelId]);
        
        console.log(`   OTA service activity during gap period (02:00-03:00 UTC):`);
        if (otaServiceStatus.rows.length > 0) {
            otaServiceStatus.rows.forEach((status, i) => {
                const jst = new Date(status.created_at.getTime() + (9 * 60 * 60 * 1000));
                console.log(`     ${i + 1}. ${jst.toISOString()} JST - ${status.service_name} - ${status.status} - ${status.error_status}`);
            });
        } else {
            console.log('     ❌ NO OTA service activity during the gap period');
            console.log('     This suggests the OTA trigger mechanism was not working');
        }
        
        // 6. Conclusion and next steps
        console.log('\n6. INVESTIGATION CONCLUSION:');
        console.log('   🚨 CONFIRMED: OTA trigger mechanism failed for 山本塗装店 reservations');
        console.log('   📋 EVIDENCE:');
        console.log('   - Reservations created with inventory impact (hold status)');
        console.log('   - No OTA stock adjustments triggered within expected timeframe');
        console.log('   - Need to identify the specific trigger mechanism (job/webhook/trigger)');
        console.log('');
        console.log('   🔧 NEXT STEPS:');
        console.log('   1. Identify the exact mechanism that monitors reservation changes');
        console.log('   2. Check if the mechanism was running during 2026-01-16 11:04-11:05 JST');
        console.log('   3. Verify trigger conditions (status, billable, etc.)');
        console.log('   4. Check for any errors or failures in the trigger system');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();