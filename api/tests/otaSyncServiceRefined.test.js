
// Mock uuid
jest.mock('uuid', () => ({
    validate: jest.fn().mockReturnValue(true),
    v4: jest.fn().mockReturnValue('mocked-uuid')
}));

const { syncReservationInventory } = require('../services/otaSyncService');

// Mocking dependencies
const mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
    on: jest.fn()
};

const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    on: jest.fn()
};

jest.mock('../config/database', () => ({
    getPool: jest.fn(() => mockPool),
    getProdPool: jest.fn(() => mockPool)
}));

jest.mock('../config/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
}));

// Mock models used in the service
const mockScLogs = [
    { hotel_id: 1, check_in: '2027-01-01', check_out: '2027-01-05' },
    { hotel_id: 1, check_in: '2027-01-10', check_out: '2027-01-15' }
];
const mockGoogleData = [
    { hotel_id: 1, check_in: '2027-01-01', check_out: '2027-01-05' },
    { hotel_id: 1, check_in: '2027-01-10', check_out: '2027-01-15' }
];

jest.mock('../models/log', () => ({
    selectReservationInventoryChange: jest.fn().mockResolvedValue(mockScLogs),
    selectReservationGoogleInventoryChange: jest.fn().mockResolvedValue(mockGoogleData)
}));

jest.mock('../models/report', () => ({
    selectReservationsInventory: jest.fn().mockResolvedValue([{ date: '2027-01-01', total_rooms: 10, room_count: 5, netrmtypegroupcode: 'G1' }])
}));

jest.mock('../ota/xmlController', () => ({
    updateInventoryMultipleDays: jest.fn().mockResolvedValue({ success: true })
}));

describe('OTA Sync Service Refinements', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NODE_ENV = 'production';
    });

    it('should iterate over ALL entries in googleData and scLogs', async () => {
        const logId = 12345;
        const requestId = 'test-refinement-id';

        await syncReservationInventory(requestId, logId);

        // Verify connection count
        const { getProdPool } = require('../config/database');
        expect(getProdPool().connect).toHaveBeenCalledTimes(1);
        expect(mockClient.release).toHaveBeenCalledTimes(1);

        // Verify Google Sheets Enqueue happened TWICE (for both entries in mockGoogleData)
        expect(mockClient.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO google_sheets_queue'),
            expect.arrayContaining(['2027-01-01'])
        );
        expect(mockClient.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO google_sheets_queue'),
            expect.arrayContaining(['2027-01-10'])
        );

        // Verify OTA Sync happened TWICE (for both entries in mockScLogs)
        const { updateInventoryMultipleDays } = require('../ota/xmlController');
        expect(updateInventoryMultipleDays).toHaveBeenCalledTimes(2);
    });
});
