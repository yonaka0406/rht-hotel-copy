/**
 * Debug script to investigate the specific gap mentioned in the timeline
 * Looking for the exact reservation events and OTA requests mentioned
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function debugSpecificGap() {
    const client = await pool.connect();
    try {
        console.log('🔍 Debugging Specific Gap from Timeline...');
        console.log('=' .repeat(80));
        
        const hotelId = 25;
        
        // 1. Look for the specific reservation events mentioned in the timeline
        console.log('\n📊 Step 1: Looking for 株式会社山本塗装店 reservations...');
        
        const yamamoto = await client.query(`
            SELECT 
                lr.log_time,
                lr.action,
                lr.record_id,
                lr.changes->>'date' as date,
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
                AND COALESCE(c.name_kanji, c.name_kana, c.name) ILIKE '%山本塗装%'
                AND lr.log_time >= '2026-01-15'::date
                AND lr.log_time <= '2026-01-17'::date
            ORDER BY lr.log_time DESC
        `, [`reservation_details_${hotelId}`]);
        
        console.log(`   Found ${yamamoto.rows.length} 山本塗装店 reservation logs:`);
        yamamoto.rows.forEach(log => {
            console.log(`   ${log.log_time.toISOString()} - ${log.action} - Room ${log.room_number || log.room_id} - Date: ${log.date}`);
        });
        
        // 2. Look for Unknown Client reservations on 2026-01-20
        console.log('\n📊 Step 2: Looking for Unknown Client reservations on 2026-01-20...');
        
        const unknownClient = await client.query(`
            SELECT 
                lr.log_time,
                lr.action,
                lr.record_id,
                lr.changes->>'date' as date,
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
                AND lr.log_time >= '2026-01-20 12:38:00'::timestamp
                AND lr.log_time <= '2026-01-20 12:39:00'::timestamp
                AND r.room_number = '207'
            ORDER BY lr.log_time DESC
        `, [`reservation_details_${hotelId}`]);
        
        console.log(`   Found ${unknownClient.rows.length} Unknown Client reservations (Room 207):`);
        unknownClient.rows.forEach(log => {
            console.log(`   ${log.log_time.toISOString()} - ${log.action} - ${log.guest_name || 'Unknown'} - Room ${log.room_number}`);
        });
        
        // 3. Look for the specific OTA requests mentioned
        console.log('\n📊 Step 3: Looking for specific OTA requests...');
        
        const otaRequests = await client.query(`
            SELECT 
                id,
                service_name,
                created_at,
                processed_at,
                status,
                current_request_id,
                retries,
                last_error
            FROM ota_xml_queue 
            WHERE 
                hotel_id = $1
                AND (
                    current_request_id = '42663500'
                    OR current_request_id = '04270.01'
                    OR created_at >= '2026-01-16 09:47:00'::timestamp
                    AND created_at <= '2026-01-16 09:48:00'::timestamp
                    OR created_at >= '2026-01-20 12:38:00'::timestamp
                    AND created_at <= '2026-01-20 12:39:00'::timestamp
                )
            ORDER BY created_at DESC
        `, [hotelId]);
        
        console.log(`   Found ${otaRequests.rows.length} specific OTA requests:`);
        otaRequests.rows.forEach(entry => {
            console.log(`   ${entry.created_at.toISOString()} - ${entry.service_name} - ID: ${entry.current_request_id} - Status: ${entry.status}`);
        });
        
        // 4. Check the timeline around 2026-01-16 11:04:36 more broadly
        console.log('\n📊 Step 4: Broader check around 2026-01-16 11:04:36...');
        
        const broadCheck = await client.query(`
            SELECT 
                lr.log_time,
                lr.action,
                lr.record_id,
                lr.changes->>'date' as date,
                lr.changes->>'room_id' as room_id,
                r.room_number,
                COALESCE(c.name_kanji, c.name_kana, c.name) as guest_name
            FROM logs_reservation lr
            LEFT JOIN rooms r ON (lr.changes->>'room_id')::integer = r.id
            LEFT JOIN reservations res ON (lr.changes->>'reservation_id')::uuid = res.id
            LEFT JOIN clients c ON res.reservation_client_id = c.id
            WHERE 
                lr.table_name = $1
                AND lr.log_time >= '2026-01-16 11:00:00'::timestamp
                AND lr.log_time <= '2026-01-16 11:10:00'::timestamp
            ORDER BY lr.log_time DESC
        `, [`reservation_details_${hotelId}`]);
        
        console.log(`   Found ${broadCheck.rows.length} reservation logs around 11:04:36:`);
        broadCheck.rows.forEach(log => {
            console.log(`   ${log.log_time.toISOString()} - ${log.action} - ${log.guest_name || 'Unknown'} - Room ${log.room_number || log.room_id} - Date: ${log.date}`);
        });
        
        // 5. Check OTA requests around the same time
        console.log('\n📊 Step 5: OTA requests around 2026-01-16 11:04:36...');
        
        const otaAroundGap = await client.query(`
            SELECT 
                id,
                service_name,
                created_at,
                processed_at,
                status,
                current_request_id
            FROM ota_xml_queue 
            WHERE 
                hotel_id = $1
                AND created_at >= '2026-01-16 11:00:00'::timestamp
                AND created_at <= '2026-01-16 11:10:00'::timestamp
            ORDER BY created_at DESC
        `, [hotelId]);
        
        console.log(`   Found ${otaAroundGap.rows.length} OTA requests around 11:04:36:`);
        otaAroundGap.rows.forEach(entry => {
            console.log(`   ${entry.created_at.toISOString()} - ${entry.service_name} - ID: ${entry.current_request_id} - Status: ${entry.status}`);
        });
        
        // 6. Summary and analysis
        console.log('\n📊 Step 6: Analysis Summary...');
        
        const analysis = {
            yamamoto_events: yamamoto.rows.length,
            unknown_client_events: unknownClient.rows.length,
            specific_ota_requests: otaRequests.rows.length,
            broad_reservation_events: broadCheck.rows.length,
            ota_around_gap: otaAroundGap.rows.length
        };
        
        console.log('   Analysis Results:');
        console.log(`   - 山本塗装店 events found: ${analysis.yamamoto_events}`);
        console.log(`   - Unknown Client events (Room 207): ${analysis.unknown_client_events}`);
        console.log(`   - Specific OTA requests found: ${analysis.specific_ota_requests}`);
        console.log(`   - Reservation events around gap time: ${analysis.broad_reservation_events}`);
        console.log(`   - OTA requests around gap time: ${analysis.ota_around_gap}`);
        
        // 7. Conclusions
        console.log('\n💡 Conclusions:');
        
        if (analysis.yamamoto_events === 0) {
            console.log('   🚨 ISSUE: No 山本塗装店 reservation events found in logs');
            console.log('   🔧 POSSIBLE CAUSES: Events may have been from a different date, or logs may have been cleaned up');
        }
        
        if (analysis.broad_reservation_events === 0 && analysis.ota_around_gap === 0) {
            console.log('   ❓ QUESTION: No activity found around the gap time');
            console.log('   🔧 SUGGESTION: The timeline data may be from a different investigation or date range');
        }
        
        if (analysis.specific_ota_requests > 0) {
            console.log('   ✅ INFO: Found the specific OTA requests mentioned in timeline');
        }
        
        return analysis;
        
    } catch (error) {
        console.error('Error during specific gap debug:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the debug
if (require.main === module) {
    debugSpecificGap()
        .then(result => {
            console.log('\n📊 Debug Complete!');
            console.log('Result:', result);
            console.log('\n' + '='.repeat(80));
        })
        .catch(error => {
            console.error('Debug failed:', error);
            process.exit(1);
        });
}

module.exports = { debugSpecificGap };