/**
 * Detailed gap analysis for 山本塗装店 reservations
 */

require('dotenv').config();
const { pool } = require('./config/database');

async function main() {
    console.log('🔍 Detailed Gap Analysis...');
    
    const client = await pool.connect();
    try {
        const hotelId = 25;
        
        // Get the exact reservation times
        const reservationTimes = [
            '2026-01-16T02:04:36.187Z',
            '2026-01-16T02:05:07.301Z'
        ];
        
        console.log('Reservation times:');
        reservationTimes.forEach((time, i) => {
            const jst = new Date(new Date(time).getTime() + (9 * 60 * 60 * 1000));
            console.log(`  ${i + 1}. ${time} (JST: ${jst.toISOString()})`);
        });
        
        // Check OTA requests around each reservation time
        for (const reservationTime of reservationTimes) {
            console.log(`\n🔍 Checking OTA requests after ${reservationTime}:`);
            
            const result = await client.query(`
                SELECT 
                    created_at,
                    current_request_id,
                    service_name,
                    status,
                    EXTRACT(EPOCH FROM (created_at - $2::timestamp)) as seconds_gap
                FROM ota_xml_queue 
                WHERE 
                    hotel_id = $1
                    AND created_at > $2::timestamp
                    AND created_at <= $2::timestamp + interval '10 minutes'
                    AND service_name LIKE '%Stock%'
                ORDER BY created_at ASC
                LIMIT 3
            `, [hotelId, reservationTime]);
            
            if (result.rows.length > 0) {
                result.rows.forEach(r => {
                    const jst = new Date(r.created_at.getTime() + (9 * 60 * 60 * 1000));
                    const minutes = Math.round(r.seconds_gap / 60 * 100) / 100;
                    console.log(`    ${r.created_at.toISOString()} (JST: ${jst.toISOString()}) - ID: ${r.current_request_id} - Gap: ${minutes} min`);
                });
            } else {
                console.log('    ❌ No OTA requests found');
            }
        }
        
        // Check what the OTA request ID 42259960 contains
        console.log('\n🔍 Analyzing OTA request 42259960:');
        const otaDetails = await client.query(`
            SELECT 
                created_at,
                current_request_id,
                service_name,
                status,
                request_xml,
                response_xml
            FROM ota_xml_queue 
            WHERE current_request_id = '42259960'
        `);
        
        if (otaDetails.rows.length > 0) {
            const ota = otaDetails.rows[0];
            const jst = new Date(ota.created_at.getTime() + (9 * 60 * 60 * 1000));
            console.log(`  Time: ${ota.created_at.toISOString()} (JST: ${jst.toISOString()})`);
            console.log(`  Service: ${ota.service_name}`);
            console.log(`  Status: ${ota.status}`);
            
            // Check if this request includes rooms 205/206
            if (ota.request_xml) {
                const hasRoom205 = ota.request_xml.includes('205');
                const hasRoom206 = ota.request_xml.includes('206');
                console.log(`  Contains Room 205: ${hasRoom205}`);
                console.log(`  Contains Room 206: ${hasRoom206}`);
                
                if (hasRoom205 || hasRoom206) {
                    console.log('  ✅ This OTA request likely includes the 山本塗装店 reservations!');
                } else {
                    console.log('  ❌ This OTA request does not include rooms 205/206');
                }
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();