/**
 * Test script to verify active reservations from logs against reservation_details table
 * This helps identify discrepancies between what the logs show and what's actually in the database
 */

require('dotenv').config();
const { pool } = require('./config/database');

async function verifyActiveReservations() {
    const client = await pool.connect();
    
    try {
        const hotelId = 25;
        const date = '2026-02-03';
        const tableName = `reservation_details_${hotelId}`;
        
        console.log(`🔍 Verifying active reservations for Hotel ${hotelId} on ${date}`);
        console.log('=' .repeat(80));
        
        // 0. Quick verification of table state
        console.log('\n🎯 Step 0: Quick table verification...');
        
        const quickCountQuery = `
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN cancelled IS NULL THEN 1 END) as active_records,
                COUNT(CASE WHEN cancelled IS NOT NULL THEN 1 END) as cancelled_records,
                COUNT(DISTINCT room_id) FILTER (WHERE cancelled IS NULL) as occupied_rooms
            FROM ${tableName}
            WHERE date = $1
        `;
        
        const quickCountResult = await client.query(quickCountQuery, [date]);
        const quickCount = quickCountResult.rows[0];
        
        console.log(`   Total records for ${date}: ${quickCount.total_records}`);
        console.log(`   Active records (cancelled IS NULL): ${quickCount.active_records}`);
        console.log(`   Cancelled records: ${quickCount.cancelled_records}`);
        console.log(`   Occupied rooms (distinct): ${quickCount.occupied_rooms}`);
        
        if (quickCount.active_records === 28) {
            console.log('   ✅ CONFIRMED: Table has exactly 28 active records as expected');
        } else {
            console.log(`   ⚠️  UNEXPECTED: Table has ${quickCount.active_records} active records, expected 28`);
        }
        
        // 1. Get active reservations from lifecycle (what our investigation tool shows)
        console.log('\n📊 Step 1: Getting active reservations from lifecycle analysis...');
        
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
        
        console.log(`   Found ${lifecycleResult.rows.length} total records in lifecycle`);
        console.log(`   Active: ${activeFromLogs.length}`);
        console.log(`   Cancelled: ${lifecycleResult.rows.filter(r => r.final_status === 'cancelled').length}`);
        console.log(`   Deleted: ${lifecycleResult.rows.filter(r => r.final_status === 'deleted').length}`);
        
        // 2. Get actual active reservations from reservation_details table
        console.log('\n📋 Step 2: Getting actual active reservations from reservation_details table...');
        
        const actualQuery = `
            SELECT 
                id,
                reservation_id,
                room_id,
                date,
                cancelled,
                created_at,
                updated_by
            FROM ${tableName}
            WHERE date = $1 AND cancelled IS NULL
            ORDER BY room_id, created_at
        `;
        
        const actualResult = await client.query(actualQuery, [date]);
        const actualActive = actualResult.rows;
        
        console.log(`   Found ${actualActive.length} actual active reservations in ${tableName}`);
        
        // Show first few actual active records
        if (actualActive.length > 0) {
            console.log('\n   First 10 actual active records:');
            console.log('   ID                                   | Room | Created At');
            console.log('   ' + '-'.repeat(60));
            
            for (const record of actualActive.slice(0, 10)) {
                const id = record.id.substring(0, 8) + '...';
                const room = record.room_id.toString().padEnd(4);
                const created = record.created_at.toISOString().split('T')[0];
                console.log(`   ${id.padEnd(36)} | ${room} | ${created}`);
            }
            
            if (actualActive.length > 10) {
                console.log(`   ... and ${actualActive.length - 10} more`);
            }
        }
        
        // 3. Cross-reference the two sets
        console.log('\n🔄 Step 3: Cross-referencing active reservations...');
        console.log(`   Active IDs from logs: ${activeFromLogs.length}`);
        console.log(`   Active IDs from table: ${actualActive.length}`);
        
        const activeLogIds = new Set(activeFromLogs.map(r => r.record_id));
        const actualActiveIds = new Set(actualActive.map(r => r.id));
        
        // Find records that are active in logs but not in actual table
        const inLogsNotInTable = activeFromLogs.filter(logRecord => 
            !actualActiveIds.has(logRecord.record_id)
        );
        
        // Find records that are active in table but not in logs
        const inTableNotInLogs = actualActive.filter(actualRecord => 
            !activeLogIds.has(actualRecord.id)
        );
        
        // Find matching records
        const matching = activeFromLogs.filter(logRecord => 
            actualActiveIds.has(logRecord.record_id)
        );
        
        console.log(`   ✅ Matching active records: ${matching.length}`);
        console.log(`   ⚠️  Active in logs but NOT in table: ${inLogsNotInTable.length}`);
        console.log(`   ⚠️  Active in table but NOT in logs: ${inTableNotInLogs.length}`);
        
        // Show the key discrepancy
        console.log('\n🎯 KEY ANALYSIS:');
        if (actualActive.length === 28 && activeFromLogs.length === 43) {
            console.log('   ✅ CONFIRMED: Table has 28 active records, logs show 43 active records');
            console.log(`   📊 Discrepancy: ${activeFromLogs.length - actualActive.length} extra records in logs`);
            console.log('   🔍 This means 15 records that logs consider "active" are actually not in the table or not active');
        } else {
            console.log(`   📊 Table active count: ${actualActive.length} (expected: 28)`);
            console.log(`   📊 Logs active count: ${activeFromLogs.length} (reported: 43)`);
        }
        
        // 4. Detailed analysis of discrepancies
        if (inLogsNotInTable.length > 0) {
            console.log('\n❌ CRITICAL: Records that logs consider "active" but are NOT in table or NOT active:');
            console.log('   ID                                   | Last Action | Cancelled Status | Actual Status in Table');
            console.log('   ' + '-'.repeat(90));
            
            for (const record of inLogsNotInTable.slice(0, 15)) { // Show first 15
                const id = record.record_id.substring(0, 8) + '...';
                const action = record.last_action.padEnd(11);
                const cancelled = (record.last_cancelled_status || 'null').padEnd(16);
                
                // Check what this record actually is in the table
                const checkQuery = `
                    SELECT id, date, cancelled, created_at, updated_by
                    FROM ${tableName}
                    WHERE id = $1
                `;
                
                try {
                    const checkResult = await client.query(checkQuery, [record.record_id]);
                    let actualStatus = 'NOT FOUND';
                    
                    if (checkResult.rows.length > 0) {
                        const actualRecord = checkResult.rows[0];
                        if (actualRecord.date !== date) {
                            actualStatus = `Different date: ${actualRecord.date}`;
                        } else if (actualRecord.cancelled !== null) {
                            actualStatus = `CANCELLED: ${actualRecord.cancelled}`;
                        } else {
                            actualStatus = 'ACTIVE (unexpected!)';
                        }
                    }
                    
                    console.log(`   ${id.padEnd(36)} | ${action} | ${cancelled} | ${actualStatus}`);
                } catch (err) {
                    console.log(`   ${id.padEnd(36)} | ${action} | ${cancelled} | ERROR checking`);
                }
            }
            
            if (inLogsNotInTable.length > 15) {
                console.log(`   ... and ${inLogsNotInTable.length - 15} more records to check`);
            }
        }
        
        if (inTableNotInLogs.length > 0) {
            console.log('\n❌ Records active in table but NOT captured by logs analysis:');
            console.log('   ID                                   | Room | Created At          | Why not in logs?');
            console.log('   ' + '-'.repeat(80));
            
            for (const record of inTableNotInLogs.slice(0, 10)) {
                const id = record.id.substring(0, 8) + '...';
                const room = record.room_id.toString().padEnd(4);
                const created = record.created_at.toISOString().replace('T', ' ').substring(0, 19);
                
                // Check if this record has any logs at all
                const logCheckQuery = `
                    SELECT COUNT(*) as log_count, MIN(log_time) as first_log, MAX(log_time) as last_log
                    FROM logs_reservation
                    WHERE record_id = $1 AND table_name = $2
                `;
                
                try {
                    const logCheckResult = await client.query(logCheckQuery, [record.id, tableName]);
                    const logInfo = logCheckResult.rows[0];
                    
                    let reason = 'No logs found';
                    if (logInfo.log_count > 0) {
                        reason = `${logInfo.log_count} logs, but filtered out`;
                    }
                    
                    console.log(`   ${id.padEnd(36)} | ${room} | ${created} | ${reason}`);
                } catch (err) {
                    console.log(`   ${id.padEnd(36)} | ${room} | ${created} | Error checking logs`);
                }
            }
            
            if (inTableNotInLogs.length > 10) {
                console.log(`   ... and ${inTableNotInLogs.length - 10} more records`);
            }
        }
        
        // 5. Summary and recommendations
        console.log('\n📈 FINAL SUMMARY:');
        console.log('=' .repeat(80));
        console.log(`   🏨 Hotel ${hotelId}, Date: ${date}`);
        console.log(`   📊 Table State: ${quickCount.active_records} active records, ${quickCount.occupied_rooms} occupied rooms`);
        console.log(`   📋 Logs Analysis: ${activeFromLogs.length} records considered "active"`);
        console.log(`   🔄 Matching Records: ${matching.length}`);
        console.log(`   ❌ Logs Active but NOT in Table: ${inLogsNotInTable.length}`);
        console.log(`   ❌ Table Active but NOT in Logs: ${inTableNotInLogs.length}`);
        
        if (quickCount.active_records === 28 && activeFromLogs.length === 43) {
            console.log('\n🎯 CONFIRMED ISSUE:');
            console.log('   • Table correctly has 28 active reservations');
            console.log('   • Logs analysis incorrectly reports 43 active reservations');
            console.log(`   • ${inLogsNotInTable.length} records in logs are falsely considered "active"`);
            console.log('   • This explains why the investigation tool shows incorrect numbers');
        }
        
        console.log('\n🔧 NEXT STEPS:');
        if (inLogsNotInTable.length > 0) {
            console.log('   1. Review the log analysis logic for determining "active" status');
            console.log('   2. Check if cancelled status detection is working correctly');
            console.log('   3. Verify that deleted records are properly identified');
            console.log('   4. Update the lifecycle query to match actual table state');
        }
        
        if (inTableNotInLogs.length > 0) {
            console.log('   5. Investigate why some active table records are not captured by logs');
            console.log('   6. Check if these records were created before logging was implemented');
        }
        
        // 6. Additional verification - check current state and duplicates
        console.log('\n🎯 Step 4: Current state verification and duplicate analysis...');
        
        const currentStateQuery = `
            SELECT 
                COUNT(*) as total_reservation_details,
                COUNT(CASE WHEN cancelled IS NULL THEN 1 END) as active_reservation_details,
                COUNT(CASE WHEN cancelled IS NOT NULL THEN 1 END) as cancelled_reservation_details
            FROM ${tableName} 
            WHERE date = $1
        `;
        
        const currentStateResult = await client.query(currentStateQuery, [date]);
        const currentState = currentStateResult.rows[0];
        
        console.log(`   Total reservation_details for ${date}: ${currentState.total_reservation_details}`);
        console.log(`   Active (cancelled IS NULL): ${currentState.active_reservation_details}`);
        console.log(`   Cancelled (cancelled IS NOT NULL): ${currentState.cancelled_reservation_details}`);
        
        const roomCountQuery = `
            SELECT COUNT(DISTINCT room_id) as occupied_rooms
            FROM ${tableName} 
            WHERE date = $1 AND cancelled IS NULL
        `;
        
        const roomCountResult = await client.query(roomCountQuery, [date]);
        const occupiedRooms = roomCountResult.rows[0].occupied_rooms;
        
        console.log(`   Occupied rooms (distinct room_id): ${occupiedRooms}`);
        
        // 7. Check for duplicate room assignments (multiple active records for same room/date)
        console.log('\n🔍 Step 5: Checking for duplicate room assignments...');
        
        const duplicateRoomsQuery = `
            SELECT 
                room_id,
                COUNT(*) as record_count,
                ARRAY_AGG(id ORDER BY created_at) as record_ids,
                ARRAY_AGG(
                    COALESCE(
                        (SELECT COALESCE(c.name_kanji, c.name_kana, c.name) 
                         FROM reservations r 
                         LEFT JOIN clients c ON r.reservation_client_id = c.id 
                         WHERE r.id = rd.reservation_id), 
                        'Unknown Client'
                    ) ORDER BY created_at
                ) as guest_names,
                ARRAY_AGG(created_at ORDER BY created_at) as created_times
            FROM ${tableName} rd
            WHERE date = $1 AND cancelled IS NULL
            GROUP BY room_id
            HAVING COUNT(*) > 1
            ORDER BY room_id
        `;
        
        const duplicateRoomsResult = await client.query(duplicateRoomsQuery, [date]);
        const duplicateRooms = duplicateRoomsResult.rows;
        
        if (duplicateRooms.length > 0) {
            console.log(`   ⚠️  Found ${duplicateRooms.length} rooms with multiple active reservations:`);
            console.log('   Room | Count | Record IDs | Guest Names | Created Times');
            console.log('   ' + '-'.repeat(120));
            
            let totalDuplicateRecords = 0;
            
            for (const room of duplicateRooms) {
                const roomNum = room.room_id.toString().padEnd(4);
                const count = room.record_count.toString().padEnd(5);
                const ids = room.record_ids.map(id => id.substring(0, 8) + '...').join(', ');
                const names = room.guest_names.join(', ');
                const times = room.created_times.map(t => t.toISOString().split('T')[0]).join(', ');
                
                console.log(`   ${roomNum} | ${count} | ${ids}`);
                console.log(`        |       | Names: ${names}`);
                console.log(`        |       | Created: ${times}`);
                console.log('   ' + '-'.repeat(120));
                
                totalDuplicateRecords += room.record_count;
            }
            
            const extraRecords = totalDuplicateRecords - duplicateRooms.length;
            console.log(`   Total duplicate records: ${totalDuplicateRecords}`);
            console.log(`   Extra records (beyond 1 per room): ${extraRecords}`);
            console.log(`   Expected active count if no duplicates: ${currentState.active_reservation_details - extraRecords}`);
            
        } else {
            console.log('   ✅ No duplicate room assignments found');
        }
        
        // 8. Detailed analysis of specific room 203 (from your example)
        console.log('\n🔍 Step 6: Detailed analysis of room 203...');
        
        const room203Query = `
            SELECT 
                rd.id,
                rd.reservation_id,
                rd.created_at,
                rd.updated_by,
                rd.cancelled,
                COALESCE(
                    c.name_kanji,
                    c.name_kana, 
                    c.name,
                    'Unknown Client'
                ) as guest_name,
                r.check_in,
                r.check_out
            FROM ${tableName} rd
            LEFT JOIN reservations r ON rd.reservation_id = r.id
            LEFT JOIN clients c ON r.reservation_client_id = c.id
            WHERE rd.room_id = 203 AND rd.date = $1
            ORDER BY rd.created_at
        `;
        
        const room203Result = await client.query(room203Query, [date]);
        
        if (room203Result.rows.length > 0) {
            console.log(`   Found ${room203Result.rows.length} records for room 203 on ${date}:`);
            console.log('   ID                                   | Guest Name    | Status    | Created At          | Check-in   | Check-out');
            console.log('   ' + '-'.repeat(110));
            
            for (const record of room203Result.rows) {
                const id = record.id.substring(0, 8) + '...';
                const name = (record.guest_name || 'Unknown').substring(0, 12).padEnd(12);
                const status = (record.cancelled ? 'Cancelled' : 'Active').padEnd(9);
                const created = record.created_at.toISOString().split('T')[0] + ' ' + record.created_at.toISOString().split('T')[1].substring(0, 8);
                const checkin = record.check_in ? record.check_in.toISOString().split('T')[0] : 'N/A';
                const checkout = record.check_out ? record.check_out.toISOString().split('T')[0] : 'N/A';
                
                console.log(`   ${id.padEnd(36)} | ${name} | ${status} | ${created} | ${checkin.padEnd(10)} | ${checkout}`);
            }
        } else {
            console.log('   No records found for room 203');
        }
        
        console.log(`   Occupied rooms (distinct room_id): ${occupiedRooms}`);
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ Verification complete!');
        
        return {
            quickCount: quickCount,
            lifecycleActive: activeFromLogs.length,
            tableActive: actualActive.length,
            matching: matching.length,
            inLogsNotInTable: inLogsNotInTable.length,
            inTableNotInLogs: inTableNotInLogs.length,
            currentState: currentState,
            occupiedRooms: occupiedRooms,
            duplicateRooms: duplicateRooms?.length || 0,
            totalDuplicateRecords: duplicateRooms?.reduce((sum, room) => sum + room.record_count, 0) || 0,
            isExpectedState: quickCount.active_records === 28 && activeFromLogs.length === 43
        };
        
    } catch (error) {
        console.error('❌ Error during verification:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the verification
if (require.main === module) {
    verifyActiveReservations()
        .then(result => {
            console.log('\n📊 Final Results:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Script failed:', error);
            process.exit(1);
        });
}

module.exports = { verifyActiveReservations };