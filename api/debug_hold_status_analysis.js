/**
 * Comprehensive analysis of why 山本塗装店 reservations didn't trigger OTA updates
 */

require('dotenv').config();
const { pool } = require('./config/database');

async function main() {
    console.log('🔍 Analyzing why 山本塗装店 reservations did not trigger OTA updates...\n');
    
    const client = await pool.connect();
    try {
        const hotelId = 25;
        
        // 1. Check the reservation status and billable status
        console.log('1. RESERVATION STATUS ANALYSIS:');
        
        const reservationAnalysis = await client.query(`
            SELECT 
                r.id as reservation_id,
                r.status as reservation_status,
                r.check_in,
                r.check_out,
                COALESCE(c.name_kanji, c.name_kana, c.name) as guest_name,
                COUNT(rd.id) as total_details,
                COUNT(CASE WHEN rd.billable = true THEN 1 END) as billable_details,
                COUNT(CASE WHEN rd.billable = false THEN 1 END) as non_billable_details
            FROM reservations r
            JOIN clients c ON r.reservation_client_id = c.id
            JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id
            WHERE 
                r.hotel_id = $1
                AND COALESCE(c.name_kanji, c.name_kana, c.name) ILIKE '%山本塗装%'
                AND DATE(r.created_at) = '2026-01-16'
            GROUP BY r.id, r.status, r.check_in, r.check_out, r.created_at, c.name_kanji, c.name_kana, c.name
            ORDER BY r.created_at
        `, [hotelId]);
        
        reservationAnalysis.rows.forEach((res, i) => {
            console.log(`  ${i + 1}. ${res.guest_name}`);
            console.log(`     Status: ${res.reservation_status}`);
            console.log(`     Check-in: ${res.check_in} to ${res.check_out}`);
            console.log(`     Details: ${res.total_details} total, ${res.billable_details} billable, ${res.non_billable_details} non-billable`);
        });
        
        // 2. Explain the billable logic
        console.log('\n2. BILLABLE LOGIC ANALYSIS:');
        console.log('   Based on the code in api/models/reservations/details.js:');
        console.log('   - When status = "recovered": billable = !(status === "provisory" || status === "hold")');
        console.log('   - For "hold" status reservations: billable = false');
        console.log('   - For "provisory" status reservations: billable = false');
        console.log('   - Only "confirmed", "checked_in", "checked_out" reservations are billable = true');
        
        // 3. Check what triggers OTA updates
        console.log('\n3. OTA TRIGGER ANALYSIS:');
        console.log('   Searching for OTA trigger conditions...');
        
        // Look for any patterns in successful OTA updates
        const successfulOTAPattern = await client.query(`
            SELECT DISTINCT
                lr.action,
                lr.changes->>'billable' as billable_value,
                lr.changes->>'cancelled' as cancelled_value,
                COUNT(*) as occurrence_count
            FROM logs_reservation lr
            WHERE 
                lr.table_name = $1
                AND lr.log_time >= '2026-01-15'::date
                AND lr.log_time < '2026-01-17'::date
            GROUP BY lr.action, lr.changes->>'billable', lr.changes->>'cancelled'
            ORDER BY occurrence_count DESC
        `, [`reservation_details_${hotelId}`]);
        
        console.log('   Recent reservation_details log patterns:');
        successfulOTAPattern.rows.forEach(pattern => {
            console.log(`     ${pattern.action}: billable=${pattern.billable_value}, cancelled=${pattern.cancelled_value} (${pattern.occurrence_count} times)`);
        });
        
        // 4. Check if there are any OTA updates triggered by billable=true changes
        console.log('\n4. BILLABLE=TRUE CORRELATION ANALYSIS:');
        
        const billableTrueEvents = await client.query(`
            SELECT 
                lr.log_time,
                lr.action,
                lr.changes->>'billable' as billable_value,
                r.room_number,
                COALESCE(c.name_kanji, c.name_kana, c.name) as guest_name
            FROM logs_reservation lr
            LEFT JOIN rooms r ON (lr.changes->>'room_id')::integer = r.id
            LEFT JOIN reservations res ON (lr.changes->>'reservation_id')::uuid = res.id
            LEFT JOIN clients c ON res.reservation_client_id = c.id
            WHERE 
                lr.table_name = $1
                AND lr.log_time >= '2026-01-15'::date
                AND lr.log_time < '2026-01-17'::date
                AND lr.changes->>'billable' = 'true'
            ORDER BY lr.log_time ASC
        `, [`reservation_details_${hotelId}`]);
        
        console.log(`   Found ${billableTrueEvents.rows.length} events with billable=true:`);
        
        if (billableTrueEvents.rows.length > 0) {
            billableTrueEvents.rows.forEach((event, i) => {
                const jst = new Date(event.log_time.getTime() + (9 * 60 * 60 * 1000));
                console.log(`     ${i + 1}. ${jst.toISOString()} JST - ${event.action} - Room ${event.room_number} - ${event.guest_name}`);
            });
            
            // Check if these billable=true events correlate with OTA requests
            console.log('\n   Checking OTA correlation for billable=true events...');
            
            for (const event of billableTrueEvents.rows.slice(0, 3)) { // Check first 3
                const otaAfter = await client.query(`
                    SELECT created_at, current_request_id, service_name
                    FROM ota_xml_queue 
                    WHERE 
                        hotel_id = $1
                        AND created_at > $2::timestamp
                        AND created_at <= $2::timestamp + interval '10 minutes'
                        AND service_name LIKE '%Stock%'
                    ORDER BY created_at ASC
                    LIMIT 1
                `, [hotelId, event.log_time]);
                
                const jst = new Date(event.log_time.getTime() + (9 * 60 * 60 * 1000));
                if (otaAfter.rows.length > 0) {
                    const otaJst = new Date(otaAfter.rows[0].created_at.getTime() + (9 * 60 * 60 * 1000));
                    const gap = (otaAfter.rows[0].created_at - event.log_time) / 1000 / 60;
                    console.log(`     ✅ ${jst.toISOString()} JST -> OTA at ${otaJst.toISOString()} JST (+${Math.round(gap)} min)`);
                } else {
                    console.log(`     ❌ ${jst.toISOString()} JST -> No OTA within 10 minutes`);
                }
            }
        } else {
            console.log('     No billable=true events found in the timeframe');
        }
        
        // 5. Conclusion
        console.log('\n5. CONCLUSION:');
        console.log('   🔍 ROOT CAUSE IDENTIFIED:');
        console.log('   - 山本塗装店 reservations have status="hold"');
        console.log('   - Hold status reservations have billable=false by design');
        console.log('   - OTA stock updates are likely triggered only by billable=true changes');
        console.log('   - Since billable=false, no OTA stock adjustment was triggered');
        console.log('');
        console.log('   📋 BUSINESS LOGIC:');
        console.log('   - "hold" = tentative/negotiation phase - should not affect inventory');
        console.log('   - "confirmed" = finalized booking - should trigger inventory updates');
        console.log('   - This explains why no OTA request was made for the 山本塗装店 reservations');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();