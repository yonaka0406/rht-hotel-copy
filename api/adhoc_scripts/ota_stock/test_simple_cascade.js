/**
 * Simple test for CASCADE DELETE handling
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function testSimpleCascade() {
    console.log('🧪 Simple CASCADE DELETE Test');
    console.log('=============================\n');
    
    const client = await pool.connect();
    try {
        // Test the query directly
        const testQuery = `
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
            LIMIT 5
        `;
        
        // Find a DELETE log to test with
        const findDeleteQuery = `
            SELECT lr.id as log_id
            FROM logs_reservation lr
            WHERE 
                lr.action = 'DELETE'
                AND lr.table_name LIKE 'reservations_%'
                AND lr.log_time >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY lr.log_time DESC
            LIMIT 1
        `;
        
        const deleteLogResult = await client.query(findDeleteQuery);
        
        if (deleteLogResult.rows.length === 0) {
            console.log('❌ No DELETE logs found to test with');
            return;
        }
        
        const logId = deleteLogResult.rows[0].log_id;
        console.log(`Testing with DELETE log ID: ${logId}`);
        
        const result = await client.query(testQuery, [logId]);
        console.log(`Query returned ${result.rows.length} rows:`);
        
        result.rows.forEach((row, i) => {
            console.log(`  ${i + 1}. Date: ${row.check_in}, Hotel: ${row.hotel_id}, Action: ${row.action}`);
        });
        
        if (result.rows.length > 0) {
            console.log('✅ CASCADE DELETE query works correctly!');
        } else {
            console.log('⚠️  No CASCADE DELETE data found for this log');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        client.release();
    }
}

testSimpleCascade().then(() => {
    console.log('\n✅ Simple test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});