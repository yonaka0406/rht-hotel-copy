/**
 * Debug why INSERT actions for 山本塗装店 didn't trigger OTA updates
 */

require('dotenv').config();
const { pool } = require('./config/database');

async function main() {
    console.log('🔍 Debugging INSERT trigger failure for 山本塗装店...\n');
    
    const client = await pool.connect();
    try {
        const hotelId = 25;
        
        // 1. Check if the logs_reservation entries exist for 山本塗装店
        console.log('1. CHECKING LOGS_RESERVATION ENTRIES:');
        
        const logEntries = await client.query(`
            SELECT 
                lr.id,
                lr.log_time,
                lr.action,
                lr.table_name,
                lr.changes->>'status' as status,
                lr.changes->>'hotel_id' as hotel_id,
                lr.changes->>'check_in' as check_in,
                lr.changes->>'check_out' as check_out
            FROM logs_reservation lr
            LEFT JOIN clients c ON (lr.changes->>'reservation_client_id')::uuid = c.id
            WHERE 
                lr.table_name = $1
                AND DATE(lr.log_time) = '2026-01-16'
                AND COALESCE(c.name_kanji, c.name_kana, c.name) ILIKE '%山本塗装%'
                AND lr.action = 'INSERT'
            ORDER BY lr.log_time ASC
        `, [`reservations_${hotelId}`]);
        
        console.log(`   Found ${logEntries.rows.length} INSERT log entries:`);
        logEntries.rows.forEach((log, i) => {
            const jst = new Date(log.log_time.getTime() + (9 * 60 * 60 * 1000));
            console.log(`     ${i + 1}. ID: ${log.id} - ${jst.toISOString()} JST`);
            console.log(`        Status: ${log.status}, Hotel: ${log.hotel_id}`);
            console.log(`        Check-in: ${log.check_in}, Check-out: ${log.check_out}`);
        });
        
        // 2. Test the selectReservationInventoryChange function for each log entry
        console.log('\n2. TESTING selectReservationInventoryChange FUNCTION:');
        
        for (const log of logEntries.rows) {
            console.log(`\n   Testing log ID ${log.id}:`);
            
            // Simulate the exact query from selectReservationInventoryChange
            const testQuery = `
                SELECT
                    id,
                    action,
                    table_name,        
                    CASE
                        WHEN action != 'UPDATE' THEN changes->>'check_in'
                        ELSE LEAST(
                        changes->'old'->>'check_in',
                        changes->'new'->>'check_in'
                        )
                    END AS check_in,
                    CASE
                        WHEN action != 'UPDATE' THEN changes->>'check_out'
                        ELSE GREATEST(
                        changes->'old'->>'check_out',
                        changes->'new'->>'check_out'
                        )
                    END AS check_out,
                    CASE
                        WHEN action != 'UPDATE' THEN (changes->>'hotel_id')::int
                        ELSE (changes->'new'->>'hotel_id')::int
                    END AS hotel_id

                FROM logs_reservation
                WHERE 
                    id = $1
                    AND table_name LIKE 'reservations_%'
                    AND LENGTH(table_name) <= LENGTH('reservations_') + 3
                    AND 
                    (
                        action != 'UPDATE' OR (
                            action = 'UPDATE' AND (
                                changes->'old'->>'check_in' IS DISTINCT FROM changes->'new'->>'check_in' OR
                                changes->'old'->>'check_out' IS DISTINCT FROM changes->'new'->>'check_out' OR
                                (changes->'old'->>'hotel_id')::int IS DISTINCT FROM (changes->'new'->>'hotel_id')::int OR (
                                changes->'old'->>'status' IS DISTINCT FROM changes->'new'->>'status' AND (
                                        changes->'old'->>'status' = 'cancelled' OR
                                        changes->'new'->>'status' = 'cancelled'
                                    )
                                )
                            )
                        )
                    )
            `;
            
            const testResult = await client.query(testQuery, [log.id]);
            
            if (testResult.rows.length > 0) {
                console.log(`     ✅ PASSES filter - should trigger OTA`);
                console.log(`        Result: ${JSON.stringify(testResult.rows[0])}`);
            } else {
                console.log(`     ❌ FAILS filter - would NOT trigger OTA`);
            }
        }
        
        // 3. Check if reservation_log_inserted notifications were sent
        console.log('\n3. CHECKING NOTIFICATION MECHANISM:');
        console.log('   The reservation_log_inserted trigger should fire for each INSERT');
        console.log('   Let\'s check if there are any issues with the trigger or notification system');
        
        // Check if the trigger function exists
        const triggerCheck = await client.query(`
            SELECT 
                trigger_name,
                event_manipulation,
                action_statement
            FROM information_schema.triggers 
            WHERE event_object_table = 'logs_reservation'
            AND trigger_name LIKE '%notification%'
        `);
        
        console.log(`   Found ${triggerCheck.rows.length} notification triggers:`);
        triggerCheck.rows.forEach((trigger, i) => {
            console.log(`     ${i + 1}. ${trigger.trigger_name} - ${trigger.event_manipulation}`);
            console.log(`        Action: ${trigger.action_statement}`);
        });
        
        // 4. Check if there were any errors during the time period
        console.log('\n4. CHECKING FOR SYSTEM ERRORS:');
        console.log('   Looking for any errors that might have prevented OTA trigger...');
        
        // Check if the Node.js process was listening during that time
        console.log('   Key questions to investigate:');
        console.log('   - Was the Node.js process running and listening for notifications?');
        console.log('   - Were there any database connection issues?');
        console.log('   - Did the fetch calls to site-controller endpoint fail?');
        console.log('   - Was the OTA service available?');
        
        // 5. Simulate the trigger chain manually
        console.log('\n5. MANUAL TRIGGER SIMULATION:');
        
        if (logEntries.rows.length > 0) {
            const firstLog = logEntries.rows[0];
            console.log(`   Simulating trigger for log ID ${firstLog.id}...`);
            
            try {
                // This would be the call made by the notification handler
                const baseUrl = 'http://localhost:5000';
                
                console.log(`   Step 1: Calling /api/log/reservation-inventory/${firstLog.id}/site-controller`);
                
                // Note: This is a simulation - the actual call would be made by the notification handler
                console.log('   (Simulation - would need actual HTTP server running to test)');
                console.log(`   Expected: Should return reservation data if filter passes`);
                console.log(`   Expected: Should then trigger /api/sc/tl/inventory/multiple/${firstLog.hotel_id}/${firstLog.id}`);
                
            } catch (error) {
                console.log(`   ❌ Simulation failed: ${error.message}`);
            }
        }
        
        // 6. Conclusion
        console.log('\n6. INVESTIGATION CONCLUSION:');
        console.log('   🔍 FINDINGS:');
        console.log('   - INSERT actions should pass the selectReservationInventoryChange filter');
        console.log('   - The issue is likely in the notification/trigger chain, not the filter logic');
        console.log('   - Possible causes:');
        console.log('     a) Node.js process not listening for PostgreSQL notifications');
        console.log('     b) Database connection issues during the time period');
        console.log('     c) HTTP fetch calls failing silently');
        console.log('     d) OTA service unavailable or returning errors');
        console.log('');
        console.log('   🔧 NEXT STEPS:');
        console.log('   1. Check Node.js application logs for 2026-01-16 11:04-11:05 JST');
        console.log('   2. Verify PostgreSQL notification system was working');
        console.log('   3. Test the notification handler manually');
        console.log('   4. Check OTA service logs for any errors during that period');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();