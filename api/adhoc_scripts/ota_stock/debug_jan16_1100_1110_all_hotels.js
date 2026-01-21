/**
 * Analysis of ALL hotels between 11:00-11:10 JST on 2026/01/16
 * Checks if only 山本塗装店 was affected or if other hotels had activity too
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function analyzeAllHotels1100to1110() {
    console.log('🔍 ALL HOTELS Analysis: 2026/01/16 11:00-11:10 JST');
    console.log('====================================================\n');
    
    const client = await pool.connect();
    try {
        // Define the 10-minute window in JST and convert to UTC
        const windowStartJST = '2026-01-16 11:00:00';
        const windowEndJST = '2026-01-16 11:10:00';
        const windowStartUTC = '2026-01-16 02:00:00'; // JST - 9 hours = UTC
        const windowEndUTC = '2026-01-16 02:10:00';
        
        console.log(`📅 Analysis Window:`);
        console.log(`   JST: ${windowStartJST} to ${windowEndJST}`);
        console.log(`   UTC: ${windowStartUTC} to ${windowEndUTC}\n`);
        
        // 1. Get ALL reservation logs in the 10-minute window across ALL hotels
        console.log('1. ALL RESERVATION LOGS (11:00-11:10 JST):');
        
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
                AND lr.log_time < $2::timestamp
                AND lr.table_name LIKE 'reservations_%'
                AND LENGTH(lr.table_name) <= LENGTH('reservations_') + 3
            ORDER BY lr.log_time ASC
        `;
        
        const allLogsResult = await client.query(allLogsQuery, [windowStartUTC, windowEndUTC]);
        
        console.log(`   Found ${allLogsResult.rows.length} reservation logs in the 10-minute window\n`);
        
        if (allLogsResult.rows.length === 0) {
            console.log('   ❌ No reservation logs found in the specified timeframe');
            return;
        }
        
        // 2. Get client names for all logs
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
        
        // 3. Analyze each log entry with OTA trigger check
        console.log('2. DETAILED LOG ANALYSIS WITH OTA TRIGGER CHECK:');
        
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
        
        // 4. Display detailed results grouped by hotel
        console.log(`   Analyzing ${logAnalysis.length} logs:\n`);
        
        // Group by hotel for better visualization
        const hotelGroups = {};
        logAnalysis.forEach(analysis => {
            if (!hotelGroups[analysis.hotel_id]) {
                hotelGroups[analysis.hotel_id] = [];
            }
            hotelGroups[analysis.hotel_id].push(analysis);
        });
        
        Object.entries(hotelGroups).forEach(([hotelId, logs]) => {
            console.log(`   🏨 HOTEL ${hotelId} (${logs.length} logs):`);
            
            logs.forEach((analysis, i) => {
                const status = analysis.has_ota_trigger ? '✅' : '❌';
                const yamamoto = analysis.is_yamamoto ? ' [山本塗装店]' : '';
                const timeStr = analysis.log_time_jst.replace('T', ' ').substring(11, 19);
                
                console.log(`      ${i + 1}. ${status} ${timeStr} JST - ${analysis.action} - ${analysis.client_name}${yamamoto}`);
                console.log(`         Status: ${analysis.status}, Check-in: ${analysis.check_in}`);
                
                if (analysis.has_ota_trigger) {
                    const gap = Math.round(analysis.ota_details.minutes_gap * 100) / 100;
                    console.log(`         OTA: Found after ${gap} min (${analysis.ota_details.service_name})`);
                } else {
                    console.log(`         OTA: ❌ NOT FOUND within 5 minutes`);
                }
            });
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
        const nonYamamoto_logs = logAnalysis.filter(a => !a.is_yamamoto);
        const nonYamamoto_WithOTA = nonYamamoto_logs.filter(a => a.has_ota_trigger).length;
        const nonYamamoto_WithoutOTA = nonYamamoto_logs.length - nonYamamoto_WithOTA;
        
        console.log(`   📊 OVERALL:`);
        console.log(`      Total logs: ${totalLogs}`);
        console.log(`      With OTA triggers: ${logsWithOTA} (${Math.round(logsWithOTA/totalLogs*100)}%)`);
        console.log(`      WITHOUT OTA triggers: ${logsWithoutOTA} (${Math.round(logsWithoutOTA/totalLogs*100)}%)`);
        console.log('');
        
        console.log(`   🏢 山本塗装店:`);
        console.log(`      Total logs: ${yamamoto_logs.length}`);
        console.log(`      With OTA: ${yamamoto_WithOTA} (${yamamoto_logs.length > 0 ? Math.round(yamamoto_WithOTA/yamamoto_logs.length*100) : 0}%)`);
        console.log(`      Without OTA: ${yamamoto_WithoutOTA}`);
        console.log('');
        
        console.log(`   🏢 OTHER CLIENTS:`);
        console.log(`      Total logs: ${nonYamamoto_logs.length}`);
        console.log(`      With OTA: ${nonYamamoto_WithOTA} (${nonYamamoto_logs.length > 0 ? Math.round(nonYamamoto_WithOTA/nonYamamoto_logs.length*100) : 0}%)`);
        console.log(`      Without OTA: ${nonYamamoto_WithoutOTA}`);
        console.log('');
        
        // 6. Analysis by hotel
        console.log('4. ANALYSIS BY HOTEL:');
        Object.entries(hotelGroups).forEach(([hotelId, logs]) => {
            const withOTA = logs.filter(l => l.has_ota_trigger).length;
            const withoutOTA = logs.length - withOTA;
            const successRate = Math.round(withOTA / logs.length * 100);
            const yamamoto_Count = logs.filter(l => l.is_yamamoto).length;
            
            console.log(`   Hotel ${hotelId}: ${logs.length} logs, ${withOTA} with OTA, ${withoutOTA} without OTA (${successRate}% success)`);
            if (yamamoto_Count > 0) {
                console.log(`      └─ 山本塗装店: ${yamamoto_Count} logs`);
            }
        });
        console.log('');
        
        // 7. Timeline analysis
        console.log('5. TIMELINE ANALYSIS:');
        const timeGroups = {};
        logAnalysis.forEach(analysis => {
            const minute = analysis.log_time_jst.substring(14, 16); // Extract minute
            const timeKey = `11:0${minute}`;
            if (!timeGroups[timeKey]) {
                timeGroups[timeKey] = [];
            }
            timeGroups[timeKey].push(analysis);
        });
        
        Object.entries(timeGroups).sort().forEach(([time, logs]) => {
            const withOTA = logs.filter(l => l.has_ota_trigger).length;
            const withoutOTA = logs.length - withOTA;
            console.log(`   ${time} JST: ${logs.length} logs (${withOTA} with OTA, ${withoutOTA} without)`);
        });
        console.log('');
        
        // 8. Conclusion
        console.log('6. CONCLUSION:');
        
        if (nonYamamoto_logs.length === 0) {
            console.log('   🎯 FINDING: ONLY 山本塗装店 had reservation activity in this 10-minute window');
            console.log('   📋 This means we cannot determine if other clients would have been affected');
            console.log('   📋 The issue appears isolated to this specific timeframe and client');
        } else {
            console.log(`   🎯 FINDING: Multiple clients active (山本塗装店: ${yamamoto_logs.length}, Others: ${nonYamamoto_logs.length})`);
            
            if (logsWithoutOTA === totalLogs) {
                console.log('   🚨 CRITICAL: ALL clients affected - system-wide failure during this period');
            } else if (yamamoto_WithoutOTA === yamamoto_logs.length && nonYamamoto_WithoutOTA === 0) {
                console.log('   🔍 PATTERN: Only 山本塗装店 affected - client-specific issue');
            } else if (yamamoto_WithoutOTA === yamamoto_logs.length && nonYamamoto_WithoutOTA > 0) {
                console.log('   🔍 PATTERN: Multiple clients affected - likely system issue');
            } else {
                console.log('   🔍 PATTERN: Mixed results - partial system failure');
            }
        }
        
        // 9. Unique clients summary
        const uniqueClients = [...new Set(logAnalysis.map(a => a.client_name))];
        console.log(`\n   📋 UNIQUE CLIENTS IN TIMEFRAME: ${uniqueClients.length}`);
        uniqueClients.forEach((client, i) => {
            const clientLogs = logAnalysis.filter(a => a.client_name === client);
            const clientOTA = clientLogs.filter(a => a.has_ota_trigger).length;
            const isYamamoto = client.includes('山本') ? ' [山本塗装店]' : '';
            console.log(`      ${i + 1}. ${client}${isYamamoto}: ${clientLogs.length} logs, ${clientOTA} with OTA`);
        });
        
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

// Run the analysis
analyzeAllHotels1100to1110().then(() => {
    console.log('\n✅ All hotels 11:00-11:10 analysis completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Analysis error:', error);
    process.exit(1);
});