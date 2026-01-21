/**
 * Debug script to investigate why the CASCADE DELETE fix is not working
 */

require('dotenv').config();
const { pool } = require('./config/database');

async function debugCascadeFix() {
    const client = await pool.connect();
    
    try {
        const hotelId = 25;
        const date = '2026-02-03';
        const tableName = `reservation_details_${hotelId}`;
        const reservationsTableName = `reservations_${hotelId}`;
        
        console.log('🔍 Debugging CASCADE DELETE fix...');
        console.log('=' .repeat(80));
        
        // 1. Get one of the false positive records - let's find the actual full ID
        console.log(`\n📋 Step 1: Finding actual false positive records...`);
        
        // Get the lifecycle query results to find false positives
        const lifecycleQuery = `
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
            ORDER BY rt.record_id
        `;
        
        const lifecycleResult = await client.query(lifecycleQuery, [tableName, date]);
        const activeFromLogs = lifecycleResult.rows.filter(row => row.final_status === 'active');
        
        console.log(`   Found ${activeFromLogs.length} records considered active by logs`);
        
        // Check which ones don't exist in the table
        const falsePositives = [];
        
        for (const record of activeFromLogs) {
            const existsQuery = `SELECT id FROM ${tableName} WHERE id = $1 AND cancelled IS NULL`;
            const existsResult = await client.query(existsQuery, [record.record_id]);
            
            if (existsResult.rows.length === 0) {
                falsePositives.push(record);
            }
        }
        
        console.log(`   Found ${falsePositives.length} false positives (active in logs but not in table)`);
        
        if (falsePositives.length === 0) {
            console.log('   ✅ No false positives found - the fix might be working!');
            return;
        }
        
        const falsePositiveId = falsePositives[0].record_id;
        
        console.log(`\n📋 Step 1: Analyzing false positive record ${falsePositiveId.substring(0, 8)}...`);
        
        // Check if this record exists in the table
        const recordExistsQuery = `
            SELECT * FROM ${tableName} WHERE id = $1
        `;
        
        const recordExistsResult = await client.query(recordExistsQuery, [falsePositiveId]);
        console.log(`   Record exists in table: ${recordExistsResult.rows.length > 0 ? 'YES' : 'NO'}`);
        
        if (recordExistsResult.rows.length > 0) {
            const record = recordExistsResult.rows[0];
            console.log(`   Record details: date=${record.date}, cancelled=${record.cancelled}, room_id=${record.room_id}`);
        }
        
        // 2. Get logs for this record
        console.log(`\n📊 Step 2: Getting logs for record ${falsePositiveId.substring(0, 8)}...`);
        
        const recordLogsQuery = `
            SELECT 
                log_time,
                action,
                changes,
                table_name
            FROM logs_reservation
            WHERE record_id = $1
            ORDER BY log_time
        `;
        
        const recordLogsResult = await client.query(recordLogsQuery, [falsePositiveId]);
        console.log(`   Found ${recordLogsResult.rows.length} logs for this record:`);
        
        let reservationId = null;
        
        for (const log of recordLogsResult.rows) {
            console.log(`   ${log.log_time.toISOString()} | ${log.action} | ${log.table_name}`);
            
            // Extract reservation_id
            if (log.action === 'INSERT' || log.action === 'DELETE') {
                reservationId = log.changes.reservation_id;
            } else if (log.action === 'UPDATE') {
                reservationId = log.changes.new?.reservation_id || log.changes.old?.reservation_id;
            }
            
            console.log(`     Changes: ${JSON.stringify(log.changes, null, 2)}`);
        }
        
        if (reservationId) {
            console.log(`   Extracted reservation_id: ${reservationId}`);
            
            // 3. Check parent reservation logs
            console.log(`\n🔍 Step 3: Checking parent reservation logs for ${reservationId.substring(0, 8)}...`);
            
            const parentLogsQuery = `
                SELECT 
                    log_time,
                    action,
                    changes,
                    table_name
                FROM logs_reservation
                WHERE record_id = $1 AND table_name = $2
                ORDER BY log_time
            `;
            
            const parentLogsResult = await client.query(parentLogsQuery, [reservationId, reservationsTableName]);
            console.log(`   Found ${parentLogsResult.rows.length} logs for parent reservation:`);
            
            let hasParentDelete = false;
            
            for (const log of parentLogsResult.rows) {
                console.log(`   ${log.log_time.toISOString()} | ${log.action} | ${log.table_name}`);
                if (log.action === 'DELETE') {
                    hasParentDelete = true;
                    console.log(`     ✅ FOUND PARENT DELETE LOG!`);
                }
            }
            
            if (!hasParentDelete) {
                console.log(`     ❌ No DELETE log found for parent reservation`);
            }
            
            // 4. Check if parent reservation still exists
            console.log(`\n📋 Step 4: Checking if parent reservation still exists...`);
            
            const parentExistsQuery = `
                SELECT id, status, created_at, updated_by
                FROM ${reservationsTableName}
                WHERE id = $1
            `;
            
            const parentExistsResult = await client.query(parentExistsQuery, [reservationId]);
            console.log(`   Parent reservation exists: ${parentExistsResult.rows.length > 0 ? 'YES' : 'NO'}`);
            
            if (parentExistsResult.rows.length > 0) {
                const parent = parentExistsResult.rows[0];
                console.log(`   Parent details: status=${parent.status}, created=${parent.created_at}, updated_by=${parent.updated_by}`);
            }
            
            // 5. Test the CASCADE DELETE detection query directly
            console.log(`\n🧪 Step 5: Testing CASCADE DELETE detection query...`);
            
            const cascadeTestQuery = `
                SELECT DISTINCT
                    $1 as reservation_id,
                    CASE 
                        WHEN parent_delete_logs.record_id IS NOT NULL THEN true
                        ELSE false
                    END as parent_was_deleted
                FROM (SELECT $1 as reservation_id) fli
                LEFT JOIN (
                    SELECT DISTINCT record_id
                    FROM logs_reservation
                    WHERE table_name = $2 AND action = 'DELETE'
                ) parent_delete_logs ON fli.reservation_id = parent_delete_logs.record_id
            `;
            
            const cascadeTestResult = await client.query(cascadeTestQuery, [reservationId, reservationsTableName]);
            
            if (cascadeTestResult.rows.length > 0) {
                const result = cascadeTestResult.rows[0];
                console.log(`   CASCADE DELETE detection result: parent_was_deleted = ${result.parent_was_deleted}`);
                
                if (result.parent_was_deleted) {
                    console.log(`   ✅ CASCADE DELETE should be detected correctly`);
                } else {
                    console.log(`   ❌ CASCADE DELETE not detected - this is the problem!`);
                }
            }
            
            // 6. Check all DELETE logs in parent table
            console.log(`\n📊 Step 6: Checking all DELETE logs in ${reservationsTableName}...`);
            
            const allDeletesQuery = `
                SELECT record_id, log_time
                FROM logs_reservation
                WHERE table_name = $1 AND action = 'DELETE'
                ORDER BY log_time DESC
                LIMIT 10
            `;
            
            const allDeletesResult = await client.query(allDeletesQuery, [reservationsTableName]);
            console.log(`   Found ${allDeletesResult.rows.length} DELETE logs in ${reservationsTableName}:`);
            
            for (const deleteLog of allDeletesResult.rows) {
                const isOurReservation = deleteLog.record_id === reservationId;
                console.log(`   ${deleteLog.log_time.toISOString()} | ${deleteLog.record_id.substring(0, 8)}... ${isOurReservation ? '← THIS IS OUR RESERVATION!' : ''}`);
            }
            
        } else {
            console.log(`   ❌ Could not extract reservation_id from logs`);
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('🔍 Debug complete!');
        
    } catch (error) {
        console.error('❌ Error during debug:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the debug
if (require.main === module) {
    debugCascadeFix()
        .then(() => {
            console.log('\n✅ Debug completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Debug failed:', error);
            process.exit(1);
        });
}

module.exports = { debugCascadeFix };