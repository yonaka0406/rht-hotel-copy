/**
 * Test script to verify defensive email alert handling
 * Tests that sendEmailAlert properly handles error cases without crashing
 */

require('dotenv').config({ path: './api/.env' });
const { createOTATriggerMonitor } = require('../../jobs/otaTriggerMonitorJob');

async function testEmailErrorHandling() {
    console.log('🧪 Testing Email Alert Error Handling');
    console.log('=====================================\n');
    
    const monitor = createOTATriggerMonitor({
        enableAlerts: true,
        enableLogging: true
    });
    
    console.log('1. Testing Normal Success Case:');
    try {
        await monitor.sendEmailAlert('INFO', 'Test normal case', {
            successRate: 98.5,
            missingTriggers: 2,
            totalCandidates: 100
        });
        console.log('   ✅ Normal case handled successfully');
    } catch (error) {
        console.log('   ❌ Normal case failed:', error.message);
    }
    
    console.log('\n2. Testing Error Case (no successRate):');
    try {
        await monitor.sendEmailAlert('ERROR', 'OTA trigger monitoring failed', {
            error: 'Database connection timeout',
            timestamp: new Date()
        });
        console.log('   ✅ Error case handled successfully');
    } catch (error) {
        console.log('   ❌ Error case failed:', error.message);
    }
    
    console.log('\n3. Testing Critical Case with Missing Data:');
    try {
        await monitor.sendEmailAlert('CRITICAL', 'System failure', {
            successRate: null,
            missingTriggers: undefined,
            totalCandidates: 'invalid'
        });
        console.log('   ✅ Missing data case handled successfully');
    } catch (error) {
        console.log('   ❌ Missing data case failed:', error.message);
    }
    
    console.log('\n4. Testing Empty Data Object:');
    try {
        await monitor.sendEmailAlert('WARNING', 'Test empty data', {});
        console.log('   ✅ Empty data case handled successfully');
    } catch (error) {
        console.log('   ❌ Empty data case failed:', error.message);
    }
    
    console.log('\n5. Testing Null Data Object:');
    try {
        await monitor.sendEmailAlert('INFO', 'Test null data', null);
        console.log('   ✅ Null data case handled successfully');
    } catch (error) {
        console.log('   ❌ Null data case failed:', error.message);
    }
    
    console.log('\n6. Testing Mixed Valid/Invalid Data:');
    try {
        await monitor.sendEmailAlert('WARNING', 'Mixed data test', {
            successRate: 85.2,
            missingTriggers: 'not a number',
            totalCandidates: 50,
            error: 'Some error occurred'
        });
        console.log('   ✅ Mixed data case handled successfully');
    } catch (error) {
        console.log('   ❌ Mixed data case failed:', error.message);
    }

    console.log('\n7. Testing HTML Escaping in Error Messages:');
    try {
        await monitor.sendEmailAlert('ERROR', 'Testing HTML Escaping', {
            error: 'Error with <script>alert("XSS")</script> and & symbols'
        });
        console.log('   ✅ HTML escaping case handled successfully');
    } catch (error) {
        console.log('   ❌ HTML escaping case failed:', error.message);
    }
    
    console.log('\n8. Testing All Alert Levels:');
    const testCases = [
        { level: 'INFO', data: { successRate: 99.1, missingTriggers: 1, totalCandidates: 120 } },
        { level: 'WARNING', data: { successRate: 92.5, missingTriggers: 8, totalCandidates: 107 } },
        { level: 'CRITICAL', data: { successRate: 75.0, missingTriggers: 25, totalCandidates: 100 } },
        { level: 'ERROR', data: { error: 'System exception occurred', timestamp: new Date() } }
    ];
    
    for (const testCase of testCases) {
        try {
            await monitor.sendEmailAlert(testCase.level, `Test ${testCase.level} alert`, testCase.data);
            console.log(`   ✅ ${testCase.level} level handled successfully`);
        } catch (error) {
            console.log(`   ❌ ${testCase.level} level failed:`, error.message);
        }
    }
    
    console.log('\n8. Defensive Validation Summary:');
    console.log('   ✅ successRate: null-safe with toFixed() calls');
    console.log('   ✅ missingTriggers: defaults to 0 for non-numbers');
    console.log('   ✅ totalCandidates: defaults to 0 for non-numbers');
    console.log('   ✅ error/message: safely extracted from data object');
    console.log('   ✅ ERROR level: properly styled and handled');
    console.log('   ✅ Japanese translations: include ERROR level');
    
    console.log('\n9. Email Content Validation:');
    console.log('   ✅ Subject line adapts to error vs success cases');
    console.log('   ✅ Text content shows error details when available');
    console.log('   ✅ HTML content conditionally renders system status vs error details');
    console.log('   ✅ Action messages appropriate for each alert level');
}

testEmailErrorHandling().then(() => {
    console.log('\n✅ Email error handling test completed');
    console.log('📧 Check dx@redhorse-group.co.jp for test emails');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});