/**
 * Basic test to find 山本塗装店 logs and understand the data structure
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function basicYamamotoSearch() {
    console.log('🔍 Basic 山本塗装店 Search Test');
    console.log('================================\n');
    
    const client = await pool.connect();
    try {
        // 1. Test basic database connection
        console.log('1. TESTING DATABASE CONNECTION:');
        const testQuery = `SELECT NOW() as current_time, version() as pg_version`;
        const testResult = await client.query(testQuery);
        console.log('   Database connected:', testResult.rows[0].current_time);
        console.log('   PostgreSQL version:', testResult.rows[0].pg_version.substring(0, 50) + '...');
        console.log('');
        
        // 2. Check if logs_reservation table exists and has data
        console.log('2. CHECKING LOGS_RESERVATION TABLE:');
        const tableCheckQuery = `
            SELECT 
                COUNT(*) as total_logs,
                MIN(log_time) as earliest_log,
                MAX(log_time) as latest_log
            FROM logs_reservation
        `;
        const tableResult = await client.query(tableCheckQuery);
        console.log('   Total logs in table:', tableResult.rows[0].total_logs);
        console.log('   Date range:', tableResult.rows[0].earliest_log, 'to', tableResult.rows[0].latest_log);
        console.log('');
        
        // 3. Check for reservation tables
        console.log('3. CHECKING RESERVATION TABLES:');
        const reservationTablesQuery = `
            SELECT COUNT(*) as total_logs
            FROM logs_reservation 
            WHERE table_name LIKE 'reservations_%'
        `;
        const reservationTablesResult = await client.query(reservationTablesQuery);
        console.log('   Logs for reservation tables:', reservationTablesResult.rows[0].total_logs);
        
        // 4. Look for any logs on Jan 16 (any table)
        console.log('4. CHECKING JAN 16 LOGS (ANY TABLE):');
        const jan16Query = `
            SELECT 
                COUNT(*) as total_logs,
                MIN(log_time) as first_log,
                MAX(log_time) as last_log
            FROM logs_reservation 
            WHERE log_time >= '2026-01-16 00:00:00'::timestamp
            AND log_time < '2026-01-17 00:00:00'::timestamp
        `;
        const jan16Result = await client.query(jan16Query);
        console.log('   Jan 16 logs (all tables):', jan16Result.rows[0]);
        
        if (parseInt(jan16Result.rows[0].total_logs) > 0) {
            // 5. Sample Jan 16 logs
            console.log('\n5. SAMPLE JAN 16 LOGS:');
            const sampleQuery = `
                SELECT 
                    id,
                    log_time,
                    action,
                    table_name,
                    changes->>'hotel_id' as hotel_id
                FROM logs_reservation 
                WHERE log_time >= '2026-01-16 00:00:00'::timestamp
                AND log_time < '2026-01-17 00:00:00'::timestamp
                ORDER BY log_time ASC
                LIMIT 10
            `;
            const sampleResult = await client.query(sampleQuery);
            sampleResult.rows.forEach((row, i) => {
                const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                console.log(`   ${i + 1}. ${jstTime.toISOString()} JST - ${row.table_name} - ${row.action} - Hotel ${row.hotel_id}`);
            });
        }
        
        // 6. Direct search for 山本塗装店 in clients table
        console.log('\n6. SEARCHING CLIENTS TABLE FOR 山本塗装店:');
        const clientSearchQuery = `
            SELECT 
                id,
                name,
                name_kana,
                name_kanji
            FROM clients 
            WHERE 
                name LIKE '%山本%' OR
                name_kana LIKE '%山本%' OR
                name_kanji LIKE '%山本%'
        `;
        const clientSearchResult = await client.query(clientSearchQuery);
        console.log(`   Found ${clientSearchResult.rows.length} clients with 山本:`);
        clientSearchResult.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. ID: ${row.id}`);
            console.log(`      Name: ${row.name || 'null'}`);
            console.log(`      Name Kana: ${row.name_kana || 'null'}`);
            console.log(`      Name Kanji: ${row.name_kanji || 'null'}`);
        });
        
        if (clientSearchResult.rows.length > 0) {
            // 7. Search for reservations with these client IDs
            console.log('\n7. SEARCHING FOR RESERVATIONS WITH 山本塗装店 CLIENT IDs:');
            const clientIds = clientSearchResult.rows.map(row => row.id);
            
            const reservationSearchQuery = `
                SELECT 
                    COUNT(*) as total_reservations,
                    MIN(created_at) as earliest_reservation,
                    MAX(created_at) as latest_reservation
                FROM reservations 
                WHERE reservation_client_id = ANY($1)
            `;
            const reservationSearchResult = await client.query(reservationSearchQuery, [clientIds]);
            console.log('   Reservations found:', reservationSearchResult.rows[0]);
            
            // 8. Search logs by client ID directly
            console.log('\n8. SEARCHING LOGS BY CLIENT ID:');
            const logSearchQuery = `
                SELECT 
                    COUNT(*) as total_logs,
                    MIN(log_time) as earliest_log,
                    MAX(log_time) as latest_log
                FROM logs_reservation 
                WHERE 
                    (changes->>'reservation_client_id')::uuid = ANY($1)
                    OR (changes->'new'->>'reservation_client_id')::uuid = ANY($1)
                    OR (changes->'old'->>'reservation_client_id')::uuid = ANY($1)
            `;
            const logSearchResult = await client.query(logSearchQuery, [clientIds]);
            console.log('   Logs by client ID:', logSearchResult.rows[0]);
            
            if (parseInt(logSearchResult.rows[0].total_logs) > 0) {
                // 9. Sample logs by client ID
                console.log('\n9. SAMPLE LOGS BY CLIENT ID:');
                const sampleLogQuery = `
                    SELECT 
                        id,
                        log_time,
                        action,
                        table_name,
                        changes->>'hotel_id' as hotel_id,
                        changes->>'reservation_client_id' as client_id
                    FROM logs_reservation 
                    WHERE 
                        (changes->>'reservation_client_id')::uuid = ANY($1)
                        OR (changes->'new'->>'reservation_client_id')::uuid = ANY($1)
                        OR (changes->'old'->>'reservation_client_id')::uuid = ANY($1)
                    ORDER BY log_time DESC
                    LIMIT 10
                `;
                const sampleLogResult = await client.query(sampleLogQuery, [clientIds]);
                sampleLogResult.rows.forEach((row, i) => {
                    const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                    console.log(`   ${i + 1}. ${jstTime.toISOString()} JST - ${row.table_name} - ${row.action} - Hotel ${row.hotel_id}`);
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Search failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

// Run the search
basicYamamotoSearch().then(() => {
    console.log('\n✅ Basic 山本塗装店 search completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Search error:', error);
    process.exit(1);
});