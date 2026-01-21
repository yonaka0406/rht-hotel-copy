/**
 * Check OTA request 42259960 details
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Checking OTA request 42259960...');
    
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                hotel_id,
                created_at,
                current_request_id,
                service_name,
                status,
                xml_body
            FROM ota_xml_queue 
            WHERE current_request_id = '42259960'
        `);
        
        if (result.rows.length > 0) {
            const ota = result.rows[0];
            console.log(`OTA Request 42259960:`);
            console.log(`  Hotel ID: ${ota.hotel_id}`);
            console.log(`  Created: ${ota.created_at.toISOString()}`);
            console.log(`  Service: ${ota.service_name}`);
            console.log(`  Status: ${ota.status}`);
            
            // Check if XML contains date 20260203
            if (ota.xml_body) {
                const hasDate20260203 = ota.xml_body.includes('20260203');
                console.log(`  Contains date 20260203: ${hasDate20260203}`);
                
                // Look for date patterns in XML
                const dateMatches = ota.xml_body.match(/202[0-9]{5}/g);
                if (dateMatches) {
                    const uniqueDates = [...new Set(dateMatches)];
                    console.log(`  Dates found in XML: ${uniqueDates.join(', ')}`);
                }
                
                // Show first few lines of XML for context
                const xmlLines = ota.xml_body.split('\n').slice(0, 20);
                console.log('\n  XML Preview:');
                xmlLines.forEach((line, i) => {
                    if (line.trim()) {
                        console.log(`    ${i + 1}: ${line.trim()}`);
                    }
                });
            }
        } else {
            console.log('OTA request 42259960 not found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();