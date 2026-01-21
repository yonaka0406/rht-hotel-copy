/**
 * Find all log changes that should have triggered OTA requests but didn't have any OTA request within 5 minutes
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Finding all missing OTA triggers...\n');
    
    const client = await pool.connect();
    try {
        const hotelId = 25;
        
        // Define the date range to check (adjust as needed)
        const startDate = '2026-01-15';
        const endDate = '2026-01-17';
        
        console.log(`Checking period: ${startDate} to ${endDate}`);
        console.log(`Hotel ID: ${hotelId}\n`);
        
        // 1. Find all logs_reservation entries that should trigger OTA updates
        console.log('1. FINDING LOGS THAT SHOULD TRIGGER OTA UPDATES:');
        
        const triggerCandidates = await client.query(`
            WITH trigger_logs AS (
                SELECT
                    lr.id,
                    lr.log_time,
                    lr.action,
                    lr.table_name,
                    lr.changes,
                    -- Extract relevant fields based on action type
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
                    -- Extract status for analysis
                    CASE
                        WHEN lr.action = 'INSERT' THEN lr.changes->>'status'
                        WHEN lr.action = 'DELETE' THEN lr.changes->>'status'
                        WHEN lr.action = 'UPDATE' THEN lr.changes->'new'->>'status'
                    END AS status,
                    -- Extract client info for identification
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
                        -- INSERT/DELETE actions (any status)
                        lr.action != 'UPDATE' 
                        OR 
                        -- UPDATE actions with specific changes
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
        `, [startDate, endDate, hotelId]);
        
        console.log(`   Found ${triggerCandidates.rows.length} log entries that should trigger OTA updates\n`);
        
        // 2. Check each candidate for missing OTA requests
        console.log('2. CHECKING FOR MISSING OTA REQUESTS:');
        
        const missingTriggers = [];
        let checkedCount = 0;
        
        for (const log of triggerCandidates.rows) {
            checkedCount++;
            
            // Show progress for large datasets
            if (checkedCount % 50 === 0) {
                console.log(`   Progress: ${checkedCount}/${triggerCandidates.rows.length} checked...`);
            }
            
            // Look for OTA requests within 5 minutes after this log entry
            const otaCheck = await client.query(`
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
            `, [hotelId, log.log_time]);
            
            if (otaCheck.rows.length === 0) {
                // No OTA request found within 5 minutes - this is a missing trigger
                missingTriggers.push({
                    ...log,
                    gap_reason: 'NO_OTA_WITHIN_5_MIN'
                });
            }
        }
        
        console.log(`   Checked ${checkedCount} log entries\n`);
        
        // 3. Report missing triggers
        console.log('3. MISSING OTA TRIGGERS REPORT:');
        console.log(`   Found ${missingTriggers.length} log entries without OTA requests within 5 minutes\n`);
        
        if (missingTriggers.length > 0) {
            // Group by date for better analysis
            const byDate = {};
            missingTriggers.forEach(trigger => {
                const date = trigger.log_time.toISOString().split('T')[0];
                if (!byDate[date]) byDate[date] = [];
                byDate[date].push(trigger);
            });
            
            Object.keys(byDate).sort().forEach(date => {
                const dayTriggers = byDate[date];
                console.log(`   📅 ${date}: ${dayTriggers.length} missing triggers`);
                
                dayTriggers.forEach((trigger, i) => {
                    const jst = new Date(trigger.log_time.getTime() + (9 * 60 * 60 * 1000));
                    console.log(`     ${i + 1}. ${jst.toISOString()} JST - ${trigger.action} - ${trigger.client_name || 'Unknown Client'}`);
                    console.log(`        Status: ${trigger.status}, Check-in: ${trigger.check_in}, Check-out: ${trigger.check_out}`);
                    console.log(`        Log ID: ${trigger.id}`);
                });
                console.log('');
            });
            
            // 4. Analyze patterns
            console.log('4. PATTERN ANALYSIS:');
            
            const actionCounts = {};
            const statusCounts = {};
            const timePeriods = {};
            
            missingTriggers.forEach(trigger => {
                // Count by action
                actionCounts[trigger.action] = (actionCounts[trigger.action] || 0) + 1;
                
                // Count by status
                if (trigger.status) {
                    statusCounts[trigger.status] = (statusCounts[trigger.status] || 0) + 1;
                }
                
                // Count by hour
                const hour = trigger.log_time.getHours();
                timePeriods[hour] = (timePeriods[hour] || 0) + 1;
            });
            
            console.log('   By Action:');
            Object.entries(actionCounts).forEach(([action, count]) => {
                console.log(`     ${action}: ${count} missing triggers`);
            });
            
            console.log('\n   By Status:');
            Object.entries(statusCounts).forEach(([status, count]) => {
                console.log(`     ${status}: ${count} missing triggers`);
            });
            
            console.log('\n   By Hour (UTC):');
            Object.entries(timePeriods).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).forEach(([hour, count]) => {
                const jstHour = (parseInt(hour) + 9) % 24;
                console.log(`     ${hour}:00 UTC (${jstHour}:00 JST): ${count} missing triggers`);
            });
            
            // 5. Specific investigation for high-impact cases
            console.log('\n5. HIGH-IMPACT CASES:');
            
            const highImpactCases = missingTriggers.filter(trigger => 
                trigger.action === 'INSERT' && 
                ['hold', 'confirmed', 'provisory'].includes(trigger.status)
            );
            
            if (highImpactCases.length > 0) {
                console.log(`   Found ${highImpactCases.length} high-impact cases (INSERT with inventory-affecting status):`);
                
                highImpactCases.slice(0, 10).forEach((trigger, i) => {
                    const jst = new Date(trigger.log_time.getTime() + (9 * 60 * 60 * 1000));
                    console.log(`     ${i + 1}. ${jst.toISOString()} JST - ${trigger.client_name}`);
                    console.log(`        Status: ${trigger.status}, Log ID: ${trigger.id}`);
                });
                
                if (highImpactCases.length > 10) {
                    console.log(`     ... and ${highImpactCases.length - 10} more`);
                }
            } else {
                console.log('   No high-impact cases found');
            }
            
        } else {
            console.log('   ✅ All log entries have corresponding OTA requests within 5 minutes');
        }
        
        // 6. Summary and recommendations
        console.log('\n6. SUMMARY AND RECOMMENDATIONS:');
        
        if (missingTriggers.length > 0) {
            console.log(`   🚨 ISSUES FOUND: ${missingTriggers.length} missing OTA triggers`);
            console.log('   📋 RECOMMENDATIONS:');
            console.log('   1. Check Node.js application uptime during identified time periods');
            console.log('   2. Verify PostgreSQL notification system was working');
            console.log('   3. Check for database connection issues');
            console.log('   4. Review OTA service availability and error logs');
            console.log('   5. Consider implementing retry mechanism for failed triggers');
            console.log('   6. Add monitoring/alerting for missing OTA triggers');
        } else {
            console.log('   ✅ NO ISSUES: All triggers working correctly');
        }
        
        console.log(`\n   Total logs checked: ${triggerCandidates.rows.length}`);
        console.log(`   Missing triggers: ${missingTriggers.length}`);
        console.log(`   Success rate: ${((triggerCandidates.rows.length - missingTriggers.length) / triggerCandidates.rows.length * 100).toFixed(1)}%`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();