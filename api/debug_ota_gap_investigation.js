/**
 * Debug script to investigate why OTA request was not made on 2026-01-16
 * Based on the timeline showing gaps after reservation details were added
 */

require('dotenv').config();
const { pool } = require('./config/database');

async function investigateOTAGap() {
    const client = await pool.connect();
    try {
        console.log('🔍 Investigating OTA Gap on 2026-01-16...');
        console.log('=' .repeat(80));
        
        const hotelId = 25;
        const targetDate = '2026-01-16';
        
        // 1. Check reservation details logs around the gap time
        console.log('\n📊 Step 1: Checking reservation details logs around 11:04:36...');
        
        const reservationLogsQuery = `
            SELECT 
                lr.log_time,
                lr.action,
                lr.record_id,
                lr.changes->>'date' as date,
                lr.changes->>'room_id' as room_id,
                lr.changes->>'reservation_id' as reservation_id,
                lr.changes->>'cancelled' as cancelled,
                r.room_number,
                COALESCE(c.name_kanji, c.name_kana, c.name) as guest_name
            FROM logs_reservation lr
            LEFT JOIN rooms r ON (lr.changes->>'room_id')::integer = r.id
            LEFT JOIN reservations res ON (lr.changes->>'reservation_id')::uuid = res.id
            LEFT JOIN clients c ON res.reservation_client_id = c.id
            WHERE 
                lr.table_name = $1
                AND lr.log_time >= $2::timestamp - interval '1 hour'
                AND lr.log_time <= $2::timestamp + interval '1 hour'
                AND (lr.changes->>'date')::date = $3
            ORDER BY lr.log_time DESC
        `;
        
        const tableName = `reservation_details_${hotelId}`;
        const gapTime = '2026-01-16 11:04:36';
        
        const logsResult = await client.query(reservationLogsQuery, [tableName, gapTime, targetDate]);
        
        console.log(`   Found ${logsResult.rows.length} reservation logs around the gap time:`);
        logsResult.rows.forEach(log => {
            console.log(`   ${log.log_time.toISOString()} - ${log.action} - ${log.guest_name || 'Unknown'} - Room ${log.room_number || log.room_id}`);
        });
        
        // 2. Check OTA XML queue around the same time
        console.log('\n📊 Step 2: Checking OTA XML queue around the gap time...');
        
        const otaQueueQuery = `
            SELECT 
                id,
                service_name,
                created_at,
                processed_at,
                status,
                retries,
                last_error,
                xml_body
            FROM ota_xml_queue 
            WHERE 
                hotel_id = $1
                AND created_at >= $2::timestamp - interval '2 hours'
                AND created_at <= $2::timestamp + interval '2 hours'
                AND service_name LIKE '%Stock%'
            ORDER BY created_at DESC
        `;
        
        const otaResult = await client.query(otaQueueQuery, [hotelId, gapTime]);
        
        console.log(`   Found ${otaResult.rows.length} OTA queue entries around the gap time:`);
        otaResult.rows.forEach(entry => {
            console.log(`   ${entry.created_at.toISOString()} - ${entry.service_name} - Status: ${entry.status} - ID: ${entry.id}`);
            if (entry.last_error) {
                console.log(`     Error: ${entry.last_error}`);
            }
        });
        
        // 3. Check if there are any failed or pending OTA requests
        console.log('\n📊 Step 3: Checking for failed or pending OTA requests...');
        
        const failedOTAQuery = `
            SELECT 
                id,
                service_name,
                created_at,
                status,
                retries,
                last_error,
                LENGTH(xml_body) as xml_size
            FROM ota_xml_queue 
            WHERE 
                hotel_id = $1
                AND created_at >= $2::date - interval '1 day'
                AND created_at <= $2::date + interval '1 day'
                AND (status != 'completed' OR retries > 0)
            ORDER BY created_at DESC
        `;
        
        const failedResult = await client.query(failedOTAQuery, [hotelId, targetDate]);
        
        console.log(`   Found ${failedResult.rows.length} failed/pending OTA requests:`);
        failedResult.rows.forEach(entry => {
            console.log(`   ${entry.created_at.toISOString()} - ${entry.service_name} - Status: ${entry.status} - Retries: ${entry.retries}`);
            if (entry.last_error) {
                console.log(`     Error: ${entry.last_error.substring(0, 200)}...`);
            }
        });
        
        // 4. Check if there are any OTA configuration issues
        console.log('\n📊 Step 4: Checking OTA configuration and recent activity...');
        
        // Check recent OTA activity to see the pattern
        const recentOTAQuery = `
            SELECT 
                id,
                service_name,
                created_at,
                processed_at,
                status,
                retries,
                last_error
            FROM ota_xml_queue 
            WHERE 
                hotel_id = $1
                AND created_at >= $2::date - interval '2 days'
                AND created_at <= $2::date + interval '1 day'
                AND service_name LIKE '%Stock%'
            ORDER BY created_at DESC
            LIMIT 20
        `;
        
        const recentOTAResult = await client.query(recentOTAQuery, [hotelId, targetDate]);
        
        console.log(`   Found ${recentOTAResult.rows.length} recent OTA stock requests:`);
        recentOTAResult.rows.forEach(entry => {
            console.log(`   ${entry.created_at.toISOString()} - ${entry.service_name} - Status: ${entry.status}`);
            if (entry.last_error) {
                console.log(`     Error: ${entry.last_error.substring(0, 100)}...`);
            }
        });
        
        // 5. Check reservation logs pattern around the target date
        console.log('\n📊 Step 5: Checking reservation pattern around target date...');
        
        const reservationPatternQuery = `
            SELECT 
                DATE(lr.log_time) as log_date,
                COUNT(*) as total_events,
                COUNT(CASE WHEN lr.action = 'INSERT' THEN 1 END) as inserts,
                COUNT(CASE WHEN lr.action = 'UPDATE' THEN 1 END) as updates,
                COUNT(CASE WHEN lr.action = 'DELETE' THEN 1 END) as deletes
            FROM logs_reservation lr
            WHERE 
                lr.table_name = $1
                AND lr.log_time >= $2::date - interval '3 days'
                AND lr.log_time <= $2::date + interval '1 day'
                AND (lr.changes->>'date')::date = $2
            GROUP BY DATE(lr.log_time)
            ORDER BY log_date DESC
        `;
        
        const patternResult = await client.query(reservationPatternQuery, [tableName, targetDate]);
        
        console.log(`   Reservation activity pattern:`);
        patternResult.rows.forEach(day => {
            console.log(`   ${day.log_date.toISOString().split('T')[0]} - Total: ${day.total_events}, Inserts: ${day.inserts}, Updates: ${day.updates}, Deletes: ${day.deletes}`);
        });
        
        // 6. Analyze the gap pattern
        console.log('\n📊 Step 6: Gap Analysis...');
        
        const gapAnalysis = {
            reservationEvents: logsResult.rows.length,
            otaEvents: otaResult.rows.length,
            failedOTARequests: failedResult.rows.length,
            recentOTARequests: recentOTAResult.rows.length,
            reservationPatternDays: patternResult.rows.length
        };
        
        console.log('   Gap Analysis Summary:');
        console.log(`   - Reservation events around gap time: ${gapAnalysis.reservationEvents}`);
        console.log(`   - OTA events around gap time: ${gapAnalysis.otaEvents}`);
        console.log(`   - Failed/pending OTA requests: ${gapAnalysis.failedOTARequests}`);
        console.log(`   - Recent OTA requests (2 days): ${gapAnalysis.recentOTARequests}`);
        console.log(`   - Days with reservation activity: ${gapAnalysis.reservationPatternDays}`);
        
        // 7. Recommendations
        console.log('\n💡 Recommendations:');
        
        if (gapAnalysis.reservationEvents > 0 && gapAnalysis.otaEvents === 0) {
            console.log('   🚨 ISSUE: Reservation events occurred but no OTA stock adjustments were triggered');
            console.log('   🔧 CHECK: OTA trigger mechanism or job scheduler');
        }
        
        if (gapAnalysis.failedOTARequests > 0) {
            console.log('   ⚠️  WARNING: Failed OTA requests detected');
            console.log('   🔧 CHECK: OTA service connectivity and error handling');
        }
        
        if (gapAnalysis.recentOTARequests === 0) {
            console.log('   🚨 CRITICAL: No recent OTA stock requests found');
            console.log('   🔧 CHECK: OTA service configuration and connectivity');
        }
        
        if (gapAnalysis.reservationPatternDays === 0) {
            console.log('   ❓ QUESTION: No reservation activity pattern found');
            console.log('   🔧 CHECK: Date range and reservation data integrity');
        }
        
        return gapAnalysis;
        
    } catch (error) {
        console.error('Error during investigation:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the investigation
if (require.main === module) {
    investigateOTAGap()
        .then(result => {
            console.log('\n📊 Investigation Complete!');
            console.log('Result:', result);
            console.log('\n' + '='.repeat(80));
        })
        .catch(error => {
            console.error('Investigation failed:', error);
            process.exit(1);
        });
}

module.exports = { investigateOTAGap };