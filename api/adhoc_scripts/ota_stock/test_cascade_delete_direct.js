/**
 * Test the CASCADE DELETE query directly to see if it's working
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function testCascadeDeleteDirect() {
    console.log('🔍 Testing CASCADE DELETE Query Directly');
    console.log('=====================================\n');
    
    const client = await pool.connect();
    try {
        // 1. Find a recent parent reservation DELETE log
        console.log('1. FINDING RECENT PARENT DELETE LOG:');
        
        const parentDeleteQuery = `
            SELECT 
                lr.id as log_id,
                lr.log_time,
                lr.table_name,
                lr.changes->>'id' as deleted_reservation_id,
                (lr.changes->>'hotel_id')::int as hotel_id,
                lr.changes->>'check_in' as check_in,
                lr.changes->>'check_out' as check_out
            FROM logs_reservation lr
            WHERE 
                lr.action = 'DELETE'
                AND lr.table_name LIKE 'reservations_%'
                AND lr.log_time >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY lr.log_time DESC
            LIMIT 1
        `;
        
        const parentDeleteResult = await client.query(parentDeleteQuery);
        const parentDelete = parentDeleteResult.rows[0];
        
        console.log(`   Parent DELETE log: ${parentDelete.log_id}`);
        console.log(`   Reservation dates: ${parentDelete.check_in} to ${parentDelete.check_out}`);
        console.log(`   Hotel: ${parentDelete.hotel_id}`);
        
        // 2. Test the CASCADE DELETE query directly
        console.log('\n2. TESTING CASCADE DELETE QUERY DIRECTLY:');
        
        const cascadeQuery = `
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
        
        const cascadeResult = await client.query(cascadeQuery, [parentDelete.log_id]);
        
        console.log(`   CASCADE query returned ${cascadeResult.rows.length} rows:`);
        cascadeResult.rows.forEach((row, i) => {
            console.log(`     ${i + 1}. ID: ${row.id}, Date: ${row.check_in}, Hotel: ${row.hotel_id}`);
        });
        
        // 3. Check what the reservation query returns for this log
        console.log('\n3. TESTING RESERVATION QUERY:');
        
        const reservationQuery = `
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
        
        const reservationResult = await client.query(reservationQuery, [parentDelete.log_id]);
        
        console.log(`   Reservation query returned ${reservationResult.rows.length} rows:`);
        reservationResult.rows.forEach((row, i) => {
            console.log(`     ${i + 1}. ID: ${row.id}, Action: ${row.action}`);
            console.log(`        Dates: ${row.check_in} to ${row.check_out}`);
            console.log(`        Hotel: ${row.hotel_id}`);
        });
        
        // 4. Explain the logic
        console.log('\n4. LOGIC EXPLANATION:');
        console.log('   The OTA trigger functions work as follows:');
        console.log('   1. First, try the reservation query (for reservation-level changes)');
        console.log('   2. If no results, try the CASCADE DELETE query (for deleted reservations)');
        console.log('   3. If still no results, try the details query (for reservation_details changes)');
        console.log('');
        console.log('   In this case:');
        if (reservationResult.rows.length > 0) {
            console.log('   ✅ The reservation query found the DELETE, so it returns reservation-level info');
            console.log('   ✅ This is correct - OTA needs the overall date range, not individual dates');
            console.log('   ✅ The CASCADE DELETE query is available as fallback if needed');
        } else {
            console.log('   ⚠️  The reservation query found nothing, CASCADE DELETE query should be used');
            if (cascadeResult.rows.length > 0) {
                console.log('   ✅ CASCADE DELETE query works and would return individual dates');
            } else {
                console.log('   ❌ CASCADE DELETE query also returns nothing - there may be an issue');
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

testCascadeDeleteDirect().then(() => {
    console.log('\n✅ CASCADE DELETE direct test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});