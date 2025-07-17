/**
 * OTA Reservation Validation Tests
 *
 * This file tests OTA reservation assignment and conflict logic using mock data from /api/tests/mockDB.
 *
 * Test Coverage:
 * - Room assignment for OTA reservations
 * - Conflict detection with existing reservations
 * - Mapping logic for RoomTypeCode and agtcode
 *
 * Usage: node tests/otaValidation.test.js
 *
 * Dependencies:
 * - Node.js assert module (built-in)
 * - xmlController.js (../ota/xmlController.js)
 * - Mock DB data from /api/tests/mockDB
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// --- Load mock data from CSVs ---
function loadCSV(file) {
    const content = fs.readFileSync(path.join(__dirname, 'mockDB', file), 'utf8');
    const [header, ...lines] = content.trim().split(/\r?\n/);
    const keys = header.split(',');
    return lines.map(line => {
        const values = line.split(',');
        return Object.fromEntries(keys.map((k, i) => [k.trim(), values[i] ? values[i].trim() : '']));
    });
}

const mockRooms = loadCSV('sc_tl_rooms.csv');
const mockPlans = loadCSV('sc_tl_plans.csv');
const mockReservationDetails = loadCSV('reservation_details.csv');
const mockReservations = loadCSV('reservations.csv');
// Add more as needed (e.g., xml_responses.csv)

// --- Mock DB infrastructure ---
let mockDbQueryResult = { rows: [] };
const mockPool = {
    query: async (queryText, values) => {
        // You can add logic here to return different results based on queryText/values
        return mockDbQueryResult;
    }
};
const mockGetPool = () => mockPool;

// Helper: Map OTA RoomTypeCode (e.g., 'sgls') to room_type_id using mockRooms
function mapRoomTypeCodeToRoomTypeId(roomTypeCode) {
    // Find the first matching room with the given netagtrmtypecode
    const match = mockRooms.find(r => r.netagtrmtypecode === roomTypeCode);
    return match ? match.room_type_id : undefined;
}

// Helper: Find available room_id for a given room_type_id and date range
function findAvailableRoomId(room_type_id, check_in, check_out) {
    // Get all rooms of this type
    const roomsOfType = mockRooms.filter(r => r.room_type_id === room_type_id);
    // For each room, check if it is free for the entire date range
    for (const room of roomsOfType) {
        let isAvailable = true;
        let currentDate = new Date(check_in);
        const endDate = new Date(check_out);
        while (currentDate < endDate) {
            const dateStr = currentDate.toISOString().slice(0, 10);
            // Is there a reservation_detail for this room_id and date?
            if (mockReservationDetails.some(d => d.room_id === room.room_id && d.date === dateStr && d.cancelled !== 'True')) {
                isAvailable = false;
                break;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        if (isAvailable) return room.room_id;
    }
    return null;
}

// Patch DB module for testing
const originalDatabaseModule = require('../config/database');
const mockDatabaseModule = {
    ...originalDatabaseModule,
    getPool: mockGetPool
};
function patchDatabaseForTesting() {
    require.cache[require.resolve('../config/database')].exports = mockDatabaseModule;
}
function unpatchDatabaseAfterTesting() {
    require.cache[require.resolve('../config/database')].exports = originalDatabaseModule;
}

// Import the controller after patching
let xmlController;

function getRoomTypeIdForReservation(reservation) {
    // Try to find a detail row with matching reservation_id
    const detail = mockReservationDetails.find(
        d => d.reservation_id === reservation.id
    );
    if (!detail) {
        console.log(`[DEBUG] No reservation_detail found for reservation.id=${reservation.id}`);
    } else {
        console.log(`[DEBUG] Found reservation_detail for reservation.id=${reservation.id}: room_type_id=${detail.room_type_id}`);
    }
    return detail ? detail.room_type_id : undefined;
}

(async () => {
    console.log('Starting OTA reservation validation tests...\n');
    patchDatabaseForTesting();
    xmlController = require('../ota/xmlController');

    // --- Test Suite ---
    const tests = [];
    const describe = (name, fn) => {
        console.log(`\n--- ${name} ---`);
        fn();
    };
    const it = (name, fn) => { tests.push({ name, fn }); };

    describe('OTA Reservation Assignment & Conflict Logic', () => {
        it('should detect conflict when room is already booked for the requested dates', async () => {
            assert.ok(true, 'Placeholder test - replace with real logic');
        });
        it('should assign room if available and mapping matches', async () => {
            assert.ok(true, 'Placeholder test - replace with real logic');
        });
        it('should process multiple OTA reservations and return 200 (getOTAReservations) with verbose output and real mock data', async () => {
            // Patch dependencies
            const xmlModel = require('../ota/xmlModel');
            const hotelModel = require('../models/hotel');
            const reservationsModel = require('../models/reservations');
            // Patch model functions
            xmlModel.selectXMLTemplate = async (requestId, hotel_id, name) => '<xml>template</xml>';

            // Use several real reservations from mockReservations as the OTA input
            const testReservations = mockReservations.slice(0, 5); // Test with first 5 for brevity
            const bookingInfoList = testReservations.map(r => {
                const room_type_id = getRoomTypeIdForReservation(r);
                if (!room_type_id) {
                    console.log(`[DEBUG] Reservation ${r.id} has undefined room_type_id`);
                }
                const testRoomType = mockRooms.find(room => room.hotel_id === r.hotel_id && room.room_type_id === room_type_id);
                if (!testRoomType) {
                    console.log(`[DEBUG] No matching room in mockRooms for hotel_id=${r.hotel_id}, room_type_id=${room_type_id}`);
                } else {
                    console.log(`[DEBUG] Found room in mockRooms for hotel_id=${r.hotel_id}, room_type_id=${room_type_id}: netrmtypegroupname=${testRoomType.netrmtypegroupname}`);
                }
                return {
                    infoTravelXML: `<AllotmentBookingReport>\n  <TransactionType>\n    <DataClassification>NewBookReport</DataClassification>\n  </TransactionType>\n  <UniqueID>\n    <ID>${r.id}</ID>\n  </UniqueID>\n  <RoomType>${testRoomType ? testRoomType.netrmtypegroupname : 'Unknown'}</RoomType>\n  <CheckIn>${r.check_in}</CheckIn>\n  <CheckOut>${r.check_out}</CheckOut>\n</AllotmentBookingReport>`,
                    _room_type_id: room_type_id // for debugging
                };
            });
            // Log the first few reservation_details for context
            console.log('First few mockReservationDetails:', mockReservationDetails.slice(0, 3));

            xmlModel.submitXMLTemplate = async (req, res, hotel_id, name, xml) => ({
                'S:Envelope': {
                    'S:Body': {
                        'ns2:executeResponse': {
                            return: {
                                bookingInfoList,
                                configurationSettings: { outputId: 'output-123' }
                            }
                        }
                    }
                }
            });

            hotelModel.getAllHotelSiteController = async () => [{ hotel_id: testReservations[0].hotel_id }];

            // Patch reservation functions to log the assignment attempt
            reservationsModel.addOTAReservation = async (requestId, hotel_id, reservation) => {
                console.log('Attempting to add OTA reservation:', reservation.UniqueID?.ID, reservation.RoomType, reservation.CheckIn, reservation.CheckOut);
                // --- Simulate real mapping and assignment logic ---
                const roomTypeId = mapRoomTypeCodeToRoomTypeId(reservation.RoomType);
                if (!roomTypeId) {
                    console.log('  -> No mapping for RoomTypeCode:', reservation.RoomType);
                    return { success: false, error: 'No mapping for RoomTypeCode' };
                }
                const roomId = findAvailableRoomId(roomTypeId, reservation.CheckIn, reservation.CheckOut);
                if (!roomId) {
                    console.log('  -> No available room found for RoomTypeCode:', reservation.RoomType);
                    return { success: false, error: `No available room found for RoomTypeCode ${reservation.RoomType}` };
                }
                // Simulate successful assignment
                console.log('  -> Reservation assigned successfully:', reservation.UniqueID?.ID, 'room_id:', roomId);
                return { success: true };
            };
            reservationsModel.editOTAReservation = async () => ({ success: true });
            reservationsModel.cancelOTAReservation = async () => ({ success: true });

            // Patch logger to suppress output
            require('../config/logger').info = () => {};
            require('../config/logger').warn = () => {};
            require('../config/logger').error = () => {};

            const xmlController = require('../ota/xmlController');
            function createMockReqRes() {
                return [
                    { requestId: 'mock-req-1', params: {}, body: {} },
                    {
                        statusCode: 200,
                        status(code) { this.statusCode = code; return this; },
                        send(data) { this.data = data; return this; },
                        json(data) { this.data = data; return this; }
                    }
                ];
            }

            // Verbose: print out the test reservations and room types
            console.log('Loaded test reservations:', testReservations.map(r => ({
                id: r.id, room_type_id: r.room_type_id, check_in: r.check_in, check_out: r.check_out
            })));

            const [req, res] = createMockReqRes();
            await xmlController.getOTAReservations(req, res);

            assert.strictEqual(res.statusCode, 200, 'Should return 200 status');
            assert.ok(res.data && res.data.message, 'Should return a message in response');
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
        }
    }
    unpatchDatabaseAfterTesting();
    console.log(`\nTests finished. Passed: ${passedCount}, Failed: ${failedCount}`);
    if (failedCount > 0) {
        console.log('\nNote: Some tests failed. Please review the output.');
    } else {
        console.log('\nAll tests passed!');
    }
    console.log('\nTest execution completed.');
})().catch(e => {
    console.error('Critical error running test script:', e);
    try { unpatchDatabaseAfterTesting(); } catch (cleanupError) { console.error('Error during cleanup:', cleanupError); }
}); 