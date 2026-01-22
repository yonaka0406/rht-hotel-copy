/**
 * Example: Running OTA Trigger Monitor with Email Notifications
 * This demonstrates how to use the monitoring system with automatic email alerts
 */

require('dotenv').config({ path: './api/.env' });
const { checkMissingOTATriggers } = require('../../ota_trigger_monitor');

async function runMonitoringExample() {
    console.log('📊 OTA Trigger Monitor with Email Notifications');
    console.log('==============================================\n');
    
    console.log('🔍 Running monitoring check for the last hour...');
    console.log('📧 Email notifications will be sent to: dx@redhorse-group.co.jp\n');
    
    try {
        // Run monitoring for the last hour with auto-remediation enabled
        const result = await checkMissingOTATriggers(1, {
            autoRemediate: true,  // Enable automatic fixing of missing triggers
            baseUrl: 'http://localhost:5000'
        });
        
        console.log('\n📊 MONITORING RESULTS:');
        console.log(`   Success: ${result.success}`);
        console.log(`   Success Rate: ${result.successRate.toFixed(1)}%`);
        console.log(`   Total Candidates: ${result.totalCandidates}`);
        console.log(`   Missing Triggers: ${result.missingTriggers}`);
        console.log(`   Execution Time: ${result.executionTime}ms`);
        
        if (result.remediationResults) {
            console.log('\n⚡ AUTO-REMEDIATION RESULTS:');
            console.log(`   Successful: ${result.remediationResults.successful}`);
            console.log(`   Failed: ${result.remediationResults.failed}`);
            console.log(`   Skipped: ${result.remediationResults.skipped}`);
        }
        
        console.log(`\n📧 EMAIL NOTIFICATIONS:`);
        if (result.missingTriggers > 0) {
            console.log('   ✅ Inconsistency notification sent');
        }
        if (result.remediationResults && result.remediationResults.successful > 0) {
            console.log('   ✅ Remediation notification sent');
        }
        if (result.missingTriggers === 0) {
            console.log('   ℹ️  No issues detected - no emails sent');
        }
        
        console.log(`\n📋 SUMMARY: ${result.message}`);
        
    } catch (error) {
        console.error('❌ Monitoring failed:', error.message);
    }
}

runMonitoringExample().then(() => {
    console.log('\n✅ Monitoring example completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Example error:', error);
    process.exit(1);
});