const planRateModel = require('../models/planRate');

// --- Mocking Infrastructure ---
let mockDbQueryResult = { rows: [] }; // This will be set by each test

// This is the mock client/pool object that will be used by the model during tests
const mockDbClientOrPool = {
    query: jest.fn(async (queryText, values) => {
        // console.log('Mock DB Query:', queryText, 'Values:', values); // For debugging tests
        // Handle transaction commands
        if (queryText.includes('BEGIN') || queryText.includes('COMMIT') || queryText.includes('ROLLBACK')) {
            return;
        }
        return mockDbQueryResult;
    }),
    release: jest.fn(() => {}), // Mock release function
    connect: jest.fn(async () => mockDbClientOrPool) // connect returns itself
};

describe('planRateModel', () => {
    let originalGetPool;
    let originalIsValidCondition;

    beforeEach(() => {
        // Store original functions
        originalGetPool = planRateModel.__getOriginalGetPool();
        originalIsValidCondition = planRateModel.__getOriginalIsValidCondition();

        // Inject mock getPool and isValidCondition
        planRateModel.__setGetPool(() => mockDbClientOrPool);
        planRateModel.__setIsValidCondition(jest.fn((row, date) => {
            if (row.condition_type === 'month') {
                const month = new Date(date).toLocaleString('en-US', { month: 'long' }).toLowerCase();
                return row.condition_value.includes(month);
            }
            return true; // Default for 'none' or other types
        }));

        // Reset mock calls for each test
        mockDbClientOrPool.query.mockClear();
        mockDbClientOrPool.release.mockClear();
        mockDbClientOrPool.connect.mockClear();
    });

    afterEach(() => {
        // Restore original functions
        planRateModel.__setGetPool(originalGetPool);
        planRateModel.__setIsValidCondition(originalIsValidCondition);
    });

    describe('getPriceForReservation (Sequential Logic & Enhanced Output)', () => {
        it('Test Case: Base 9300, +1500 seasonal (Jul-Sep), -22% GroupA, 500 flat fee (Nov-Apr) for 2025-07-25', async () => {
            const params = { base: 9300, seasonal: 1500, groupA_adj: -22, flatFee: 500 };
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: params.base, tax_type_id: null, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'base_rate', total_value: params.seasonal, tax_type_id: null, condition_type: 'month', condition_value: '{july,august,september}' },
                    { adjustment_type: 'percentage', tax_type_id: 2, total_value: params.groupA_adj, condition_type: 'none', condition_value: null }, // Group A
                    { adjustment_type: 'flat_fee', total_value: params.flatFee, tax_type_id: null, condition_type: 'month', condition_value: '{november,december,january,february,march,april}' } // Flat fee Nov-Apr
                ]
            };
            
            const price = await planRateModel.getPriceForReservation('req_prod', null, null, 'hotel1', '2025-07-25');
            
            // Expected: (9300 + 1500) = 10800
            //           10800 * (1 - 0.22) = 8424 (Group A adjustment)
            //           floor(8424 / 100) * 100 = 8400 (round down to nearest 100)
            //           +0 (Group B adjustment, none in this case)
            //           +0 (flat fee skipped for July)
            expect(price).toBe(8400);
        });

        it('Test Case 1: Base 1400, GroupA -4%, GroupB +2.5%, FF 0', async () => {
            const params = { base: 1400, groupA_adj: -4, groupB_adj: 2.5, flatFee: 0 };
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: params.base, tax_type_id: null, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'percentage', tax_type_id: 2, total_value: params.groupA_adj, condition_type: 'none', condition_value: null }, // Group A
                    { adjustment_type: 'percentage', tax_type_id: 1, total_value: params.groupB_adj, condition_type: 'none', condition_value: null }  // Group B
                ]
            };
            const price = await planRateModel.getPriceForReservation('req_tc1', null, null, 'hotel1', '2023-01-01');
            // Expected: (1400 * (1 - 0.04) = 1344)
            //           floor(1344 / 100) * 100 = 1300 (round down to nearest 100)
            //           1300 * (1 + 2.5/100) = 1332.5 (Group B applied after rounding)
            //           floor(1332.5) + 0 (FF) = 1332
            expect(price).toBe(1332);
        });

        it('Test Case 2: Base 1080, GroupA +10% (10 val for tax_type_id !=1), FF 0', async () => {
            const params = { base: 1080, groupA_adj: 10, groupB_adj: 0, flatFee: 0 };
             mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: params.base, tax_type_id: null, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'percentage', tax_type_id: 2, total_value: params.groupA_adj, condition_type: 'none', condition_value: null }
                ]
            };
            const price = await planRateModel.getPriceForReservation('req_tc2', null, null, 'hotel1', '2023-01-01');
            // Expected: (1080 * (1 + 0.10) = 1188)
            //           floor(1188 / 100) * 100 = 1100 (round down to nearest 100)
            //           1100 * (1 + 0) = 1100 (No Group B adjustment)
            //           floor(1100) + 0 = 1100
            expect(price).toBe(1100);
        });

        it('Test Case 3: Base 1000, GroupB +5.5% (5.5 val for tax_type_id=1), FF 0', async () => {
            const params = { base: 1000, groupA_adj: 0, groupB_adj: 5.5, flatFee: 0 };
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: params.base, tax_type_id: null, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'percentage', tax_type_id: 1, total_value: params.groupB_adj, condition_type: 'none', condition_value: null }
                ]
            };
            const price = await planRateModel.getPriceForReservation('req_tc3', null, null, 'hotel1', '2023-01-01');
            // Expected: (1000 * (1 + 0) = 1000)
            //           floor(1000 / 100) * 100 = 1000 (round down to nearest 100)
            //           1000 * (1 + 5.5/100) = 1055 (Group B applied after rounding)
            //           floor(1055) + 0 = 1055
            expect(price).toBe(1055);
        });

        it('Test Case 4: Base 1000, FF 50', async () => {
            const params = { base: 1000, groupA_adj: 0, groupB_adj: 0, flatFee: 50 };
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: params.base, tax_type_id: null, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'flat_fee', total_value: params.flatFee, tax_type_id: null, condition_type: 'none', condition_value: null }
                ]
            };
            const price = await planRateModel.getPriceForReservation('req_tc4', null, null, 'hotel1', '2023-01-01');
            // Expected: (1000 * (1+0) = 1000) -> 1000 -> (1000 * (1+0) = 1000) -> 1000
            //           1000 + 50 = 1050
            expect(price).toBe(1050);
        });

        it('Test Case 5: Zero base rate, with all types of adjustments', async () => {
            const params = { base: 0, groupA_adj: 10, groupB_adj: 5, flatFee: 30 };
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: params.base, tax_type_id: null, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'percentage', tax_type_id: 2, total_value: params.groupA_adj, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'percentage', tax_type_id: 1, total_value: params.groupB_adj, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'flat_fee', total_value: params.flatFee, tax_type_id: null, condition_type: 'none', condition_value: null }
                ]
            };
            const price = await planRateModel.getPriceForReservation('req_tc5', null, null, 'hotel1', '2023-01-01');
            // Expected: (0 * 1.10 = 0) -> 0 -> (0 * 1.05 = 0) -> 0
            //           0 + 30 = 30
            expect(price).toBe(30);
        });

        it('Test Case 6: Base 1000, GroupA(-5%, +15%), GroupB(+2%, +3%), FF 20', async () => {
            const params = { base: 1000, flatFee: 20 }; // Effects calculated from rows
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: params.base, tax_type_id: null, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'percentage', tax_type_id: 2, total_value: -0.05, condition_type: 'none', condition_value: null }, // Group A
                    { adjustment_type: 'percentage', tax_type_id: 3, total_value: 15, condition_type: 'none', condition_value: null },  // Group A
                    { adjustment_type: 'percentage', tax_type_id: 1, total_value: 2, condition_type: 'none', condition_value: null },    // Group B
                    { adjustment_type: 'percentage', tax_type_id: 1, total_value: 3, condition_type: 'none', condition_value: null },    // Group B
                    { adjustment_type: 'flat_fee', total_value: params.flatFee, tax_type_id: null, condition_type: 'none', condition_value: null }
                ]
            };
            // groupAPercentageEffect = -0.05 + 0.15 = 0.10
            // groupBPercentageEffect = (2/100) + (3/100) = 0.02 + 0.03 = 0.05
            const price = await planRateModel.getPriceForReservation('req_tc6', null, null, 'hotel1', '2023-01-01');
            // Expected: (1000 * (1 + 0.10) = 1100) -> floor(1100/100)*100 = 1100
            //           (1100 * (1 + 0.05) = 1155) -> floor(1155) = 1155
            //           1155 + 20 = 1175
            expect(price).toBe(1175);
        });

        it('Test Case 7: Base 1280, FF 25', async () => {
            const params = { base: 1280, groupA_adj: 0, groupB_adj: 0, flatFee: 25 };
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: params.base, tax_type_id: null, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'flat_fee', total_value: params.flatFee, tax_type_id: null, condition_type: 'none', condition_value: null }
                ]
            };
            const price = await planRateModel.getPriceForReservation('req_tc7', null, null, 'hotel1', '2023-01-01');
            // Expected: (1280 * 1 = 1280) -> floor(1280/100)*100 = 1200
            //           (1200 * 1 = 1200) -> floor(1200) = 1200
            //           1200 + 25 = 1225
            expect(price).toBe(1225);
        });

        it('Test Case 8: Base 80, GroupA +10% (0.1), FF 0', async () => {
            const params = { base: 80, groupA_adj: 0.10, groupB_adj: 0, flatFee: 0 };
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: params.base, tax_type_id: null, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'percentage', tax_type_id: 2, total_value: params.groupA_adj, condition_type: 'none', condition_value: null }
                ]
            };
            const price = await planRateModel.getPriceForReservation('req_tc8', null, null, 'hotel1', '2023-01-01');
            // Expected: (80 * 1.10 = 88) -> floor(88/100)*100 = 0
            //           (0 * 1 = 0) -> floor(0) = 0
            //           0 + 0 = 0
            expect(price).toBe(0);
        });
    });

    describe('planRateModel CRUD Operations', () => {
        it('should create a new plan rate with include_in_cancel_fee', async () => {
            const newRateData = {
                hotel_id: 1,
                plans_global_id: 1,
                adjustment_type: 'base_rate',
                adjustment_value: 10000,
                include_in_cancel_fee: true,
                tax_type_id: 1,
                tax_rate: 0.1,
                condition_type: 'none',
                date_start: '2023-01-01',
                created_by: 1
            };
            mockDbQueryResult = {
                rows: [{ id: 1, ...newRateData, created_at: new Date(), updated_at: new Date() }]
            };
            const createdRate = await planRateModel.createPlansRate('req_create', newRateData);
            expect(createdRate.adjustment_value).toBe(newRateData.adjustment_value);
            expect(createdRate.include_in_cancel_fee).toBe(newRateData.include_in_cancel_fee);
        });

        it('should update an existing plan rate with include_in_cancel_fee', async () => {
            const updatedRateData = {
                id: 1,
                hotel_id: 1,
                plans_global_id: 1,
                adjustment_type: 'flat_fee',
                adjustment_value: 500,
                include_in_cancel_fee: false,
                tax_type_id: 1,
                tax_rate: 0.1,
                condition_type: 'none',
                date_start: '2023-01-01',
                updated_by: 1
            };
            mockDbQueryResult = {
                rows: [{ ...updatedRateData, created_at: new Date(), updated_at: new Date() }]
            };
            const updatedRate = await planRateModel.updatePlansRate('req_update', updatedRateData.id, updatedRateData);
            expect(updatedRate.adjustment_value).toBe(updatedRateData.adjustment_value);
            expect(updatedRate.include_in_cancel_fee).toBe(updatedRateData.include_in_cancel_fee);
        });
    });
});