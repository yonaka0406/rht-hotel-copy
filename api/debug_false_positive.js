/**
 * Debug script to examine log entries for false positive "active" records
 */

require('dotenv').config();
const { pool } = require('./config/database');

async function debugFalsePositive() {
    const client = await pool.connect();
    
    try {
        const hotelId = 25;
        const date = '2026-02-03';
        const tableName = `reservation_details_${hotelId}`;
        
        // Let's examine the first false positive record: 08c9f122...
        const recordId = '08c9f122-4b5e-4b8b-8b1a-1b5e4b8b1a1b'; // We'll need to get the full ID
        
        console.log('🔍 Debugging False Positive Records');
        console.log('=' .repeat(80));
        
        // First, let's get the full IDs of the false positive records
        console.log('\n📋 Step 1: Getting full IDs of false positive records...');
        
        const falsePositiveQuery = `
            WITH record_timeframes AS (
                SELECT DISTINCT
                    lr.record_id,
                    MIN(lr.log_time) as first_log_time,
                    MAX(lr.log_time) as last_log_time,
                    COUNT(*) as total_operations
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
            LIMIT 5
        `;
        
        const falsePositiveResult = await client.query(falsePositiveQuery, [tableName, date]);
        
        console.log(`   Found ${falsePositiveResult.rows.length} false positive records to examine:`);
        
        for (const record of falsePositiveResult.rows) {
            console.log(`   ${record.record_id} - Last Action: ${record.last_action}, Status: ${record.final_status}`);
        }
        
        // Now let's examine the first few in detail
        if (falsePositiveResult.rows.length > 0) {
            for (let i = 0; i < Math.min(3, falsePositiveResult.rows.length); i++) {
                const targetRecord = falsePositiveResult.rows[i];
                const targetId = targetRecord.record_id;
                
                console.log(`\n🔍 Step ${i + 2}: Detailed analysis of record ${targetId.substring(0, 8)}...`);
            
            // Get ALL log entries for this record
            const allLogsQuery = `
                SELECT 
                    log_time,
                    action,
                    table_name,
                    changes,
                    user_id
                FROM logs_reservation
                WHERE record_id = $1
                ORDER BY log_time ASC
            `;
            
            const allLogsResult = await client.query(allLogsQuery, [targetId]);
            
            console.log(`   Found ${allLogsResult.rows.length} log entries for this record:`);
            console.log('   Time                     | Action | Table                    | Changes Summary');
            console.log('   ' + '-'.repeat(90));
            
            for (const log of allLogsResult.rows) {
                const time = log.log_time.toISOString().replace('T', ' ').substring(0, 19);
                const action = log.action.padEnd(6);
                const table = log.table_name.padEnd(24);
                
                // Summarize changes
                let changesSummary = '';
                let reservationId = null;
                if (log.changes) {
                    if (log.action === 'INSERT') {
                        const date = log.changes.date || 'N/A';
                        const roomId = log.changes.room_id || 'N/A';
                        const cancelled = log.changes.cancelled || 'null';
                        reservationId = log.changes.reservation_id;
                        changesSummary = `date:${date}, room:${roomId}, cancelled:${cancelled}, reservation_id:${reservationId?.substring(0, 8) || 'N/A'}`;
                    } else if (log.action === 'DELETE') {
                        const date = log.changes.date || 'N/A';
                        const roomId = log.changes.room_id || 'N/A';
                        reservationId = log.changes.reservation_id;
                        changesSummary = `deleted date:${date}, room:${roomId}, reservation_id:${reservationId?.substring(0, 8) || 'N/A'}`;
                    } else if (log.action === 'UPDATE') {
                        const oldCancelled = log.changes.old?.cancelled || 'null';
                        const newCancelled = log.changes.new?.cancelled || 'null';
                        reservationId = log.changes.new?.reservation_id || log.changes.old?.reservation_id;
                        changesSummary = `cancelled: ${oldCancelled} -> ${newCancelled}, reservation_id:${reservationId?.substring(0, 8) || 'N/A'}`;
                    }
                }
                
                console.log(`   ${time} | ${action} | ${table} | ${changesSummary}`);
                
                // Store the reservation_id for later use
                if (reservationId && !targetRecord.reservation_id) {
                    targetRecord.reservation_id = reservationId;
                }
            }
            
            console.log(`\n🔍 Step ${i + 2}.3: Checking if record exists in ${tableName}...`);
            
            const existsQuery = `
                SELECT id, date, room_id, cancelled, created_at, reservation_id
                FROM ${tableName}
                WHERE id = $1
            `;
            
            const existsResult = await client.query(existsQuery, [targetId]);
            
            if (existsResult.rows.length > 0) {
                const record = existsResult.rows[0];
                console.log('   ✅ Record EXISTS in table:');
                console.log(`      ID: ${record.id}`);
                console.log(`      Date: ${record.date}`);
                console.log(`      Room: ${record.room_id}`);
                console.log(`      Cancelled: ${record.cancelled || 'null'}`);
                console.log(`      Created: ${record.created_at.toISOString()}`);
                console.log(`      Reservation ID: ${record.reservation_id}`);
                
                // Store reservation_id for later use
                if (!targetRecord.reservation_id) {
                    targetRecord.reservation_id = record.reservation_id;
                }
            } else {
                console.log('   ❌ Record does NOT exist in table');
            }
            
            // Check reservation logs if we have a reservation_id
            if (targetRecord.reservation_id) {
                console.log(`\n🔍 Step ${i + 2}.3b: Checking parent reservation logs for ${targetRecord.reservation_id.substring(0, 8)}...`);
                
                const reservationLogsQuery = `
                    SELECT 
                        log_time,
                        action,
                        table_name,
                        changes,
                        user_id
                    FROM logs_reservation
                    WHERE record_id = $1 AND table_name = 'reservations'
                    ORDER BY log_time ASC
                `;
                
                const reservationLogsResult = await client.query(reservationLogsQuery, [targetRecord.reservation_id]);
                
                if (reservationLogsResult.rows.length > 0) {
                    console.log(`   Found ${reservationLogsResult.rows.length} reservation log entries:`);
                    console.log('   Time                     | Action | Changes Summary');
                    console.log('   ' + '-'.repeat(70));
                    
                    for (const resLog of reservationLogsResult.rows) {
                        const time = resLog.log_time.toISOString().replace('T', ' ').substring(0, 19);
                        const action = resLog.action.padEnd(6);
                        
                        let changesSummary = '';
                        if (resLog.changes) {
                            if (resLog.action === 'INSERT') {
                                const status = resLog.changes.status || 'N/A';
                                const checkin = resLog.changes.check_in || 'N/A';
                                const checkout = resLog.changes.check_out || 'N/A';
                                changesSummary = `status:${status}, check_in:${checkin}, check_out:${checkout}`;
                            } else if (resLog.action === 'DELETE') {
                                const status = resLog.changes.status || 'N/A';
                                changesSummary = `deleted reservation, status was:${status}`;
                            } else if (resLog.action === 'UPDATE') {
                                const oldStatus = resLog.changes.old?.status || 'N/A';
                                const newStatus = resLog.changes.new?.status || 'N/A';
                                changesSummary = `status: ${oldStatus} -> ${newStatus}`;
                            }
                        }
                        
                        console.log(`   ${time} | ${action} | ${changesSummary}`);
                    }
                    
                    // Check if the reservation was deleted
                    const deleteOps = reservationLogsResult.rows.filter(log => log.action === 'DELETE');
                    if (deleteOps.length > 0) {
                        console.log(`   🚨 FOUND IT! Parent reservation was DELETED at ${deleteOps[0].log_time.toISOString()}`);
                        console.log('   💡 This explains why the reservation_detail doesn\'t exist in the table!');
                        console.log('   🔧 The lifecycle query should detect when parent reservation is deleted');
                    } else {
                        console.log('   ℹ️  Parent reservation was not deleted');
                    }
                } else {
                    console.log('   ❌ No reservation logs found for this reservation_id');
                }
            }
            
            // Analyze the lifecycle logic
            console.log(`\n🧠 Step ${i + 2}.4: Analyzing lifecycle logic for ${targetId.substring(0, 8)}...`);
            
            const logs = allLogsResult.rows;
            if (logs.length > 0) {
                const firstLog = logs[0];
                const lastLog = logs[logs.length - 1];
                
                console.log(`   First log: ${firstLog.action} at ${firstLog.log_time.toISOString()}`);
                console.log(`   Last log: ${lastLog.action} at ${lastLog.log_time.toISOString()}`);
                
                // Apply the current lifecycle logic
                let finalStatus = 'unknown';
                if (lastLog.action === 'DELETE') {
                    finalStatus = 'deleted';
                } else {
                    let lastCancelledStatus = null;
                    if (lastLog.action === 'INSERT' || lastLog.action === 'DELETE') {
                        lastCancelledStatus = lastLog.changes?.cancelled;
                    } else if (lastLog.action === 'UPDATE') {
                        lastCancelledStatus = lastLog.changes?.new?.cancelled;
                    }
                    
                    if (lastCancelledStatus !== null && lastCancelledStatus !== '' && lastCancelledStatus !== 'null') {
                        finalStatus = 'cancelled';
                    } else {
                        finalStatus = 'active';
                    }
                }
                
                console.log(`   Current logic determines: ${finalStatus}`);
                console.log(`   Last cancelled status: ${lastLog.changes?.new?.cancelled || lastLog.changes?.cancelled || 'null'}`);
                
                // Check if there's a DELETE operation
                const deleteOps = logs.filter(log => log.action === 'DELETE');
                if (deleteOps.length > 0) {
                    console.log(`   ⚠️  Found ${deleteOps.length} DELETE operations:`);
                    for (const deleteOp of deleteOps) {
                        console.log(`      DELETE at ${deleteOp.log_time.toISOString()}`);
                    }
                    console.log('   🔍 The record was deleted, but lifecycle logic may not be detecting it correctly');
                } else {
                    console.log('   ℹ️  No DELETE operations found - record was never deleted from logs perspective');
                    console.log('   🚨 PROBLEM: Record was INSERTed but never DELETEd in logs, yet it doesn\'t exist in table!');
                }
            }
            
            console.log('   ' + '-'.repeat(80));
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
    debugFalsePositive()
        .then(() => {
            console.log('\n📊 Debug complete!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Debug failed:', error);
            process.exit(1);
        });
}

module.exports = { debugFalsePositive };