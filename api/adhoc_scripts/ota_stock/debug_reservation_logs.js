/**
 * Debug script to examine reservation logs for false positive records
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function debugReservationLogs() {
    const client = await pool.connect();
    
    try {
        const hotelId = 25;
        const date = '2026-02-03';
        const tableName = `reservation_details_${hotelId}`;
        
        console.log('🔍 Debugging Reservation Logs for False Positives');
        console.log('=' .repeat(80));
        
        // Get one false positive record with its reservation_id
        console.log('\n📋 Step 1: Getting a false positive record...');
        
        const falsePositiveQuery = `
            WITH record_timeframes AS (
                SELECT DISTINCT
                    lr.record_id,
                    MIN(lr.log_time) as first_log_time,
                    MAX(lr.log_time) as last_log_time
                FROM logs_reservation lr
                WHERE 
                    lr.table_name = $1
                    AND (
                        (lr.action IN ('INSERT', 'DELETE') AND (lr.changes->>'date')::date = $2)
                        OR 
                        (lr.action = 'UPDATE' AND (
                            (lr.changes->'new'->>'date')::date = $2 
                            OR (lr.changes->'old'->>'date')::date = $2
                        ))
                    )
                GROUP BY lr.record_id
            ),
            last_log_info AS (
                SELECT DISTINCT
                    rt.record_id,
                    lr.action as last_action,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN lr.changes->>'cancelled'
                        WHEN lr.action = 'UPDATE' THEN lr.changes->'new'->>'cancelled'
                    END AS last_cancelled_status
                FROM record_timeframes rt
                JOIN logs_reservation lr ON lr.record_id = rt.record_id AND lr.log_time = rt.last_log_time
                WHERE lr.table_name = $1
            )
            SELECT 
                rt.record_id,
                lli.last_action,
                lli.last_cancelled_status,
                CASE 
                    WHEN lli.last_action = 'DELETE' THEN 'deleted'
                    WHEN lli.last_cancelled_status IS NOT NULL AND lli.last_cancelled_status != '' AND lli.last_cancelled_status != 'null' THEN 'cancelled'
                    ELSE 'active'
                END as final_status
            FROM record_timeframes rt
            JOIN last_log_info lli ON rt.record_id = lli.record_id
            WHERE CASE 
                WHEN lli.last_action = 'DELETE' THEN 'deleted'
                WHEN lli.last_cancelled_status IS NOT NULL AND lli.last_cancelled_status != '' AND lli.last_cancelled_status != 'null' THEN 'cancelled'
                ELSE 'active'
            END = 'active'
            ORDER BY rt.record_id
            LIMIT 3
        `;
        
        const falsePositiveResult = await client.query(falsePositiveQuery, [tableName, date]);
        
        if (falsePositiveResult.rows.length === 0) {
            console.log('   No false positive records found');
            return;
        }
        
        console.log(`   Found ${falsePositiveResult.rows.length} false positive records to examine`);
        
        for (let i = 0; i < falsePositiveResult.rows.length; i++) {
            const targetRecord = falsePositiveResult.rows[i];
            const targetId = targetRecord.record_id;
            
            console.log(`\n🔍 === EXAMINING RECORD ${i + 1}: ${targetId.substring(0, 8)}... ===`);
        
        // Get the reservation_id from the logs
        console.log('\n📋 Getting reservation_id from logs...');
        
        const reservationIdQuery = `
            SELECT 
                CASE
                    WHEN action IN ('INSERT', 'DELETE') THEN changes->>'reservation_id'
                    WHEN action = 'UPDATE' THEN COALESCE(changes->'new'->>'reservation_id', changes->'old'->>'reservation_id')
                END as reservation_id
            FROM logs_reservation
            WHERE record_id = $1 AND table_name = $2
            AND (
                (action IN ('INSERT', 'DELETE') AND changes->>'reservation_id' IS NOT NULL)
                OR 
                (action = 'UPDATE' AND (changes->'new'->>'reservation_id' IS NOT NULL OR changes->'old'->>'reservation_id' IS NOT NULL))
            )
            LIMIT 1
        `;
        
        const reservationIdResult = await client.query(reservationIdQuery, [targetId, tableName]);
        
        if (reservationIdResult.rows.length === 0) {
            console.log('   ❌ No reservation_id found in logs');
            continue;
        }
        
        const reservationId = reservationIdResult.rows[0].reservation_id;
        console.log(`   Found reservation_id: ${reservationId.substring(0, 8)}...`);
        
        // Check if the reservation_detail exists in the table
        console.log('\n📋 Checking if reservation_detail exists in table...');
        
        const existsQuery = `
            SELECT id, reservation_id, room_id, date, cancelled, created_at
            FROM ${tableName}
            WHERE id = $1
        `;
        
        const existsResult = await client.query(existsQuery, [targetId]);
        
        if (existsResult.rows.length > 0) {
            console.log('   ✅ Record EXISTS in table - this should not be a false positive!');
            const record = existsResult.rows[0];
            console.log(`      Room: ${record.room_id}, Cancelled: ${record.cancelled || 'null'}`);
        } else {
            console.log('   ❌ Record does NOT exist in table - confirmed false positive');
        }
        
        // Check if the parent reservation still exists
        console.log(`\n📋 Checking if parent reservation exists in reservations table...`);
        
        const parentExistsQuery = `
            SELECT id, status, check_in, check_out, created_at
            FROM reservations
            WHERE id = $1
        `;
        
        const parentExistsResult = await client.query(parentExistsQuery, [reservationId]);
        
        if (parentExistsResult.rows.length > 0) {
            const reservation = parentExistsResult.rows[0];
            console.log('   ✅ Parent reservation EXISTS:');
            console.log(`      Status: ${reservation.status}`);
        } else {
            console.log('   ❌ Parent reservation does NOT exist');
            console.log('   💡 This confirms the reservation was deleted, taking all reservation_details with it');
        }
        
        // Check if there are DELETE logs for the parent reservation
        console.log(`\n📋 Checking for DELETE logs in logs_reservation for parent reservation...`);
        
        const parentDeleteLogsQuery = `
            SELECT 
                log_time,
                action,
                changes,
                user_id
            FROM logs_reservation
            WHERE record_id = $1 AND table_name = 'reservations' AND action = 'DELETE'
            ORDER BY log_time DESC
        `;
        
        const parentDeleteLogsResult = await client.query(parentDeleteLogsQuery, [reservationId]);
        
        if (parentDeleteLogsResult.rows.length > 0) {
            console.log(`   🚨 FOUND ${parentDeleteLogsResult.rows.length} DELETE log(s) for parent reservation:`);
            
            for (const deleteLog of parentDeleteLogsResult.rows) {
                const time = deleteLog.log_time.toISOString().replace('T', ' ').substring(0, 19);
                const status = deleteLog.changes?.status || 'N/A';
                const userId = deleteLog.user_id || 'N/A';
                
                console.log(`      ${time} | DELETE | Status was: ${status} | User: ${userId}`);
            }
            
            console.log('   💡 This explains why the reservation_detail doesn\'t exist!');
            console.log('   🔧 The lifecycle query should check for parent reservation DELETE logs');
            
        } else {
            console.log('   ℹ️  No DELETE logs found for parent reservation');
            
            // Check if there are ANY logs for the parent reservation
            const anyParentLogsQuery = `
                SELECT COUNT(*) as log_count, MIN(log_time) as first_log, MAX(log_time) as last_log
                FROM logs_reservation
                WHERE record_id = $1 AND table_name = 'reservations'
            `;
            
            const anyParentLogsResult = await client.query(anyParentLogsQuery, [reservationId]);
            const logInfo = anyParentLogsResult.rows[0];
            
            if (parseInt(logInfo.log_count) > 0) {
                console.log(`   📋 Found ${logInfo.log_count} other logs for parent reservation`);
                console.log(`      First log: ${logInfo.first_log?.toISOString()}`);
                console.log(`      Last log: ${logInfo.last_log?.toISOString()}`);
            } else {
                console.log('   ❌ No logs found at all for parent reservation');
                console.log('   🤔 Parent reservation may have been created before logging was implemented');
            }
        }
        
        console.log('   ' + '-'.repeat(60));
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ Debug analysis complete!');
        
    } catch (error) {
        console.error('❌ Error during debug:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the debug
if (require.main === module) {
    debugReservationLogs()
        .then(() => {
            console.log('\n📊 Debug complete!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Debug failed:', error);
            process.exit(1);
        });
}

module.exports = { debugReservationLogs };