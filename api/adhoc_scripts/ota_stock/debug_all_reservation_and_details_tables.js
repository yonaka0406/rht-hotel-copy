/**
 * Comprehensive search for ALL reservation-related tables during Jan 16 11:04:36 JST
 * Includes both reservations_% AND reservation_details_% tables
 * This should reveal the complete picture of what was happening at that time
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function findAllReservationAndDetailsTables() {
    console.log('🔍 Finding ALL Reservation & Details Tables - Jan 16 Analysis');
    console.log('=============================================================\n');
    
    const client = await pool.connect();
    try {
        // 1. Find all reservation-related tables
        console.log('1. FINDING ALL RESERVATION-RELATED TABLES:');
        
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (
                table_name LIKE 'reservations_%'
                OR table_name LIKE 'reservation_details_%'
                OR table_name LIKE 'reservation_clients_%'
                OR table_name LIKE 'reservation_addons_%'
                OR table_name LIKE 'reservation_payments_%'
            )
            ORDER BY table_name
        `;
        
        const tablesResult = await client.query(tablesQuery);
        console.log(`   Found ${tablesResult.rows.length} reservation-related tables:`);
        
        // Group by type
        const tablesByType = {
            reservations: [],
            reservation_details: [],
            reservation_clients: [],
            reservation_addons: [],
            reservation_payments: [],
            other: []
        };
        
        tablesResult.rows.forEach(row => {
            const tableName = row.table_name;
            if (tableName.startsWith('reservations_')) {
                tablesByType.reservations.push(tableName);
            } else if (tableName.startsWith('reservation_details_')) {
                tablesByType.reservation_details.push(tableName);
            } else if (tableName.startsWith('reservation_clients_')) {
                tablesByType.reservation_clients.push(tableName);
            } else if (tableName.startsWith('reservation_addons_')) {
                tablesByType.reservation_addons.push(tableName);
            } else if (tableName.startsWith('reservation_payments_')) {
                tablesByType.reservation_payments.push(tableName);
            } else {
                tablesByType.other.push(tableName);
            }
        });
        
        Object.entries(tablesByType).forEach(([type, tables]) => {
            if (tables.length > 0) {
                console.log(`   ${type}: ${tables.length} tables`);
                if (tables.length <= 10) {
                    console.log(`      ${tables.join(', ')}`);
                } else {
                    console.log(`      ${tables.slice(0, 5).join(', ')}, ... and ${tables.length - 5} more`);
                }
            }
        });
        
        // 2. Focus on the critical timeframe: 11:00-11:10 JST (02:00-02:10 UTC)
        console.log('\n2. ACTIVITY DURING 11:00-11:10 JST (02:00-02:10 UTC):');
        
        const allTableNames = tablesResult.rows.map(row => row.table_name);
        
        const timeframeQuery = `
            SELECT 
                table_name,
                COUNT(*) as log_count,
                MIN(log_time) as first_log,
                MAX(log_time) as last_log,
                array_agg(DISTINCT action) as actions
            FROM logs_reservation 
            WHERE 
                log_time >= '2026-01-16 02:00:00'::timestamp
                AND log_time < '2026-01-16 02:10:00'::timestamp
                AND table_name = ANY($1)
            GROUP BY table_name
            ORDER BY log_count DESC
        `;
        
        const timeframeResult = await client.query(timeframeQuery, [allTableNames]);
        console.log(`   Tables with activity in 11:00-11:10 JST: ${timeframeResult.rows.length}`);
        
        if (timeframeResult.rows.length === 0) {
            console.log('   ❌ No activity found in this exact timeframe');
            
            // Expand the search window
            console.log('\n   Expanding search to 10:55-11:15 JST (01:55-02:15 UTC):');
            
            const expandedQuery = `
                SELECT 
                    table_name,
                    COUNT(*) as log_count,
                    MIN(log_time) as first_log,
                    MAX(log_time) as last_log,
                    array_agg(DISTINCT action) as actions
                FROM logs_reservation 
                WHERE 
                    log_time >= '2026-01-16 01:55:00'::timestamp
                    AND log_time < '2026-01-16 02:15:00'::timestamp
                    AND table_name = ANY($1)
                GROUP BY table_name
                ORDER BY log_count DESC
            `;
            
            const expandedResult = await client.query(expandedQuery, [allTableNames]);
            console.log(`   Tables with activity in expanded window: ${expandedResult.rows.length}`);
            
            if (expandedResult.rows.length > 0) {
                expandedResult.rows.forEach((row, i) => {
                    const firstJST = new Date(row.first_log.getTime() + (9 * 60 * 60 * 1000));
                    const lastJST = new Date(row.last_log.getTime() + (9 * 60 * 60 * 1000));
                    const tableType = row.table_name.split('_')[0] + '_' + row.table_name.split('_')[1];
                    console.log(`   ${i + 1}. ${row.table_name} (${tableType}): ${row.log_count} logs`);
                    console.log(`      Actions: ${row.actions.join(', ')}`);
                    console.log(`      First: ${firstJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
                    console.log(`      Last:  ${lastJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
                });
                
                // 3. Get detailed logs for the expanded window
                console.log('\n3. DETAILED LOGS IN EXPANDED WINDOW:');
                
                const detailQuery = `
                    SELECT 
                        lr.id,
                        lr.log_time,
                        lr.action,
                        lr.table_name,
                        lr.changes->>'hotel_id' as hotel_id,
                        lr.changes->>'reservation_client_id' as client_id,
                        lr.changes->>'check_in' as check_in,
                        lr.changes->>'check_out' as check_out,
                        lr.changes->>'status' as status,
                        lr.changes->>'date' as detail_date,
                        lr.changes->>'room_id' as room_id,
                        lr.changes->>'cancelled' as cancelled
                    FROM logs_reservation lr
                    WHERE 
                        lr.log_time >= '2026-01-16 01:55:00'::timestamp
                        AND lr.log_time < '2026-01-16 02:15:00'::timestamp
                        AND lr.table_name = ANY($1)
                    ORDER BY lr.log_time ASC
                `;
                
                const detailResult = await client.query(detailQuery, [allTableNames]);
                
                // Get client names
                const clientIds = [...new Set(detailResult.rows.map(row => row.client_id).filter(Boolean))];
                let clientNames = {};
                
                if (clientIds.length > 0) {
                    const clientsQuery = `
                        SELECT id, COALESCE(name_kanji, name_kana, name) as client_name
                        FROM clients WHERE id = ANY($1)
                    `;
                    const clientsResult = await client.query(clientsQuery, [clientIds]);
                    clientNames = Object.fromEntries(
                        clientsResult.rows.map(row => [row.id, row.client_name])
                    );
                }
                
                console.log(`   Found ${detailResult.rows.length} detailed logs:`);
                
                // Group by exact time for better analysis
                const timeGroups = {};
                detailResult.rows.forEach(row => {
                    const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                    const timeKey = jstTime.toISOString().substring(0, 19); // YYYY-MM-DDTHH:MM:SS
                    if (!timeGroups[timeKey]) {
                        timeGroups[timeKey] = [];
                    }
                    timeGroups[timeKey].push(row);
                });
                
                console.log('\n   Logs grouped by exact time:');
                Object.entries(timeGroups).sort().forEach(([timeKey, logs]) => {
                    const timeStr = timeKey.replace('T', ' ') + ' JST';
                    console.log(`\n   ⏰ ${timeStr} (${logs.length} logs):`);
                    
                    // Group by table type within each time
                    const tableTypeGroups = {};
                    logs.forEach(log => {
                        const tableType = log.table_name.includes('_details_') ? 'details' : 
                                         log.table_name.includes('_clients_') ? 'clients' :
                                         log.table_name.includes('_addons_') ? 'addons' :
                                         log.table_name.includes('_payments_') ? 'payments' : 'reservations';
                        if (!tableTypeGroups[tableType]) {
                            tableTypeGroups[tableType] = [];
                        }
                        tableTypeGroups[tableType].push(log);
                    });
                    
                    Object.entries(tableTypeGroups).forEach(([tableType, typeLogs]) => {
                        console.log(`      📋 ${tableType.toUpperCase()} (${typeLogs.length} logs):`);
                        
                        typeLogs.forEach((log, i) => {
                            const clientName = clientNames[log.client_id] || 'Unknown Client';
                            const isYamamoto = clientName && clientName.includes('山本');
                            const yamamoto_Flag = isYamamoto ? ' [山本塗装店]' : '';
                            
                            console.log(`         ${i + 1}. ${log.action} - Hotel ${log.hotel_id} - ${clientName}${yamamoto_Flag}`);
                            
                            if (tableType === 'details') {
                                console.log(`            Date: ${log.detail_date}, Room: ${log.room_id}, Cancelled: ${log.cancelled || 'null'}`);
                            } else if (tableType === 'reservations') {
                                console.log(`            Check-in: ${log.check_in}, Status: ${log.status}`);
                            }
                        });
                    });
                });
                
                // 4. Summary analysis
                console.log('\n4. SUMMARY ANALYSIS:');
                
                const totalLogs = detailResult.rows.length;
                const yamamoto_Logs = detailResult.rows.filter(row => {
                    const clientName = clientNames[row.client_id] || '';
                    return clientName.includes('山本');
                });
                const nonYamamoto_Logs = detailResult.rows.filter(row => {
                    const clientName = clientNames[row.client_id] || '';
                    return !clientName.includes('山本');
                });
                
                console.log(`   📊 OVERALL STATISTICS:`);
                console.log(`      Total logs: ${totalLogs}`);
                console.log(`      山本塗装店 logs: ${yamamoto_Logs.length}`);
                console.log(`      Other client logs: ${nonYamamoto_Logs.length}`);
                
                // Analyze by table type
                const tableTypeStats = {};
                detailResult.rows.forEach(row => {
                    const tableType = row.table_name.includes('_details_') ? 'reservation_details' : 
                                     row.table_name.includes('_clients_') ? 'reservation_clients' :
                                     row.table_name.includes('_addons_') ? 'reservation_addons' :
                                     row.table_name.includes('_payments_') ? 'reservation_payments' : 'reservations';
                    if (!tableTypeStats[tableType]) {
                        tableTypeStats[tableType] = { total: 0, yamamoto: 0, other: 0 };
                    }
                    tableTypeStats[tableType].total++;
                    
                    const clientName = clientNames[row.client_id] || '';
                    if (clientName.includes('山本')) {
                        tableTypeStats[tableType].yamamoto++;
                    } else {
                        tableTypeStats[tableType].other++;
                    }
                });
                
                console.log('\n   📋 BY TABLE TYPE:');
                Object.entries(tableTypeStats).forEach(([tableType, stats]) => {
                    console.log(`      ${tableType}: ${stats.total} logs (${stats.yamamoto} 山本塗装店, ${stats.other} others)`);
                });
                
                // Analyze by hotel
                const hotelStats = {};
                detailResult.rows.forEach(row => {
                    const hotelId = row.hotel_id || 'unknown';
                    if (!hotelStats[hotelId]) {
                        hotelStats[hotelId] = { total: 0, yamamoto: 0, other: 0 };
                    }
                    hotelStats[hotelId].total++;
                    
                    const clientName = clientNames[row.client_id] || '';
                    if (clientName.includes('山本')) {
                        hotelStats[hotelId].yamamoto++;
                    } else {
                        hotelStats[hotelId].other++;
                    }
                });
                
                console.log('\n   🏨 BY HOTEL:');
                Object.entries(hotelStats).sort().forEach(([hotelId, stats]) => {
                    console.log(`      Hotel ${hotelId}: ${stats.total} logs (${stats.yamamoto} 山本塗装店, ${stats.other} others)`);
                });
                
                // 5. Focus on inventory-affecting tables (reservation_details)
                const detailsLogs = detailResult.rows.filter(row => 
                    row.table_name.includes('_details_')
                );
                
                console.log('\n5. INVENTORY-AFFECTING LOGS (reservation_details):');
                console.log(`   Found ${detailsLogs.length} reservation_details logs`);
                
                if (detailsLogs.length > 0) {
                    const detailsYamamoto = detailsLogs.filter(row => {
                        const clientName = clientNames[row.client_id] || '';
                        return clientName.includes('山本');
                    });
                    const detailsOthers = detailsLogs.filter(row => {
                        const clientName = clientNames[row.client_id] || '';
                        return !clientName.includes('山本');
                    });
                    
                    console.log(`   山本塗装店 details logs: ${detailsYamamoto.length}`);
                    console.log(`   Other client details logs: ${detailsOthers.length}`);
                    
                    if (detailsOthers.length > 0) {
                        console.log('\n   Other clients with inventory changes:');
                        const otherDetailsClients = [...new Set(detailsOthers.map(row => 
                            clientNames[row.client_id]
                        ).filter(Boolean))];
                        otherDetailsClients.forEach((client, i) => {
                            const clientLogs = detailsOthers.filter(row => 
                                clientNames[row.client_id] === client
                            );
                            console.log(`      ${i + 1}. ${client}: ${clientLogs.length} logs`);
                        });
                    }
                }
                
                // 6. Final conclusion
                console.log('\n6. FINAL CONCLUSION:');
                
                if (nonYamamoto_Logs.length === 0) {
                    console.log('   🎯 FINDING: ONLY 山本塗装店 had reservation activity during this timeframe');
                    console.log('   📋 No other clients were making reservations at the same time');
                    console.log('   📋 Cannot determine if OTA trigger failure was system-wide or client-specific');
                } else {
                    console.log(`   🎯 FINDING: Multiple clients were active during this timeframe`);
                    console.log(`   📋 山本塗装店: ${yamamoto_Logs.length} logs`);
                    console.log(`   📋 Other clients: ${nonYamamoto_Logs.length} logs`);
                    
                    if (detailResult.rows.filter(row => row.table_name.includes('_details_')).length > 0) {
                        const detailsOthers = detailResult.rows.filter(row => 
                            row.table_name.includes('_details_') && 
                            !clientNames[row.client_id]?.includes('山本')
                        );
                        
                        if (detailsOthers.length > 0) {
                            console.log('   📋 OTHER CLIENTS ALSO HAD INVENTORY CHANGES (reservation_details)');
                            console.log('   📋 This allows us to test if OTA trigger failure was system-wide');
                        } else {
                            console.log('   📋 Only 山本塗装店 had inventory changes (reservation_details)');
                            console.log('   📋 Other activity was in non-inventory tables');
                        }
                    }
                    
                    // List unique other clients
                    const otherClients = [...new Set(nonYamamoto_Logs.map(row => 
                        clientNames[row.client_id]
                    ).filter(Boolean))];
                    console.log(`   📋 Other clients involved: ${otherClients.join(', ')}`);
                }
            } else {
                console.log('   ❌ No activity found even in expanded window');
            }
        } else {
            // Process the original timeframe results
            timeframeResult.rows.forEach((row, i) => {
                const firstJST = new Date(row.first_log.getTime() + (9 * 60 * 60 * 1000));
                const lastJST = new Date(row.last_log.getTime() + (9 * 60 * 60 * 1000));
                console.log(`   ${i + 1}. ${row.table_name}: ${row.log_count} logs - Actions: ${row.actions.join(', ')}`);
                console.log(`      First: ${firstJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
                console.log(`      Last:  ${lastJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
            });
        }
        
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

// Run the analysis
findAllReservationAndDetailsTables().then(() => {
    console.log('\n✅ All reservation and details tables analysis completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Analysis error:', error);
    process.exit(1);
});