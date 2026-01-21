/**
 * Test script to check just the summary calculation with CASCADE DELETE fix
 */

require('dotenv').config();
const { investigateStock } = require('../../controllers/ota/investigationController');

async function testSummaryOnly() {
    try {
        console.log('🔍 Testing summary calculation with CASCADE DELETE fix...');
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
        
        if (statusCode === 200 && responseData) {
            console.log('\n✅ API call successful!');
            
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
                    
                    // Verification calculation
                    const currentState = responseData.currentState;
                    const totalRooms = currentState.totalRooms;
                    const currentAvailable = currentState.calculatedAvailableStock;
                    const expectedAvailable = totalRooms - summary.operationStats.totalActive;
                    const discrepancy = expectedAvailable - currentAvailable;
                    
                    console.log('\n🔍 Verification:');
                    console.log(`   Total Rooms: ${totalRooms}`);
                    console.log(`   Current Available: ${currentAvailable}`);
                    console.log(`   Expected Available: ${totalRooms} - ${summary.operationStats.totalActive} = ${expectedAvailable}`);
                    console.log(`   Discrepancy: ${discrepancy}`);
                    
                    if (discrepancy === 0) {
                        console.log('   ✅ SUCCESS: Calculation matches!');
                        return { success: true, message: '✅ 計算一致' };
                    } else {
                        console.log('   ❌ ISSUE: Calculation mismatch!');
                        return { success: false, message: `⚠️ 計算不一致: 期待値 ${expectedAvailable} vs 実際 ${currentAvailable} (差異: ${discrepancy})` };
                    }
                } else {
                    console.log('\n⚠️  Using fallback calculation (CASCADE DELETE aware data not available)');
                    return { success: false, message: 'CASCADE DELETE aware data not available' };
                }
            } else {
                console.log('\n❌ No operation statistics available');
                return { success: false, message: 'No operation statistics' };
            }
            
        } else {
            console.log('❌ API call failed');
            console.log('Response:', responseData);
            return { success: false, message: 'API call failed' };
        }
        
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: error.message };
    }
}

// Run the test
if (require.main === module) {
    testSummaryOnly()
        .then(result => {
            console.log('\n📊 Final Result:', result);
            console.log('\n' + '='.repeat(80));
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testSummaryOnly };