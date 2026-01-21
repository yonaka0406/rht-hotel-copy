/**
 * Find all reservation tables and search for logs during 11:04:36 JST timeframe
 * This will show if other hotels had activity during the same time as 山本塗装店
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function findAllReservationTables() {
    console.log('🔍 Finding ALL Reservation Tables and Jan 16 Activity');
    console.log('===================================================\n');
    
    const client = await pool.connect();
    try {
        // 1. Find all tables that match 'reservations_%' pattern
        console.log('1. FINDING ALL RESERVATION TABLES:');
        
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'reservations_%'
            ORDER BY table_name
        `;
        
        const tablesResult = await client.query(tablesQuery);
        console.log(`   Found ${tablesResult.rows.length} reservation tables:`);
        
        tablesResult.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. ${row.table_name}`);
        });
        
        // 2. Check logs_reservation for entries matching these tables on Jan 16
        console.log('\n2. CHECKING LOGS_RESERVATION FOR JAN 16 ACTIVITY:');
        
        const tableNames = tablesResult.rows.map(row => row.table_name);
        
        const jan16LogsQuery = `
            SELECT 
                table_name,
                COUNT(*) as log_count,
                MIN(log_time) as first_log,
                MAX(log_time) as last_log
            FROM logs_reservation 
            WHERE 
                log_time >= '2026-01-16 00:00:00'::timestamp
                AND log_time < '2026-01-17 00:00:00'::timestamp
                AND table_name = ANY($1)
            GROUP BY table_name
            ORDER BY table_name
        `;
        
        const jan16LogsResult = await client.query(jan16LogsQuery, [tableNames]);
        console.log(`   Tables with Jan 16 activity: ${jan16LogsResult.rows.length}`);
        
        jan16LogsResult.rows.forEach((row, i) => {
            const firstJST = new Date(row.first_log.getTime() + (9 * 60 * 60 * 1000));
            const lastJST = new Date(row.last_log.getTime() + (9 * 60 * 60 * 1000));
            console.log(`   ${i + 1}. ${row.table_name}: ${row.log_count} logs`);
            console.log(`      First: ${firstJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
            console.log(`      Last:  ${lastJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
        });
        
        // 3. Focus on the specific timeframe: 11:00-11:10 JST (02:00-02:10 UTC)
        console.log('\n3. ACTIVITY DURING 11:00-11:10 JST (02:00-02:10 UTC):');
        
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
        
        const timeframeResult = await client.query(timeframeQuery, [tableNames]);
        console.log(`   Tables with activity in 11:00-11:10 JST: ${timeframeResult.rows.length}`);
        
        if (timeframeResult.rows.length === 0) {
            console.log('   ❌ No reservation table activity found in this timeframe');
            
            // Let's expand the search slightly
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
            
            const expandedResult = await client.query(expandedQuery, [tableNames]);
            console.log(`   Tables with activity in expanded window: ${expandedResult.rows.length}`);
            
            expandedResult.rows.forEach((row, i) => {
                const firstJST = new Date(row.first_log.getTime() + (9 * 60 * 60 * 1000));
                const lastJST = new Date(row.last_log.getTime() + (9 * 60 * 60 * 1000));
                console.log(`   ${i + 1}. ${row.table_name}: ${row.log_count} logs - Actions: ${row.actions.join(', ')}`);
                console.log(`      First: ${firstJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
                console.log(`      Last:  ${lastJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
            });
            
            // If we found activity in expanded window, get detailed logs
            if (expandedResult.rows.length > 0) {
                console.log('\n4. DETAILED LOGS IN EXPANDED WINDOW:');
                
                const detailQuery = `
                    SELECT 
                        lr.id,
                        lr.log_time,
                        lr.action,
                        lr.table_name,
                        lr.changes->>'hotel_id' as hotel_id,
                        lr.changes->>'reservation_client_id' as client_id,
                        lr.changes->>'check_in' as check_in,
                        lr.changes->>'status' as status
                    FROM logs_reservation lr
                    WHERE 
                        lr.log_time >= '2026-01-16 01:55:00'::timestamp
                        AND lr.log_time < '2026-01-16 02:15:00'::timestamp
                        AND lr.table_name = ANY($1)
                    ORDER BY lr.log_time ASC
                `;
                
                const detailResult = await client.query(detailQuery, [tableNames]);
                
                // Get client names for the logs
                const clientIds = [...new Set(detailResult.rows.map(row => row.client_id).filter(Boolean))];
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
                
                console.log(`   Found ${detailResult.rows.length} detailed logs:`);
                
                detailResult.rows.forEach((row, i) => {
                    const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                    const clientName = clientNames[row.client_id] || 'Unknown Client';
                    const isYamamoto = clientName && clientName.includes('山本');
                    const yamamoto_Flag = isYamamoto ? ' [山本塗装店]' : '';
                    
                    console.log(`   ${i + 1}. ${jstTime.toISOString().replace('T', ' ').substring(0, 19)} JST`);
                    console.log(`      Table: ${row.table_name} - Action: ${row.action} - Hotel: ${row.hotel_id}`);
                    console.log(`      Client: ${clientName}${yamamoto_Flag}`);
                    console.log(`      Status: ${row.status}, Check-in: ${row.check_in}`);
                    console.log('');
                });
                
                // 5. Summary analysis
                console.log('5. SUMMARY ANALYSIS:');
                
                const totalLogs = detailResult.rows.length;
                const yamamoto_Logs = detailResult.rows.filter(row => {
                    const clientName = clientNames[row.client_id] || '';
                    return clientName.includes('山本');
                });
                const nonYamamoto_Logs = detailResult.rows.filter(row => {
                    const clientName = clientNames[row.client_id] || '';
                    return !clientName.includes('山本');
                });
                
                console.log(`   Total logs in expanded window: ${totalLogs}`);
                console.log(`   山本塗装店 logs: ${yamamoto_Logs.length}`);
                console.log(`   Other client logs: ${nonYamamoto_Logs.length}`);
                
                // Hotel analysis
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
                
                console.log('\n   By Hotel:');
                Object.entries(hotelStats).forEach(([hotelId, stats]) => {
                    console.log(`   Hotel ${hotelId}: ${stats.total} logs (${stats.yamamoto} 山本塗装店, ${stats.other} others)`);
                });
                
                // Time analysis
                const timeStats = {};
                detailResult.rows.forEach(row => {
                    const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                    const timeKey = jstTime.toISOString().substring(11, 16); // HH:MM
                    if (!timeStats[timeKey]) {
                        timeStats[timeKey] = { total: 0, yamamoto: 0, other: 0 };
                    }
                    timeStats[timeKey].total++;
                    
                    const clientName = clientNames[row.client_id] || '';
                    if (clientName.includes('山本')) {
                        timeStats[timeKey].yamamoto++;
                    } else {
                        timeStats[timeKey].other++;
                    }
                });
                
                console.log('\n   By Time (JST):');
                Object.entries(timeStats).sort().forEach(([time, stats]) => {
                    console.log(`   ${time}: ${stats.total} logs (${stats.yamamoto} 山本塗装店, ${stats.other} others)`);
                });
                
                // 6. Final conclusion
                console.log('\n6. FINAL CONCLUSION:');
                
                if (nonYamamoto_Logs.length === 0) {
                    console.log('   🎯 FINDING: ONLY 山本塗装店 had reservation activity during this timeframe');
                    console.log('   📋 No other clients were making reservations at the same time');
                    console.log('   📋 Cannot determine if the OTA trigger failure was system-wide or client-specific');
                } else {
                    console.log(`   🎯 FINDING: Multiple clients were active during this timeframe`);
                    console.log(`   📋 山本塗装店: ${yamamoto_Logs.length} logs`);
                    console.log(`   📋 Other clients: ${nonYamamoto_Logs.length} logs`);
                    console.log('   📋 This allows us to determine if the OTA failure was system-wide or client-specific');
                    
                    // List unique other clients
                    const otherClients = [...new Set(nonYamamoto_Logs.map(row => clientNames[row.client_id]).filter(Boolean))];
                    console.log(`   📋 Other clients involved: ${otherClients.join(', ')}`);
                }
            }
        } else {
            // Process the timeframe results
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
findAllReservationTables().then(() => {
    console.log('\n✅ All reservation tables analysis completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Analysis error:', error);
    process.exit(1);
});