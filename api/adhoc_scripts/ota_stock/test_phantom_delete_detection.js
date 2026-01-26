/**
 * Test script to verify phantom delete detection in OTA investigation
 */

require('dotenv').config({ path: './api/.env' });
const { 
    getCurrentStateSnapshot,
    getPMSEvents,
    getReservationLifecycle,
    mergeTimeline,
    generateSummary
} = require('../../models/ota/investigation');

async function testPhantomDeleteDetection() {
    console.log('🔍 Testing Phantom Delete Detection in OTA Investigation');
    console.log('=====================================================\n');
    
    // Test with hotel 14 and date 2027-02-03 (from user's example)
    const hotelId = 14;
    const date = '2027-02-03';
    const requestId = 'test-phantom-delete';
    
    console.log(`Testing with Hotel ID: ${hotelId}, Date: ${date}\n`);
    
    try {
        // 1. Get current state snapshot
        console.log('1. GETTING CURRENT STATE SNAPSHOT:');
        const currentState = await getCurrentStateSnapshot(requestId, hotelId, date);
        console.log(`   Total Rooms: ${currentState.totalRooms}`);
        console.log(`   Occupied Rooms: ${currentState.occupiedRooms}`);
        console.log(`   Calculated Available Stock: ${currentState.calculatedAvailableStock}`);
        console.log(`   Active Reservation Details: ${currentState.activeReservationDetails}`);
        console.log(`   Cancelled Reservation Details: ${currentState.cancelledReservationDetails}`);
        
        // 2. Get PMS events (should include phantom deletes)
        console.log('\n2. GETTING PMS EVENTS (INCLUDING PHANTOM DELETES):');
        const pmsEvents = await getPMSEvents(requestId, hotelId, date);
        console.log(`   Total PMS Events: ${pmsEvents.length}`);
        
        // Count different types of events
        const eventCounts = {
            insert: 0,
            delete: 0,
            update: 0,
            cascade: 0,
            phantom: 0
        };
        
        pmsEvents.forEach(event => {
            if (event.action === 'INSERT') eventCounts.insert++;
            else if (event.action === 'DELETE') {
                eventCounts.delete++;
                if (event.is_cascade) eventCounts.cascade++;
                if (event.is_phantom_delete) eventCounts.phantom++;
            }
            else if (event.action === 'UPDATE') eventCounts.update++;
        });
        
        console.log(`   INSERT events: ${eventCounts.insert}`);
        console.log(`   DELETE events: ${eventCounts.delete} (${eventCounts.cascade} cascade, ${eventCounts.phantom} phantom)`);
        console.log(`   UPDATE events: ${eventCounts.update}`);
        
        // Show phantom delete events specifically
        const phantomDeletes = pmsEvents.filter(e => e.is_phantom_delete);
        if (phantomDeletes.length > 0) {
            console.log('\n   PHANTOM DELETE EVENTS DETECTED:');
            phantomDeletes.forEach((event, index) => {
                console.log(`     ${index + 1}. Guest: ${event.guest_name}`);
                console.log(`        Room: ${event.room_number || 'N/A'} (ID: ${event.room_id})`);
                console.log(`        Time: ${event.timestamp}`);
                console.log(`        For Sale: ${event.for_sale}, Staff Room: ${event.is_staff_room}`);
                console.log(`        Note: ${event.note}`);
            });
        } else {
            console.log('   ⚠️  No phantom delete events found');
        }
        
        // 3. Get reservation lifecycle (CASCADE DELETE aware)
        console.log('\n3. GETTING RESERVATION LIFECYCLE (CASCADE DELETE AWARE):');
        const lifecycle = await getReservationLifecycle(requestId, hotelId, date);
        console.log(`   Total Lifecycle Records: ${lifecycle.length}`);
        
        // Count by final status
        const statusCounts = {
            active: 0,
            cancelled: 0,
            deleted: 0,
            cascadeDeleted: 0
        };
        
        lifecycle.forEach(record => {
            statusCounts[record.final_status]++;
            if (record.final_status === 'deleted' && record.parent_was_deleted) {
                statusCounts.cascadeDeleted++;
            }
        });
        
        console.log(`   Active: ${statusCounts.active}`);
        console.log(`   Cancelled: ${statusCounts.cancelled}`);
        console.log(`   Deleted: ${statusCounts.deleted} (${statusCounts.cascadeDeleted} cascade deleted)`);
        
        // 4. Merge timeline and calculate room changes
        console.log('\n4. MERGING TIMELINE AND CALCULATING ROOM CHANGES:');
        const timeline = mergeTimeline(pmsEvents, []);
        console.log(`   Timeline Events: ${timeline.length}`);
        
        // Calculate total room change from timeline
        const totalRoomChange = timeline.reduce((sum, event) => sum + (event.room_count_change || 0), 0);
        console.log(`   Total Room Change from Timeline: ${totalRoomChange}`);
        
        // 5. Generate summary with CASCADE DELETE aware statistics
        console.log('\n5. GENERATING SUMMARY WITH CASCADE DELETE AWARENESS:');
        const summary = generateSummary(pmsEvents, [], timeline, lifecycle);
        console.log(`   Operation Stats:`);
        console.log(`     Total Active: ${summary.operationStats.totalActive}`);
        console.log(`     Total Cancelled: ${summary.operationStats.totalCancelled}`);
        console.log(`     Total Deleted: ${summary.operationStats.totalDeleted}`);
        console.log(`     Cascade Deleted: ${summary.operationStats.cascadeDeleted}`);
        console.log(`     Net Room Change: ${summary.operationStats.netRoomChange}`);
        
        // 6. Verification
        console.log('\n6. VERIFICATION:');
        const expectedAvailable = currentState.totalRooms - summary.operationStats.totalActive;
        const actualAvailable = currentState.calculatedAvailableStock;
        const discrepancy = expectedAvailable - actualAvailable;
        
        console.log(`   Expected Available: ${currentState.totalRooms} - ${summary.operationStats.totalActive} = ${expectedAvailable}`);
        console.log(`   Actual Available: ${actualAvailable}`);
        console.log(`   Discrepancy: ${discrepancy}`);
        
        if (discrepancy === 0) {
            console.log('   ✅ CALCULATION MATCHES! Phantom deletes are properly accounted for.');
        } else {
            console.log('   ❌ CALCULATION MISMATCH! There may still be missing phantom deletes.');
        }
        
        // 7. Timeline verification
        console.log('\n7. TIMELINE VERIFICATION:');
        const timelineStartingRooms = currentState.totalRooms;
        const timelineEndingRooms = timelineStartingRooms + totalRoomChange;
        
        console.log(`   Timeline Starting Rooms: ${timelineStartingRooms}`);
        console.log(`   Timeline Total Change: ${totalRoomChange}`);
        console.log(`   Timeline Ending Rooms: ${timelineEndingRooms}`);
        console.log(`   Current Available Stock: ${actualAvailable}`);
        
        if (timelineEndingRooms === actualAvailable) {
            console.log('   ✅ TIMELINE CALCULATION MATCHES! All events properly accounted for.');
        } else {
            console.log('   ❌ TIMELINE MISMATCH! Some events may be missing from timeline.');
            console.log(`   Difference: ${timelineEndingRooms - actualAvailable} rooms`);
        }
        
    } catch (error) {
        console.error('❌ Test error:', error);
        console.error('Stack trace:', error.stack);
    }
}

testPhantomDeleteDetection().then(() => {
    console.log('\n✅ Phantom delete detection test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});