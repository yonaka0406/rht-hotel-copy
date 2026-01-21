/**
 * Debug OTA timeline around 2026-01-16
 */

require('dotenv').config();
const { pool } = require('./config/database');

async function main() {
    console.log('🔍 Checking OTA timeline around 2026-01-16...');
    
    const client = await pool.connect();
    try {
        const hotelId = 25;
        
        // Check OTA requests on 2026-01-16
        const result = await client.query(`
            SELECT 
                created_at,
                current_request_id,
                service_name,
                status,
                EXTRACT(EPOCH FROM (created_at - '2026-01-16 02:04:36'::timestamp))/60 as minutes_from_reservation
            FROM ota_xml_queue 
            WHERE 
                hotel_id = $1
                AND created_at >= '2026-01-16 00:00:00'::timestamp
                AND created_at <= '2026-01-17 00:00:00'::timestamp
                AND service_name LIKE '%Stock%'
            ORDER BY created_at ASC
        `, [hotelId]);
        
        console.log(`Found ${result.rows.length} OTA stock requests on 2026-01-16:`);
        result.rows.forEach(r => {
            const jst = new Date(r.created_at.getTime() + (9 * 60 * 60 * 1000));
            console.log(`  ${r.created_at.toISOString()} (JST: ${jst.toISOString()}) - ID: ${r.current_request_id} - Gap: ${Math.round(r.minutes_from_reservation)} min`);
        });
        
        // Check what triggered OTA requests before and after
        console.log('\n🔍 Checking broader timeline (2026-01-15 to 2026-01-17)...');
        
        const broader = await client.query(`
            SELECT 
                created_at,
                current_request_id,
                service_name,
                status
            FROM ota_xml_queue 
            WHERE 
                hotel_id = $1
                AND created_at >= '2026-01-15 00:00:00'::timestamp
                AND created_at <= '2026-01-17 23:59:59'::timestamp
                AND service_name LIKE '%Stock%'
            ORDER BY created_at ASC
        `, [hotelId]);
        
        console.log(`Found ${broader.rows.length} OTA stock requests in broader timeline:`);
        broader.rows.forEach(r => {
            const jst = new Date(r.created_at.getTime() + (9 * 60 * 60 * 1000));
            console.log(`  ${r.created_at.toISOString()} (JST: ${jst.toISOString()}) - ID: ${r.current_request_id}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();