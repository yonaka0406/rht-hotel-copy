
const { DatabaseError } = require('pg');

// Mock pg
const mockClient = {
    query: jest.fn(),
    on: jest.fn(),
    release: jest.fn(),
    processID: 12345
};

const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    on: jest.fn(),
    totalCount: 1,
    idleCount: 0,
    waitingCount: 0
};

jest.mock('../config/database', () => ({
    getProdPool: jest.fn(() => mockPool),
    getPool: jest.fn(() => mockPool)
}));

jest.mock('../config/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
}));

// Mock ota/xmlController
jest.mock('../ota/xmlController', () => ({
    submitXMLTemplate: jest.fn().mockResolvedValue({ success: true }),
    selectXMLTemplate: jest.fn().mockResolvedValue('<xml></xml>'),
    OtaApiError: class extends Error {}
}));

// Mock ota/xmlModel
jest.mock('../ota/xmlModel', () => ({
    updateOTAXmlQueue: jest.fn().mockResolvedValue({ success: true })
}));

// Mock cron_logs
jest.mock('../models/cron_logs', () => ({
    startLog: jest.fn().mockResolvedValue(1),
    completeLog: jest.fn().mockResolvedValue(true)
}));

const { startOtaXmlPoller, stopOtaXmlPoller, POLL_INTERVAL } = require('../jobs/otaXmlPoller');

describe('OTA XML Poller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset process.env or other state if needed
    });

    afterEach(async () => {
        stopOtaXmlPoller();
        // Wait for loop to actually exit
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    it('should reuse the same database connection across multiple poll cycles', async () => {
        // Setup mock return values for fetchPendingRequests
        const { updateOTAXmlQueue } = require('../ota/xmlModel');
        const { submitXMLTemplate } = require('../ota/xmlController');
        const { getProdPool } = require('../config/database');

        // First call returns 1 item, subsequent call returns 0
        mockClient.query
            .mockResolvedValueOnce({ rows: [{ id: 1, hotel_id: 1, service_name: 'Test', xml_body: '<test></test>', retries: 0 }] }) // Fetch items
            .mockResolvedValueOnce({ rows: [] }); // Next fetch returns nothing

        // Start poller
        startOtaXmlPoller();

        // Wait for at least two cycles (initial + one empty)
        await new Promise(resolve => setTimeout(resolve, 3000));

        stopOtaXmlPoller();

        // Verify pool.connect was called only once
        expect(getProdPool().connect).toHaveBeenCalledTimes(1);

        // Verify items were processed
        expect(submitXMLTemplate).toHaveBeenCalled();
        expect(updateOTAXmlQueue).toHaveBeenCalledWith(null, 1, 'completed', null, mockClient);
    });

    it('should re-acquire connection if the client is lost', async () => {
        const { getProdPool } = require('../config/database');

        // Force a DB error on the first query
        const dbError = new DatabaseError('Connection lost', 0, 'error');
        dbError.code = '57P01'; // Admin shutdown

        mockClient.query
            .mockRejectedValueOnce(dbError) // First fetch fails
            .mockResolvedValueOnce({ rows: [] }); // Second fetch (after re-connect) succeeds

        startOtaXmlPoller();

        // Wait for poller to detect error and retry (waits 5s on DB error)
        await new Promise(resolve => setTimeout(resolve, 8000));

        stopOtaXmlPoller();

        // Should have called connect twice
        expect(getProdPool().connect).toHaveBeenCalledTimes(2);
    }, 15000); // Increased timeout
});
