/**
 * Check OTA request content for ID 42259960
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Checking OTA request 42259960 content...');
    
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                created_at,
                current_request_id,
                service_name,
                status,
                xml_body,
                last_error
            FROM ota_xml_queue 
            WHERE current_request_id = '42259960'
        `);
        
        if (result.rows.length > 0) {
            const ota = result.rows[0];
            const jst = new Date(ota.created_at.getTime() + (9 * 60 * 60 * 1000));
            
            console.log(`Time: ${ota.created_at.toISOString()} (JST: ${jst.toISOString()})`);
            console.log(`Service: ${ota.service_name}`);
            console.log(`Status: ${ota.status}`);
            
            if (ota.xml_body) {
                const hasRoom205 = ota.xml_body.includes('205');
                const hasRoom206 = ota.xml_body.includes('206');
                console.log(`Contains Room 205: ${hasRoom205}`);
                console.log(`Contains Room 206: ${hasRoom206}`);
                
                if (hasRoom205 || hasRoom206) {
                    console.log('✅ This OTA request includes rooms 205/206!');
                    
                    // Show relevant parts of XML
                    const lines = ota.xml_body.split('\n');
                    const relevantLines = lines.filter(line => 
                        line.includes('205') || line.includes('206') || 
                        line.includes('<RoomType') || line.includes('<Inventory')
                    );
                    
                    if (relevantLines.length > 0) {
                        console.log('\nRelevant XML content:');
                        relevantLines.slice(0, 10).forEach(line => {
                            console.log(`  ${line.trim()}`);
                        });
                    }
                } else {
                    console.log('❌ This OTA request does not include rooms 205/206');
                }
            } else {
                console.log('No XML body found');
            }
            
            if (ota.last_error) {
                console.log(`Last Error: ${ota.last_error}`);
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