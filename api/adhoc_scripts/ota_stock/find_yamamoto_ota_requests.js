/**
 * Search for OTA requests that actually contain 山本塗装店 reservation dates
 * Look for any OTA requests containing 2026-02-02, 2026-02-03, 2026-02-04, 2026-02-05
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function findYamamotoOTARequests() {
    console.log('🔍 Searching for OTA Requests Containing 山本塗装店 Reservation Dates');
    console.log('================================================================\n');
    
    const client = await pool.connect();
    try {
        // 1. Get all 山本塗装店 reservation dates from the logs
        console.log('1. GETTING 山本塗装店 RESERVATION DATES:');
        
        const reservationDatesQuery = `
            SELECT DISTINCT
                lr.changes->>'date' as reservation_date,
                lr.changes->>'room_id' as room_id,
                r.room_number,
                COUNT(*) as log_count
            FROM logs_reservation lr
            LEFT JOIN reservations res ON (lr.changes->>'reservation_id')::uuid = res.id
            LEFT JOIN clients c ON res.reservation_client_id = c.id
            LEFT JOIN rooms r ON (lr.changes->>'room_id')::int = r.id
            WHERE 
                lr.log_time >= '2026-01-16 02:04:00'::timestamp
                AND lr.log_time <= '2026-01-16 02:06:00'::timestamp
                AND lr.table_name LIKE 'reservation_details_%'
                AND lr.action = 'INSERT'
                AND (
                    c.name_kanji LIKE '%山本%' OR
                    c.name_kana LIKE '%山本%' OR
                    c.name LIKE '%山本%'
                )
            GROUP BY lr.changes->>'date', lr.changes->>'room_id', r.room_number
            ORDER BY lr.changes->>'date', r.room_number
        `;
        
        const datesResult = await client.query(reservationDatesQuery);
        console.log(`   Found ${datesResult.rows.length} unique reservation date/room combinations`);
        
        if (datesResult.rows.length === 0) {
            console.log('   ❌ No 山本塗装店 reservation details found');
            return;
        }
        
        const targetDates = [];
        datesResult.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. Date: ${row.reservation_date}, Room: ${row.room_number} (${row.log_count} logs)`);
            if (!targetDates.includes(row.reservation_date)) {
                targetDates.push(row.reservation_date);
            }
        });
        
        console.log(`\n   Target dates to search for: ${targetDates.join(', ')}`);
        
        // 2. Search for OTA requests containing these dates
        console.log('\n2. SEARCHING FOR OTA REQUESTS CONTAINING TARGET DATES:');
        
        const datePatterns = [];
        targetDates.forEach(date => {
            datePatterns.push(date);                    // YYYY-MM-DD
            datePatterns.push(date.replace(/-/g, ''));  // YYYYMMDD
            datePatterns.push(date.replace(/-/g, '/'));  // YYYY/MM/DD
        });
        
        console.log(`   Searching for patterns: ${datePatterns.join(', ')}`);
        
        const foundRequests = [];
        
        // Search each pattern
        for (const pattern of datePatterns) {
            console.log(`\n   Searching for pattern: ${pattern}`);
            
            const searchQuery = `
                SELECT 
                    id,
                    hotel_id,
                    service_name,
                    current_request_id,
                    status,
                    created_at,
                    processed_at,
                    LENGTH(xml_body) as xml_length
                FROM ota_xml_queue 
                WHERE 
                    hotel_id = 25
                    AND xml_body LIKE $1
                    AND created_at >= '2026-01-16 00:00:00'::timestamp
                    AND created_at <= '2026-01-17 00:00:00'::timestamp
                ORDER BY created_at ASC
            `;
            
            const searchResult = await client.query(searchQuery, [`%${pattern}%`]);
            
            if (searchResult.rows.length > 0) {
                console.log(`      ✅ Found ${searchResult.rows.length} requests containing "${pattern}"`);
                
                searchResult.rows.forEach((row, i) => {
                    const createdJST = new Date(row.created_at.getTime() + (9 * 60 * 60 * 1000));
                    console.log(`         ${i + 1}. ${createdJST.toISOString().replace('T', ' ').substring(0, 19)} JST - ${row.current_request_id}`);
                    console.log(`            Service: ${row.service_name}, Status: ${row.status}`);
                    
                    // Add to found requests if not already there
                    if (!foundRequests.some(req => req.id === row.id)) {
                        foundRequests.push({
                            ...row,
                            found_pattern: pattern
                        });
                    }
                });
            } else {
                console.log(`      ❌ No requests found containing "${pattern}"`);
            }
        }
        
        // 3. Analyze found requests in detail
        if (foundRequests.length > 0) {
            console.log(`\n3. DETAILED ANALYSIS OF ${foundRequests.length} FOUND REQUESTS:`);
            
            for (const request of foundRequests) {
                console.log(`\n   Request ID: ${request.current_request_id}`);
                console.log(`   Queue ID: ${request.id}`);
                console.log(`   Hotel: ${request.hotel_id}`);
                console.log(`   Service: ${request.service_name}`);
                console.log(`   Status: ${request.status}`);
                
                const createdJST = new Date(request.created_at.getTime() + (9 * 60 * 60 * 1000));
                const processedJST = request.processed_at ? new Date(request.processed_at.getTime() + (9 * 60 * 60 * 1000)) : null;
                
                console.log(`   Created: ${createdJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
                console.log(`   Processed: ${processedJST ? processedJST.toISOString().replace('T', ' ').substring(0, 19) + ' JST' : 'Not processed'}`);
                console.log(`   Found pattern: ${request.found_pattern}`);
                
                // Calculate time gap from 山本塗装店 reservations
                const reservationTime1 = new Date('2026-01-16T02:04:36.000Z'); // 11:04:36 JST
                const reservationTime2 = new Date('2026-01-16T02:05:07.000Z'); // 11:05:07 JST
                
                const gap1Minutes = Math.round((request.created_at - reservationTime1) / 60000);
                const gap2Minutes = Math.round((request.created_at - reservationTime2) / 60000);
                
                console.log(`   Gap from 11:04:36 JST: ${gap1Minutes} minutes`);
                console.log(`   Gap from 11:05:07 JST: ${gap2Minutes} minutes`);
                
                // Get XML content to verify dates
                const xmlQuery = `SELECT xml_body FROM ota_xml_queue WHERE id = $1`;
                const xmlResult = await client.query(xmlQuery, [request.id]);
                
                if (xmlResult.rows.length > 0) {
                    const xmlBody = xmlResult.rows[0].xml_body;
                    
                    console.log(`   XML analysis:`);
                    targetDates.forEach(date => {
                        const yyyymmdd = date.replace(/-/g, '');
                        const hasDate = xmlBody.includes(date);
                        const hasYYYYMMDD = xmlBody.includes(yyyymmdd);
                        
                        if (hasDate || hasYYYYMMDD) {
                            console.log(`      ✅ Contains ${date} (${hasDate ? 'YYYY-MM-DD' : ''}${hasDate && hasYYYYMMDD ? ' and ' : ''}${hasYYYYMMDD ? 'YYYYMMDD' : ''})`);
                        } else {
                            console.log(`      ❌ Does not contain ${date}`);
                        }
                    });
                    
                    // Check for room numbers
                    const roomNumbers = ['352', '353'];
                    roomNumbers.forEach(roomNum => {
                        if (xmlBody.includes(roomNum)) {
                            console.log(`      ✅ Contains room ${roomNum}`);
                        }
                    });
                }
            }
            
            // 4. Timeline analysis
            console.log('\n4. TIMELINE ANALYSIS:');
            
            const timeline = [
                { time: '2026-01-16T02:04:36.000Z', type: 'RESERVATION', desc: '山本塗装店 batch 1 (15 logs)' },
                { time: '2026-01-16T02:05:07.000Z', type: 'RESERVATION', desc: '山本塗装店 batch 2 (15 logs)' }
            ];
            
            foundRequests.forEach(req => {
                timeline.push({
                    time: req.created_at.toISOString(),
                    type: 'OTA_REQUEST',
                    desc: `${req.current_request_id} (${req.service_name})`
                });
            });
            
            timeline.sort((a, b) => new Date(a.time) - new Date(b.time));
            
            console.log('\n   Chronological timeline:');
            timeline.forEach((event, i) => {
                const jstTime = new Date(event.time).getTime() + (9 * 60 * 60 * 1000);
                const jstStr = new Date(jstTime).toISOString().replace('T', ' ').substring(0, 19);
                const marker = event.type === 'OTA_REQUEST' ? '📡' : '📝';
                
                console.log(`   ${i + 1}. ${jstStr} JST - ${marker} ${event.desc}`);
            });
            
        } else {
            console.log('\n3. NO OTA REQUESTS FOUND:');
            console.log('   ❌ No OTA requests found containing 山本塗装店 reservation dates');
            console.log('   📋 This confirms that NO OTA updates were triggered by the reservations');
        }
        
        // 5. Search for any OTA requests in a wider time window
        console.log('\n5. WIDER TIME WINDOW SEARCH (Jan 16-17):');
        
        const widerSearchQuery = `
            SELECT 
                id,
                service_name,
                current_request_id,
                status,
                created_at,
                LENGTH(xml_body) as xml_length
            FROM ota_xml_queue 
            WHERE 
                hotel_id = 25
                AND created_at >= '2026-01-16 11:00:00'::timestamp + interval '-9 hours'  -- 11:00 JST = 02:00 UTC
                AND created_at <= '2026-01-16 12:00:00'::timestamp + interval '-9 hours'  -- 12:00 JST = 03:00 UTC
            ORDER BY created_at ASC
        `;
        
        const widerResult = await client.query(widerSearchQuery);
        console.log(`   Found ${widerResult.rows.length} OTA requests between 11:00-12:00 JST on Jan 16`);
        
        if (widerResult.rows.length > 0) {
            widerResult.rows.forEach((row, i) => {
                const createdJST = new Date(row.created_at.getTime() + (9 * 60 * 60 * 1000));
                console.log(`   ${i + 1}. ${createdJST.toISOString().replace('T', ' ').substring(0, 19)} JST - ${row.current_request_id}`);
                console.log(`      Service: ${row.service_name}, Status: ${row.status}`);
            });
        }
        
        // 6. Final conclusion
        console.log('\n6. FINAL CONCLUSION:');
        
        if (foundRequests.length > 0) {
            console.log(`   ✅ FOUND ${foundRequests.length} OTA requests containing 山本塗装店 reservation dates`);
            
            // Find the closest one to the reservation times
            const closest = foundRequests.reduce((closest, current) => {
                const reservationTime = new Date('2026-01-16T02:04:36.000Z');
                const currentGap = Math.abs(current.created_at - reservationTime);
                const closestGap = closest ? Math.abs(closest.created_at - reservationTime) : Infinity;
                return currentGap < closestGap ? current : closest;
            }, null);
            
            if (closest) {
                const gapMinutes = Math.round((closest.created_at - new Date('2026-01-16T02:04:36.000Z')) / 60000);
                console.log(`   🎯 CLOSEST MATCH: ${closest.current_request_id} (${gapMinutes} minutes after reservations)`);
                console.log(`   📋 This is likely the OTA request triggered by 山本塗装店 reservations`);
            }
        } else {
            console.log('   ❌ NO OTA REQUESTS FOUND containing 山本塗装店 reservation dates');
            console.log('   📋 This confirms the original problem: NO OTA updates were triggered');
            console.log('   📋 The system failed to send OTA updates for these reservations');
            console.log('   📋 This is a genuine missing trigger case, not a silent skip');
        }
        
    } catch (error) {
        console.error('❌ Search failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

// Run the search
findYamamotoOTARequests().then(() => {
    console.log('\n✅ 山本塗装店 OTA request search completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Search error:', error);
    process.exit(1);
});