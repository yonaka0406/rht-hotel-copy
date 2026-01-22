/**
 * Analyze OTA Request 42259960 XML Content
 * Check if it includes the date 2026-02-03 (20260203) from 山本塗装店 reservations
 */

require('dotenv').config();
const { pool } = require('../../config/database');
const xml2js = require('xml2js');

async function analyzeOTARequest42259960() {
    console.log('🔍 Analyzing OTA Request 42259960 XML Content');
    console.log('=============================================\n');
    
    const client = await pool.connect();
    try {
        // 1. Get the XML content for request 42259960
        console.log('1. RETRIEVING XML CONTENT FOR REQUEST 42259960:');
        
        const xmlQuery = `
            SELECT 
                id,
                hotel_id,
                service_name,
                xml_body,
                current_request_id,
                status,
                created_at,
                processed_at
            FROM ota_xml_queue 
            WHERE current_request_id = '42259960'
        `;
        
        const xmlResult = await client.query(xmlQuery);
        
        if (xmlResult.rows.length === 0) {
            console.log('   ❌ Request 42259960 not found in ota_xml_queue');
            return;
        }
        
        const request = xmlResult.rows[0];
        const createdJST = new Date(request.created_at.getTime() + (9 * 60 * 60 * 1000));
        const processedJST = request.processed_at ? new Date(request.processed_at.getTime() + (9 * 60 * 60 * 1000)) : null;
        
        console.log('   ✅ Found request 42259960:');
        console.log(`      Queue ID: ${request.id}`);
        console.log(`      Hotel ID: ${request.hotel_id}`);
        console.log(`      Service: ${request.service_name}`);
        console.log(`      Status: ${request.status}`);
        console.log(`      Created: ${createdJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
        console.log(`      Processed: ${processedJST ? processedJST.toISOString().replace('T', ' ').substring(0, 19) + ' JST' : 'Not processed'}`);
        
        // 2. Analyze XML content for target dates
        console.log('\n2. ANALYZING XML CONTENT FOR TARGET DATES:');
        
        const xmlBody = request.xml_body;
        console.log(`   XML body length: ${xmlBody.length} characters`);
        
        // Check for various date formats
        const targetDates = [
            '2026-02-03',  // YYYY-MM-DD
            '20260203',    // YYYYMMDD (most common in XML)
            '2026/02/03',  // YYYY/MM/DD
            '03/02/2026',  // DD/MM/YYYY
            '02/03/2026',  // MM/DD/YYYY
            '2026-02-02',  // Also check 2026-02-02 (first day of reservation)
            '20260202',    // YYYYMMDD for 2026-02-02
            '2026-02-04',  // Also check 2026-02-04 (third day)
            '20260204',    // YYYYMMDD for 2026-02-04
            '2026-02-05',  // Also check 2026-02-05 (fourth day)
            '20260205'     // YYYYMMDD for 2026-02-05
        ];
        
        console.log('   Searching for date patterns in XML:');
        const foundDates = [];
        
        targetDates.forEach(datePattern => {
            if (xmlBody.includes(datePattern)) {
                foundDates.push(datePattern);
                console.log(`   ✅ FOUND: ${datePattern}`);
            } else {
                console.log(`   ❌ Not found: ${datePattern}`);
            }
        });
        
        // 3. Parse XML structure to understand content better
        console.log('\n3. PARSING XML STRUCTURE:');
        
        try {
            const parser = new xml2js.Parser();
            const parsedXML = await parser.parseStringPromise(xmlBody);
            
            console.log('   ✅ XML parsed successfully');
            
            // Convert to JSON string for easier searching
            const xmlString = JSON.stringify(parsedXML, null, 2);
            
            // Search for date patterns in parsed XML
            console.log('\n   Searching in parsed XML structure:');
            targetDates.forEach(datePattern => {
                if (xmlString.includes(datePattern)) {
                    if (!foundDates.includes(datePattern)) {
                        foundDates.push(datePattern);
                        console.log(`   ✅ FOUND in structure: ${datePattern}`);
                    }
                }
            });
            
            // Look for room numbers mentioned in 山本塗装店 reservations
            const roomNumbers = ['352', '353'];
            console.log('\n   Searching for room numbers:');
            roomNumbers.forEach(roomNum => {
                if (xmlString.includes(roomNum)) {
                    console.log(`   ✅ FOUND room: ${roomNum}`);
                } else {
                    console.log(`   ❌ Not found room: ${roomNum}`);
                }
            });
            
            // Show XML structure overview
            console.log('\n   XML Structure Overview:');
            console.log(`      Root elements: ${Object.keys(parsedXML).join(', ')}`);
            
            // Try to find date-related elements
            const findDatesInObject = (obj, path = '') => {
                const dates = [];
                if (typeof obj === 'object' && obj !== null) {
                    for (const [key, value] of Object.entries(obj)) {
                        const currentPath = path ? `${path}.${key}` : key;
                        if (typeof value === 'string') {
                            // Check if this string contains any of our target dates
                            targetDates.forEach(date => {
                                if (value.includes(date)) {
                                    dates.push({ path: currentPath, value: value, date: date });
                                }
                            });
                        } else if (Array.isArray(value)) {
                            value.forEach((item, index) => {
                                dates.push(...findDatesInObject(item, `${currentPath}[${index}]`));
                            });
                        } else if (typeof value === 'object') {
                            dates.push(...findDatesInObject(value, currentPath));
                        }
                    }
                }
                return dates;
            };
            
            const foundDateElements = findDatesInObject(parsedXML);
            
            if (foundDateElements.length > 0) {
                console.log('\n   Date elements found in XML:');
                foundDateElements.forEach((element, i) => {
                    console.log(`      ${i + 1}. Path: ${element.path}`);
                    console.log(`         Value: ${element.value}`);
                    console.log(`         Contains: ${element.date}`);
                });
            } else {
                console.log('\n   ❌ No date elements found in XML structure');
            }
            
        } catch (parseError) {
            console.log('   ❌ XML parsing failed:', parseError.message);
            
            // Fallback: show first 500 characters of XML
            console.log('\n   Raw XML preview (first 500 chars):');
            console.log('   ' + xmlBody.substring(0, 500) + (xmlBody.length > 500 ? '...' : ''));
        }
        
        // 4. Check for 山本塗装店 reservation details in the timeframe
        console.log('\n4. CROSS-REFERENCE WITH 山本塗装店 RESERVATION DETAILS:');
        
        const reservationDetailsQuery = `
            SELECT 
                lr.id,
                lr.log_time,
                lr.action,
                lr.changes->>'date' as reservation_date,
                lr.changes->>'room_id' as room_id,
                lr.changes->>'cancelled' as cancelled,
                r.room_number
            FROM logs_reservation lr
            LEFT JOIN reservations res ON (lr.changes->>'reservation_id')::uuid = res.id
            LEFT JOIN clients c ON res.reservation_client_id = c.id
            LEFT JOIN rooms r ON (lr.changes->>'room_id')::int = r.id
            WHERE 
                lr.log_time >= '2026-01-16 02:04:00'::timestamp
                AND lr.log_time <= '2026-01-16 02:06:00'::timestamp
                AND lr.table_name LIKE 'reservation_details_%'
                AND (
                    c.name_kanji LIKE '%山本%' OR
                    c.name_kana LIKE '%山本%' OR
                    c.name LIKE '%山本%'
                )
            ORDER BY lr.log_time ASC, lr.changes->>'date' ASC
        `;
        
        const detailsResult = await client.query(reservationDetailsQuery);
        console.log(`   Found ${detailsResult.rows.length} 山本塗装店 reservation_details logs`);
        
        if (detailsResult.rows.length > 0) {
            console.log('\n   Reservation details:');
            detailsResult.rows.forEach((detail, i) => {
                const logJST = new Date(detail.log_time.getTime() + (9 * 60 * 60 * 1000));
                console.log(`      ${i + 1}. ${logJST.toISOString().replace('T', ' ').substring(0, 19)} JST`);
                console.log(`         Date: ${detail.reservation_date}, Room: ${detail.room_number} (ID: ${detail.room_id})`);
                console.log(`         Action: ${detail.action}, Cancelled: ${detail.cancelled || 'null'}`);
                
                // Check if this date is in the XML
                const dateYYYYMMDD = detail.reservation_date.replace(/-/g, '');
                const inXML = foundDates.some(date => date.includes(dateYYYYMMDD) || date.includes(detail.reservation_date));
                console.log(`         In XML: ${inXML ? '✅ YES' : '❌ NO'}`);
            });
            
            // Summary of dates that should be in XML
            const expectedDates = [...new Set(detailsResult.rows.map(row => row.reservation_date))];
            console.log('\n   Expected dates in XML:');
            expectedDates.forEach(date => {
                const dateYYYYMMDD = date.replace(/-/g, '');
                const inXML = foundDates.some(foundDate => foundDate.includes(dateYYYYMMDD) || foundDate.includes(date));
                console.log(`      ${date} (${dateYYYYMMDD}): ${inXML ? '✅ FOUND' : '❌ MISSING'}`);
            });
        }
        
        // 5. Final analysis
        console.log('\n5. FINAL ANALYSIS:');
        
        if (foundDates.length > 0) {
            console.log(`   ✅ FOUND ${foundDates.length} matching dates in XML:`);
            foundDates.forEach(date => {
                console.log(`      - ${date}`);
            });
            
            // Check specifically for 2026-02-03
            const has20260203 = foundDates.some(date => date.includes('20260203') || date.includes('2026-02-03'));
            if (has20260203) {
                console.log('\n   🎯 CONFIRMED: XML contains 2026-02-03 (20260203)');
                console.log('   📋 This proves OTA request 42259960 WAS triggered by 山本塗装店 reservations');
            } else {
                console.log('\n   ❌ 2026-02-03 (20260203) NOT found in XML');
                console.log('   📋 This suggests OTA request 42259960 may not be related to 山本塗装店 reservations');
            }
        } else {
            console.log('   ❌ NO matching dates found in XML');
            console.log('   📋 This suggests OTA request 42259960 is not related to 山本塗装店 reservations');
            console.log('   📋 The timing correlation may be coincidental');
        }
        
        // 6. Conclusion
        console.log('\n6. INVESTIGATION CONCLUSION:');
        
        const has20260203 = foundDates.some(date => date.includes('20260203') || date.includes('2026-02-03'));
        
        if (has20260203) {
            console.log('   ✅ CORRELATION CONFIRMED');
            console.log('   📋 OTA request 42259960 contains 2026-02-03 date');
            console.log('   📋 This proves it was triggered by 山本塗装店 reservations');
            console.log('   📋 System worked correctly: 4:35 delay is acceptable');
        } else {
            console.log('   ❌ CORRELATION NOT CONFIRMED');
            console.log('   📋 OTA request 42259960 does not contain 2026-02-03 date');
            console.log('   📋 This may be an unrelated bulk adjustment');
            console.log('   📋 Need to find the actual OTA request triggered by 山本塗装店 reservations');
        }
        
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

// Run the analysis
analyzeOTARequest42259960().then(() => {
    console.log('\n✅ OTA Request 42259960 XML analysis completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Analysis error:', error);
    process.exit(1);
});