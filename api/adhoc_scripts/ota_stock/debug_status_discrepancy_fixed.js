/**
 * Investigate the discrepancy between logs showing "hold" and current status showing "confirmed"
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Investigating status discrepancy for 山本塗装店 reservations...\n');
    
    const client = await pool.connect();
    try {
        const hotelId = 25;
        
        // 1. Check current reservation status vs log history
        console.log('1. CURRENT STATUS vs LOG HISTORY:');
        
        const currentStatus = await client.query(`
            SELECT 
                r.id,
                r.status as current_status,
                r.created_at,
                COALESCE(c.name_kanji, c.name_kana, c.name) as guest_name
            FROM reservations r
            JOIN clients c ON r.reservation_client_id = c.id
            WHERE 
                r.hotel_id = $1
                AND COALESCE(c.name_kanji, c.name_kana, c.name) ILIKE '%山本塗装%'
                AND DATE(r.created_at) = '2026-01-16'
            ORDER BY r.created_at
        `, [hotelId]);
        
        console.log('Current reservation status:');
        currentStatus.rows.forEach((res, i) => {
            const createdJst = new Date(res.created_at.getTime() + (9 * 60 * 60 * 1000));
            console.log(`  ${i + 1}. ${res.guest_name}`);
            console.log(`     Current Status: ${res.current_status}`);
            console.log(`     Created: ${createdJst.toISOString()} JST`);
        });
        
        // 2. Check the log history for status changes
        console.log('\n2. RESERVATION STATUS CHANGE HISTORY:');
        
        for (const res of currentStatus.rows) {
            console.log(`\n   Reservation ${res.id} (${res.guest_name}):`);
            
            const statusHistory = await client.query(`
                SELECT 
                    log_time,
                    action,
                    changes->>'status' as status_value,
                    changes
                FROM logs_reservation
                WHERE 
                    table_name = $1
                    AND (changes->>'id')::uuid = $2
                ORDER BY log_time ASC
            `, [`reservations_${hotelId}`, res.id]);
            
            statusHistory.rows.forEach((log, i) => {
                const jst = new Date(log.log_time.getTime() + (9 * 60 * 60 * 1000));
                console.log(`     ${i + 1}. ${jst.toISOString()} JST - ${log.action} - status: ${log.status_value}`);
            });
        }
        
        // 3. Check if there were any UPDATE operations that changed status from hold to confirmed
        console.log('\n3. STATUS CHANGE ANALYSIS:');
        
        const statusUpdates = await client.query(`
            SELECT 
                lr.log_time,
                lr.action,
                lr.changes->>'status' as new_status,
                lr.changes->>'id' as reservation_id,
                COALESCE(c.name_kanji, c.name_kana, c.name) as guest_name
            FROM logs_reservation lr
            LEFT JOIN clients c ON (lr.changes->>'reservation_client_id')::uuid = c.id
            WHERE 
                lr.table_name = $1
                AND lr.action = 'UPDATE'
                AND lr.changes->>'status' IS NOT NULL
                AND DATE(lr.log_time) >= '2026-01-16'
                AND COALESCE(c.name_kanji, c.name_kana, c.name) ILIKE '%山本塗装%'
            ORDER BY lr.log_time ASC
        `, [`reservations_${hotelId}`]);
        
        if (statusUpdates.rows.length > 0) {
            console.log('   Found status update operations:');
            statusUpdates.rows.forEach((update, i) => {
                const jst = new Date(update.log_time.getTime() + (9 * 60 * 60 * 1000));
                console.log(`     ${i + 1}. ${jst.toISOString()} JST - Status changed to: ${update.new_status}`);
            });
        } else {
            console.log('   No status UPDATE operations found for 山本塗装店 reservations');
        }
        
        // 4. Check if the reservation_details were updated to billable=true after creation
        console.log('\n4. RESERVATION_DETAILS BILLABLE CHANGES:');
        
        for (const res of currentStatus.rows) {
            console.log(`\n   Details for reservation ${res.id}:`);
            
            const detailsHistory = await client.query(`
                SELECT 
                    lr.log_time,
                    lr.action,
                    lr.changes->>'billable' as billable_value,
                    lr.changes->>'room_id' as room_id,
                    r.room_number
                FROM logs_reservation lr
                LEFT JOIN rooms r ON (lr.changes->>'room_id')::integer = r.id
                WHERE 
                    lr.table_name = $1
                    AND (lr.changes->>'reservation_id')::uuid = $2
                    AND (lr.changes->>'billable' IS NOT NULL OR lr.action = 'INSERT')
                ORDER BY lr.log_time ASC
            `, [`reservation_details_${hotelId}`, res.id]);
            
            detailsHistory.rows.forEach((log, i) => {
                const jst = new Date(log.log_time.getTime() + (9 * 60 * 60 * 1000));
                console.log(`     ${i + 1}. ${jst.toISOString()} JST - ${log.action} - Room ${log.room_number} - billable: ${log.billable_value}`);
            });
        }
        
        // 5. Conclusion
        console.log('\n5. ANALYSIS CONCLUSION:');
        console.log('   If reservations were created as "hold" but later changed to "confirmed",');
        console.log('   the status change should have triggered billable=true updates,');
        console.log('   which in turn should have triggered OTA stock adjustments.');
        console.log('   The gap suggests either:');
        console.log('   a) Status change did not trigger OTA updates');
        console.log('   b) OTA trigger mechanism failed');
        console.log('   c) Reservations were created as confirmed but OTA system was down');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();