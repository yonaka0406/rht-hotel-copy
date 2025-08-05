const assert = require('assert');
const parkingModel = require('../models/parking');
const reservationsModel = require('../models/reservations');

// --- Mocking Infrastructure ---
const mockClient = {
    query: async (queryText, values) => {
        console.log('Mock DB Query:', queryText, 'Values:', values);
        if (queryText.startsWith('INSERT INTO reservations')) {
            return { rows: [{ id: 'a4e6d7a3-5c7b-4e1a-9a3e-3e1b6d1f9a1e' }] };
        }
        if (queryText.startsWith('SELECT capacity_units_required')) {
            return { rows: [{ capacity_units_required: 1 }] };
        }
        if (queryText.includes('WITH occupied_spots AS')) {
            return { rows: [{ parking_spot_id: 1, spot_number: 'A-01', spot_type: 'standard', capacity_units: 1 }] };
        }
        if (queryText.startsWith('INSERT INTO reservation_parking')) {
            return { rows: [] };
        }
        if (queryText.startsWith('BEGIN') || queryText.startsWith('COMMIT') || queryText.startsWith('ROLLBACK')) {
            return { rows: [] };
        }
        return { rows: [] };
    },
    release: () => { },
};

const mockPool = {
    connect: async () => mockClient,
    query: mockClient.query,
};

const mockGetPool = () => mockPool;

// --- Test Suites ---
(async () => {
    const tests = [];
    const describe = (name, fn) => {
        console.log(`\n--- ${name} ---`);
        fn();
    };
    const it = (name, fn) => { tests.push({ name, fn }); };

    reservationsModel.__setGetPool(mockGetPool);

    describe('Parking Management', () => {
        it('should create a reservation with a parking spot', async () => {
            const reservation = {
                hotel_id: 1,
                reservation_client_id: 'some-client-id',
                check_in: '2025-01-01',
                check_out: '2025-01-05',
                number_of_people: 2,
                vehicle_category_id: 1,
                created_by: 1,
                updated_by: 1,
            };
            const result = await reservationsModel.addReservationHold('test-request', reservation);
            assert.strictEqual(result.id, 'a4e6d7a3-5c7b-4e1a-9a3e-3e1b6d1f9a1e');
        });
    });

    // --- Run tests ---
    let passedCount = 0;
    let failedCount = 0;

    for (const test of tests) {
        try {
            await test.fn();
            console.log(`  PASSED: ${test.name}`);
            passedCount++;
        } catch (e) {
            failedCount++;
            console.error(`  FAILED: ${test.name} | Error: ${e.message}`);
            console.error(e.stack);
        }
    }

    console.log(`\nTests finished. Passed: ${passedCount}, Failed: ${failedCount}`);
    if (failedCount > 0) {
        process.exit(1);
    }
})().catch(e => {
    console.error("Critical error running test script:", e);
    process.exit(1);
});
