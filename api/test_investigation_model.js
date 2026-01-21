/**
 * Test script to directly test the investigation model with CASCADE DELETE fix
 */

require('dotenv').config();
const { getReservationLifecycle } = require('./models/ota/investigation');

async function testInvestigationModel() {
    try {
        const hotelId = 25;
        const date = '2026-02-03';
        
        console.log('🔍 Testing investigation model with CASCADE DELETE fix...');
        console.log('=' .repeat(80));
        
        console.log(`\n📊 Getting reservation lifecycle for Hotel ${hotelId} on ${date}...`);
        
        const lifecycle = await getReservationLifecycle(hotelId, date);
        
        console.log(`   Found ${lifecycle.length} total records in lifecycle`);
        
        // Count by status
        const statusCounts = {
            active: lifecycle.filter(r => r.final_status === 'active').length,
            cancelled: lifecycle.filter(r => r.final_status === 'cancelled').length,
            deleted: lifecycle.filter(r => r.final_status === 'deleted').length
        };
        
        console.log(`   Active: ${statusCounts.active}`);
        console.log(`   Cancelled: ${statusCounts.cancelled}`);
        console.log(`   Deleted: ${statusCounts.deleted}`);
        
        // Show first few records with CASCADE DELETE info
        console.log('\n📋 First 10 records with CASCADE DELETE detection:');
        console.log('   ID                                   | Final Status | Parent Deleted | Last Action');
        console.log('   ' + '-'.repeat(90));
        
        for (const record of lifecycle.slice(0, 10)) {
            const id = record.record_id.substring(0, 8) + '...';
            const status = record.final_status.padEnd(12);
            const parentDeleted = (record.parent_was_deleted ? 'YES' : 'NO').padEnd(14);
            const lastAction = record.last_action.padEnd(11);
            
            console.log(`   ${id.padEnd(36)} | ${status} | ${parentDeleted} | ${lastAction}`);
        }
        
        // Check if the CASCADE DELETE fix is working for our test record
        const testRecord = lifecycle.find(r => r.record_id.startsWith('08c9f122'));
        
        if (testRecord) {
            console.log('\n🎯 Test record 08c9f122 analysis:');
            console.log(`   Final Status: ${testRecord.final_status}`);
            console.log(`   Parent Was Deleted: ${testRecord.parent_was_deleted}`);
            console.log(`   Last Action: ${testRecord.last_action}`);
            console.log(`   Last Cancelled Status: ${testRecord.last_cancelled_status}`);
            
            if (testRecord.final_status === 'deleted' && testRecord.parent_was_deleted) {
                console.log('   ✅ CASCADE DELETE fix is working correctly!');
            } else {
                console.log('   ❌ CASCADE DELETE fix is not working correctly');
            }
        } else {
            console.log('\n❌ Test record 08c9f122 not found in lifecycle results');
        }
        
        // Expected vs actual comparison
        console.log('\n📊 COMPARISON:');
        console.log(`   Expected active records (from table): 28`);
        console.log(`   Actual active records (from lifecycle): ${statusCounts.active}`);
        
        if (statusCounts.active === 28) {
            console.log('   ✅ SUCCESS: CASCADE DELETE fix resolved the discrepancy!');
        } else {
            console.log(`   ❌ ISSUE: Still ${statusCounts.active - 28} extra active records`);
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ Investigation model test complete!');
        
        return {
            totalRecords: lifecycle.length,
            statusCounts,
            cascadeFixWorking: statusCounts.active === 28
        };
        
    } catch (error) {
        console.error('❌ Error during test:', error);
        throw error;
    }
}

// Run the test
if (require.main === module) {
    testInvestigationModel()
        .then(result => {
            console.log('\n📊 Final Results:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testInvestigationModel };