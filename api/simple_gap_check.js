/**
 * Simple gap check for the 山本塗装店 reservations
 */

require('dotenv').config();
const { pool } = require('./config/database');

async function main() {
    console.log('🔍 Simple Gap Check...');
    
    const client = await pool.connect();
    try {
        const hotelId = 25;
        
        // 1. Find 山本塗装店 reservations on 2026-01-16
        console.log('\n1. Finding 山本塗装店 reservations...');
        
        const reservations = await client.query(`
            SELECT 
                lr.log_time,
                lr.action,
                lr.changes->>'date' as reservation_date,
                r.room_number,
                COALESCE(c.name_kanji, c.name_kana, c.name) as guest_name
            FROM logs_reservation lr
            LEFT JOIN rooms r ON (lr.changes->>'room_id')::integer = r.id
            LEFT JOIN reservations res ON (lr.changes->>'reservation_id')::uuid = res.id
            LEFT JOIN clients c ON res.reservation_client_id = c.id
            WHERE 
                lr.table_name = $1
                AND lr.action = 'INSERT'
                AND DATE(lr.log_time) = '2026-01-16'
                AND COALESCE(c.name_kanji, c.name_kana, c.name) ILIKE '%山本塗装%'
            ORDER BY lr.log_time ASC
        `, [`reservation_details_${hotelId}`]);
        
        console.log(`Found ${reservations.rows.length} reservations:`);
        reservations.rows.forEach(r => {
            const jst = new Date(r.log_time.getTime() + (9 * 60 * 60 * 1000));
            console.log(`  ${r.log_time.toISOString()} (JST: ${jst.toISOString()}) - Room ${r.room_number}`);
        });
        
        // 2. Check OTA requests around those times
        console.log('\n2. Checking OTA requests...');
        
        for (const reservation of reservations.rows) {
            const reservationTime = reservation.log_time;
            const jstTime = new Date(reservationTime.getTime() + (9 * 60 * 60 * 1000));
            
            console.log(`\nReservation: ${jstTime.toISOString()} JST`);
            
            // Look for OTA requests within 10 minutes after
            const otaResult = await client.query(`
                SELECT 
                    created_at,
                    current_request_id,
                    status,
                    EXTRACT(EPOCH FROM (created_at - $2::timestamp))/60 as minutes_gap
                FROM ota_xml_queue 
                WHERE 
                    hotel_id = $1
                    AND created_at > $2::timestamp
                    AND created_at <= $2::timestamp + interval '10 minutes'
                    AND service_name LIKE '%Stock%'
                ORDER BY created_at ASC
                LIMIT 1
            `, [hotelId, reservationTime]);
            
            if (otaResult.rows.length > 0) {
                const ota = otaResult.rows[0];
                const otaJST = new Date(ota.created_at.getTime() + (9 * 60 * 60 * 1000));
                console.log(`  Next OTA: ${otaJST.toISOString()} JST (+${Math.round(ota.minutes_gap)} min) - ID: ${ota.current_request_id}`);
                
                if (ota.minutes_gap > 5) {
                    console.log(`  🚨 GAP: ${Math.round(ota.minutes_gap)} minutes (expected ≤5)`);
                } else {
                    console.log(`  ✅ OK: ${Math.round(ota.minutes_gap)} minutes`);
                }
            } else {
                console.log(`  ❌ NO OTA request found within 10 minutes`);
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();