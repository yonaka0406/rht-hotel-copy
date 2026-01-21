/**
 * Simple test for Jan 16 timeframe analysis
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function simpleTest() {
    console.log('🔍 Simple Jan 16 Analysis Test');
    console.log('==============================\n');
    
    const client = await pool.connect();
    try {
        // Test basic query first
        const testQuery = `SELECT NOW() as current_time, 'test' as message`;
        const testResult = await client.query(testQuery);
        console.log('Database connection test:', testResult.rows[0]);
        
        // Define the target timeframe
        const windowStart = '2026-01-16 01:34:36'; // 30 min before target
        const windowEnd = '2026-01-16 02:34:36';   // 30 min after target
        
        console.log(`\nAnalyzing timeframe: ${windowStart} to ${windowEnd} UTC`);
        
        // Get reservation logs in timeframe
        const logsQuery = `
            SELECT 
                COUNT(*) as total_logs,
                MIN(log_time) as first_log,
                MAX(log_time) as last_log
            FROM logs_reservation lr
            WHERE 
                lr.log_time >= $1::timestamp
                AND lr.log_time <= $2::timestamp
                AND lr.table_name LIKE 'reservations_%'
        `;
        
        const logsResult = await client.query(logsQuery, [windowStart, windowEnd]);
        console.log('Logs found:', logsResult.rows[0]);
        
        // Define broader search windows
        const broadWindowStart = '2026-01-16 00:00:00'; // Entire day
        const broadWindowEnd = '2026-01-17 00:00:00';
        
        console.log(`\nBroader search: ${broadWindowStart} to ${broadWindowEnd} UTC (entire Jan 16)`);
        
        // Get reservation logs for entire day
        const broadLogsQuery = `
            SELECT 
                COUNT(*) as total_logs,
                MIN(log_time) as first_log,
                MAX(log_time) as last_log
            FROM logs_reservation lr
            WHERE 
                lr.log_time >= $1::timestamp
                AND lr.log_time < $2::timestamp
                AND lr.table_name LIKE 'reservations_%'
        `;
        
        const broadLogsResult = await client.query(broadLogsQuery, [broadWindowStart, broadWindowEnd]);
        console.log('Logs found for entire Jan 16:', broadLogsResult.rows[0]);
        
        if (parseInt(broadLogsResult.rows[0].total_logs) > 0) {
            // Get logs around the target time
            const targetLogsQuery = `
                SELECT 
                    lr.id,
                    lr.log_time,
                    lr.action,
                    lr.table_name,
                    lr.changes->>'hotel_id' as hotel_id,
                    lr.changes->>'reservation_client_id' as client_id,
                    ABS(EXTRACT(EPOCH FROM (lr.log_time - '2026-01-16 02:04:36'::timestamp))) as seconds_from_target
                FROM logs_reservation lr
                WHERE 
                    lr.log_time >= $1::timestamp
                    AND lr.log_time < $2::timestamp
                    AND lr.table_name LIKE 'reservations_%'
                ORDER BY seconds_from_target ASC
                LIMIT 10
            `;
            
            const targetLogsResult = await client.query(targetLogsQuery, [broadWindowStart, broadWindowEnd]);
            console.log('\nClosest logs to 2026-01-16 02:04:36 UTC (11:04:36 JST):');
            targetLogsResult.rows.forEach((row, i) => {
                const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                const minutesFromTarget = Math.round(row.seconds_from_target / 60);
                console.log(`  ${i + 1}. ${jstTime.toISOString().replace('T', ' ').substring(0, 19)} JST - Hotel ${row.hotel_id} - ${row.action} (${minutesFromTarget} min from target)`);
            });
        }
        
        // Also search for 山本塗装店 specifically
        console.log('\nSearching for 山本塗装店 logs on Jan 16...');
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
                lr.log_time >= $1::timestamp
                AND lr.log_time < $2::timestamp
                AND lr.table_name LIKE 'reservations_%'
                AND (
                    c.name_kanji LIKE '%山本%' OR
                    c.name_kana LIKE '%山本%' OR
                    c.name LIKE '%山本%'
                )
            ORDER BY lr.log_time ASC
        `;
        
        const yamamoto_Result = await client.query(yamamoto_Query, [broadWindowStart, broadWindowEnd]);
        console.log(`Found ${yamamoto_Result.rows.length} 山本塗装店 logs on Jan 16:`);
        
        yamamoto_Result.rows.forEach((row, i) => {
            const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
            const clientName = row.name_kanji || row.name_kana || row.name || 'Unknown';
            console.log(`  ${i + 1}. ${jstTime.toISOString().replace('T', ' ').substring(0, 19)} JST - Hotel ${row.hotel_id} - ${row.action} - ${clientName}`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
    }
}

simpleTest().then(() => {
    console.log('\n✅ Simple test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});