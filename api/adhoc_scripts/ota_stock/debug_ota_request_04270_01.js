/**
 * Investigation of OTA Request ID 04270.01 from January 16th
 * This request was sent at 09:47:30 JST but not detected by our monitoring
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function investigateOTARequest04270() {
    console.log('🔍 Investigating OTA Request ID 04270.01 - January 16th');
    console.log('=====================================================\n');
    
    const client = await pool.connect();
    try {
        // 1. Search for request ID 04270.01 in ota_xml_queue
        console.log('1. SEARCHING FOR REQUEST ID 04270.01 IN OTA_XML_QUEUE:');
        
        const requestQuery = `
            SELECT 
                id,
                hotel_id,
                service_name,
                xml_body,
                current_request_id,
                status,
                retries,
                last_error,
                created_at,
                processed_at,
                EXTRACT(EPOCH FROM (processed_at - created_at)) as processing_seconds
            FROM ota_xml_queue 
            WHERE current_request_id = '04270.01'
            ORDER BY created_at DESC
        `;
        
        const requestResult = await client.query(requestQuery);
        console.log(`   Found ${requestResult.rows.length} entries with request ID 04270.01`);
        
        if (requestResult.rows.length > 0) {
            requestResult.rows.forEach((row, i) => {
                const createdJST = new Date(row.created_at.getTime() + (9 * 60 * 60 * 1000));
                const processedJST = row.processed_at ? new Date(row.processed_at.getTime() + (9 * 60 * 60 * 1000)) : null;
                
                console.log(`\n   Entry ${i + 1}:`);
                console.log(`     Queue ID: ${row.id}`);
                console.log(`     Hotel ID: ${row.hotel_id}`);
                console.log(`     Service: ${row.service_name}`);
                console.log(`     Status: ${row.status}`);
                console.log(`     Created: ${createdJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
                console.log(`     Processed: ${processedJST ? processedJST.toISOString().replace('T', ' ').substring(0, 19) + ' JST' : 'Not processed'}`);
                console.log(`     Processing time: ${row.processing_seconds ? Math.round(row.processing_seconds) + 's' : 'N/A'}`);
                console.log(`     Retries: ${row.retries}`);
                if (row.last_error) {
                    console.log(`     Last error: ${row.last_error}`);
                }
            });
        } else {
            console.log('   ❌ No entries found with request ID 04270.01');
        }
        
        // 2. Search for any OTA requests around 09:47:30 JST (00:47:30 UTC)
        console.log('\n2. SEARCHING FOR OTA REQUESTS AROUND 09:47:30 JST:');
        
        const timeWindowQuery = `
            SELECT 
                id,
                hotel_id,
                service_name,
                current_request_id,
                status,
                created_at,
                processed_at
            FROM ota_xml_queue 
            WHERE 
                created_at >= '2026-01-16 00:40:00'::timestamp
                AND created_at <= '2026-01-16 00:55:00'::timestamp
            ORDER BY created_at ASC
        `;
        
        const timeWindowResult = await client.query(timeWindowQuery);
        console.log(`   Found ${timeWindowResult.rows.length} OTA requests between 09:40-09:55 JST`);
        
        if (timeWindowResult.rows.length > 0) {
            timeWindowResult.rows.forEach((row, i) => {
                const createdJST = new Date(row.created_at.getTime() + (9 * 60 * 60 * 1000));
                const isTarget = row.current_request_id === '04270.01';
                const marker = isTarget ? ' ⭐ TARGET REQUEST' : '';
                
                console.log(`   ${i + 1}. ${createdJST.toISOString().replace('T', ' ').substring(0, 19)} JST - Hotel ${row.hotel_id} - ${row.current_request_id}${marker}`);
                console.log(`      Service: ${row.service_name}, Status: ${row.status}`);
            });
        }
        
        // 3. Check if there are any requests with similar patterns
        console.log('\n3. SEARCHING FOR SIMILAR REQUEST ID PATTERNS:');
        
        const patternQuery = `
            SELECT 
                current_request_id,
                COUNT(*) as count,
                MIN(created_at) as first_seen,
                MAX(created_at) as last_seen,
                array_agg(DISTINCT hotel_id) as hotels,
                array_agg(DISTINCT service_name) as services
            FROM ota_xml_queue 
            WHERE 
                current_request_id LIKE '04270%'
                OR current_request_id LIKE '%04270%'
            GROUP BY current_request_id
            ORDER BY first_seen DESC
            LIMIT 10
        `;
        
        const patternResult = await client.query(patternQuery);
        console.log(`   Found ${patternResult.rows.length} request IDs with pattern '04270'`);
        
        if (patternResult.rows.length > 0) {
            patternResult.rows.forEach((row, i) => {
                const firstJST = new Date(row.first_seen.getTime() + (9 * 60 * 60 * 1000));
                const lastJST = new Date(row.last_seen.getTime() + (9 * 60 * 60 * 1000));
                const isTarget = row.current_request_id === '04270.01';
                const marker = isTarget ? ' ⭐ TARGET' : '';
                
                console.log(`   ${i + 1}. ${row.current_request_id}${marker}: ${row.count} requests`);
                console.log(`      Hotels: ${row.hotels.join(', ')}`);
                console.log(`      Services: ${row.services.join(', ')}`);
                console.log(`      First: ${firstJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
                console.log(`      Last:  ${lastJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
            });
        }
        
        // 4. Search for the other request ID mentioned: 42663500
        console.log('\n4. SEARCHING FOR REQUEST ID 42663500:');
        
        const request2Query = `
            SELECT 
                id,
                hotel_id,
                service_name,
                current_request_id,
                status,
                created_at,
                processed_at
            FROM ota_xml_queue 
            WHERE current_request_id = '42663500'
            ORDER BY created_at DESC
        `;
        
        const request2Result = await client.query(request2Query);
        console.log(`   Found ${request2Result.rows.length} entries with request ID 42663500`);
        
        if (request2Result.rows.length > 0) {
            request2Result.rows.forEach((row, i) => {
                const createdJST = new Date(row.created_at.getTime() + (9 * 60 * 60 * 1000));
                const processedJST = row.processed_at ? new Date(row.processed_at.getTime() + (9 * 60 * 60 * 1000)) : null;
                
                console.log(`   Entry ${i + 1}:`);
                console.log(`     Queue ID: ${row.id}`);
                console.log(`     Hotel ID: ${row.hotel_id}`);
                console.log(`     Service: ${row.service_name}`);
                console.log(`     Status: ${row.status}`);
                console.log(`     Created: ${createdJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
                console.log(`     Processed: ${processedJST ? processedJST.toISOString().replace('T', ' ').substring(0, 19) + ' JST' : 'Not processed'}`);
            });
        }
        
        // 5. Check for any OTA requests for Hotel 25 on January 16th
        console.log('\n5. ALL OTA REQUESTS FOR HOTEL 25 ON JANUARY 16TH:');
        
        const hotel25Query = `
            SELECT 
                id,
                service_name,
                current_request_id,
                status,
                created_at,
                processed_at,
                retries,
                last_error
            FROM ota_xml_queue 
            WHERE 
                hotel_id = 25
                AND created_at >= '2026-01-16 00:00:00'::timestamp
                AND created_at < '2026-01-17 00:00:00'::timestamp
            ORDER BY created_at ASC
        `;
        
        const hotel25Result = await client.query(hotel25Query);
        console.log(`   Found ${hotel25Result.rows.length} OTA requests for Hotel 25 on Jan 16th`);
        
        if (hotel25Result.rows.length > 0) {
            hotel25Result.rows.forEach((row, i) => {
                const createdJST = new Date(row.created_at.getTime() + (9 * 60 * 60 * 1000));
                const processedJST = row.processed_at ? new Date(row.processed_at.getTime() + (9 * 60 * 60 * 1000)) : null;
                const isTarget = row.current_request_id === '04270.01' || row.current_request_id === '42663500';
                const marker = isTarget ? ' ⭐ MENTIONED IN LOGS' : '';
                
                console.log(`   ${i + 1}. ${createdJST.toISOString().replace('T', ' ').substring(0, 19)} JST - ${row.current_request_id}${marker}`);
                console.log(`      Service: ${row.service_name}`);
                console.log(`      Status: ${row.status}`);
                if (processedJST) {
                    console.log(`      Processed: ${processedJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
                }
                if (row.retries > 0) {
                    console.log(`      Retries: ${row.retries}`);
                }
                if (row.last_error) {
                    console.log(`      Error: ${row.last_error.substring(0, 100)}...`);
                }
            });
        }
        
        // 6. Timeline analysis: Compare OTA requests with reservation logs
        console.log('\n6. TIMELINE ANALYSIS - OTA REQUESTS vs RESERVATION LOGS:');
        
        // Get 山本塗装店 reservation logs from Jan 16th
        const yamamoto_LogsQuery = `
            SELECT 
                lr.id,
                lr.log_time,
                lr.action,
                lr.table_name
            FROM logs_reservation lr
            LEFT JOIN reservations r ON (lr.changes->>'reservation_client_id')::uuid = r.reservation_client_id
            LEFT JOIN clients c ON r.reservation_client_id = c.id
            WHERE 
                lr.log_time >= '2026-01-16 00:00:00'::timestamp
                AND lr.log_time < '2026-01-17 00:00:00'::timestamp
                AND lr.table_name LIKE 'reservations_25'
                AND (
                    c.name_kanji LIKE '%山本%' OR
                    c.name_kana LIKE '%山本%' OR
                    c.name LIKE '%山本%'
                )
            ORDER BY lr.log_time ASC
        `;
        
        const yamamoto_LogsResult = await client.query(yamamoto_LogsQuery);
        
        console.log(`   山本塗装店 reservation logs: ${yamamoto_LogsResult.rows.length}`);
        console.log(`   Hotel 25 OTA requests: ${hotel25Result.rows.length}`);
        
        // Create timeline
        const timeline = [];
        
        yamamoto_LogsResult.rows.forEach(log => {
            timeline.push({
                time: log.log_time,
                type: 'RESERVATION_LOG',
                action: log.action,
                table: log.table_name,
                id: log.id
            });
        });
        
        hotel25Result.rows.forEach(ota => {
            timeline.push({
                time: ota.created_at,
                type: 'OTA_REQUEST',
                service: ota.service_name,
                request_id: ota.current_request_id,
                status: ota.status
            });
        });
        
        timeline.sort((a, b) => new Date(a.time) - new Date(b.time));
        
        console.log('\n   CHRONOLOGICAL TIMELINE:');
        timeline.forEach((event, i) => {
            const jstTime = new Date(event.time.getTime() + (9 * 60 * 60 * 1000));
            const timeStr = jstTime.toISOString().replace('T', ' ').substring(0, 19);
            
            if (event.type === 'RESERVATION_LOG') {
                console.log(`   ${i + 1}. ${timeStr} JST - 📝 ${event.action} (${event.table}) - Log ID: ${event.id}`);
            } else {
                const isTarget = event.request_id === '04270.01' || event.request_id === '42663500';
                const marker = isTarget ? ' ⭐' : '';
                console.log(`   ${i + 1}. ${timeStr} JST - 📡 OTA ${event.service} - ${event.request_id} (${event.status})${marker}`);
            }
        });
        
        // 7. Gap analysis
        console.log('\n7. GAP ANALYSIS:');
        
        const targetTimes = [
            { name: '11:04:36 JST', utc: '2026-01-16 02:04:36' },
            { name: '11:05:07 JST', utc: '2026-01-16 02:05:07' }
        ];
        
        targetTimes.forEach(target => {
            console.log(`\n   Checking ${target.name}:`);
            
            // Find closest OTA request before and after
            const beforeOTA = hotel25Result.rows
                .filter(ota => ota.created_at < target.utc)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                
            const afterOTA = hotel25Result.rows
                .filter(ota => ota.created_at > target.utc)
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
            
            if (beforeOTA) {
                const beforeJST = new Date(beforeOTA.created_at.getTime() + (9 * 60 * 60 * 1000));
                const gapMinutes = Math.round((new Date(target.utc) - beforeOTA.created_at) / 60000);
                console.log(`     Last OTA before: ${beforeJST.toISOString().replace('T', ' ').substring(0, 19)} JST (${gapMinutes} min before)`);
                console.log(`       Request ID: ${beforeOTA.current_request_id}, Service: ${beforeOTA.service_name}`);
            } else {
                console.log(`     No OTA requests before ${target.name}`);
            }
            
            if (afterOTA) {
                const afterJST = new Date(afterOTA.created_at.getTime() + (9 * 60 * 60 * 1000));
                const gapMinutes = Math.round((afterOTA.created_at - new Date(target.utc)) / 60000);
                console.log(`     Next OTA after: ${afterJST.toISOString().replace('T', ' ').substring(0, 19)} JST (${gapMinutes} min after)`);
                console.log(`       Request ID: ${afterOTA.current_request_id}, Service: ${afterOTA.service_name}`);
            } else {
                console.log(`     No OTA requests after ${target.name}`);
            }
        });
        
        // 8. Conclusion
        console.log('\n8. INVESTIGATION CONCLUSION:');
        
        const foundTarget = hotel25Result.rows.some(row => row.current_request_id === '04270.01');
        const foundSecond = hotel25Result.rows.some(row => row.current_request_id === '42663500');
        
        if (foundTarget) {
            console.log('   ✅ FOUND: Request ID 04270.01 exists in ota_xml_queue');
            console.log('   📋 This confirms that an OTA update WAS sent');
            console.log('   📋 Our "silent skip" theory was INCORRECT');
        } else {
            console.log('   ❌ NOT FOUND: Request ID 04270.01 not found in ota_xml_queue');
            console.log('   📋 This suggests the log entry may be from a different system or time');
        }
        
        if (foundSecond) {
            console.log('   ✅ FOUND: Request ID 42663500 also exists');
        } else {
            console.log('   ❌ NOT FOUND: Request ID 42663500 not found');
        }
        
        console.log('\n   🔍 NEXT STEPS:');
        console.log('   1. If requests found: Analyze why our monitoring missed them');
        console.log('   2. If requests not found: Investigate log source and timing');
        console.log('   3. Check if there are multiple OTA systems or databases');
        console.log('   4. Verify the timestamp format and timezone in the log entry');
        
    } catch (error) {
        console.error('❌ Investigation failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

// Run the investigation
investigateOTARequest04270().then(() => {
    console.log('\n✅ OTA Request 04270.01 investigation completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Investigation error:', error);
    process.exit(1);
});