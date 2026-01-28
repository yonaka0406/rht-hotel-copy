const { getPool } = require('../../config/database');
const { getPMSEvents } = require('../../models/ota/investigation');

async function checkMissingRecords() {
    const requestId = 'check-missing';
    const hotelId = 14;
    const stayDate = '2026-01-31';

    const client = await getPool(requestId).connect();
    try {
        const pmsEvents = await getPMSEvents(requestId, hotelId, stayDate);
        const eventsById = {};
        pmsEvents.forEach(e => {
            if (!eventsById[e.id]) eventsById[e.id] = [];
            eventsById[e.id].push(e);
        });

        const loggedIds = Object.keys(eventsById);
        console.log(`Found ${loggedIds.length} unique IDs in logs for ${stayDate}`);

        // Check which of these actually exist in the table now
        const query = `
            SELECT id, cancelled FROM reservation_details 
            WHERE hotel_id = $1 AND id = ANY($2::uuid[])
        `;
        const result = await client.query(query, [hotelId, loggedIds]);
        const existingIds = new Set(result.rows.map(r => r.id));

        console.log(`Of those, ${existingIds.size} still exist in reservation_details table.`);

        const missingIds = loggedIds.filter(id => !existingIds.has(id));
        console.log(`IDs in logs but NOT in table (${missingIds.length}):`);

        missingIds.forEach(id => {
            const events = eventsById[id];
            console.log(`\nID: ${id}`);
            events.forEach(e => {
                console.log(`  - Log: ${e.timestamp.toISOString()}, Action: ${e.action}, Change: ${e.room_count_change}`);
            });
            // Let's check for ANY logs for this ID in ANY date
            // (maybe the delete was logged with a different date?)
        });

    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        client.release();
    }
}

checkMissingRecords();
