/**
 * Comprehensive analysis of 2026/01/16 11:04:36 JST timeframe
 * Investigates whether only 山本塗装店 reservations were affected or ALL logs in that period
 */

console.log('Starting script...');
require('dotenv').config();
console.log('Environment loaded');

const { pool } = require('../../config/database');
console.log('Database module loaded');

async function analyzeJan16Timeframe() {
    console.log('🔍 Comprehensive Analysis: 2026/01/16 11:04:36 JST Timeframe');
    console.log('================================================================\n');
    
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Database connected successfully');
    
    try {
        // Define the target timeframe (JST to UTC conversion)
        const targetTimeJST = '2026-01-16 11:04:36';
        const targetTimeUTC = '2026-01-16 02:04:36'; // JST - 9 hours = UTC
        
        // Define analysis window (±30 minutes around the target time)
        const windowStart = '2026-01-16 01:34:36'; // 30 min before
        const windowEnd = '2026-01-16 02:34:36';   // 30 min after
        
        console.log(`📅 Analysis Window:`);
        console.log(`   Target Time: ${targetTimeJST} JST (${targetTimeUTC} UTC)`);
        console.log(`   Window: ${windowStart} UTC to ${windowEnd} UTC (±30 minutes)`);
        console.log(`   JST Window: 2026-01-16 10:34:36 JST to 2026-01-16 11:34:36 JST\n`);
        
        // 1. Get ALL reservation logs in the timeframe
        console.log('1. ALL RESERVATION LOGS IN TIMEFRAME:');
        
        const allLogsQuery = `
            SELECT 
                lr.id,
                lr.log_time,
                lr.action,
                lr.table_name,
                lr.changes,
                CASE
                    WHEN lr.action != 'UPDATE' THEN (lr.changes->>'hotel_id')::int
                    ELSE COALESCE((lr.changes->'new'->>'hotel_id')::int, (lr.changes->'old'->>'hotel_id')::int)
                END AS hotel_id,
                CASE
                    WHEN lr.action != 'UPDATE' THEN lr.changes->>'check_in'
                    ELSE COALESCE(lr.changes->'new'->>'check_in', lr.changes->'old'->>'check_in')
                END AS check_in,
                CASE
                    WHEN lr.action != 'UPDATE' THEN lr.changes->>'check_out'
                    ELSE COALESCE(lr.changes->'new'->>'check_out', lr.changes->'old'->>'check_out')
                END AS check_out,
                CASE
                    WHEN lr.action != 'UPDATE' THEN (lr.changes->>'reservation_client_id')::uuid
                    ELSE COALESCE((lr.changes->'new'->>'reservation_client_id')::uuid, (lr.changes->'old'->>'reservation_client_id')::uuid)
                END AS client_id,
                CASE
                    WHEN lr.action = 'INSERT' THEN lr.changes->>'status'
                    WHEN lr.action = 'DELETE' THEN lr.changes->>'status'
                    WHEN lr.action = 'UPDATE' THEN lr.changes->'new'->>'status'
                END AS status
            FROM logs_reservation lr
            WHERE 
                lr.log_time >= $1::timestamp
                AND lr.log_time <= $2::timestamp
                AND lr.table_name LIKE 'reservations_%'
                AND LENGTH(lr.table_name) <= LENGTH('reservations_') + 3
            ORDER BY lr.log_time ASC
        `;
        
        const allLogsResult = await client.query(allLogsQuery, [windowStart, windowEnd]);
        
        console.log(`   Found ${allLogsResult.rows.length} reservation logs in the timeframe\n`);
        
        if (allLogsResult.rows.length === 0) {
            console.log('   ❌ No reservation logs found in the specified timeframe');
            return;
        }
        
        // 2. Get client names for all logs
        console.log('2. DETAILED LOG ANALYSIS:');
        
        const clientIds = [...new Set(allLogsResult.rows.map(row => row.client_id).filter(Boolean))];
        let clientNames = {};
        
        if (clientIds.length > 0) {
            const clientsQuery = `
                SELECT id, 
                       COALESCE(name_kanji, name_kana, name) as client_name
                FROM clients 
                WHERE id = ANY($1)
            `;
            const clientsResult = await client.query(clientsQuery, [clientIds]);
            clientNames = Object.fromEntries(
                clientsResult.rows.map(row => [row.id, row.client_name])
            );
        }
        
        // 3. Analyze each log entry
        const logAnalysis = [];
        
        for (const log of allLogsResult.rows) {
            const jstTime = new Date(log.log_time.getTime() + (9 * 60 * 60 * 1000));
            const clientName = clientNames[log.client_id] || 'Unknown Client';
            
            // Check for OTA requests within 5 minutes
            const otaCheckQuery = `
                SELECT 
                    id,
                    created_at,
                    service_name,
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
            
            const otaResult = await client.query(otaCheckQuery, [log.hotel_id, log.log_time]);
            
            const analysis = {
                log_id: log.id,
                log_time_utc: log.log_time,
                log_time_jst: jstTime.toISOString(),
                action: log.action,
                hotel_id: log.hotel_id,
                client_name: clientName,
                status: log.status,
                check_in: log.check_in,
                check_out: log.check_out,
                has_ota_trigger: otaResult.rows.length > 0,
                ota_details: otaResult.rows[0] || null,
                is_yamamoto: clientName && clientName.includes('山本')
            };
            
            logAnalysis.push(analysis);
        }
        
        // 4. Display detailed results
        console.log(`   Analyzing ${logAnalysis.length} logs:\n`);
        
        logAnalysis.forEach((analysis, i) => {
            const status = analysis.has_ota_trigger ? '✅' : '❌';
            const yamamoto = analysis.is_yamamoto ? ' [山本塗装店]' : '';
            
            console.log(`   ${i + 1}. ${status} ${analysis.log_time_jst.replace('T', ' ').substring(0, 19)} JST`);
            console.log(`      Hotel ${analysis.hotel_id} - ${analysis.action} - ${analysis.client_name}${yamamoto}`);
            console.log(`      Status: ${analysis.status}, Check-in: ${analysis.check_in}`);
            
            if (analysis.has_ota_trigger) {
                const gap = Math.round(analysis.ota_details.minutes_gap * 100) / 100;
                console.log(`      OTA Trigger: Found after ${gap} minutes (${analysis.ota_details.service_name})`);
            } else {
                console.log(`      OTA Trigger: ❌ NOT FOUND within 5 minutes`);
            }
            console.log('');
        });
        
        // 5. Summary statistics
        console.log('3. SUMMARY STATISTICS:');
        
        const totalLogs = logAnalysis.length;
        const logsWithOTA = logAnalysis.filter(a => a.has_ota_trigger).length;
        const logsWithoutOTA = totalLogs - logsWithOTA;
        const yamamoto_logs = logAnalysis.filter(a => a.is_yamamoto);
        const yamamoto_WithOTA = yamamoto_logs.filter(a => a.has_ota_trigger).length;
        const yamamoto_WithoutOTA = yamamoto_logs.length - yamamoto_WithOTA;
        
        console.log(`   Total logs in timeframe: ${totalLogs}`);
        console.log(`   Logs with OTA triggers: ${logsWithOTA} (${Math.round(logsWithOTA/totalLogs*100)}%)`);
        console.log(`   Logs WITHOUT OTA triggers: ${logsWithoutOTA} (${Math.round(logsWithoutOTA/totalLogs*100)}%)`);
        console.log('');
        console.log(`   山本塗装店 logs: ${yamamoto_logs.length}`);
        console.log(`   山本塗装店 with OTA: ${yamamoto_WithOTA}`);
        console.log(`   山本塗装店 without OTA: ${yamamoto_WithoutOTA}`);
        console.log('');
        
        // 6. Analysis by hotel
        const hotelStats = {};
        logAnalysis.forEach(analysis => {
            if (!hotelStats[analysis.hotel_id]) {
                hotelStats[analysis.hotel_id] = {
                    total: 0,
                    with_ota: 0,
                    without_ota: 0
                };
            }
            hotelStats[analysis.hotel_id].total++;
            if (analysis.has_ota_trigger) {
                hotelStats[analysis.hotel_id].with_ota++;
            } else {
                hotelStats[analysis.hotel_id].without_ota++;
            }
        });
        
        console.log('4. ANALYSIS BY HOTEL:');
        Object.entries(hotelStats).forEach(([hotelId, stats]) => {
            const successRate = Math.round(stats.with_ota / stats.total * 100);
            console.log(`   Hotel ${hotelId}: ${stats.total} logs, ${stats.with_ota} with OTA, ${stats.without_ota} without OTA (${successRate}% success)`);
        });
        console.log('');
        
        // 7. Analysis by action type
        const actionStats = {};
        logAnalysis.forEach(analysis => {
            if (!actionStats[analysis.action]) {
                actionStats[analysis.action] = {
                    total: 0,
                    with_ota: 0,
                    without_ota: 0
                };
            }
            actionStats[analysis.action].total++;
            if (analysis.has_ota_trigger) {
                actionStats[analysis.action].with_ota++;
            } else {
                actionStats[analysis.action].without_ota++;
            }
        });
        
        console.log('5. ANALYSIS BY ACTION TYPE:');
        Object.entries(actionStats).forEach(([action, stats]) => {
            const successRate = Math.round(stats.with_ota / stats.total * 100);
            console.log(`   ${action}: ${stats.total} logs, ${stats.with_ota} with OTA, ${stats.without_ota} without OTA (${successRate}% success)`);
        });
        console.log('');
        
        // 8. Conclusion
        console.log('6. CONCLUSION:');
        
        if (logsWithoutOTA === 0) {
            console.log('   ✅ ALL logs in this timeframe have corresponding OTA triggers');
            console.log('   ✅ No systematic failure detected in this period');
        } else if (logsWithoutOTA === totalLogs) {
            console.log('   🚨 CRITICAL: ALL logs in this timeframe are missing OTA triggers');
            console.log('   🚨 This indicates a complete system failure during this period');
        } else {
            console.log(`   ⚠️  PARTIAL FAILURE: ${logsWithoutOTA}/${totalLogs} logs missing OTA triggers`);
            
            if (yamamoto_WithoutOTA === yamamoto_logs.length && yamamoto_logs.length > 0) {
                console.log('   📋 山本塗装店: ALL reservations affected (consistent with reported issue)');
            } else if (yamamoto_WithoutOTA > 0) {
                console.log(`   📋 山本塗装店: ${yamamoto_WithoutOTA}/${yamamoto_logs.length} reservations affected`);
            }
            
            // Check if it's client-specific or system-wide
            const affectedClients = [...new Set(logAnalysis.filter(a => !a.has_ota_trigger).map(a => a.client_name))];
            const totalClients = [...new Set(logAnalysis.map(a => a.client_name))];
            
            if (affectedClients.length === totalClients.length) {
                console.log('   🔍 PATTERN: All clients affected - likely system-wide issue');
            } else {
                console.log(`   🔍 PATTERN: ${affectedClients.length}/${totalClients.length} clients affected - may be client-specific`);
                console.log(`   🔍 Affected clients: ${affectedClients.join(', ')}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

// Run the analysis
analyzeJan16Timeframe().then(() => {
    console.log('\n✅ Jan 16 comprehensive analysis completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Analysis error:', error);
    process.exit(1);
});