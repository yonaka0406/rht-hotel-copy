/**
 * Comprehensive search for 山本塗装店 OTA requests
 * Use the exact method that found the reservation logs earlier
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function comprehensiveYamamotoOTASearch() {
    console.log('🔍 Comprehensive 山本塗装店 OTA Request Search');
    console.log('==============================================\n');
    
    const client = await pool.connect();
    try {
        // 1. First, get the actual 山本塗装店 reservation details using the method that worked
        console.log('1. GETTING 山本塗装店 RESERVATION DETAILS (VERIFIED METHOD):');
        
        const detailsQuery = `
            SELECT 
                lr.id,
                lr.log_time,
                lr.action,
                lr.table_name,
                lr.changes->>'date' as reservation_date,
                lr.changes->>'room_id' as room_id,
                lr.changes->>'cancelled' as cancelled,
                lr.changes->>'reservation_id' as reservation_id
            FROM logs_reservation lr
            LEFT JOIN reservations r ON (lr.changes->>'reservation_id')::uuid = r.id
            LEFT JOIN clients c ON r.reservation_client_id = c.id
            WHERE 
                lr.log_time >= '2026-01-16 00:00:00'::timestamp
                AND lr.log_time < '2026-01-17 00:00:00'::timestamp
                AND lr.table_name LIKE 'reservation_details_%'
                AND lr.action = 'INSERT'
                AND (
                    c.name_kanji LIKE '%山本%' OR
                    c.name_kana LIKE '%山本%' OR
                    c.name LIKE '%山本%'
                )
            ORDER BY lr.log_time ASC, lr.changes->>'date' ASC
        `;
        
        const detailsResult = await client.query(detailsQuery);
        console.log(`   Found ${detailsResult.rows.length} 山本塗装店 reservation_details INSERT logs`);
        
        if (detailsResult.rows.length === 0) {
            console.log('   ❌ No 山本塗装店 reservation details found with this method either');
            console.log('   📋 Let me try a different approach...');
            
            // Alternative: search by the exact times we know
            const alternativeQuery = `
                SELECT 
                    lr.id,
                    lr.log_time,
                    lr.action,
                    lr.table_name,
                    lr.changes
                FROM logs_reservation lr
                WHERE 
                    (lr.log_time = '2026-01-16 02:04:36.187'::timestamp OR
                     lr.log_time = '2026-01-16 02:05:07.301'::timestamp)
                    AND lr.table_name LIKE 'reservation_details_%'
                    AND lr.action = 'INSERT'
                ORDER BY lr.log_time ASC
            `;
            
            const altResult = await client.query(alternativeQuery);
            console.log(`\n   Alternative search by exact times: ${altResult.rows.length} logs`);
            
            if (altResult.rows.length > 0) {
                console.log('   Found logs at exact times:');
                altResult.rows.forEach((row, i) => {
                    const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
                    console.log(`   ${i + 1}. ${jstTime.toISOString().replace('T', ' ').substring(0, 19)} JST`);
                    console.log(`      Table: ${row.table_name}`);
                    console.log(`      Date: ${row.changes.date}`);
                    console.log(`      Room ID: ${row.changes.room_id}`);
                    console.log(`      Reservation ID: ${row.changes.reservation_id}`);
                });
                
                // Use these dates for OTA search
                const targetDates = [...new Set(altResult.rows.map(row => row.changes.date))];
                console.log(`\n   Target dates found: ${targetDates.join(', ')}`);
                
                // Now search for OTA requests containing these dates
                await searchOTARequestsForDates(client, targetDates);
            } else {
                console.log('   ❌ No logs found even with exact times');
            }
            return;
        }
        
        // Process the found details
        const targetDates = [...new Set(detailsResult.rows.map(row => row.reservation_date))];
        const roomIds = [...new Set(detailsResult.rows.map(row => row.room_id))];
        
        console.log(`\n   Found reservation details:`);
        detailsResult.rows.forEach((row, i) => {
            const jstTime = new Date(row.log_time.getTime() + (9 * 60 * 60 * 1000));
            console.log(`   ${i + 1}. ${jstTime.toISOString().replace('T', ' ').substring(0, 19)} JST`);
            console.log(`      Date: ${row.reservation_date}, Room ID: ${row.room_id}`);
            console.log(`      Cancelled: ${row.cancelled || 'null'}`);
        });
        
        console.log(`\n   Target dates: ${targetDates.join(', ')}`);
        console.log(`   Room IDs: ${roomIds.join(', ')}`);
        
        // 2. Search for OTA requests containing these dates
        await searchOTARequestsForDates(client, targetDates);
        
    } catch (error) {
        console.error('❌ Search failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

async function searchOTARequestsForDates(client, targetDates) {
    console.log('\n2. SEARCHING FOR OTA REQUESTS CONTAINING TARGET DATES:');
    
    if (targetDates.length === 0) {
        console.log('   ❌ No target dates to search for');
        return;
    }
    
    const datePatterns = [];
    targetDates.forEach(date => {
        datePatterns.push(date);                    // YYYY-MM-DD
        datePatterns.push(date.replace(/-/g, ''));  // YYYYMMDD
        datePatterns.push(date.replace(/-/g, '/'));  // YYYY/MM/DD
    });
    
    console.log(`   Searching for patterns: ${datePatterns.join(', ')}`);
    
    const foundRequests = [];
    
    // Search each pattern in Hotel 25 requests
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
    
    // 3. Analyze found requests
    if (foundRequests.length > 0) {
        console.log(`\n3. DETAILED ANALYSIS OF ${foundRequests.length} FOUND REQUESTS:`);
        
        for (const request of foundRequests) {
            console.log(`\n   ═══ Request ID: ${request.current_request_id} ═══`);
            console.log(`   Queue ID: ${request.id}`);
            console.log(`   Service: ${request.service_name}`);
            console.log(`   Status: ${request.status}`);
            
            const createdJST = new Date(request.created_at.getTime() + (9 * 60 * 60 * 1000));
            const processedJST = request.processed_at ? new Date(request.processed_at.getTime() + (9 * 60 * 60 * 1000)) : null;
            
            console.log(`   Created: ${createdJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
            console.log(`   Processed: ${processedJST ? processedJST.toISOString().replace('T', ' ').substring(0, 19) + ' JST' : 'Not processed'}`);
            console.log(`   Found pattern: ${request.found_pattern}`);
            
            // Calculate time gaps from 山本塗装店 reservations
            const reservationTime1 = new Date('2026-01-16T02:04:36.187Z'); // 11:04:36 JST
            const reservationTime2 = new Date('2026-01-16T02:05:07.301Z'); // 11:05:07 JST
            
            const gap1Minutes = Math.round((request.created_at - reservationTime1) / 60000);
            const gap2Minutes = Math.round((request.created_at - reservationTime2) / 60000);
            
            console.log(`   Gap from 11:04:36 JST: ${gap1Minutes} minutes`);
            console.log(`   Gap from 11:05:07 JST: ${gap2Minutes} minutes`);
            
            // Analyze XML content
            const xmlQuery = `SELECT xml_body FROM ota_xml_queue WHERE id = $1`;
            const xmlResult = await client.query(xmlQuery, [request.id]);
            
            if (xmlResult.rows.length > 0) {
                const xmlBody = xmlResult.rows[0].xml_body;
                
                console.log(`   XML Content Analysis:`);
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
                
                // Check for room numbers 352 and 353
                const roomNumbers = ['352', '353'];
                roomNumbers.forEach(roomNum => {
                    if (xmlBody.includes(roomNum)) {
                        console.log(`      ✅ Contains room ${roomNum}`);
                    } else {
                        console.log(`      ❌ Does not contain room ${roomNum}`);
                    }
                });
                
                // Show a snippet of XML for manual verification
                console.log(`   XML Preview (first 200 chars):`);
                console.log(`      ${xmlBody.substring(0, 200)}...`);
            }
        }
        
        // 4. Timeline and correlation analysis
        console.log('\n4. TIMELINE AND CORRELATION ANALYSIS:');
        
        const timeline = [
            { time: '2026-01-16T02:04:36.187Z', type: 'RESERVATION', desc: '山本塗装店 batch 1 (rooms 352, 353 for Feb 2-5)' },
            { time: '2026-01-16T02:05:07.301Z', type: 'RESERVATION', desc: '山本塗装店 batch 2 (room 353 for Feb 9-12)' }
        ];
        
        foundRequests.forEach(req => {
            timeline.push({
                time: req.created_at.toISOString(),
                type: 'OTA_REQUEST',
                desc: `${req.current_request_id} (${req.service_name}) - contains ${req.found_pattern}`
            });
        });
        
        timeline.sort((a, b) => new Date(a.time) - new Date(b.time));
        
        console.log('\n   Complete Timeline:');
        timeline.forEach((event, i) => {
            const jstTime = new Date(event.time).getTime() + (9 * 60 * 60 * 1000);
            const jstStr = new Date(jstTime).toISOString().replace('T', ' ').substring(0, 19);
            const marker = event.type === 'OTA_REQUEST' ? '📡' : '📝';
            
            console.log(`   ${i + 1}. ${jstStr} JST - ${marker} ${event.desc}`);
        });
        
        // Find the best correlation
        const bestMatch = foundRequests.reduce((best, current) => {
            const gap1 = Math.abs(current.created_at - new Date('2026-01-16T02:04:36.187Z'));
            const gap2 = Math.abs(current.created_at - new Date('2026-01-16T02:05:07.301Z'));
            const minGap = Math.min(gap1, gap2);
            
            if (!best || minGap < best.minGap) {
                return { request: current, minGap };
            }
            return best;
        }, null);
        
        if (bestMatch) {
            const gapMinutes = Math.round(bestMatch.minGap / 60000);
            console.log(`\n   🎯 BEST CORRELATION: ${bestMatch.request.current_request_id}`);
            console.log(`      Minimum gap: ${gapMinutes} minutes from reservations`);
            console.log(`      This is likely the OTA request triggered by 山本塗装店 reservations`);
        }
        
    } else {
        console.log('\n3. NO MATCHING OTA REQUESTS FOUND:');
        console.log('   ❌ No OTA requests found containing 山本塗装店 reservation dates');
        console.log('   📋 This confirms: NO OTA updates were triggered by the reservations');
        console.log('   📋 This is a genuine case of missing OTA triggers');
        console.log('   📋 The system failed to send inventory updates to OTA channels');
    }
    
    // 5. Final conclusion
    console.log('\n5. FINAL INVESTIGATION CONCLUSION:');
    
    if (foundRequests.length > 0) {
        console.log('   ✅ CORRELATION FOUND');
        console.log(`   📋 Found ${foundRequests.length} OTA requests containing 山本塗装店 reservation dates`);
        console.log('   📋 The system DID send OTA updates for these reservations');
        console.log('   📋 Our original monitoring failed to detect the correlation');
    } else {
        console.log('   ❌ NO CORRELATION FOUND');
        console.log('   📋 NO OTA requests contain 山本塗装店 reservation dates');
        console.log('   📋 This confirms the original issue: Missing OTA triggers');
        console.log('   📋 The system FAILED to send OTA updates for these reservations');
        console.log('   📋 This is NOT a silent skip - it is a genuine system failure');
    }
}

// Run the comprehensive search
comprehensiveYamamotoOTASearch().then(() => {
    console.log('\n✅ Comprehensive 山本塗装店 OTA search completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Search error:', error);
    process.exit(1);
});