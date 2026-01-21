/**
 * Simple test to check CASCADE DELETE aware summary calculation
 */

require('dotenv').config();
const { generateSummary } = require('./models/ota/investigation');

async function testSummarySimple() {
    try {
        console.log('🔍 Testing CASCADE DELETE aware summary calculation...');
        
        // Mock lifecycle data with CASCADE DELETE aware information
        const mockLifecycleData = [
            { final_status: 'active', first_action: 'INSERT', last_action: 'UPDATE', parent_was_deleted: false },
            { final_status: 'active', first_action: 'INSERT', last_action: 'UPDATE', parent_was_deleted: false },
            { final_status: 'cancelled', first_action: 'INSERT', last_action: 'UPDATE', parent_was_deleted: false },
            { final_status: 'deleted', first_action: 'INSERT', last_action: 'DELETE', parent_was_deleted: false },
            { final_status: 'deleted', first_action: 'INSERT', last_action: 'DELETE', parent_was_deleted: true }, // CASCADE DELETE
        ];
        
        // Mock PMS events (empty for this test)
        const mockPMSEvents = [];
        const mockOTAEvents = [];
        const mockTimeline = [];
        
        // Generate summary with CASCADE DELETE aware data
        const summary = generateSummary(mockPMSEvents, mockOTAEvents, mockTimeline, mockLifecycleData);
        
        console.log('\n📊 Summary Result:');
        console.log('Operation Stats:', summary.operationStats);
        
        // Check if CASCADE DELETE aware statistics are present
        if (summary.operationStats.totalActive !== undefined) {
            console.log('\n✅ CASCADE DELETE aware statistics found:');
            console.log(`   Total Active: ${summary.operationStats.totalActive}`);
            console.log(`   Total Cancelled: ${summary.operationStats.totalCancelled}`);
            console.log(`   Total Deleted: ${summary.operationStats.totalDeleted}`);
            console.log(`   Cascade Deleted: ${summary.operationStats.cascadeDeleted}`);
            console.log(`   Net Room Change: ${summary.operationStats.netRoomChange}`);
            
            // Verify the calculation
            const expectedActive = 2;
            const expectedCancelled = 1;
            const expectedDeleted = 2;
            const expectedCascadeDeleted = 1;
            const expectedNetRoomChange = -2; // Active records reduce availability
            
            if (summary.operationStats.totalActive === expectedActive &&
                summary.operationStats.totalCancelled === expectedCancelled &&
                summary.operationStats.totalDeleted === expectedDeleted &&
                summary.operationStats.cascadeDeleted === expectedCascadeDeleted &&
                summary.operationStats.netRoomChange === expectedNetRoomChange) {
                
                console.log('\n🎉 SUCCESS: All CASCADE DELETE aware calculations are correct!');
                return { success: true, message: 'CASCADE DELETE aware calculation working' };
            } else {
                console.log('\n❌ FAILURE: CASCADE DELETE aware calculations are incorrect');
                return { success: false, message: 'Calculation mismatch' };
            }
        } else {
            console.log('\n❌ FAILURE: CASCADE DELETE aware statistics not found');
            return { success: false, message: 'CASCADE DELETE aware data not available' };
        }
        
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: error.message };
    }
}

// Run the test
if (require.main === module) {
    testSummarySimple()
        .then(result => {
            console.log('\n📊 Final Result:', result);
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testSummarySimple };