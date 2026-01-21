/**
 * Test script to simulate frontend API call to investigation controller
 */

require('dotenv').config();
const { investigateStock } = require('../../controllers/ota/investigationController');

async function testFrontendIntegration() {
    try {
        console.log('🔍 Testing frontend integration with investigation controller...');
        console.log('=' .repeat(80));
        
        // Simulate Express request/response objects
        const req = {
            query: {
                hotelId: '25',
                date: '2026-02-03'
            }
        };
        
        let responseData = null;
        let statusCode = null;
        
        const res = {
            status: (code) => {
                statusCode = code;
                return res;
            },
            json: (data) => {
                responseData = data;
                return res;
            }
        };
        
        console.log(`\n📊 Calling investigateStock API for Hotel ${req.query.hotelId} on ${req.query.date}...`);
        
        await investigateStock(req, res);
        
        console.log(`   Response Status: ${statusCode}`);
        
        if (statusCode === 200 && responseData) {
            console.log('\n✅ API call successful!');
            
            // Debug: Log the entire response structure
            console.log('\n🔍 Response Structure:');
            console.log('Keys:', Object.keys(responseData));
            if (responseData.summary) {
                console.log('Summary keys:', Object.keys(responseData.summary));
                if (responseData.summary.operationStats) {
                    console.log('OperationStats keys:', Object.keys(responseData.summary.operationStats));
                }
            }
            
            // Check current state
            const currentState = responseData.currentState;
            console.log('\n📊 Current State:');
            console.log(`   Total Rooms: ${currentState.totalRooms}`);
            console.log(`   Occupied Rooms: ${currentState.occupiedRooms}`);
            console.log(`   Active Reservation Details: ${currentState.activeReservationDetails}`);
            console.log(`   Cancelled Reservation Details: ${currentState.cancelledReservationDetails}`);
            console.log(`   Calculated Available Stock: ${currentState.calculatedAvailableStock}`);
            
            // Check reservation lifecycle
            const lifecycle = responseData.reservationLifecycle;
            console.log('\n📋 Reservation Lifecycle:');
            console.log(`   Total Records: ${lifecycle.length}`);
            
            const statusCounts = {
                active: lifecycle.filter(r => r.final_status === 'active').length,
                cancelled: lifecycle.filter(r => r.final_status === 'cancelled').length,
                deleted: lifecycle.filter(r => r.final_status === 'deleted').length
            };
            
            console.log(`   Active: ${statusCounts.active}`);
            console.log(`   Cancelled: ${statusCounts.cancelled}`);
            console.log(`   Deleted: ${statusCounts.deleted}`);
            
            // Check summary
            const summary = responseData.summary;
            console.log('\n📈 Summary:');
            console.log(`   Total PMS Events: ${summary.totalPMSEvents}`);
            console.log(`   Total OTA Events: ${summary.totalOTAEvents}`);
            console.log(`   Potential Gaps: ${summary.potentialGaps}`);
            console.log(`   Risk Level: ${summary.analysis.riskLevel}`);
            
            // Operation statistics
            if (summary.operationStats) {
                console.log('\n🔢 Operation Statistics:');
                console.log(`   Total Inserts: ${summary.operationStats.totalInserts}`);
                console.log(`   Total Deletes: ${summary.operationStats.totalDeletes}`);
                console.log(`   Total Updates: ${summary.operationStats.totalUpdates}`);
                console.log(`   Net Room Change: ${summary.operationStats.netRoomChange}`);
                
                // CASCADE DELETE aware statistics
                if (summary.operationStats.totalActive !== undefined) {
                    console.log('\n🎯 CASCADE DELETE Aware Statistics:');
                    console.log(`   Total Active: ${summary.operationStats.totalActive}`);
                    console.log(`   Total Cancelled: ${summary.operationStats.totalCancelled}`);
                    console.log(`   Total Deleted: ${summary.operationStats.totalDeleted}`);
                    console.log(`   Cascade Deleted: ${summary.operationStats.cascadeDeleted}`);
                    console.log(`   ✅ Using CASCADE DELETE aware calculation`);
                } else {
                    console.log('\n⚠️  Using fallback calculation (CASCADE DELETE aware data not available)');
                }
            }
            
            // Verify the fix
            console.log('\n🎯 CASCADE DELETE Fix Verification:');
            if (statusCounts.active === 28) {
                console.log('   ✅ SUCCESS: Active count matches expected (28)');
                console.log('   ✅ CASCADE DELETE fix is working correctly in the API');
            } else {
                console.log(`   ❌ ISSUE: Active count is ${statusCounts.active}, expected 28`);
            }
            
            // Check if our test record is correctly marked as deleted
            const testRecord = lifecycle.find(r => r.record_id && r.record_id.startsWith('08c9f122'));
            if (testRecord) {
                console.log(`   ✅ Test record 08c9f122 status: ${testRecord.final_status}`);
                if (testRecord.final_status === 'deleted') {
                    console.log('   ✅ Test record correctly identified as deleted');
                }
            }
            
        } else {
            console.log('❌ API call failed');
            console.log('Response:', responseData);
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ Frontend integration test complete!');
        
        return {
            success: statusCode === 200,
            statusCode,
            activeCount: responseData?.reservationLifecycle?.filter(r => r.final_status === 'active').length || 0,
            cascadeFixWorking: responseData?.reservationLifecycle?.filter(r => r.final_status === 'active').length === 28
        };
        
    } catch (error) {
        console.error('❌ Error during test:', error);
        throw error;
    }
}

// Run the test
if (require.main === module) {
    testFrontendIntegration()
        .then(result => {
            console.log('\n📊 Final Results:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testFrontendIntegration };