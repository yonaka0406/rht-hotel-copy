/**
 * Debug exact times for 山本塗装店 logs to understand timezone handling
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function debugExactTimes() {
    console.log('🔍 Debug Exact Times for 山本塗装店 on Jan 16');
    console.log('===============================================\n');
    
    const client = await pool.connect();
    try {
        // First, let's find the exact UTC times for 山本塗装店 logs
        console.log('1. FINDING EXACT 山本塗装店 LOG TIMES:');
        
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
        console.log(`Found ${yamamoto_Result.rows.length} 山本塗装店 logs on Jan 16:`);
        
        const uniqueTimes = new Set();
        yamamoto_Result.rows.forEach((row, i) => {
            const utcTime = row.log_time;
            const jstTime = new Date(utcTime.getTime() + (9 * 60 * 60 * 1000));
            const timeKey = jstTime.toISOString().substring(0, 19);
            uniqueTimes.add(timeKey);
            
            if (i < 5) { // Show first 5 for detail
                console.log(`  ${i + 1}. UTC: ${utcTime.toISOString()}`);
                console.log(`     JST: ${jstTime.toISOString()}`);
                console.log(`     Hotel: ${row.hotel_id}, Action: ${row.action}`);
                console.log('');
            }
        });
        
        console.log(`Unique timestamps: ${uniqueTimes.size}`);
        console.log('Unique times (JST):');
        [...uniqueTimes].sort().forEach((time, i) => {
            const count = yamamoto_Result.rows.filter(row => {
                const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                return jstTime.toISOString().substring(0, 19) === time;
            }).length;
            console.log(`  ${i + 1}. ${time} JST (${count} logs)`);
        });
        
        // Now let's check what's in the exact UTC timeframes
        console.log('\n2. CHECKING EXACT UTC TIMEFRAMES:');
        
        const exactTimes = [
            { name: '11:04:36 JST', utc_start: '2026-01-16 02:04:36', utc_end: '2026-01-16 02:04:37' },
            { name: '11:05:07 JST', utc_start: '2026-01-16 02:05:07', utc_end: '2026-01-16 02:05:08' }
        ];
        
        for (const timeframe of exactTimes) {
            console.log(`\nChecking ${timeframe.name} (${timeframe.utc_start} UTC):`);
            
            const exactQuery = `
                SELECT 
                    lr.id,
                    lr.log_time,
                    lr.action,
                    lr.table_name,
                    lr.changes->>'hotel_id' as hotel_id,
                    lr.changes->>'reservation_client_id' as client_id
                FROM logs_reservation lr
                WHERE 
                    lr.log_time >= $1::timestamp
                    AND lr.log_time < $2::timestamp
                    AND lr.table_name LIKE 'reservations_%'
                ORDER BY lr.log_time ASC
            `;
            
            const exactResult = await client.query(exactQuery, [timeframe.utc_start, timeframe.utc_end]);
            console.log(`  Found ${exactResult.rows.length} logs in this exact second`);
            
            exactResult.rows.forEach((row, i) => {
                const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                console.log(`    ${i + 1}. ${jstTime.toISOString()} JST - Hotel ${row.hotel_id} - ${row.action}`);
            });
        }
        
        // Check broader 10-minute window with millisecond precision
        console.log('\n3. CHECKING 11:00-11:10 JST WITH MILLISECOND PRECISION:');
        
        const broadQuery = `
            SELECT 
                lr.id,
                lr.log_time,
                lr.action,
                lr.table_name,
                lr.changes->>'hotel_id' as hotel_id,
                EXTRACT(EPOCH FROM lr.log_time) as epoch_time
            FROM logs_reservation lr
            WHERE 
                lr.log_time >= '2026-01-16 02:00:00'::timestamp
                AND lr.log_time < '2026-01-16 02:10:00'::timestamp
                AND lr.table_name LIKE 'reservations_%'
            ORDER BY lr.log_time ASC
        `;
        
        const broadResult = await client.query(broadQuery);
        console.log(`Found ${broadResult.rows.length} logs in 11:00-11:10 JST window (02:00-02:10 UTC)`);
        
        if (broadResult.rows.length > 0) {
            console.log('All logs in this window:');
            broadResult.rows.forEach((row, i) => {
                const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                console.log(`  ${i + 1}. ${jstTime.toISOString()} JST - Hotel ${row.hotel_id} - ${row.action}`);
                console.log(`     UTC: ${row.log_time.toISOString()}`);
                console.log(`     Epoch: ${row.epoch_time}`);
            });
        }
        
        // Final check: look for logs in a wider window around the target times
        console.log('\n4. WIDER WINDOW CHECK (10:50-11:20 JST):');
        
        const wideQuery = `
            SELECT 
                COUNT(*) as total_logs,
                MIN(lr.log_time) as first_log,
                MAX(lr.log_time) as last_log
            FROM logs_reservation lr
            WHERE 
                lr.log_time >= '2026-01-16 01:50:00'::timestamp
                AND lr.log_time < '2026-01-16 02:20:00'::timestamp
                AND lr.table_name LIKE 'reservations_%'
        `;
        
        const wideResult = await client.query(wideQuery);
        console.log('Wider window results:', wideResult.rows[0]);
        
        if (parseInt(wideResult.rows[0].total_logs) > 0) {
            const sampleQuery = `
                SELECT 
                    lr.id,
                    lr.log_time,
                    lr.action,
                    lr.changes->>'hotel_id' as hotel_id
                FROM logs_reservation lr
                WHERE 
                    lr.log_time >= '2026-01-16 01:50:00'::timestamp
                    AND lr.log_time < '2026-01-16 02:20:00'::timestamp
                    AND lr.table_name LIKE 'reservations_%'
                ORDER BY lr.log_time ASC
                LIMIT 10
            `;
            
            const sampleResult = await client.query(sampleQuery);
            console.log('\nFirst 10 logs in wider window:');
            sampleResult.rows.forEach((row, i) => {
                const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                console.log(`  ${i + 1}. ${jstTime.toISOString()} JST - Hotel ${row.hotel_id} - ${row.action}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

// Run the debug
debugExactTimes().then(() => {
    console.log('\n✅ Exact times debug completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Debug error:', error);
    process.exit(1);
});