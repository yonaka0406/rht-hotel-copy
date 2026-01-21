/**
 * Analyze the performance cost of the missing OTA triggers query
 * to determine if it can be used as a routine monitoring system
 */

require('dotenv').config();
const { pool } = require('./config/database');

async function main() {
    console.log('🔍 Analyzing performance of missing OTA triggers query...\n');
    
    const client = await pool.connect();
    try {
        const hotelId = 25;
        
        // Test different time ranges to understand scaling
        const testRanges = [
            { name: '1 day', start: '2026-01-16', end: '2026-01-16' },
            { name: '3 days', start: '2026-01-15', end: '2026-01-17' },
            { name: '7 days', start: '2026-01-14', end: '2026-01-20' },
            { name: '30 days', start: '2026-01-01', end: '2026-01-30' }
        ];
        
        for (const range of testRanges) {
            console.log(`📊 Testing ${range.name} range (${range.start} to ${range.end}):`);
            
            // 1. Analyze the main trigger candidates query
            console.log('\n   1. Main trigger candidates query:');
            
            const mainQuery = `
                EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
                WITH trigger_logs AS (
                    SELECT
                        lr.id,
                        lr.log_time,
                        lr.action,
                        lr.table_name,
                        lr.changes,
                        CASE
                            WHEN lr.action != 'UPDATE' THEN lr.changes->>'check_in'
                            ELSE LEAST(
                                lr.changes->'old'->>'check_in',
                                lr.changes->'new'->>'check_in'
                            )
                        END AS check_in,
                        CASE
                            WHEN lr.action != 'UPDATE' THEN lr.changes->>'check_out'
                            ELSE GREATEST(
                                lr.changes->'old'->>'check_out',
                                lr.changes->'new'->>'check_out'
                            )
                        END AS check_out,
                        CASE
                            WHEN lr.action != 'UPDATE' THEN (lr.changes->>'hotel_id')::int
                            ELSE COALESCE((lr.changes->'new'->>'hotel_id')::int, (lr.changes->'old'->>'hotel_id')::int)
                        END AS hotel_id,
                        CASE
                            WHEN lr.action = 'INSERT' THEN lr.changes->>'status'
                            WHEN lr.action = 'DELETE' THEN lr.changes->>'status'
                            WHEN lr.action = 'UPDATE' THEN lr.changes->'new'->>'status'
                        END AS status,
                        CASE
                            WHEN lr.action != 'UPDATE' THEN (lr.changes->>'reservation_client_id')::uuid
                            ELSE COALESCE((lr.changes->'new'->>'reservation_client_id')::uuid, (lr.changes->'old'->>'reservation_client_id')::uuid)
                        END AS client_id
                    FROM logs_reservation lr
                    WHERE 
                        lr.log_time >= $1::date
                        AND lr.log_time < $2::date + interval '1 day'
                        AND lr.table_name LIKE 'reservations_%'
                        AND LENGTH(lr.table_name) <= LENGTH('reservations_') + 3
                        AND (lr.changes->>'hotel_id')::int = $3
                        AND 
                        (
                            lr.action != 'UPDATE' 
                            OR 
                            (
                                lr.action = 'UPDATE' AND (
                                    lr.changes->'old'->>'check_in' IS DISTINCT FROM lr.changes->'new'->>'check_in' OR
                                    lr.changes->'old'->>'check_out' IS DISTINCT FROM lr.changes->'new'->>'check_out' OR
                                    (lr.changes->'old'->>'hotel_id')::int IS DISTINCT FROM (lr.changes->'new'->>'hotel_id')::int OR 
                                    (
                                        lr.changes->'old'->>'status' IS DISTINCT FROM lr.changes->'new'->>'status' AND (
                                            lr.changes->'old'->>'status' = 'cancelled' OR
                                            lr.changes->'new'->>'status' = 'cancelled'
                                        )
                                    )
                                )
                            )
                        )
                )
                SELECT 
                    tl.*,
                    COALESCE(c.name_kanji, c.name_kana, c.name) as client_name
                FROM trigger_logs tl
                LEFT JOIN clients c ON tl.client_id = c.id
                ORDER BY tl.log_time ASC
            `;
            
            const mainResult = await client.query(mainQuery, [range.start, range.end, hotelId]);
            const mainPlan = mainResult.rows[0]['QUERY PLAN'][0];
            
            console.log(`      Execution Time: ${mainPlan['Execution Time']} ms`);
            console.log(`      Planning Time: ${mainPlan['Planning Time']} ms`);
            console.log(`      Total Cost: ${mainPlan['Plan']['Total Cost']}`);
            console.log(`      Rows: ${mainPlan['Plan']['Actual Rows']}`);
            
            if (mainPlan['Plan']['Shared Hit Blocks']) {
                console.log(`      Buffer Hits: ${mainPlan['Plan']['Shared Hit Blocks']}`);
            }
            if (mainPlan['Plan']['Shared Read Blocks']) {
                console.log(`      Buffer Reads: ${mainPlan['Plan']['Shared Read Blocks']}`);
            }
            
            // 2. Analyze the OTA check query (this would be run for each candidate)
            console.log('\n   2. OTA check query (per candidate):');
            
            const otaCheckQuery = `
                EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
                SELECT 
                    created_at,
                    current_request_id,
                    service_name,
                    status,
                    EXTRACT(EPOCH FROM (created_at - $2::timestamp))/60 as minutes_gap
                FROM ota_xml_queue 
                WHERE 
                    hotel_id = $1
                    AND created_at > $2::timestamp
                    AND created_at <= $2::timestamp + interval '5 minutes'
                    AND service_name LIKE '%Stock%'
                ORDER BY created_at ASC
                LIMIT 1
            `;
            
            // Use a sample timestamp from the range
            const sampleTimestamp = `${range.start} 12:00:00`;
            const otaResult = await client.query(otaCheckQuery, [hotelId, sampleTimestamp]);
            const otaPlan = otaResult.rows[0]['QUERY PLAN'][0];
            
            console.log(`      Execution Time: ${otaPlan['Execution Time']} ms`);
            console.log(`      Planning Time: ${otaPlan['Planning Time']} ms`);
            console.log(`      Total Cost: ${otaPlan['Plan']['Total Cost']}`);
            
            // 3. Calculate total estimated cost for routine monitoring
            const candidateCount = mainPlan['Plan']['Actual Rows'];
            const totalOtaCheckTime = otaPlan['Execution Time'] * candidateCount;
            const totalTime = mainPlan['Execution Time'] + totalOtaCheckTime;
            
            console.log('\n   3. Estimated total cost for routine monitoring:');
            console.log(`      Candidates found: ${candidateCount}`);
            console.log(`      Main query time: ${mainPlan['Execution Time']} ms`);
            console.log(`      OTA checks time: ${totalOtaCheckTime.toFixed(2)} ms (${candidateCount} × ${otaPlan['Execution Time']} ms)`);
            console.log(`      Total estimated time: ${totalTime.toFixed(2)} ms`);
            
            // Performance assessment
            let assessment = '';
            if (totalTime < 100) {
                assessment = '🟢 EXCELLENT - Suitable for frequent monitoring';
            } else if (totalTime < 500) {
                assessment = '🟡 GOOD - Suitable for periodic monitoring';
            } else if (totalTime < 2000) {
                assessment = '🟠 MODERATE - Suitable for daily monitoring';
            } else {
                assessment = '🔴 EXPENSIVE - Consider optimization or less frequent monitoring';
            }
            
            console.log(`      Assessment: ${assessment}`);
            console.log('');
        }
        
        // 4. Check existing indexes that could help
        console.log('📋 EXISTING INDEXES ANALYSIS:');
        
        const indexQuery = `
            SELECT 
                schemaname,
                tablename,
                indexname,
                indexdef
            FROM pg_indexes 
            WHERE tablename IN ('logs_reservation', 'ota_xml_queue')
            ORDER BY tablename, indexname
        `;
        
        const indexResult = await client.query(indexQuery);
        
        console.log('\n   Current indexes:');
        indexResult.rows.forEach(idx => {
            console.log(`     ${idx.tablename}.${idx.indexname}`);
            if (idx.indexdef.includes('log_time') || idx.indexdef.includes('created_at') || idx.indexdef.includes('hotel_id')) {
                console.log(`       ✅ ${idx.indexdef}`);
            } else {
                console.log(`       ${idx.indexdef}`);
            }
        });
        
        // 5. Suggest optimizations
        console.log('\n🔧 OPTIMIZATION RECOMMENDATIONS:');
        
        console.log('\n   Potential index improvements:');
        console.log('   1. logs_reservation: (hotel_id, log_time, table_name) - for time-range queries');
        console.log('   2. logs_reservation: (log_time, hotel_id) WHERE table_name LIKE \'reservations_%\' - partial index');
        console.log('   3. ota_xml_queue: (hotel_id, created_at, service_name) - for OTA lookups');
        
        console.log('\n   Query optimizations:');
        console.log('   1. Use prepared statements to reduce planning time');
        console.log('   2. Consider materialized view for recent trigger candidates');
        console.log('   3. Batch OTA checks instead of individual queries');
        console.log('   4. Add time-based partitioning for large tables');
        
        // 6. Routine monitoring design
        console.log('\n📅 ROUTINE MONITORING DESIGN:');
        
        console.log('\n   Recommended monitoring schedule:');
        console.log('   - Real-time: Check last 5 minutes every minute (for immediate alerts)');
        console.log('   - Short-term: Check last hour every 15 minutes');
        console.log('   - Daily: Check previous day every morning');
        console.log('   - Weekly: Full analysis of previous week');
        
        console.log('\n   Implementation approach:');
        console.log('   1. Create a scheduled job (cron/node-cron)');
        console.log('   2. Store results in monitoring table');
        console.log('   3. Send alerts for missing triggers');
        console.log('   4. Provide dashboard for trend analysis');
        console.log('   5. Auto-retry failed triggers if possible');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();