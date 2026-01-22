/**
 * Test the updated selectReservationInventoryChange and selectReservationGoogleInventoryChange
 * functions with CASCADE DELETE scenarios
 */

require('dotenv').config();
const { pool } = require('../../config/database');
const { selectReservationInventoryChange, selectReservationGoogleInventoryChange } = require('../../models/log');

async function testCascadeDeleteHandling() {
    console.log('🔍 Testing CASCADE DELETE Handling in OTA Trigger Functions');
    console.log('=======================================================\n');
    
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
                (lr.changes->>'hotel_id')::int as hotel_id
            FROM logs_reservation lr
            WHERE 
                lr.action = 'DELETE'
                AND lr.table_name LIKE 'reservations_%'
                AND lr.log_time >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY lr.log_time DESC
            LIMIT 1
        `;
        
        const parentDeleteResult = await client.query(parentDeleteQuery);
        
        if (parentDeleteResult.rows.length === 0) {
            console.log('   ❌ No parent DELETE logs found in last 7 days');
            return;
        }
        
        const parentDelete = parentDeleteResult.rows[0];
        console.log(`   ✅ Found parent DELETE log: ${parentDelete.log_id}`);
        console.log(`   Reservation ID: ${parentDelete.deleted_reservation_id}`);
        console.log(`   Hotel: ${parentDelete.hotel_id}`);
        console.log(`   Time: ${parentDelete.log_time}`);
        
        // 2. Test selectReservationInventoryChange with this parent DELETE log
        console.log('\n2. TESTING selectReservationInventoryChange:');
        
        try {
            const inventoryResult = await selectReservationInventoryChange('default', parentDelete.log_id);
            console.log(`   ✅ Function returned ${inventoryResult.length} rows:`);
            
            inventoryResult.forEach((row, i) => {
                console.log(`     ${i + 1}. ID: ${row.id}, Action: ${row.action}`);
                console.log(`        Table: ${row.table_name}`);
                console.log(`        Date: ${row.check_in} - ${row.check_out}`);
                console.log(`        Hotel: ${row.hotel_id}`);
            });
            
            if (inventoryResult.length > 0) {
                console.log('   ✅ CASCADE DELETE handling works for selectReservationInventoryChange!');
            } else {
                console.log('   ❌ No results returned - CASCADE DELETE handling may not be working');
            }
            
        } catch (error) {
            console.log(`   ❌ Error in selectReservationInventoryChange: ${error.message}`);
        }
        
        // 3. Test selectReservationGoogleInventoryChange with this parent DELETE log
        console.log('\n3. TESTING selectReservationGoogleInventoryChange:');
        
        try {
            const googleResult = await selectReservationGoogleInventoryChange('default', parentDelete.log_id);
            console.log(`   ✅ Function returned ${googleResult.length} rows:`);
            
            googleResult.forEach((row, i) => {
                console.log(`     ${i + 1}. ID: ${row.id}, Action: ${row.action}`);
                console.log(`        Table: ${row.table_name}`);
                console.log(`        Date: ${row.check_in} - ${row.check_out}`);
                console.log(`        Hotel: ${row.hotel_id}`);
            });
            
            if (googleResult.length > 0) {
                console.log('   ✅ CASCADE DELETE handling works for selectReservationGoogleInventoryChange!');
            } else {
                console.log('   ❌ No results returned - CASCADE DELETE handling may not be working');
            }
            
        } catch (error) {
            console.log(`   ❌ Error in selectReservationGoogleInventoryChange: ${error.message}`);
        }
        
        // 4. Verify the results match what we expect
        console.log('\n4. VERIFICATION:');
        
        const verificationQuery = `
            SELECT COUNT(*) as expected_count
            FROM logs_reservation lr
            WHERE 
                lr.action = 'DELETE'
                AND lr.table_name = 'reservation_details_' || $2
                AND (lr.changes->>'reservation_id')::uuid = $1::uuid
                AND lr.log_time BETWEEN $3::timestamp - INTERVAL '10 minutes' AND $3::timestamp + INTERVAL '10 minutes'
        `;
        
        const verificationResult = await client.query(verificationQuery, [
            parentDelete.deleted_reservation_id,
            parentDelete.hotel_id,
            parentDelete.log_time
        ]);
        
        const expectedCount = parseInt(verificationResult.rows[0].expected_count);
        console.log(`   Expected ${expectedCount} reservation_details DELETE logs`);
        
        // Compare with actual function results
        const inventoryCount = await selectReservationInventoryChange('default', parentDelete.log_id);
        const googleCount = await selectReservationGoogleInventoryChange('default', parentDelete.log_id);
        
        console.log(`   selectReservationInventoryChange returned: ${inventoryCount.length} rows`);
        console.log(`   selectReservationGoogleInventoryChange returned: ${googleCount.length} rows`);
        
        if (inventoryCount.length === expectedCount && googleCount.length === expectedCount) {
            console.log('   ✅ All functions return the expected number of rows!');
        } else {
            console.log('   ⚠️  Row counts don\'t match expected values');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
    }
}

testCascadeDeleteHandling().then(() => {
    console.log('\n✅ CASCADE DELETE handling test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});