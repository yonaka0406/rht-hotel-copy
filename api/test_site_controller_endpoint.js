/**
 * Test the actual site-controller endpoint for 山本塗装店 log IDs
 */

require('dotenv').config();
const { selectReservationInventoryChange } = require('./models/log');

async function main() {
    console.log('🔍 Testing site-controller endpoint for 山本塗装店 log IDs...\n');
    
    try {
        // Test the actual function that the endpoint calls
        const logIds = [4225917, 4225996]; // From our previous investigation
        
        for (const logId of logIds) {
            console.log(`Testing log ID ${logId}:`);
            
            try {
                const result = await selectReservationInventoryChange('test-request', logId);
                
                if (result && result.length > 0) {
                    console.log(`  ✅ Returns data - SHOULD trigger OTA`);
                    console.log(`  Result:`, JSON.stringify(result, null, 2));
                } else {
                    console.log(`  ❌ Returns empty - would NOT trigger OTA`);
                    console.log(`  Result:`, result);
                }
            } catch (error) {
                console.log(`  ❌ Error: ${error.message}`);
            }
            
            console.log('');
        }
        
        // Also test what happens if we simulate the full chain
        console.log('🔍 SIMULATING FULL TRIGGER CHAIN:');
        console.log('1. reservation_log_inserted notification sent ✅');
        console.log('2. Node.js listener receives notification ✅');
        console.log('3. Calls /api/log/reservation-inventory/${logId}/site-controller');
        console.log('4. selectReservationInventoryChange function called');
        console.log('5. If data returned, calls inventory endpoint');
        console.log('6. If inventory data, calls OTA endpoint');
        
        console.log('\n🔧 POTENTIAL FAILURE POINTS:');
        console.log('- Node.js process not running during 2026-01-16 11:04-11:05 JST');
        console.log('- Database connection issues');
        console.log('- HTTP fetch failures (network/timeout)');
        console.log('- OTA service down or returning errors');
        console.log('- Environment check (NODE_ENV !== "production")');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

main();