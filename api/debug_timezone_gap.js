/**
 * Debug script to investigate the timezone difference between frontend display and backend data
 * JST is UTC+9, so frontend times might be 9 hours ahead of backend UTC times
 */

require('dotenv').config();
const { pool } = require('./config/database');

async function debugTimezoneGap() {
    const client = await pool.connect();
    try {
        console.log('🔍 Investigating Timezone Gap (JST vs UTC)...');
        console.log('=' .repeat(80));
        
        const hotelId = 25;
        
        // The timeline shows: 2026/01/16 11:04:36 (JST)
        // Converting to UTC: 2026-01-16 11:04:36 JST = 2026-01-16 02:04:36 UTC
        const jstTime = '2026-01-16 11:04:36';
        const utcTime = '2026-01-16 02:04:36';
        
        console.log(`\n📊 Timeline Analysis:`);
        console.log(`   Frontend JST time: ${jstTime}`);
        console.log(`   Expected UTC time: ${utcTime}`);
        console.log(`   Timezone offset: JST = UTC+9`);
        
        // 1. Check reservation logs around the converted UTC time
        console.log('\n📊 Step 1: Checking reservation logs around UTC time (02:04:36)...');
        
        const reservationLogsQuery = `
            SELECT 
                lr.log_time,
                lr.log_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo' as jst_time,
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
                AND lr.log_time >= $2::timestamp - interval '5 minutes'
                AND lr.log_time <= $2::timestamp + interval '5 minutes'
                AND lr.action = 'INSERT'
                AND COALESCE(c.name_kanji, c.name_kana, c.name) ILIKE '%山本塗装%'
            ORDER BY lr.log_time DESC
        `;
        
        const tableName = `reservation_details_${hotelId}`;
        const logsResult = await client.query(reservationLogsQuery, [tableName, utcTime]);
        
        console.log(`   Found ${logsResult.rows.length} 山本塗装店 reservation logs around UTC time:`);
        logsResult.rows.forEach(log => {
            console.log(`   UTC: ${log.log_time.toISOString()} | JST: ${log.jst_time.toISOString()} - ${log.action} - Room ${log.room_number || log.room_id}`);
        });
        
        // 2. Check OTA requests around the same UTC time and after
        console.log('\n📊 Step 2: Checking OTA requests around and after UTC time...');
        
        const otaQuery = `
            SELECT 
                id,
                service_name,
                created_at,
                created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo' as jst_time,
                processed_at,
                status,
                current_request_id
            FROM ota_xml_queue 
            WHERE 
                hotel_id = $1
                AND created_at >= $2::timestamp - interval '5 minutes'
                AND created_at <= $2::timestamp + interval '15 minutes'
                AND service_name LIKE '%Stock%'
            ORDER BY created_at ASC
        `;
        
        const otaResult = await client.query(otaQuery, [hotelId, utcTime]);
        
        console.log(`   Found ${otaResult.rows.length} OTA requests around UTC time:`);
        otaResult.rows.forEach(entry => {
            console.log(`   UTC: ${entry.created_at.toISOString()} | JST: ${entry.jst_time.toISOString()} - ${entry.service_name} - ID: ${entry.current_request_id}`);
        });
        
        // 3. Calculate the gap between reservation and OTA request
        if (logsResult.rows.length > 0 && otaResult.rows.length > 0) {
            const reservationTime = new Date(logsResult.rows[0].log_time);
            const otaTime = new Date(otaResult.rows[0].created_at);
            const gapMinutes = Math.round((otaTime - reservationTime) / (1000 * 60));
            
            console.log('\n📊 Step 3: Gap Analysis...');
            console.log(`   Reservation time (UTC): ${reservationTime.toISOString()}`);
            console.log(`   Next OTA request (UTC): ${otaTime.toISOString()}`);
            console.log(`   Gap: ${gapMinutes} minutes`);
            
            if (gapMinutes > 5) {
                console.log(`   🚨 GAP DETECTED: ${gapMinutes} minutes between reservation and OTA request`);
                console.log(`   🔧 EXPECTED: OTA request should occur within 5 minutes of reservation change`);
            } else {
                console.log(`   ✅ NORMAL: Gap is within acceptable range`);
            }
        }
        
        // 4. Check for any OTA requests that should have been triggered
        console.log('\n📊 Step 4: Checking expected OTA trigger pattern...');
        
        // Look for the pattern: reservation INSERT -> OTA stock adjustment
        const patternQuery = `
            WITH reservation_inserts AS (
                SELECT 
                    lr.log_time,
                    lr.record_id,
                    lr.changes->>'date' as reservation_date,
                    r.room_number,
                    COALESCE(c.name_kanji, c.name_kana, c.name) as guest_name
                FROM logs_reservation lr
                LEFT JOIN rooms r ON (lr.changes->>'room_id')::integer = r.id
                LEFT JOIN reservations res ON (lr.changes->>'reservation_id')::uuid = res.id
                LEFT JOIN clients c ON res.reservation_client_id = c.id
                WHERE 
                    lr.table_name = $1
                    AND lr.action = 'INSERT'
                    AND lr.log_time >= $2::timestamp - interval '1 hour'
                    AND lr.log_time <= $2::timestamp + interval '1 hour'
                    AND COALESCE(c.name_kanji, c.name_kana, c.name) ILIKE '%山本塗装%'
            ),
            ota_requests AS (
                SELECT 
                    created_at,
                    service_name,
                    current_request_id,
                    status
                FROM ota_xml_queue 
                WHERE 
                    hotel_id = $3
                    AND created_at >= $2::timestamp - interval '1 hour'
                    AND created_at <= $2::timestamp + interval '2 hours'
                    AND service_name LIKE '%Stock%'
            )
            SELECT 
                ri.log_time as reservation_time,
                ri.guest_name,
                ri.room_number,
                ri.reservation_date,
                (
                    SELECT MIN(ota.created_at)
                    FROM ota_requests ota
                    WHERE ota.created_at > ri.log_time
                    AND ota.created_at <= ri.log_time + interval '10 minutes'
                ) as next_ota_time,
                (
                    SELECT ota.current_request_id
                    FROM ota_requests ota
                    WHERE ota.created_at > ri.log_time
                    AND ota.created_at <= ri.log_time + interval '10 minutes'
                    ORDER BY ota.created_at ASC
                    LIMIT 1
                ) as next_ota_id
            FROM reservation_inserts ri
            ORDER BY ri.log_time ASC
        `;
        
        const patternResult = await client.query(patternQuery, [tableName, utcTime, hotelId]);
        
        console.log(`   Found ${patternResult.rows.length} reservation->OTA patterns:`);
        patternResult.rows.forEach(pattern => {
            const gapMinutes = pattern.next_ota_time ? 
                Math.round((new Date(pattern.next_ota_time) - new Date(pattern.reservation_time)) / (1000 * 60)) : 
                null;
            
            console.log(`   ${pattern.reservation_time.toISOString()} - ${pattern.guest_name} - Room ${pattern.room_number}`);
            if (pattern.next_ota_time) {
                console.log(`     -> OTA: ${pattern.next_ota_time.toISOString()} (${gapMinutes} min gap) - ID: ${pattern.next_ota_id}`);
            } else {
                console.log(`     -> ❌ NO OTA REQUEST FOUND within 10 minutes`);
            }
        });
        
        // 5. Summary and recommendations
        console.log('\n💡 Analysis Summary:');
        
        const analysis = {
            reservation_events: logsResult.rows.length,
            ota_events: otaResult.rows.length,
            pattern_matches: patternResult.rows.length,
            gaps_found: patternResult.rows.filter(p => !p.next_ota_time).length
        };
        
        console.log(`   - Reservation events found: ${analysis.reservation_events}`);
        console.log(`   - OTA events found: ${analysis.ota_events}`);
        console.log(`   - Pattern matches: ${analysis.pattern_matches}`);
        console.log(`   - Gaps found: ${analysis.gaps_found}`);
        
        if (analysis.gaps_found > 0) {
            console.log('\n🚨 ISSUE IDENTIFIED:');
            console.log(`   - ${analysis.gaps_found} reservation(s) did not trigger OTA stock adjustment`);
            console.log('   - This confirms the gap reported in the timeline');
            console.log('\n🔧 RECOMMENDATIONS:');
            console.log('   1. Check OTA trigger mechanism (job scheduler, webhooks, etc.)');
            console.log('   2. Verify OTA service connectivity and authentication');
            console.log('   3. Check for any error logs during the gap period');
            console.log('   4. Review OTA configuration for automatic stock updates');
        } else {
            console.log('\n✅ NO GAPS FOUND: All reservations appear to have triggered OTA requests');
        }
        
        return analysis;
        
    } catch (error) {
        console.error('Error during timezone gap investigation:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the investigation
if (require.main === module) {
    debugTimezoneGap()
        .then(result => {
            console.log('\n📊 Timezone Investigation Complete!');
            console.log('Result:', result);
            console.log('\n' + '='.repeat(80));
        })
        .catch(error => {
            console.error('Investigation failed:', error);
            process.exit(1);
        });
}

module.exports = { debugTimezoneGap };