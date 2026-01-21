/**
 * Analyze 山本塗装店 reservation logs to understand what changes were made
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Analyzing 山本塗装店 reservation logs...');
    
    const client = await pool.connect();
    try {
        const hotelId = 25;
        
        // Get all logs for 山本塗装店 reservations on 2026-01-16
        const result = await client.query(`
            SELECT 
                lr.log_time,
                lr.action,
                lr.table_name,
                lr.changes,
                r.room_number,
                COALESCE(c.name_kanji, c.name_kana, c.name) as guest_name
            FROM logs_reservation lr
            LEFT JOIN rooms r ON (lr.changes->>'room_id')::integer = r.id
            LEFT JOIN reservations res ON (lr.changes->>'reservation_id')::uuid = res.id
            LEFT JOIN clients c ON res.reservation_client_id = c.id
            WHERE 
                lr.table_name = $1
                AND DATE(lr.log_time) = '2026-01-16'
                AND COALESCE(c.name_kanji, c.name_kana, c.name) ILIKE '%山本塗装%'
            ORDER BY lr.log_time ASC, lr.id ASC
        `, [`reservation_details_${hotelId}`]);
        
        console.log(`Found ${result.rows.length} log entries for 山本塗装店:`);
        
        result.rows.forEach((log, i) => {
            const jst = new Date(log.log_time.getTime() + (9 * 60 * 60 * 1000));
            console.log(`\n${i + 1}. ${log.action} - ${jst.toISOString()} JST`);
            console.log(`   Room: ${log.room_number}`);
            console.log(`   Guest: ${log.guest_name}`);
            console.log(`   Changes:`, JSON.stringify(log.changes, null, 2));
        });
        
        // Also check if there are any logs in the main reservations table
        console.log('\n🔍 Checking main reservations table logs...');
        
        const mainReservationLogs = await client.query(`
            SELECT 
                lr.log_time,
                lr.action,
                lr.table_name,
                lr.changes,
                COALESCE(c.name_kanji, c.name_kana, c.name) as guest_name
            FROM logs_reservation lr
            LEFT JOIN clients c ON (lr.changes->>'reservation_client_id')::uuid = c.id
            WHERE 
                lr.table_name = $1
                AND DATE(lr.log_time) = '2026-01-16'
                AND COALESCE(c.name_kanji, c.name_kana, c.name) ILIKE '%山本塗装%'
            ORDER BY lr.log_time ASC
        `, [`reservations_${hotelId}`]);
        
        console.log(`Found ${mainReservationLogs.rows.length} main reservation log entries:`);
        
        mainReservationLogs.rows.forEach((log, i) => {
            const jst = new Date(log.log_time.getTime() + (9 * 60 * 60 * 1000));
            console.log(`\n${i + 1}. ${log.action} - ${jst.toISOString()} JST`);
            console.log(`   Guest: ${log.guest_name}`);
            console.log(`   Changes:`, JSON.stringify(log.changes, null, 2));
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();