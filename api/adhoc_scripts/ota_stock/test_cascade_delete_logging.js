/**
 * Test script to verify if CASCADE DELETE operations are being logged
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function testCascadeDeleteLogging() {
    const client = await pool.connect();
    
    try {
        const hotelId = 25;
        const date = '2026-02-03';
        const tableName = `reservation_details_${hotelId}`;
        
        console.log('🔍 Testing CASCADE DELETE Logging');
        console.log('=' .repeat(80));
        
        // Get some reservation_details that don't exist in the table but have logs
        console.log('\n📋 Step 1: Finding reservation_details with logs but missing from table...');
        
        const missingRecordsQuery = `
            SELECT DISTINCT lr.record_id
            FROM logs_reservation lr
            WHERE lr.table_name = $1
            AND (lr.changes->>'date')::date = $2
            AND lr.record_id NOT IN (
                SELECT id FROM ${tableName} WHERE date = $2
            )
            LIMIT 5
        `;
        
        const missingRecordsResult = await client.query(missingRecordsQuery, [tableName, date]);
        
        console.log(`   Found ${missingRecordsResult.rows.length} records with logs but missing from table`);
        
        for (const record of missingRecordsResult.rows) {
            const recordId = record.record_id;
            console.log(`\n🔍 === ANALYZING RECORD: ${recordId.substring(0, 8)}... ===`);
            
            // Get all logs for this record
            const logsQuery = `
                SELECT log_time, action, changes
                FROM logs_reservation
                WHERE record_id = $1 AND table_name = $2
                ORDER BY log_time ASC
            `;
            
            const logsResult = await client.query(logsQuery, [recordId, tableName]);
            
            console.log(`   Found ${logsResult.rows.length} log entries:`);
            
            let hasDeleteLog = false;
            let reservationId = null;
            
            for (const log of logsResult.rows) {
                const time = log.log_time.toISOString().replace('T', ' ').substring(0, 19);
                const action = log.action;
                
                if (action === 'DELETE') {
                    hasDeleteLog = true;
                }
                
                // Extract reservation_id
                if (log.changes) {
                    if (action === 'INSERT' || action === 'DELETE') {
                        reservationId = log.changes.reservation_id;
                    } else if (action === 'UPDATE') {
                        reservationId = log.changes.new?.reservation_id || log.changes.old?.reservation_id;
                    }
                }
                
                console.log(`      ${time} | ${action}`);
            }
            
            console.log(`   Has DELETE log: ${hasDeleteLog ? '✅ YES' : '❌ NO'}`);
            
            if (reservationId) {
                console.log(`   Parent reservation: ${reservationId.substring(0, 8)}...`);
                
                // Check if parent reservation exists (try both global and hotel-specific tables)
                const parentExistsQuery = `
                    SELECT id, status FROM reservations WHERE id = $1
                    UNION ALL
                    SELECT id, status FROM reservations_${hotelId} WHERE id = $1
                    LIMIT 1
                `;
                
                const parentExistsResult = await client.query(parentExistsQuery, [reservationId]);
                
                if (parentExistsResult.rows.length > 0) {
                    console.log(`   Parent reservation EXISTS (status: ${parentExistsResult.rows[0].status})`);
                } else {
                    console.log('   Parent reservation DELETED');
                    
                    // Check if there are DELETE logs for the parent (both tables)
                    const parentDeleteQuery = `
                        SELECT log_time, action, table_name
                        FROM logs_reservation
                        WHERE record_id = $1 AND table_name IN ('reservations', 'reservations_${hotelId}') AND action = 'DELETE'
                    `;
                    
                    const parentDeleteResult = await client.query(parentDeleteQuery, [reservationId]);
                    
                    if (parentDeleteResult.rows.length > 0) {
                        console.log(`   ✅ Parent reservation DELETE is logged in ${parentDeleteResult.rows[0].table_name}`);
                        console.log('   💡 But child reservation_detail DELETE was NOT logged (CASCADE)');
                    } else {
                        console.log('   ❌ Parent reservation DELETE is NOT logged in either table');
                        console.log('   🤔 Parent may have been deleted before logging was implemented');
                    }
                }
            }
            
            console.log('   ' + '-'.repeat(60));
        }
        
        // Test 2: Look for explicit DELETE logs in reservation_details
        console.log('\n📋 Step 2: Checking for any DELETE logs in reservation_details...');
        
        const deleteLogsQuery = `
            SELECT 
                COUNT(*) as delete_count,
                COUNT(DISTINCT record_id) as unique_records_deleted
            FROM logs_reservation
            WHERE table_name = $1 AND action = 'DELETE'
        `;
        
        const deleteLogsResult = await client.query(deleteLogsQuery, [tableName]);
        const deleteStats = deleteLogsResult.rows[0];
        
        console.log(`   Total DELETE logs in ${tableName}: ${deleteStats.delete_count}`);
        console.log(`   Unique records with DELETE logs: ${deleteStats.unique_records_deleted}`);
        
        if (parseInt(deleteStats.delete_count) > 0) {
            console.log('\n   Sample DELETE logs:');
            
            const sampleDeletesQuery = `
                SELECT log_time, record_id, changes
                FROM logs_reservation
                WHERE table_name = $1 AND action = 'DELETE'
                ORDER BY log_time DESC
                LIMIT 5
            `;
            
            const sampleDeletesResult = await client.query(sampleDeletesQuery, [tableName]);
            
            for (const deleteLog of sampleDeletesResult.rows) {
                const time = deleteLog.log_time.toISOString().replace('T', ' ').substring(0, 19);
                const recordId = deleteLog.record_id.substring(0, 8);
                const roomId = deleteLog.changes?.room_id || 'N/A';
                
                console.log(`      ${time} | ${recordId}... | Room: ${roomId}`);
            }
        } else {
            console.log('   🚨 NO DELETE logs found for reservation_details!');
            console.log('   💡 This confirms that CASCADE DELETE operations are NOT being logged');
        }
        
        // Test 3: Check reservation DELETE logs (both global and hotel-specific)
        console.log('\n📋 Step 3: Checking for DELETE logs in reservations tables...');
        
        // Check global reservations table
        const reservationDeletesQuery = `
            SELECT 
                COUNT(*) as delete_count,
                COUNT(DISTINCT record_id) as unique_reservations_deleted
            FROM logs_reservation
            WHERE table_name = 'reservations' AND action = 'DELETE'
        `;
        
        const reservationDeletesResult = await client.query(reservationDeletesQuery);
        const reservationDeleteStats = reservationDeletesResult.rows[0];
        
        console.log(`   Total DELETE logs in 'reservations': ${reservationDeleteStats.delete_count}`);
        
        // Check hotel-specific reservations table
        const hotelReservationTable = `reservations_${hotelId}`;
        const hotelReservationDeletesQuery = `
            SELECT 
                COUNT(*) as delete_count,
                COUNT(DISTINCT record_id) as unique_reservations_deleted
            FROM logs_reservation
            WHERE table_name = $1 AND action = 'DELETE'
        `;
        
        const hotelReservationDeletesResult = await client.query(hotelReservationDeletesQuery, [hotelReservationTable]);
        const hotelReservationDeleteStats = hotelReservationDeletesResult.rows[0];
        
        console.log(`   Total DELETE logs in '${hotelReservationTable}': ${hotelReservationDeleteStats.delete_count}`);
        
        // Show samples from whichever table has DELETE logs
        const totalReservationDeletes = parseInt(reservationDeleteStats.delete_count) + parseInt(hotelReservationDeleteStats.delete_count);
        
        if (totalReservationDeletes > 0) {
            console.log('\n   Sample reservation DELETE logs:');
            
            if (parseInt(reservationDeleteStats.delete_count) > 0) {
                console.log('   From global reservations table:');
                const sampleReservationDeletesQuery = `
                    SELECT log_time, record_id, changes
                    FROM logs_reservation
                    WHERE table_name = 'reservations' AND action = 'DELETE'
                    ORDER BY log_time DESC
                    LIMIT 3
                `;
                
                const sampleReservationDeletesResult = await client.query(sampleReservationDeletesQuery);
                
                for (const deleteLog of sampleReservationDeletesResult.rows) {
                    const time = deleteLog.log_time.toISOString().replace('T', ' ').substring(0, 19);
                    const recordId = deleteLog.record_id.substring(0, 8);
                    const status = deleteLog.changes?.status || 'N/A';
                    
                    console.log(`      ${time} | ${recordId}... | Status was: ${status}`);
                }
            }
            
            if (parseInt(hotelReservationDeleteStats.delete_count) > 0) {
                console.log(`   From ${hotelReservationTable} table:`);
                const sampleHotelReservationDeletesQuery = `
                    SELECT log_time, record_id, changes
                    FROM logs_reservation
                    WHERE table_name = $1 AND action = 'DELETE'
                    ORDER BY log_time DESC
                    LIMIT 3
                `;
                
                const sampleHotelReservationDeletesResult = await client.query(sampleHotelReservationDeletesQuery, [hotelReservationTable]);
                
                for (const deleteLog of sampleHotelReservationDeletesResult.rows) {
                    const time = deleteLog.log_time.toISOString().replace('T', ' ').substring(0, 19);
                    const recordId = deleteLog.record_id.substring(0, 8);
                    const status = deleteLog.changes?.status || 'N/A';
                    
                    console.log(`      ${time} | ${recordId}... | Status was: ${status}`);
                }
            }
        }
        
        // Conclusion
        console.log('\n📊 CONCLUSION:');
        
        if (parseInt(deleteStats.delete_count) > 0 && totalReservationDeletes > 0) {
            console.log('   ✅ Both reservation_details and reservations have DELETE logs');
            console.log('   📋 Evidence:');
            console.log(`      • ${totalReservationDeletes} reservation DELETE logs found`);
            console.log(`      • ${deleteStats.delete_count} reservation_details DELETE logs found`);
            console.log('   💡 Some deletions are logged, others may be CASCADE or pre-logging');
            console.log('   🔧 SOLUTION: Check both DELETE logs AND parent reservation existence');
        } else if (parseInt(deleteStats.delete_count) > 0 && totalReservationDeletes === 0) {
            console.log('   🎯 reservation_details DELETE logs exist, but NO reservation DELETE logs');
            console.log('   📋 Evidence:');
            console.log(`      • 0 reservation DELETE logs found`);
            console.log(`      • ${deleteStats.delete_count} reservation_details DELETE logs found`);
            console.log('   💡 Reservation deletions are not being logged (CASCADE issue)');
            console.log('   ✅ SOLUTION: Check parent reservation existence in lifecycle query');
        } else if (parseInt(deleteStats.delete_count) === 0 && totalReservationDeletes === 0) {
            console.log('   🤔 No DELETE logs found for either table');
            console.log('   💭 Possible reasons:');
            console.log('      • Logging was implemented after most deletions occurred');
            console.log('      • DELETE operations are not being logged at all');
            console.log('      • Deletions happen through different mechanisms');
        } else {
            console.log('   ℹ️  Mixed situation - need further investigation');
            console.log(`   reservation DELETE logs: ${totalReservationDeletes}`);
            console.log(`   reservation_details DELETE logs: ${deleteStats.delete_count}`);
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ CASCADE DELETE logging test complete!');
        
    } catch (error) {
        console.error('❌ Error during test:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the test
if (require.main === module) {
    testCascadeDeleteLogging()
        .then(() => {
            console.log('\n📊 Test complete!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testCascadeDeleteLogging };