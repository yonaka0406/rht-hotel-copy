const { getCurrentStateSnapshot, getPMSEvents, mergeTimeline } = require('../../models/ota/investigation');

async function debugTimeline() {
    const requestId = 'debug-timeline';
    const hotelId = 14;
    const date = '2027-02-03';

    try {
        const snapshot = await getCurrentStateSnapshot(requestId, hotelId, date);
        const pmsEvents = await getPMSEvents(requestId, hotelId, date);
        const timeline = mergeTimeline(pmsEvents, []);

        let running = snapshot.totalRooms;
        const sortedTimeline = [...timeline].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        sortedTimeline.forEach(e => {
            running += (e.room_count_change || 0);
        });

        console.log(`\nComparison for ${date}:`);
        console.log(`  Snapshot Stock: ${snapshot.calculatedAvailableStock}`);
        console.log(`  Timeline Stock: ${running}`);
        console.log(`  Discrepancy: ${snapshot.calculatedAvailableStock - running}`);

        if (snapshot.calculatedAvailableStock !== running) {
            const eventsById = {};
            timeline.forEach(e => {
                if (!eventsById[e.id]) eventsById[e.id] = [];
                eventsById[e.id].push(e);
            });

            console.log('\nRecords with net negative impact on timeline:');
            Object.keys(eventsById).forEach(id => {
                const recordEvents = eventsById[id];
                const netChange = recordEvents.reduce((sum, e) => sum + (e.room_count_change || 0), 0);
                if (netChange !== 0) {
                    console.log(`ID: ${id}, Guest: ${recordEvents[0].guest_name}, Net Change: ${netChange}, Actions: ${recordEvents.map(e => e.action).join(', ')}`);
                }
            });
        }

    } catch (error) {
        console.error('Debug failed:', error);
    }
}

debugTimeline();
