/**
 * Debug the CASCADE DELETE query to understand why it's not finding data
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function debugCascadeQuery() {
    console.log('🔍 Debugging CASCADE DELETE Query');
    console.log('=================================\n');
    
    const client = await pool.connect();
    try {
        // 1. Find a DELETE log and examine its structure
        console.log('1. EXAMINING DELETE LOG STRUCTURE:');
        
        const deleteLogQuery = `
            SELECT 
                lr.id as log_id,
                lr.log_time,
                lr.table_name,
                lr.action,
                lr.changes
            FROM logs_reservation lr
            WHERE 
                lr.action = 'DELETE'
                AND lr.table_name LIKE 'reservations_%'
                AND lr.log_time >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY lr.log_time DESC
            LIMIT 3
        `;
        
        const deleteLogResult = await client.query(deleteLogQuery);
        console.log(`Found ${deleteLogResult.rows.length} DELETE logs:`);
        
        deleteLogResult.rows.forEach((log, i) => {
            console.log(`\n   ${i + 1}. Log ID: ${log.log_id}`);
            console.log(`      Time: ${log.log_time}`);
            console.log(`      Table: ${log.table_name}`);
            console.log(`      Changes: ${JSON.stringify(log.changes, null, 2)}`);
            
            // Extract hotel_id and reservation_id
            const hotelId = log.changes.hotel_id;
            const reservationId = log.changes.id;
            
            console.log(`      Hotel ID: ${hotelId}`);
            console.log(`      Reservation ID: ${reservationId}`);
        });
        
        // 2. For the first DELETE log, check if reservation_details exist
        if (deleteLogResult.rows.length > 0) {
            const firstLog = deleteLogResult.rows[0];
            const hotelId = firstLog.changes.hotel_id;
            const reservationId = firstLog.changes.id;
            
            console.log(`\n2. CHECKING RESERVATION_DETAILS FOR DELETED RESERVATION:`);
            console.log(`   Reservation ID: ${reservationId}`);
            console.log(`   Hotel ID: ${hotelId}`);
            
            // Check if reservation_details exist for this reservation
            const detailsQuery = `
                SELECT 
                    date,
                    room_id,
                    cancelled,
                    hotel_id
                FROM reservation_details
                WHERE reservation_id = $1
                ORDER BY date
            `;
            
            const detailsResult = await client.query(detailsQuery, [reservationId]);
            console.log(`   Found ${detailsResult.rows.length} reservation_details records:`);
            
            if (detailsResult.rows.length > 0) {
                detailsResult.rows.forEach((detail, i) => {
                    console.log(`     ${i + 1}. Date: ${detail.date}, Room: ${detail.room_id}, Hotel: ${detail.hotel_id}, Cancelled: ${detail.cancelled || 'null'}`);
                });
                
                // 3. Test the CASCADE query with correct table name
                console.log(`\n3. TESTING CASCADE QUERY WITH DYNAMIC TABLE NAME:`);
                
                const cascadeQuery = `
                    WITH parent_delete AS (
                        SELECT 
                            lr.changes->>'id' as deleted_reservation_id,
                            (lr.changes->>'hotel_id')::int as hotel_id,
                            lr.table_name
                        FROM logs_reservation lr
                        WHERE lr.id = $1 
                        AND lr.table_name LIKE 'reservations_%'
                        AND lr.action = 'DELETE'
                    )
                    SELECT 
                        pd.deleted_reservation_id::uuid as reservation_id,
                        'DELETE' as action,
                        'reservation_details_' || pd.hotel_id as table_name,
                        rd.date as check_in,
                        rd.date as check_out,
                        pd.hotel_id
                    FROM parent_delete pd
                    JOIN reservation_details rd ON rd.reservation_id = pd.deleted_reservation_id::uuid
                    WHERE rd.hotel_id = pd.hotel_id
                `;
                
                const cascadeResult = await client.query(cascadeQuery, [firstLog.log_id]);
                console.log(`   CASCADE query returned ${cascadeResult.rows.length} rows:`);
                
                if (cascadeResult.rows.length > 0) {
                    cascadeResult.rows.forEach((row, i) => {
                        console.log(`     ${i + 1}. Date: ${row.check_in}, Hotel: ${row.hotel_id}, Action: ${row.action}`);
                    });
                    console.log('   ✅ CASCADE DELETE query works correctly!');
                } else {
                    console.log('   ❌ CASCADE query returned no results');
                    
                    // Debug: check if the issue is with the JOIN
                    console.log('\n   Debugging JOIN issue:');
                    
                    const debugQuery = `
                        SELECT 
                            lr.changes->>'id' as deleted_reservation_id,
                            (lr.changes->>'hotel_id')::int as hotel_id
                        FROM logs_reservation lr
                        WHERE lr.id = $1 
                        AND lr.table_name LIKE 'reservations_%'
                        AND lr.action = 'DELETE'
                    `;
                    
                    const debugResult = await client.query(debugQuery, [firstLog.log_id]);
                    if (debugResult.rows.length > 0) {
                        const debug = debugResult.rows[0];
                        console.log(`     Parent delete data: ID=${debug.deleted_reservation_id}, Hotel=${debug.hotel_id}`);
                        
                        // Check if reservation_details still exist (they shouldn't if CASCADE worked)
                        const stillExistQuery = `
                            SELECT COUNT(*) as count
                            FROM reservation_details
                            WHERE reservation_id = $1 AND hotel_id = $2
                        `;
                        
                        const stillExistResult = await client.query(stillExistQuery, [debug.deleted_reservation_id, debug.hotel_id]);
                        const stillExist = parseInt(stillExistResult.rows[0].count);
                        
                        if (stillExist === 0) {
                            console.log('     📋 Reservation_details were CASCADE deleted (no longer exist)');
                            console.log('     📋 This is why the JOIN returns no results');
                            console.log('     📋 We need to get the details from the log before deletion');
                        } else {
                            console.log(`     📋 Reservation_details still exist (${stillExist} records)`);
                        }
                    }
                }
                
            } else {
                console.log('   📋 No reservation_details found for this reservation');
            }
        }
        
        // 4. Conclusion
        console.log('\n4. ANALYSIS CONCLUSION:');
        console.log('   The CASCADE DELETE query issue is likely because:');
        console.log('   - When parent reservation is deleted, child reservation_details are CASCADE deleted');
        console.log('   - By the time we check, the reservation_details no longer exist');
        console.log('   - We need to capture the reservation_details BEFORE the CASCADE happens');
        console.log('   - Alternative: Store affected dates in the parent DELETE log changes');
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

debugCascadeQuery().then(() => {
    console.log('\n✅ CASCADE DELETE debug completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Debug error:', error);
    process.exit(1);
});