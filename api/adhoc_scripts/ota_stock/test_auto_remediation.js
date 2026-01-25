/**
 * Test script for OTA trigger auto-remediation functionality
 * Tests date range grouping and remediation logic
 */

require('dotenv').config();

// Mock missing triggers for testing
const mockMissingTriggers = [
    {
        hotel_id: 25,
        hotel_name: 'Test Hotel 25',
        check_in: '2026-01-21',
        check_out: '2026-01-23',
        log_time: '2026-01-21T10:00:00Z',
        action: 'INSERT',
        client_name: 'Test Client 1'
    },
    {
        hotel_id: 25,
        hotel_name: 'Test Hotel 25',
        check_in: '2026-01-22',
        check_out: '2026-01-24',
        log_time: '2026-01-21T10:05:00Z',
        action: 'INSERT',
        client_name: 'Test Client 2'
    },
    {
        hotel_id: 25,
        hotel_name: 'Test Hotel 25',
        check_in: '2026-01-26',
        check_out: '2026-01-28',
        log_time: '2026-01-21T10:10:00Z',
        action: 'DELETE',
        client_name: 'Test Client 3'
    },
    {
        hotel_id: 26,
        hotel_name: 'Test Hotel 26',
        check_in: '2026-01-21',
        check_out: '2026-01-23',
        log_time: '2026-01-21T10:15:00Z',
        action: 'UPDATE',
        client_name: 'Test Client 4'
    }
];

/**
 * Group missing triggers by overlapping date ranges to avoid duplicate requests
 */
function groupTriggersByDateRanges(missingTriggers) {
    const groups = [];
    
    // Sort triggers by hotel_id and check_in date
    const sortedTriggers = [...missingTriggers].sort((a, b) => {
        if (a.hotel_id !== b.hotel_id) return a.hotel_id - b.hotel_id;
        return new Date(a.check_in) - new Date(b.check_in);
    });
    
    for (const trigger of sortedTriggers) {
        // Find existing group with overlapping dates for the same hotel
        const existingGroup = groups.find(group => 
            group.hotel_id === trigger.hotel_id &&
            group.check_in <= trigger.check_out &&
            group.check_out >= trigger.check_in
        );
        
        if (existingGroup) {
            // Extend the existing group's date range
            existingGroup.check_in = new Date(Math.min(
                new Date(existingGroup.check_in),
                new Date(trigger.check_in)
            )).toISOString().split('T')[0];
            
            existingGroup.check_out = new Date(Math.max(
                new Date(existingGroup.check_out),
                new Date(trigger.check_out)
            )).toISOString().split('T')[0];
            
            existingGroup.triggers.push(trigger);
        } else {
            // Create new group
            groups.push({
                hotel_id: trigger.hotel_id,
                hotel_name: trigger.hotel_name,
                check_in: trigger.check_in,
                check_out: trigger.check_out,
                triggers: [trigger]
            });
        }
    }
    
    return groups;
}

async function testAutoRemediation() {
    console.log('🧪 Testing OTA trigger auto-remediation functionality...\n');
    
    console.log('📋 Mock Missing Triggers:');
    mockMissingTriggers.forEach((trigger, i) => {
        console.log(`   ${i + 1}. Hotel ${trigger.hotel_id}: ${trigger.check_in} to ${trigger.check_out} (${trigger.action}) - ${trigger.client_name}`);
    });
    
    console.log('\n🔄 Grouping triggers by overlapping date ranges...');
    
    const groups = groupTriggersByDateRanges(mockMissingTriggers);
    
    console.log(`\n📊 Grouping Results:`);
    console.log(`   Original triggers: ${mockMissingTriggers.length}`);
    console.log(`   Grouped into: ${groups.length} date range groups\n`);
    
    groups.forEach((group, i) => {
        console.log(`   Group ${i + 1}:`);
        console.log(`     Hotel: ${group.hotel_id} (${group.hotel_name})`);
        console.log(`     Date Range: ${group.check_in} to ${group.check_out}`);
        console.log(`     Triggers: ${group.triggers.length}`);
        console.log(`     API Call: /api/report/res/inventory/${group.hotel_id}/${group.check_in}/${group.check_out}`);
        
        group.triggers.forEach((trigger, j) => {
            console.log(`       ${j + 1}. ${trigger.action} - ${trigger.client_name} (${trigger.check_in} to ${trigger.check_out})`);
        });
        console.log('');
    });
    
    console.log('✅ Expected Behavior:');
    console.log('   - Hotel 25: Two overlapping triggers (2026-01-21 to 2026-01-23 and 2026-01-22 to 2026-01-24)');
    console.log('     should be grouped into one request: 2026-01-21 to 2026-01-24');
    console.log('   - Hotel 25: Non-overlapping trigger (2026-01-26 to 2026-01-28) should be separate group');
    console.log('   - Hotel 26: Single trigger should be its own group');
    console.log('   - Total: 3 API calls instead of 4 individual calls');
    
    // Verify expected results
    const expectedGroups = 3;
    const actualGroups = groups.length;
    
    console.log(`\n🎯 Verification:`);
    console.log(`   Expected groups: ${expectedGroups}`);
    console.log(`   Actual groups: ${actualGroups}`);
    
    if (actualGroups === expectedGroups) {
        console.log('   ✅ PASS - Correct number of groups created');
        
        // Verify specific groupings
        const hotel25Groups = groups.filter(g => g.hotel_id === 25);
        const hotel26Groups = groups.filter(g => g.hotel_id === 26);
        
        if (hotel25Groups.length === 2 && hotel26Groups.length === 1) {
            console.log('   ✅ PASS - Correct hotel grouping');
            
            // Check overlapping group
            const overlappingGroup = hotel25Groups.find(g => g.triggers.length === 2);
            if (overlappingGroup && overlappingGroup.check_in === '2026-01-21' && overlappingGroup.check_out === '2026-01-24') {
                console.log('   ✅ PASS - Overlapping dates correctly merged');
            } else {
                console.log('   ❌ FAIL - Overlapping dates not merged correctly');
            }
        } else {
            console.log('   ❌ FAIL - Incorrect hotel grouping');
        }
    } else {
        console.log('   ❌ FAIL - Incorrect number of groups');
    }
    
    console.log('\n📈 Performance Benefits:');
    console.log(`   API calls reduced: ${mockMissingTriggers.length} → ${groups.length} (${Math.round((1 - groups.length/mockMissingTriggers.length) * 100)}% reduction)`);
    console.log('   Prevents duplicate inventory updates for overlapping date ranges');
    console.log('   Reduces server load and improves remediation efficiency');
}

// Run the test
testAutoRemediation().then(() => {
    console.log('\n✅ Auto-remediation test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});