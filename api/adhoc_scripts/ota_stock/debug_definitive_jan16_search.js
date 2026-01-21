/**
 * Definitive search using the exact method that found the 山本塗装店 logs
 * This will resolve the discrepancy and give us the final answer
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function definitiveJan16Search() {
    console.log('🔍 DEFINITIVE Jan 16 Search - Resolving the Mystery');
    console.log('===================================================\n');
    
    const client = await pool.connect();
    try {
        // 1. Use the EXACT method that found 山本塗装店 logs earlier
        console.log('1. SEARCHING FOR 山本塗装店 LOGS ON JAN 16 (EXACT METHOD):');
        
        const yamamoto_Query = `
            SELECT 
                lr.id,
                lr.log_time,
                lr.action,
                lr.table_name,
                lr.changes->>'hotel_id' as hotel_id,
                c.name_kanji,
                c.name_kana,
                c.name
            FROM logs_reservation lr
            LEFT JOIN reservations r ON (lr.changes->>'reservation_client_id')::uuid = r.reservation_client_id
            LEFT JOIN clients c ON r.reservation_client_id = c.id
            WHERE 
                lr.log_time >= '2026-01-16 00:00:00'::timestamp
                AND lr.log_time < '2026-01-17 00:00:00'::timestamp
                AND lr.table_name LIKE 'reservations_%'
                AND (
                    c.name_kanji LIKE '%山本%' OR
                    c.name_kana LIKE '%山本%' OR
                    c.name LIKE '%山本%'
                )
            ORDER BY lr.log_time ASC
        `;
        
        const yamamoto_Result = await client.query(yamamoto_Query);
        console.log(`   Found ${yamamoto_Result.rows.length} 山本塗装店 logs in reservations_% tables`);
        
        // 2. Now search reservation_details_% tables with the same method
        console.log('\n2. SEARCHING FOR 山本塗装店 LOGS IN RESERVATION_DETAILS_% TABLES:');
        
        const yamamoto_DetailsQuery = `
            SELECT 
                lr.id,
                lr.log_time,
                lr.action,
                lr.table_name,
                lr.changes->>'hotel_id' as hotel_id,
                lr.changes->>'date' as detail_date,
                lr.changes->>'room_id' as room_id,
                lr.changes->>'cancelled' as cancelled,
                c.name_kanji,
                c.name_kana,
                c.name
            FROM logs_reservation lr
            LEFT JOIN reservations r ON (lr.changes->>'reservation_id')::uuid = r.id
            LEFT JOIN clients c ON r.reservation_client_id = c.id
            WHERE 
                lr.log_time >= '2026-01-16 00:00:00'::timestamp
                AND lr.log_time < '2026-01-17 00:00:00'::timestamp
                AND lr.table_name LIKE 'reservation_details_%'
                AND (
                    c.name_kanji LIKE '%山本%' OR
                    c.name_kana LIKE '%山本%' OR
                    c.name LIKE '%山本%'
                )
            ORDER BY lr.log_time ASC
        `;
        
        const yamamoto_DetailsResult = await client.query(yamamoto_DetailsQuery);
        console.log(`   Found ${yamamoto_DetailsResult.rows.length} 山本塗装店 logs in reservation_details_% tables`);
        
        // 3. Combine and analyze the results
        const allYamamotoLogs = [...yamamoto_Result.rows, ...yamamoto_DetailsResult.rows];
        console.log(`\n3. TOTAL 山本塗装店 LOGS: ${allYamamotoLogs.length}`);
        
        if (allYamamotoLogs.length > 0) {
            // Group by exact time
            const timeGroups = {};
            allYamamotoLogs.forEach(row => {
                const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                const timeKey = jstTime.toISOString().substring(0, 19);
                if (!timeGroups[timeKey]) {
                    timeGroups[timeKey] = [];
                }
                timeGroups[timeKey].push(row);
            });
            
            console.log('\n   山本塗装店 logs by time:');
            Object.entries(timeGroups).sort().forEach(([time, logs]) => {
                const isTargetTime = time.includes('11:04:36') || time.includes('11:05:07');
                const marker = isTargetTime ? ' ⭐ TARGET TIME' : '';
                console.log(`   ${time} JST: ${logs.length} logs${marker}`);
                
                if (isTargetTime) {
                    logs.forEach((log, i) => {
                        const tableType = log.table_name.includes('_details_') ? 'DETAILS' : 'RESERVATIONS';
                        console.log(`      ${i + 1}. ${tableType} - Hotel ${log.hotel_id} - ${log.action} - Table: ${log.table_name}`);
                        if (log.detail_date) {
                            console.log(`         Date: ${log.detail_date}, Room: ${log.room_id}, Cancelled: ${log.cancelled || 'null'}`);
                        }
                    });
                }
            });
        }
        
        // 4. Now search for ALL OTHER CLIENT ACTIVITY at the exact target times
        console.log('\n4. SEARCHING FOR ALL OTHER CLIENT ACTIVITY AT TARGET TIMES:');
        
        const targetTimes = [
            { name: '11:04:36 JST', start: '2026-01-16 02:04:36.000', end: '2026-01-16 02:04:37.000' },
            { name: '11:05:07 JST', start: '2026-01-16 02:05:07.000', end: '2026-01-16 02:05:08.000' }
        ];
        
        for (const timeframe of targetTimes) {
            console.log(`\n   Checking ${timeframe.name}:`);
            
            // Search ALL reservation-related tables at this exact time
            const allActivityQuery = `
                SELECT 
                    lr.id,
                    lr.log_time,
                    lr.action,
                    lr.table_name,
                    lr.changes->>'hotel_id' as hotel_id,
                    lr.changes->>'reservation_client_id' as client_id,
                    lr.changes->>'reservation_id' as reservation_id,
                    lr.changes->>'date' as detail_date,
                    lr.changes->>'room_id' as room_id
                FROM logs_reservation lr
                WHERE 
                    lr.log_time >= $1::timestamp
                    AND lr.log_time < $2::timestamp
                    AND (
                        lr.table_name LIKE 'reservations_%'
                        OR lr.table_name LIKE 'reservation_details_%'
                        OR lr.table_name LIKE 'reservation_clients_%'
                        OR lr.table_name LIKE 'reservation_addons_%'
                        OR lr.table_name LIKE 'reservation_payments_%'
                    )
                ORDER BY lr.log_time ASC
            `;
            
            const allActivityResult = await client.query(allActivityQuery, [timeframe.start, timeframe.end]);
            console.log(`      Found ${allActivityResult.rows.length} total logs at this exact time`);
            
            if (allActivityResult.rows.length > 0) {
                // Get client names for all logs
                const allClientIds = [...new Set([
                    ...allActivityResult.rows.map(row => row.client_id).filter(Boolean),
                    ...allActivityResult.rows.map(row => row.reservation_id).filter(Boolean)
                ])];
                
                let allClientNames = {};
                
                if (allClientIds.length > 0) {
                    // Try both direct client lookup and reservation lookup
                    const clientsQuery = `
                        SELECT id, COALESCE(name_kanji, name_kana, name) as client_name
                        FROM clients WHERE id = ANY($1)
                    `;
                    const clientsResult = await client.query(clientsQuery, [allClientIds]);
                    allClientNames = Object.fromEntries(
                        clientsResult.rows.map(row => [row.id, row.client_name])
                    );
                    
                    // Also try reservation lookup
                    const reservationsQuery = `
                        SELECT r.id, COALESCE(c.name_kanji, c.name_kana, c.name) as client_name
                        FROM reservations r
                        LEFT JOIN clients c ON r.reservation_client_id = c.id
                        WHERE r.id = ANY($1)
                    `;
                    const reservationsResult = await client.query(reservationsQuery, [allClientIds]);
                    reservationsResult.rows.forEach(row => {
                        if (row.client_name) {
                            allClientNames[row.id] = row.client_name;
                        }
                    });
                }
                
                // Analyze the logs
                const yamamoto_AtThisTime = allActivityResult.rows.filter(row => {
                    const clientName = allClientNames[row.client_id] || allClientNames[row.reservation_id] || '';
                    return clientName.includes('山本');
                });
                
                const others_AtThisTime = allActivityResult.rows.filter(row => {
                    const clientName = allClientNames[row.client_id] || allClientNames[row.reservation_id] || '';
                    return !clientName.includes('山本') && clientName !== '';
                });
                
                const unknown_AtThisTime = allActivityResult.rows.filter(row => {
                    const clientName = allClientNames[row.client_id] || allClientNames[row.reservation_id] || '';
                    return clientName === '';
                });
                
                console.log(`      山本塗装店 logs: ${yamamoto_AtThisTime.length}`);
                console.log(`      Other client logs: ${others_AtThisTime.length}`);
                console.log(`      Unknown client logs: ${unknown_AtThisTime.length}`);
                
                // Show details of other clients
                if (others_AtThisTime.length > 0) {
                    console.log(`      Other clients at this time:`);
                    const otherClients = [...new Set(others_AtThisTime.map(row => 
                        allClientNames[row.client_id] || allClientNames[row.reservation_id]
                    ).filter(Boolean))];
                    
                    otherClients.forEach((client, i) => {
                        const clientLogs = others_AtThisTime.filter(row => 
                            (allClientNames[row.client_id] || allClientNames[row.reservation_id]) === client
                        );
                        console.log(`         ${i + 1}. ${client}: ${clientLogs.length} logs`);
                        
                        // Show table types for this client
                        const tableTypes = [...new Set(clientLogs.map(log => {
                            if (log.table_name.includes('_details_')) return 'details';
                            if (log.table_name.includes('_clients_')) return 'clients';
                            if (log.table_name.includes('_addons_')) return 'addons';
                            if (log.table_name.includes('_payments_')) return 'payments';
                            return 'reservations';
                        }))];
                        console.log(`            Tables: ${tableTypes.join(', ')}`);
                    });
                }
                
                // Show table type breakdown
                const tableTypeBreakdown = {};
                allActivityResult.rows.forEach(row => {
                    let tableType;
                    if (row.table_name.includes('_details_')) tableType = 'reservation_details';
                    else if (row.table_name.includes('_clients_')) tableType = 'reservation_clients';
                    else if (row.table_name.includes('_addons_')) tableType = 'reservation_addons';
                    else if (row.table_name.includes('_payments_')) tableType = 'reservation_payments';
                    else tableType = 'reservations';
                    
                    if (!tableTypeBreakdown[tableType]) {
                        tableTypeBreakdown[tableType] = 0;
                    }
                    tableTypeBreakdown[tableType]++;
                });
                
                console.log(`      By table type:`);
                Object.entries(tableTypeBreakdown).forEach(([type, count]) => {
                    console.log(`         ${type}: ${count} logs`);
                });
            }
        }
        
        // 5. Final definitive answer
        console.log('\n5. DEFINITIVE ANSWER:');
        
        const targetTimeLogs = allYamamotoLogs.filter(row => {
            const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
            const timeStr = jstTime.toISOString();
            return timeStr.includes('11:04:36') || timeStr.includes('11:05:07');
        });
        
        if (targetTimeLogs.length > 0) {
            console.log(`   ✅ CONFIRMED: 山本塗装店 had ${targetTimeLogs.length} logs at the target times`);
            
            // Check if we found other activity at the same exact times
            let foundOtherActivity = false;
            
            for (const timeframe of targetTimes) {
                const allActivityQuery = `
                    SELECT COUNT(*) as total_logs
                    FROM logs_reservation lr
                    WHERE 
                        lr.log_time >= $1::timestamp
                        AND lr.log_time < $2::timestamp
                        AND (
                            lr.table_name LIKE 'reservations_%'
                            OR lr.table_name LIKE 'reservation_details_%'
                            OR lr.table_name LIKE 'reservation_clients_%'
                            OR lr.table_name LIKE 'reservation_addons_%'
                            OR lr.table_name LIKE 'reservation_payments_%'
                        )
                `;
                
                const totalResult = await client.query(allActivityQuery, [timeframe.start, timeframe.end]);
                const totalLogs = parseInt(totalResult.rows[0].total_logs);
                
                if (totalLogs > targetTimeLogs.filter(log => {
                    const jstTime = new Date(log.log_time.getTime() + (9 * 60 * 60 * 1000));
                    return jstTime.toISOString().includes(timeframe.name.substring(0, 8));
                }).length) {
                    foundOtherActivity = true;
                    break;
                }
            }
            
            if (foundOtherActivity) {
                console.log('   🎯 FINAL FINDING: OTHER CLIENTS ALSO HAD ACTIVITY at the exact same times');
                console.log('   📋 This means we CAN determine if the OTA trigger failure was system-wide');
                console.log('   📋 If other clients also failed to trigger OTA updates, it was a system issue');
                console.log('   📋 If only 山本塗装店 failed, it was client-specific');
            } else {
                console.log('   🎯 FINAL FINDING: ONLY 山本塗装店 had activity at those exact times');
                console.log('   📋 No other clients were making reservations simultaneously');
                console.log('   📋 Cannot determine if OTA trigger failure was system-wide or client-specific');
                console.log('   📋 The issue appears isolated to this specific client and timeframe');
            }
        } else {
            console.log('   ❌ ERROR: Could not find the 山本塗装店 logs that were found earlier');
            console.log('   📋 There may be an issue with the search methodology');
        }
        
    } catch (error) {
        console.error('❌ Search failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

// Run the definitive search
definitiveJan16Search().then(() => {
    console.log('\n✅ Definitive Jan 16 search completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Search error:', error);
    process.exit(1);
});