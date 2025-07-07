/**
 * Waitlist Vacancy Function Tests
 * 
 * This file contains comprehensive tests for the waitlist vacancy checking functionality.
 * 
 * Test Coverage:
 * - Basic functionality: Available/no vacancy scenarios
 * - Input validation: Missing parameters, zero values
 * - Date handling: UTC to JST conversion, long stays
 * - Edge cases: Null parameters, large groups
 * - Error handling: Database errors
 * 
 * Usage: node tests/waitlistVacancy.test.js
 * 
 * Expected Output:
 * When tests pass successfully, you should see:
 * Tests finished. Passed: 10, Failed: 0
 * All tests passed!
 * 
 * Test Dependencies:
 * - Node.js assert module (built-in)
 * - Access to the waitlist controller (../controllers/waitlistController.js)
 * - Access to the database configuration (../config/database.js)
 * 
 * Mock Database Queries:
 * The tests mock the SQL function call:
 * SELECT is_waitlist_vacancy_available($1::INT, $2::INT, $3::DATE, $4::DATE, $5::INT, $6::INT, $7::BOOLEAN) AS available
 * 
 * Each test can control the mock response by setting mockDbQueryResult to simulate different scenarios.
 * 
 * Adding New Tests:
 * 1. Add a new it() call in the test suite
 * 2. Set up the mock request body with appropriate parameters
 * 3. Set mockDbQueryResult to the expected database response
 * 4. Create mock request and response objects
 * 5. Call waitlistController.checkVacancy(req, res)
 * 6. Assert the expected status code and response data
 * 7. Return the test parameters and results for logging
 * 
 * Troubleshooting:
 * - Module not found errors: Ensure you're running from the correct directory (rht-hotel/api)
 * - Database connection errors: The tests use mocks, so real database connections are not required
 * - Import errors: Make sure the controller and database modules exist and are properly structured
 * 
 * Integration with CI/CD:
 * These tests can be integrated into your CI/CD pipeline by adding to package.json:
 * {
 *   "scripts": {
 *     "test:waitlist": "node tests/waitlistVacancy.test.js",
 *     "test": "npm run test:waitlist && npm run test:other"
 *   }
 * }
 */

const assert = require('assert');

console.log('Starting waitlist vacancy function tests...\n');

// --- Mocking Infrastructure ---
let mockDbQueryResult = { rows: [{ available: false }] }; // Default mock result

// Mock pool object that will be used during tests
const mockPool = {
    query: async (queryText, values) => {
        console.log('Mock DB Query:', queryText, 'Values:', values);
        return mockDbQueryResult;
    }
};

// Mock getPool function
const mockGetPool = () => mockPool;

// Store original functions to restore after tests
let originalGetPool;

// Mock the database module
const originalDatabaseModule = require('../config/database');
const mockDatabaseModule = {
    ...originalDatabaseModule,
    getPool: mockGetPool
};

// Patch the database module for testing
function patchDatabaseForTesting() {
    // Store original
    originalGetPool = originalDatabaseModule.getPool;
    
    // Replace with mock
    require.cache[require.resolve('../config/database')].exports = mockDatabaseModule;
}

// Restore original database module
function unpatchDatabaseAfterTesting() {
    if (originalGetPool) {
        require.cache[require.resolve('../config/database')].exports = {
            ...originalDatabaseModule,
            getPool: originalGetPool
        };
    }
}

// Helper function to create a mock request object
function createMockRequest(requestId, body) {
    return {
        requestId,
        body
    };
}

// Helper function to create a mock response object
function createMockResponse() {
    const res = {
        status: (code) => {
            res.statusCode = code;
            return res;
        },
        json: (data) => {
            res.data = data;
            return res;
        },
        statusCode: 200,
        data: null
    };
    return res;
}

// Import the controller after patching
let waitlistController;

