const { addReservationAddon } = require('../models/reservations/addons');
const logger = require('../config/logger');

// --- Mocking Infrastructure ---
let mockDbQueryResult = { rows: [] };
let mockValues = [];

const mockDbClientOrPool = {
    query: jest.fn(async (queryText, values) => {
        if (queryText.includes('INSERT INTO reservation_addons')) {
            mockValues = values;
            return mockDbQueryResult;
        }
        if (queryText.includes('BEGIN') || queryText.includes('COMMIT') || queryText.includes('ROLLBACK')) {
            return;
        }
        return mockDbQueryResult;
    }),
    release: jest.fn(() => {}),
    connect: jest.fn(async () => mockDbClientOrPool)
};

// Mock the database module
jest.mock('../config/database', () => ({
    getPool: jest.fn(() => mockDbClientOrPool)
}));

// Mock logger to avoid cluttering output and verify warning calls
jest.mock('../config/logger', () => ({
    warn: jest.fn(),
    error: jest.fn()
}));

describe('Reservation Addon Tax Logic Verification', () => {
    beforeEach(() => {
        mockDbClientOrPool.query.mockClear();
        mockDbClientOrPool.release.mockClear();
        mockDbClientOrPool.connect.mockClear();
        logger.warn.mockClear();
        mockValues = [];
    });

    it('should deduce tax_type_id = 3 (10%) when tax_type_id is missing and tax_rate is 0.1', async () => {
        const addonData = {
            hotel_id: 1,
            reservation_detail_id: 'detail-123',
            addons_global_id: 1,
            addon_name: 'Breakfast',
            addon_type: 'per_night',
            quantity: 1,
            price: 1000,
            tax_rate: 0.1, // Missing tax_type_id
            created_by: 1,
            updated_by: 1
        };

        mockDbQueryResult = {
            rows: [{ id: 1, ...addonData, tax_type_id: 3 }]
        };

        await addReservationAddon('req_test', addonData, mockDbClientOrPool);
        
        expect(mockValues[8]).toBe(3); 
        expect(mockValues[9]).toBe(0.1);

        // Warning should NOT be called because we successfully deduced it
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should deduce tax_type_id = 2 (8%) when tax_type_id is missing and tax_rate is 0.08', async () => {
        const addonData = {
            hotel_id: 1,
            reservation_detail_id: 'detail-123',
            addons_global_id: 1,
            addon_name: 'Takeout',
            addon_type: 'other',
            quantity: 1,
            price: 500,
            tax_rate: 0.08, // Missing tax_type_id
            created_by: 1,
            updated_by: 1
        };

        mockDbQueryResult = {
            rows: [{ id: 2, ...addonData, tax_type_id: 2 }]
        };

        await addReservationAddon('req_test', addonData, mockDbClientOrPool);
        
        expect(mockValues[8]).toBe(2); 
        expect(mockValues[9]).toBe(0.08);
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should deduce tax_type_id = 1 (0%) when tax_type_id is missing and tax_rate is 0', async () => {
        const addonData = {
            hotel_id: 1,
            reservation_detail_id: 'detail-123',
            addons_global_id: 1,
            addon_name: 'Free Item',
            addon_type: 'other',
            quantity: 1,
            price: 0,
            tax_rate: 0, // Missing tax_type_id
            created_by: 1,
            updated_by: 1
        };

        mockDbQueryResult = {
            rows: [{ id: 3, ...addonData, tax_type_id: 1 }]
        };

        await addReservationAddon('req_test', addonData, mockDbClientOrPool);
        
        expect(mockValues[8]).toBe(1); 
        expect(mockValues[9]).toBe(0);
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should warn and use defaults if tax_rate is unknown', async () => {
        const addonData = {
            hotel_id: 1,
            reservation_detail_id: 'detail-123',
            addons_global_id: 1,
            addon_name: 'Weird Tax',
            addon_type: 'other',
            quantity: 1,
            price: 1000,
            tax_rate: 0.55, // Unknown tax rate
            created_by: 1,
            updated_by: 1
        };

        mockDbQueryResult = {
            rows: [{ id: 5, ...addonData }]
        };

        await addReservationAddon('req_test', addonData, mockDbClientOrPool);
        
        // Should remain null/undefined for tax_type_id
        expect(mockValues[8]).toBeUndefined(); 
        expect(mockValues[9]).toBe(0.55);

        // Warning SHOULD be called
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Missing tax info for addon'));
    });

    it('should use provided tax_type_id if present', async () => {
        const addonData = {
            hotel_id: 1,
            reservation_detail_id: 'detail-123',
            addons_global_id: 1,
            addon_name: 'Explicit Tax',
            addon_type: 'other',
            quantity: 1,
            price: 1000,
            tax_type_id: 99, // Explicitly provided
            tax_rate: 0.1,
            created_by: 1,
            updated_by: 1
        };

        mockDbQueryResult = {
            rows: [{ id: 4, ...addonData }]
        };

        await addReservationAddon('req_test', addonData, mockDbClientOrPool);
        
        expect(mockValues[8]).toBe(99); 
        expect(mockValues[9]).toBe(0.1);
        expect(logger.warn).not.toHaveBeenCalled();
    });
});
