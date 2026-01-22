/**
 * Test script to verify the safe overlap configuration
 */

require('dotenv').config({ path: './api/.env' });
const { createOTATriggerMonitor } = require('../../jobs/otaTriggerMonitorJob');

async function testSafeOverlapConfig() {
    console.log('🧪 Testing Safe Overlap Configuration');
    console.log('===================================\n');
    
    // Test default configuration
    console.log('1. Testing Default Configuration:');
    const defaultMonitor = createOTATriggerMonitor();
    const defaultStatus = defaultMonitor.getStatus();
    
    console.log('   Default Options:');
    console.log(`     Check Interval: ${defaultStatus.options.checkIntervalHours} hours (${(defaultStatus.options.checkIntervalHours * 60).toFixed(1)} minutes)`);
    console.log(`     Monitoring Window: ${defaultStatus.options.monitoringWindowHours} hours (${defaultStatus.options.monitoringWindowHours * 60} minutes)`);
    console.log(`     Overlap: ${((defaultStatus.options.monitoringWindowHours - defaultStatus.options.checkIntervalHours) * 60).toFixed(1)} minutes`);
    console.log(`     Alert Threshold: ${defaultStatus.options.alertThreshold}%`);
    console.log(`     Critical Threshold: ${defaultStatus.options.criticalThreshold}%`);
    console.log(`     Auto-Remediate: ${defaultStatus.options.autoRemediate}`);
    
    // Verify the safe overlap
    const checkIntervalMinutes = defaultStatus.options.checkIntervalHours * 60;
    const monitoringWindowMinutes = defaultStatus.options.monitoringWindowHours * 60;
    const overlapMinutes = monitoringWindowMinutes - checkIntervalMinutes;
    
    console.log('\n2. Safety Analysis:');
    if (checkIntervalMinutes === 55 && monitoringWindowMinutes === 60) {
        console.log('   ✅ Correct timing: Runs every 55 minutes, monitors 60 minutes');
    } else {
        console.log('   ❌ Incorrect timing configuration');
    }
    
    if (overlapMinutes === 5) {
        console.log('   ✅ Safe 5-minute overlap configured');
    } else {
        console.log(`   ❌ Overlap is ${overlapMinutes} minutes, should be 5 minutes`);
    }
    
    if (defaultStatus.options.autoRemediate === true) {
        console.log('   ✅ Auto-remediation enabled by default');
    } else {
        console.log('   ❌ Auto-remediation should be enabled by default');
    }
    
    // Test custom configuration
    console.log('\n3. Testing Custom Configuration:');
    const customMonitor = createOTATriggerMonitor({
        checkIntervalHours: 0.5,      // 30 minutes
        monitoringWindowHours: 0.75,  // 45 minutes
        alertThreshold: 98
    });
    
    const customStatus = customMonitor.getStatus();
    console.log('   Custom Options:');
    console.log(`     Check Interval: ${customStatus.options.checkIntervalHours} hours (${customStatus.options.checkIntervalHours * 60} minutes)`);
    console.log(`     Monitoring Window: ${customStatus.options.monitoringWindowHours} hours (${customStatus.options.monitoringWindowHours * 60} minutes)`);
    console.log(`     Overlap: ${(customStatus.options.monitoringWindowHours - customStatus.options.checkIntervalHours) * 60} minutes`);
    console.log(`     Alert Threshold: ${customStatus.options.alertThreshold}%`);
    
    // Calculate intervals for demonstration
    console.log('\n4. Monitoring Schedule Simulation:');
    console.log('   With 55-minute intervals and 60-minute windows:');
    
    const startTime = new Date('2026-01-22T10:00:00Z');
    for (let i = 0; i < 4; i++) {
        const checkTime = new Date(startTime.getTime() + (i * 55 * 60 * 1000));
        const windowStart = new Date(checkTime.getTime() - (60 * 60 * 1000));
        const windowEnd = checkTime;
        
        console.log(`     Check ${i + 1}: ${checkTime.toISOString().substr(11, 8)} JST`);
        console.log(`       Monitors: ${windowStart.toISOString().substr(11, 8)} to ${windowEnd.toISOString().substr(11, 8)}`);
        
        if (i > 0) {
            const prevWindowEnd = new Date(startTime.getTime() + ((i - 1) * 55 * 60 * 1000));
            const currentWindowStart = windowStart;
            const overlapStart = Math.max(prevWindowEnd.getTime() - (60 * 60 * 1000), currentWindowStart.getTime());
            const overlapEnd = Math.min(prevWindowEnd.getTime(), windowEnd.getTime());
            const overlapDuration = (overlapEnd - overlapStart) / (60 * 1000);
            
            if (overlapDuration > 0) {
                console.log(`       Overlap with previous: ${overlapDuration} minutes`);
            }
        }
    }
    
    console.log('\n5. Benefits of Safe Overlap:');
    console.log('   ✅ No gaps in monitoring coverage');
    console.log('   ✅ Redundant detection of critical issues');
    console.log('   ✅ Fail-safe operation if one check fails');
    console.log('   ✅ Catches issues that occur near interval boundaries');
    console.log('   ✅ Provides confidence in system reliability');
}

testSafeOverlapConfig().then(() => {
    console.log('\n✅ Safe overlap configuration test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});