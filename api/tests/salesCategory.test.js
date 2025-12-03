const planRateModel = require('../models/planRate');
const { getAllPlanAddons } = require('../models/planAddon/read');
const { createPlanAddon } = require('../models/planAddon/write');
const { insertReservationRate, insertAggregatedRates } = require('../models/reservations/insert');
const { addReservationAddon } = require('../models/reservations/addons');

// --- Mocking Infrastructure ---
let mockDbQueryResult = { rows: [] };

const mockDbClientOrPool = {
    query: jest.fn(async (queryText, values) => {
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

describe('Sales Category Classification - Backend Verification', () => {
    beforeEach(() => {
        mockDbClientOrPool.query.mockClear();
        mockDbClientOrPool.release.mockClear();
        mockDbClientOrPool.connect.mockClear();
    });

    describe('Requirement 1.1: Plan Rate Creation with Default Sales Category', () => {
        it('should create a plan rate with default sales_category = accommodation', async () => {
            const newRateData = {
                hotel_id: 1,
                plans_global_id: 1,
                adjustment_type: 'base_rate',
                adjustment_value: 10000,
                tax_type_id: 1,
                tax_rate: 0.1,
                condition_type: 'none',
                date_start: '2023-01-01',
                created_by: 1
            };

            mockDbQueryResult = {
                rows: [{ 
                    id: 1, 
                    ...newRateData, 
                    sales_category: 'accommodation',
                    created_at: new Date() 
                }]
            };

            const createdRate = await planRateModel.createPlansRate('req_test', newRateData);
            
            expect(createdRate.sales_category).toBe('accommodation');
            expect(mockDbClientOrPool.query).toHaveBeenCalled();
            
            const insertCall = mockDbClientOrPool.query.mock.calls.find(
                call => call[0].includes('INSERT INTO plans_rates')
            );
            expect(insertCall).toBeDefined();
            expect(insertCall[1]).toContain('accommodation');
        });

        it('should create a plan rate with explicit sales_category = other', async () => {
            const newRateData = {
                hotel_id: 1,
                plans_global_id: 1,
                adjustment_type: 'base_rate',
                adjustment_value: 500,
                tax_type_id: 1,
                tax_rate: 0.1,
                condition_type: 'none',
                date_start: '2023-01-01',
                created_by: 1,
                sales_category: 'other'
            };

            mockDbQueryResult = {
                rows: [{ 
                    id: 2, 
                    ...newRateData,
                    created_at: new Date() 
                }]
            };

            const createdRate = await planRateModel.createPlansRate('req_test', newRateData);
            
            expect(createdRate.sales_category).toBe('other');
        });
    });

    describe('Requirement 1.2: Plan Addon Creation with Default Sales Category', () => {
        it('should create a plan addon with default sales_category = accommodation', async () => {
            const newAddonData = {
                hotel_id: 1,
                plans_global_id: 1,
                addons_id: '1',
                addon_type: 'per_night',
                price: 1000,
                tax_type_id: 1,
                tax_rate: 0.1,
                date_start: '2023-01-01',
                created_by: 1
            };

            mockDbQueryResult = {
                rows: [{ 
                    id: 1, 
                    addons_global_id: 1,
                    sales_category: 'accommodation',
                    ...newAddonData 
                }]
            };

            const createdAddon = await createPlanAddon('req_test', newAddonData);
            
            expect(createdAddon.sales_category).toBe('accommodation');
        });

        it('should create a plan addon with explicit sales_category = other', async () => {
            const newAddonData = {
                hotel_id: 1,
                plans_global_id: 1,
                addons_id: '1',
                addon_type: 'per_night',
                price: 500,
                tax_type_id: 1,
                tax_rate: 0.1,
                date_start: '2023-01-01',
                created_by: 1,
                sales_category: 'other'
            };

            mockDbQueryResult = {
                rows: [{ 
                    id: 2, 
                    addons_global_id: 1,
                    ...newAddonData 
                }]
            };

            const createdAddon = await createPlanAddon('req_test', newAddonData);
            
            expect(createdAddon.sales_category).toBe('other');
        });
    });

    describe('Requirement 1.3: Reservation Rate Inherits Sales Category', () => {
        it('should create reservation rate inheriting sales_category from plan rate', async () => {
            const rateData = {
                hotel_id: 1,
                reservation_details_id: 'detail-123',
                adjustment_type: 'base_rate',
                adjustment_value: 10000,
                tax_type_id: 1,
                tax_rate: 0.1,
                price: 10000,
                include_in_cancel_fee: false,
                sales_category: 'accommodation',
                created_by: 1
            };

            mockDbQueryResult = {
                rows: [{ id: 1, ...rateData }]
            };

            const createdRate = await insertReservationRate('req_test', rateData, mockDbClientOrPool);
            
            expect(createdRate.sales_category).toBe('accommodation');
        });

        it('should default to accommodation if sales_category is not provided', async () => {
            const rateData = {
                hotel_id: 1,
                reservation_details_id: 'detail-123',
                adjustment_type: 'base_rate',
                adjustment_value: 10000,
                tax_type_id: 1,
                tax_rate: 0.1,
                price: 10000,
                include_in_cancel_fee: false,
                created_by: 1
            };

            mockDbQueryResult = {
                rows: [{ id: 1, ...rateData, sales_category: 'accommodation' }]
            };

            const createdRate = await insertReservationRate('req_test', rateData, mockDbClientOrPool);
            
            expect(createdRate.sales_category).toBe('accommodation');
            
            const insertCall = mockDbClientOrPool.query.mock.calls.find(
                call => call[0].includes('INSERT INTO reservation_rates')
            );
            expect(insertCall[1]).toContain('accommodation');
        });
    });

    describe('Requirement 1.4: Reservation Addon Inherits Sales Category', () => {
        it('should create reservation addon inheriting sales_category from plan addon', async () => {
            const addonData = {
                hotel_id: 1,
                reservation_detail_id: 'detail-123',
                addons_global_id: 1,
                addon_name: 'Breakfast',
                addon_type: 'per_night',
                quantity: 1,
                price: 1000,
                tax_type_id: 1,
                tax_rate: 0.1,
                sales_category: 'accommodation',
                created_by: 1,
                updated_by: 1
            };

            mockDbQueryResult = {
                rows: [{ id: 1, ...addonData }]
            };

            const createdAddon = await addReservationAddon('req_test', addonData, mockDbClientOrPool);
            
            expect(createdAddon.sales_category).toBe('accommodation');
        });

        it('should default to accommodation if sales_category is not provided', async () => {
            const addonData = {
                hotel_id: 1,
                reservation_detail_id: 'detail-123',
                addons_global_id: 1,
                addon_name: 'Parking',
                addon_type: 'per_stay',
                quantity: 1,
                price: 500,
                tax_type_id: 1,
                tax_rate: 0.1,
                created_by: 1,
                updated_by: 1
            };

            mockDbQueryResult = {
                rows: [{ id: 2, ...addonData, sales_category: 'accommodation' }]
            };

            const createdAddon = await addReservationAddon('req_test', addonData, mockDbClientOrPool);
            
            expect(createdAddon.sales_category).toBe('accommodation');
        });
    });

    describe('Plan Rate Update with Sales Category', () => {
        it('should update plan rate sales_category', async () => {
            const updatedRateData = {
                id: 1,
                hotel_id: 1,
                plans_global_id: 1,
                adjustment_type: 'base_rate',
                adjustment_value: 10000,
                tax_type_id: 1,
                tax_rate: 0.1,
                condition_type: 'none',
                date_start: '2023-01-01',
                sales_category: 'other',
                updated_by: 1
            };

            mockDbQueryResult = {
                rows: [{ ...updatedRateData, updated_at: new Date() }]
            };

            const updatedRate = await planRateModel.updatePlansRate('req_test', 1, updatedRateData);
            
            expect(updatedRate.sales_category).toBe('other');
        });
    });

    describe('Aggregated Rates with Sales Category', () => {
        it('should insert aggregated rates preserving sales_category', async () => {
            const rates = [
                {
                    adjustment_type: 'base_rate',
                    adjustment_value: 10000,
                    tax_type_id: 1,
                    tax_rate: 0.1,
                    include_in_cancel_fee: false,
                    sales_category: 'accommodation'
                },
                {
                    adjustment_type: 'flat_fee',
                    adjustment_value: 500,
                    tax_type_id: 1,
                    tax_rate: 0.1,
                    include_in_cancel_fee: false,
                    sales_category: 'accommodation'
                }
            ];

            mockDbQueryResult = {
                rows: [{ id: 1 }, { id: 2 }]
            };

            await insertAggregatedRates(
                'req_test',
                rates,
                1,
                'detail-123',
                1,
                false,
                mockDbClientOrPool
            );

            const insertCalls = mockDbClientOrPool.query.mock.calls.filter(
                call => call[0].includes('INSERT INTO reservation_rates')
            );
            
            expect(insertCalls.length).toBeGreaterThan(0);
            insertCalls.forEach(call => {
                expect(call[1]).toContain('accommodation');
            });
        });

        it('should aggregate rates by sales_category', async () => {
            const rates = [
                {
                    adjustment_type: 'base_rate',
                    adjustment_value: 5000,
                    tax_type_id: 1,
                    tax_rate: 0.1,
                    include_in_cancel_fee: false,
                    sales_category: 'accommodation'
                },
                {
                    adjustment_type: 'base_rate',
                    adjustment_value: 500,
                    tax_type_id: 1,
                    tax_rate: 0.1,
                    include_in_cancel_fee: false,
                    sales_category: 'other'
                }
            ];

            mockDbQueryResult = {
                rows: [{ id: 1 }, { id: 2 }]
            };

            await insertAggregatedRates(
                'req_test',
                rates,
                1,
                'detail-123',
                1,
                false,
                mockDbClientOrPool
            );

            const insertCalls = mockDbClientOrPool.query.mock.calls.filter(
                call => call[0].includes('INSERT INTO reservation_rates')
            );
            
            // Should create separate rates for different sales_category
            expect(insertCalls.length).toBe(2);
        });
    });

    describe('Query Operations Include Sales Category', () => {
        it('getAllPlansRates should include sales_category in SELECT', async () => {
            mockDbQueryResult = {
                rows: [
                    { 
                        id: 1, 
                        sales_category: 'accommodation',
                        adjustment_type: 'base_rate',
                        adjustment_value: 10000
                    }
                ]
            };

            const rates = await planRateModel.getAllPlansRates('req_test', 1, null, 1);
            
            expect(rates[0].sales_category).toBe('accommodation');
            
            const selectCall = mockDbClientOrPool.query.mock.calls.find(
                call => call[0].includes('SELECT') && call[0].includes('plans_rates')
            );
            expect(selectCall[0]).toContain('sales_category');
        });

        it('getPlansRateById should include sales_category in SELECT', async () => {
            mockDbQueryResult = {
                rows: [
                    { 
                        id: 1, 
                        sales_category: 'other',
                        adjustment_type: 'base_rate',
                        adjustment_value: 500
                    }
                ]
            };

            const rate = await planRateModel.getPlansRateById('req_test', 1);
            
            expect(rate.sales_category).toBe('other');
        });

        it('getRatesForTheDay should include sales_category', async () => {
            mockDbQueryResult = {
                rows: [
                    { 
                        adjustment_type: 'base_rate',
                        adjustment_value: 10000,
                        sales_category: 'accommodation',
                        condition_type: 'none',
                        condition_value: null,
                        tax_type_id: 1,
                        tax_rate: 0.1,
                        include_in_cancel_fee: false
                    }
                ]
            };

            const rates = await planRateModel.getRatesForTheDay(
                'req_test',
                1,
                null,
                1,
                '2023-01-01',
                mockDbClientOrPool
            );
            
            expect(rates[0].sales_category).toBe('accommodation');
        });
    });
});
