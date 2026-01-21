/**
 * Targeted search for 山本塗装店 logs on Jan 16 to resolve the discrepancy
 * This will help us understand why the table search didn't find the logs
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function targetedYamamotoSearch() {
    console.log('🔍 Targeted 山本塗装店 Search for Jan 16');
    console.log('=========================================\n');
    
    const client = await pool.connect();
    try {
        // 1. Get the specific 山本塗装店 client ID we found earlier
        console.log('1. FINDING 山本塗装店 CLIENT ID:');
        
        const clientQuery = `
            SELECT id, name_kanji
            FROM clients 
            WHERE name_kanji = '株式会社山本塗装店'
            LIMIT 1
        `;
        
        const clientResult = await client.query(clientQuery);
        if (clientResult.rows.length === 0) {
            console.log('   ❌ No exact match found for 株式会社山本塗装店');
            return;
        }
        
        const yamamoto_ClientId = clientResult.rows[0].id;
        console.log(`   Found client ID: ${yamamoto_ClientId}`);
        console.log(`   Name: ${clientResult.rows[0].name_kanji}`);
        
        // 2. Search for ALL logs with this client ID on Jan 16
        console.log('\n2. ALL LOGS FOR THIS CLIENT ON JAN 16:');
        
        const allLogsQuery = `
            SELECT 
                lr.id,
                lr.log_time,
                lr.action,
                lr.table_name,
                lr.changes
            FROM logs_reservation lr
            WHERE 
                lr.log_time >= '2026-01-16 00:00:00'::timestamp
                AND lr.log_time < '2026-01-17 00:00:00'::timestamp
                AND (
                    (lr.changes->>'reservation_client_id')::uuid = $1
                    OR (lr.changes->'new'->>'reservation_client_id')::uuid = $1
                    OR (lr.changes->'old'->>'reservation_client_id')::uuid = $1
                )
            ORDER BY lr.log_time ASC
        `;
        
        const allLogsResult = await client.query(allLogsQuery, [yamamoto_ClientId]);
        console.log(`   Found ${allLogsResult.rows.length} logs for this client on Jan 16`);
        
        if (allLogsResult.rows.length === 0) {
            console.log('   ❌ No logs found for this specific client ID');
            
            // Try searching for any 山本塗装店 variant
            console.log('\n   Trying broader search for any 山本塗装店 variant...');
            
            const broadClientQuery = `
                SELECT id, name_kanji
                FROM clients 
                WHERE name_kanji LIKE '%山本塗装店%'
            `;
            
            const broadClientResult = await client.query(broadClientQuery);
            console.log(`   Found ${broadClientResult.rows.length} 山本塗装店 variants:`);
            
            broadClientResult.rows.forEach((row, i) => {
                console.log(`   ${i + 1}. ${row.id} - ${row.name_kanji}`);
            });
            
            if (broadClientResult.rows.length > 0) {
                const allYamamotoIds = broadClientResult.rows.map(row => row.id);
                
                const broadLogsQuery = `
                    SELECT 
                        lr.id,
                        lr.log_time,
                        lr.action,
                        lr.table_name,
                        lr.changes->>'reservation_client_id' as client_id
                    FROM logs_reservation lr
                    WHERE 
                        lr.log_time >= '2026-01-16 00:00:00'::timestamp
                        AND lr.log_time < '2026-01-17 00:00:00'::timestamp
                        AND (
                            (lr.changes->>'reservation_client_id')::uuid = ANY($1)
                            OR (lr.changes->'new'->>'reservation_client_id')::uuid = ANY($1)
                            OR (lr.changes->'old'->>'reservation_client_id')::uuid = ANY($1)
                        )
                    ORDER BY lr.log_time ASC
                `;
                
                const broadLogsResult = await client.query(broadLogsQuery, [allYamamotoIds]);
                console.log(`\n   Found ${broadLogsResult.rows.length} logs for all 山本塗装店 variants on Jan 16:`);
                
                // Group by time to find the 11:04:36 entries
                const timeGroups = {};
                broadLogsResult.rows.forEach(row => {
                    const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                    const timeKey = jstTime.toISOString().substring(0, 19);
                    if (!timeGroups[timeKey]) {
                        timeGroups[timeKey] = [];
                    }
                    timeGroups[timeKey].push(row);
                });
                
                console.log('\n   Logs grouped by time:');
                Object.entries(timeGroups).sort().forEach(([time, logs]) => {
                    console.log(`   ${time} JST: ${logs.length} logs`);
                    if (time.includes('11:04:36') || time.includes('11:05:07')) {
                        console.log(`      ⭐ TARGET TIME FOUND!`);
                        logs.forEach((log, i) => {
                            console.log(`         ${i + 1}. Table: ${log.table_name}, Action: ${log.action}, Client: ${log.client_id}`);
                        });
                    }
                });
                
                // 3. Check if these logs are in reservation tables
                console.log('\n3. CHECKING TABLE TYPES:');
                
                const reservationTableLogs = broadLogsResult.rows.filter(row => 
                    row.table_name.startsWith('reservations_')
                );
                const otherTableLogs = broadLogsResult.rows.filter(row => 
                    !row.table_name.startsWith('reservations_')
                );
                
                console.log(`   Logs in reservations_* tables: ${reservationTableLogs.length}`);
                console.log(`   Logs in other tables: ${otherTableLogs.length}`);
                
                if (otherTableLogs.length > 0) {
                    console.log('\n   Other table types:');
                    const otherTableTypes = [...new Set(otherTableLogs.map(row => row.table_name))];
                    otherTableTypes.forEach(tableName => {
                        const count = otherTableLogs.filter(row => row.table_name === tableName).length;
                        console.log(`   - ${tableName}: ${count} logs`);
                    });
                }
                
                // 4. Focus on the target times
                console.log('\n4. LOGS AT TARGET TIMES (11:04:36 and 11:05:07 JST):');
                
                const targetLogs = broadLogsResult.rows.filter(row => {
                    const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                    const timeStr = jstTime.toISOString();
                    return timeStr.includes('11:04:36') || timeStr.includes('11:05:07');
                });
                
                console.log(`   Found ${targetLogs.length} logs at target times:`);
                
                targetLogs.forEach((row, i) => {
                    const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                    console.log(`   ${i + 1}. ${jstTime.toISOString()} JST`);
                    console.log(`      Table: ${row.table_name}`);
                    console.log(`      Action: ${row.action}`);
                    console.log(`      Client ID: ${row.client_id}`);
                });
                
                // 5. Final answer
                console.log('\n5. ANSWER TO THE QUESTION:');
                
                if (targetLogs.length > 0) {
                    const reservationTargetLogs = targetLogs.filter(row => 
                        row.table_name.startsWith('reservations_')
                    );
                    const otherTargetLogs = targetLogs.filter(row => 
                        !row.table_name.startsWith('reservations_')
                    );
                    
                    console.log(`   山本塗装店 had ${targetLogs.length} logs at the target times`);
                    console.log(`   - In reservations_* tables: ${reservationTargetLogs.length}`);
                    console.log(`   - In other tables: ${otherTargetLogs.length}`);
                    
                    if (reservationTargetLogs.length === 0) {
                        console.log('\n   🎯 FINDING: The 山本塗装店 logs were NOT in reservations_* tables!');
                        console.log('   📋 This explains why our reservation table search found no activity');
                        console.log('   📋 The logs were in other table types (likely reservation_details_*, etc.)');
                    } else {
                        console.log('\n   🎯 FINDING: Some 山本塗装店 logs were in reservations_* tables');
                        console.log('   📋 There may be a query issue in our previous search');
                    }
                    
                    // Check what other activity was happening at the same time
                    console.log('\n6. OTHER ACTIVITY AT THE SAME TIMES:');
                    
                    const sameTimeQuery = `
                        SELECT 
                            lr.id,
                            lr.log_time,
                            lr.action,
                            lr.table_name,
                            lr.changes->>'hotel_id' as hotel_id,
                            lr.changes->>'reservation_client_id' as client_id
                        FROM logs_reservation lr
                        WHERE 
                            (
                                lr.log_time >= '2026-01-16 02:04:36'::timestamp
                                AND lr.log_time < '2026-01-16 02:04:37'::timestamp
                            )
                            OR
                            (
                                lr.log_time >= '2026-01-16 02:05:07'::timestamp
                                AND lr.log_time < '2026-01-16 02:05:08'::timestamp
                            )
                        ORDER BY lr.log_time ASC
                    `;
                    
                    const sameTimeResult = await client.query(sameTimeQuery);
                    console.log(`   Found ${sameTimeResult.rows.length} total logs at the exact target times:`);
                    
                    // Get client names for comparison
                    const sameTimeClientIds = [...new Set(sameTimeResult.rows.map(row => row.client_id).filter(Boolean))];
                    let sameTimeClientNames = {};
                    
                    if (sameTimeClientIds.length > 0) {
                        const sameTimeClientsQuery = `
                            SELECT id, COALESCE(name_kanji, name_kana, name) as client_name
                            FROM clients WHERE id = ANY($1)
                        `;
                        const sameTimeClientsResult = await client.query(sameTimeClientsQuery, [sameTimeClientIds]);
                        sameTimeClientNames = Object.fromEntries(
                            sameTimeClientsResult.rows.map(row => [row.id, row.client_name])
                        );
                    }
                    
                    const yamamoto SameTimeLogs = sameTimeResult.rows.filter(row => {
                        const clientName = sameTimeClientNames[row.client_id] || '';
                        return clientName.includes('山本');
                    });
                    
                    const other SameTimeLogs = sameTimeResult.rows.filter(row => {
                        const clientName = sameTimeClientNames[row.client_id] || '';
                        return !clientName.includes('山本');
                    });
                    
                    console.log(`   山本塗装店 logs: ${yamamoto SameTimeLogs.length}`);
                    console.log(`   Other client logs: ${other SameTimeLogs.length}`);
                    
                    if (other SameTimeLogs.length === 0) {
                        console.log('\n   🎯 FINAL ANSWER: ONLY 山本塗装店 had activity at those exact times');
                        console.log('   📋 No other clients were making reservations simultaneously');
                    } else {
                        console.log('\n   🎯 FINAL ANSWER: Multiple clients had activity at those exact times');
                        console.log('   📋 Other clients were also making reservations simultaneously');
                        
                        const otherClients = [...new Set(other SameTimeLogs.map(row => 
                            sameTimeClientNames[row.client_id]
                        ).filter(Boolean))];
                        console.log(`   📋 Other clients: ${otherClients.join(', ')}`);
                    }
                }
            }
            
        } else {
            // Process the logs we found
            console.log('\n   Sample logs:');
            allLogsResult.rows.slice(0, 10).forEach((row, i) => {
                const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                console.log(`   ${i + 1}. ${jstTime.toISOString()} JST - ${row.table_name} - ${row.action}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Search failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

// Run the search
targetedYamamotoSearch().then(() => {
    console.log('\n✅ Targeted 山本塗装店 search completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Search error:', error);
    process.exit(1);
});