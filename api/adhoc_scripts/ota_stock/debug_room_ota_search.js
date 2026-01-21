/**
 * Search for OTA requests that include rooms 205/206 around the reservation time
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Searching for OTA requests with rooms 205/206...');
    
    const client = await pool.connect();
    try {
        const hotelId = 25;
        
        // Search for OTA requests around 2026-01-16 that contain rooms 205 or 206
        const result = await client.query(`
            SELECT 
                created_at,
                current_request_id,
                service_name,
                status,
                CASE 
                    WHEN xml_body LIKE '%205%' THEN true 
                    ELSE false 
                END as has_room_205,
                CASE 
                    WHEN xml_body LIKE '%206%' THEN true 
                    ELSE false 
                END as has_room_206
            FROM ota_xml_queue 
            WHERE 
                hotel_id = $1
                AND created_at >= '2026-01-16 00:00:00'::timestamp
                AND created_at <= '2026-01-17 00:00:00'::timestamp
                AND service_name LIKE '%Stock%'
                AND (xml_body LIKE '%205%' OR xml_body LIKE '%206%')
            ORDER BY created_at ASC
        `, [hotelId]);
        
        console.log(`Found ${result.rows.length} OTA requests containing rooms 205/206:`);
        
        if (result.rows.length === 0) {
            console.log('❌ No OTA requests found with rooms 205/206 on 2026-01-16');
            
            // Check if there were any stock requests at all after the reservations
            console.log('\n🔍 Checking all stock requests after reservations...');
            
            const allStock = await client.query(`
                SELECT 
                    created_at,
                    current_request_id,
                    service_name,
                    status,
                    EXTRACT(EPOCH FROM (created_at - '2026-01-16 02:04:36'::timestamp))/60 as minutes_from_first_reservation
                FROM ota_xml_queue 
                WHERE 
                    hotel_id = $1
                    AND created_at > '2026-01-16 02:04:36'::timestamp
                    AND created_at <= '2026-01-16 12:00:00'::timestamp
                    AND service_name LIKE '%Stock%'
                ORDER BY created_at ASC
                LIMIT 10
            `, [hotelId]);
            
            console.log(`Found ${allStock.rows.length} stock requests after reservations:`);
            allStock.rows.forEach(r => {
                const jst = new Date(r.created_at.getTime() + (9 * 60 * 60 * 1000));
                console.log(`  ${r.created_at.toISOString()} (JST: ${jst.toISOString()}) - ID: ${r.current_request_id} - Gap: ${Math.round(r.minutes_from_first_reservation)} min`);
            });
            
        } else {
            result.rows.forEach(r => {
                const jst = new Date(r.created_at.getTime() + (9 * 60 * 60 * 1000));
                console.log(`  ${r.created_at.toISOString()} (JST: ${jst.toISOString()}) - ID: ${r.current_request_id} - 205: ${r.has_room_205}, 206: ${r.has_room_206}`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();