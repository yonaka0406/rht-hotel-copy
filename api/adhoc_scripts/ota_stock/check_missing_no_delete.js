const { getPool } = require('../../config/database');
const { getPMSEvents } = require('../../models/ota/investigation');

async function checkMissingNoDelete() {
    const requestId = 'check-missing-no-delete';
    const hotelId = 14;
    const stayDate = '2027-02-03';

    const client = await getPool(requestId).connect();
    try {
        const pmsEvents = await getPMSEvents(requestId, hotelId, stayDate);
        const eventsById = {};
        pmsEvents.forEach(e => {
            if (!eventsById[e.id]) eventsById[e.id] = [];
            eventsById[e.id].push(e);
        });

        const loggedIds = Object.keys(eventsById);

        // Check which of these actually exist in the table now
        const query = `
            SELECT id FROM reservation_details 
            WHERE hotel_id = $1 AND id = ANY($2::uuid[])
        `;
        const result = await client.query(query, [hotelId, loggedIds]);
        const existingIds = new Set(result.rows.map(r => r.id));

        const missingIds = loggedIds.filter(id => !existingIds.has(id));

        console.log(`IDs missing from table but have logs: ${missingIds.length}`);

        const noDeleteLogIds = missingIds.filter(id => {
            const events = eventsById[id];
            return !events.some(e => e.action === 'DELETE');
        });

        console.log(`IDs that have INSERT log but NO DELETE log (${noDeleteLogIds.length}):`);

        noDeleteLogIds.forEach(id => {
            const events = eventsById[id];
            console.log(`\nID: ${id}`);
            events.forEach(e => {
                console.log(`  - Log: ${e.timestamp.toISOString()}, Action: ${e.action}, Guest: ${e.guest_name}`);
            });
        });

    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        client.release();
    }
}

checkMissingNoDelete();
