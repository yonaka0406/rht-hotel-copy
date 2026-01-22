/**
 * Test to understand CASCADE DELETE logs and the relationship between
 * parent reservation DELETE and child reservation_details DELETE logs
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function testCascadeDeleteLogs() {
    console.log('🔍 Testing CASCADE DELETE Logs Relationship');
    console.log('==========================================\n');
    
    const client = await pool.connect();
    try {
        // 1. Find parent reservation DELETE logs
        console.log('1. FINDING PARENT RESERVATION DELETE LOGS:');
        
        const parentDeletesQuery = `
            SELECT 
                lr.id as log_id,
                lr.log_time,
                lr.table_name,
                lr.changes->>'id' as deleted_reservation_id,
                (lr.changes->>'hotel_id')::int as hotel_id
            FROM logs_reservation lr
            WHERE 
                lr.action = 'DELETE'
                AND lr.table_name LIKE 'reservations_%'
                AND lr.log_time >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY lr.log_time DESC
            LIMIT 5
        `;
        
        const parentDeletesResult = await client.query(parentDeletesQuery);
        console.log(`   Found ${parentDeletesResult.rows.length} parent DELETE logs in last 7 days`);
        
        // 2. For each parent DELETE, look for related reservation_details DELETE logs
        for (const parentDelete of parentDeletesResult.rows) {
            console.log(`\n2. ANALYZING PARENT DELETE: ${parentDelete.log_id}`);
            console.log(`   Reservation ID: ${parentDelete.deleted_reservation_id}`);
            console.log(`   Hotel: ${parentDelete.hotel_id}`);
            console.log(`   Time: ${parentDelete.log_time}`);
            
            // Look for reservation_details DELETE logs with the same reservation_id
            const detailsDeletesQuery = `
                SELECT 
                    lr.id as log_id,
                    lr.record_id,
                    lr.log_time,
                    lr.table_name,
                    lr.changes->>'date' as affected_date,
                    lr.changes->>'room_id' as room_id,
                    lr.changes->>'reservation_id' as reservation_id,
                    (lr.changes->>'hotel_id')::int as hotel_id
                FROM logs_reservation lr
                WHERE 
                    lr.action = 'DELETE'
                    AND lr.table_name = 'reservation_details_' || $2
                    AND (lr.changes->>'reservation_id')::uuid = $1::uuid
                    AND lr.log_time BETWEEN $3::timestamp - INTERVAL '10 minutes' AND $3::timestamp + INTERVAL '10 minutes'
                ORDER BY lr.log_time ASC
            `;
            
            const detailsDeletesResult = await client.query(detailsDeletesQuery, [
                parentDelete.deleted_reservation_id,
                parentDelete.hotel_id,
                parentDelete.log_time
            ]);
            
            console.log(`   Found ${detailsDeletesResult.rows.length} related reservation_details DELETE logs:`);
            
            if (detailsDeletesResult.rows.length > 0) {
                detailsDeletesResult.rows.forEach((detail, i) => {
                    const timeDiff = Math.round((detail.log_time - parentDelete.log_time) / 1000);
                    console.log(`     ${i + 1}. Log ID: ${detail.log_id}, Record ID: ${detail.record_id}`);
                    console.log(`        Date: ${detail.affected_date}, Room: ${detail.room_id}`);
                    console.log(`        Time: ${detail.log_time} (${timeDiff}s after parent)`);
                });
                
                // 3. Test the corrected CASCADE DELETE query
                console.log('\n   Testing corrected CASCADE DELETE query:');
                
                const correctedQuery = `
                    WITH parent_delete AS (
                        SELECT 
                            lr.changes->>'id' as deleted_reservation_id,
                            (lr.changes->>'hotel_id')::int as hotel_id,
                            lr.table_name,
                            lr.log_time
                        FROM logs_reservation lr
                        WHERE lr.id = $1 
                        AND lr.table_name LIKE 'reservations_%'
                        AND lr.action = 'DELETE'
                    ),
                    related_details_deletes AS (
                        SELECT DISTINCT
                            rd_logs.record_id,
                            rd_logs.changes->>'date' as affected_date,
                            (rd_logs.changes->>'hotel_id')::int as hotel_id,
                            rd_logs.changes->>'room_id' as room_id
                        FROM parent_delete pd
                        JOIN logs_reservation rd_logs ON 
                            rd_logs.table_name = 'reservation_details_' || pd.hotel_id
                            AND rd_logs.action = 'DELETE'
                            AND (rd_logs.changes->>'reservation_id')::uuid = pd.deleted_reservation_id::uuid
                            AND rd_logs.log_time BETWEEN pd.log_time - INTERVAL '10 minutes' AND pd.log_time + INTERVAL '10 minutes'
                    )
                    SELECT 
                        rdd.record_id as id,
                        'DELETE' as action,
                        'reservation_details_' || pd.hotel_id as table_name,
                        rdd.affected_date as check_in,
                        rdd.affected_date as check_out,
                        pd.hotel_id
                    FROM parent_delete pd
                    CROSS JOIN related_details_deletes rdd
                    WHERE rdd.hotel_id = pd.hotel_id
                `;
                
                const correctedResult = await client.query(correctedQuery, [parentDelete.log_id]);
                console.log(`   Corrected query returned ${correctedResult.rows.length} rows:`);
                
                correctedResult.rows.forEach((row, i) => {
                    console.log(`     ${i + 1}. ID: ${row.id}, Date: ${row.check_in}, Hotel: ${row.hotel_id}`);
                });
                
                if (correctedResult.rows.length > 0) {
                    console.log('   ✅ CASCADE DELETE query works correctly!');
                } else {
                    console.log('   ❌ CASCADE DELETE query still returns no results');
                }
                
            } else {
                console.log('   📋 No related reservation_details DELETE logs found');
                console.log('   📋 This reservation may not have had reservation_details');
            }
            
            console.log('   ' + '─'.repeat(60));
        }
        
        // 4. Summary
        console.log('\n4. SUMMARY:');
        console.log('   Key insights for CASCADE DELETE handling:');
        console.log('   - Parent reservation DELETE creates log with reservation ID');
        console.log('   - Child reservation_details DELETEs create separate logs');
        console.log('   - Child logs contain reservation_id pointing to parent');
        console.log('   - Child logs contain affected dates and room information');
        console.log('   - Time difference is usually seconds, not minutes');
        console.log('');
        console.log('   For OTA triggers, we need to:');
        console.log('   1. Detect parent reservation DELETE log');
        console.log('   2. Find related reservation_details DELETE logs by reservation_id');
        console.log('   3. Extract affected dates from child DELETE logs');
        console.log('   4. Return those dates for OTA synchronization');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

testCascadeDeleteLogs().then(() => {
    console.log('\n✅ CASCADE DELETE logs test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});