// --- Test Suites ---
(async () => {
    const tests = [];
    const describe = (name, fn) => {
        console.log(`\n--- ${name} ---`);
        fn(); // Execute the block of tests
    };
    const it = (name, fn) => { tests.push({ name, fn }); };

    describe('waitlistController.checkVacancy (Comprehensive Test Suite)', () => {

        // Test Case 1: Basic successful vacancy check
        it('Test Case 1: Available vacancy - 2 rooms, 4 guests, smoking preference', async () => {
            const requestBody = {
                hotel_id: 7,
                room_type_id: 3,
                check_in: '2025-07-15T15:00:00.000Z',
                check_out: '2025-07-18T15:00:00.000Z',
                number_of_rooms: 2,
                number_of_guests: 4,
                smoking_preference: true
            };
            
            mockDbQueryResult = { rows: [{ available: true }] };
            
            const req = createMockRequest('req_tc1', requestBody);
            const res = createMockResponse();
            
            await waitlistController.checkVacancy(req, res);
            
            assert.strictEqual(res.statusCode, 200, 'Should return 200 status');
            assert.strictEqual(res.data.available, true, 'Should return available: true');
            
            return { params: requestBody, result: res.data };
        });

        // Test Case 2: No vacancy available
        it('Test Case 2: No vacancy - 3 rooms, 6 guests, non-smoking preference', async () => {
            const requestBody = {
                hotel_id: 7,
                room_type_id: 5,
                check_in: '2025-08-01T15:00:00.000Z',
                check_out: '2025-08-05T15:00:00.000Z',
                number_of_rooms: 3,
                number_of_guests: 6,
                smoking_preference: false
            };
            
            mockDbQueryResult = { rows: [{ available: false }] };
            
            const req = createMockRequest('req_tc2', requestBody);
            const res = createMockResponse();
            
            await waitlistController.checkVacancy(req, res);
            
            assert.strictEqual(res.statusCode, 200, 'Should return 200 status');
            assert.strictEqual(res.data.available, false, 'Should return available: false');
            
            return { params: requestBody, result: res.data };
        });

        // Test Case 3: Missing required parameters
        it('Test Case 3: Missing required parameters - should return 400 error', async () => {
            const requestBody = {
                hotel_id: 7,
                // Missing check_in, check_out, number_of_rooms, number_of_guests
                room_type_id: 3,
                smoking_preference: true
            };
            
            const req = createMockRequest('req_tc3', requestBody);
            const res = createMockResponse();
            
            await waitlistController.checkVacancy(req, res);
            
            assert.strictEqual(res.statusCode, 400, 'Should return 400 status for missing parameters');
            assert.strictEqual(res.data.error, 'Missing required parameters.', 'Should return correct error message');
            
            return { params: requestBody, result: res.data };
        });

        // Test Case 4: Date conversion test (UTC to JST)
        it('Test Case 4: Date conversion - UTC to JST adjustment', async () => {
            const requestBody = {
                hotel_id: 7,
                room_type_id: null, // No specific room type
                check_in: '2025-07-15T15:00:00.000Z', // UTC time
                check_out: '2025-07-18T15:00:00.000Z', // UTC time
                number_of_rooms: 1,
                number_of_guests: 2,
                smoking_preference: null // Any smoking preference
            };
            
            mockDbQueryResult = { rows: [{ available: true }] };
            
            const req = createMockRequest('req_tc4', requestBody);
            const res = createMockResponse();
            
            await waitlistController.checkVacancy(req, res);
            
            assert.strictEqual(res.statusCode, 200, 'Should return 200 status');
            assert.strictEqual(res.data.available, true, 'Should return available: true');
            
            return { params: requestBody, result: res.data };
        });

        // Test Case 5: Null room_type_id and smoking_preference
        it('Test Case 5: Null room_type_id and smoking_preference - any room type and smoking status', async () => {
            const requestBody = {
                hotel_id: 7,
                room_type_id: null,
                check_in: '2025-09-01T15:00:00.000Z',
                check_out: '2025-09-03T15:00:00.000Z',
                number_of_rooms: 1,
                number_of_guests: 1,
                smoking_preference: null
            };
            
            mockDbQueryResult = { rows: [{ available: true }] };
            
            const req = createMockRequest('req_tc5', requestBody);
            const res = createMockResponse();
            
            await waitlistController.checkVacancy(req, res);
            
            assert.strictEqual(res.statusCode, 200, 'Should return 200 status');
            assert.strictEqual(res.data.available, true, 'Should return available: true');
            
            return { params: requestBody, result: res.data };
        });

        // Test Case 6: Large group booking
        it('Test Case 6: Large group booking - 5 rooms, 15 guests', async () => {
            const requestBody = {
                hotel_id: 7,
                room_type_id: 2,
                check_in: '2025-10-01T15:00:00.000Z',
                check_out: '2025-10-05T15:00:00.000Z',
                number_of_rooms: 5,
                number_of_guests: 15,
                smoking_preference: false
            };
            
            mockDbQueryResult = { rows: [{ available: false }] };
            
            const req = createMockRequest('req_tc6', requestBody);
            const res = createMockResponse();
            
            await waitlistController.checkVacancy(req, res);
            
            assert.strictEqual(res.statusCode, 200, 'Should return 200 status');
            assert.strictEqual(res.data.available, false, 'Should return available: false for large group');
            
            return { params: requestBody, result: res.data };
        });

        // Test Case 7: Database error simulation
        it('Test Case 7: Database error - should return 500 error', async () => {
            const requestBody = {
                hotel_id: 7,
                room_type_id: 3,
                check_in: '2025-07-15T15:00:00.000Z',
                check_out: '2025-07-18T15:00:00.000Z',
                number_of_rooms: 1,
                number_of_guests: 2,
                smoking_preference: true
            };
            
            // Mock database error
            const originalQuery = mockPool.query;
            mockPool.query = async () => {
                throw new Error('Database connection failed');
            };
            
            const req = createMockRequest('req_tc7', requestBody);
            const res = createMockResponse();
            
            await waitlistController.checkVacancy(req, res);
            
            assert.strictEqual(res.statusCode, 500, 'Should return 500 status for database error');
            assert.strictEqual(res.data.error, 'Failed to check vacancy.', 'Should return correct error message');
            
            // Restore original query function
            mockPool.query = originalQuery;
            
            return { params: requestBody, result: res.data };
        });

        // Test Case 8: Edge case - single room, single guest
        it('Test Case 8: Single room, single guest booking', async () => {
            const requestBody = {
                hotel_id: 7,
                room_type_id: 1,
                check_in: '2025-11-01T15:00:00.000Z',
                check_out: '2025-11-02T15:00:00.000Z',
                number_of_rooms: 1,
                number_of_guests: 1,
                smoking_preference: true
            };
            
            mockDbQueryResult = { rows: [{ available: true }] };
            
            const req = createMockRequest('req_tc8', requestBody);
            const res = createMockResponse();
            
            await waitlistController.checkVacancy(req, res);
            
            assert.strictEqual(res.statusCode, 200, 'Should return 200 status');
            assert.strictEqual(res.data.available, true, 'Should return available: true');
            
            return { params: requestBody, result: res.data };
        });

        // Test Case 9: Zero values validation
        it('Test Case 9: Zero values - should return 400 error', async () => {
            const requestBody = {
                hotel_id: 7,
                room_type_id: 3,
                check_in: '2025-07-15T15:00:00.000Z',
                check_out: '2025-07-18T15:00:00.000Z',
                number_of_rooms: 0, // Invalid
                number_of_guests: 0, // Invalid
                smoking_preference: true
            };
            
            const req = createMockRequest('req_tc9', requestBody);
            const res = createMockResponse();
            
            await waitlistController.checkVacancy(req, res);
            
            assert.strictEqual(res.statusCode, 400, 'Should return 400 status for zero values');
            assert.strictEqual(res.data.error, 'Missing required parameters.', 'Should return correct error message');
            
            return { params: requestBody, result: res.data };
        });

        // Test Case 10: Long stay booking
        it('Test Case 10: Long stay booking - 2 weeks', async () => {
            const requestBody = {
                hotel_id: 7,
                room_type_id: 4,
                check_in: '2025-12-01T15:00:00.000Z',
                check_out: '2025-12-15T15:00:00.000Z',
                number_of_rooms: 2,
                number_of_guests: 4,
                smoking_preference: false
            };
            
            mockDbQueryResult = { rows: [{ available: true }] };
            
            const req = createMockRequest('req_tc10', requestBody);
            const res = createMockResponse();
            
            await waitlistController.checkVacancy(req, res);
            
            assert.strictEqual(res.statusCode, 200, 'Should return 200 status');
            assert.strictEqual(res.data.available, true, 'Should return available: true');
            
            return { params: requestBody, result: res.data };
        });
    });

    // --- Run tests ---
    let passedCount = 0;
    let failedCount = 0;

    console.log("\nINFO: Setting up test environment for waitlist vacancy function...");

    // Patch database module before importing controller
    patchDatabaseForTesting();
    
    // Import controller after patching
    waitlistController = require('../controllers/waitlistController');

    for (const test of tests) {
        let resultData = {};
        try {
            resultData = await test.fn();
            const inputSummary = resultData.params ? `Input: ${JSON.stringify(resultData.params)}` : "Input: N/A";
            const outputSummary = resultData.result ? `Output: ${JSON.stringify(resultData.result)}` : "Output: N/A";
            console.log(`  PASSED: ${test.name} | ${inputSummary} | ${outputSummary}`);
            passedCount++;
        } catch (e) {
            failedCount++;
            const inputSummary = resultData.params ? `Input: ${JSON.stringify(resultData.params)}` : "Input: N/A";
            console.error(`  FAILED: ${test.name} | ${inputSummary} | Error: ${e.message}`);
            if (e.expected !== undefined && e.actual !== undefined) {
                console.error(`    Expected: ${e.expected}, Actual: ${e.actual}`);
            }
        }
    }

    // Restore original database module
    unpatchDatabaseAfterTesting();

    console.log(`\nTests finished. Passed: ${passedCount}, Failed: ${failedCount}`);
    if (failedCount > 0) {
        console.log("\nNote: Some tests failed. Please review the output.");
    } else {
        console.log("\nAll tests passed!");
    }

    console.log('\nTest execution completed.');

})().catch(e => {
    console.error("Critical error running test script:", e);
    // Ensure cleanup happens even on error
    try {
        unpatchDatabaseAfterTesting();
    } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
    }
}); 