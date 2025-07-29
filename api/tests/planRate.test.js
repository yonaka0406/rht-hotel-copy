const assert = require('assert');
// Assuming planRateModel.js is in ../models/
const planRateModel = require('../models/planRate');

// --- Mocking Infrastructure ---
let mockDbQueryResult = { rows: [] }; // This will be set by each test

// This is the mock pool object that will be used by the model during tests
const mockPool = {
    query: async (queryText, values) => {
        // console.log('Mock DB Query:', queryText, 'Values:', values); // For debugging tests
        return mockDbQueryResult;
    }
};

// This function returns the mock pool and will replace the model's actual getPool function
const mockGetPool = () => mockPool;

// Store original functions from planRateModel to restore them after tests
let originalGetPoolInjected;
let originalIsValidConditionInjected;

// Patches the planRateModel to use mock dependencies for testing
function patchPlanRateModelForTesting(model) {
    if (model.__setGetPool && model.__setIsValidCondition && model.__getOriginalGetPool && model.__getOriginalIsValidCondition) {
        originalGetPoolInjected = model.__getOriginalGetPool();
        originalIsValidConditionInjected = model.__getOriginalIsValidCondition();
        model.__setGetPool(mockGetPool); // Inject mock getPool
        model.__setIsValidCondition(() => true); // Mock isValidCondition to always return true
    } else {
        console.warn("CRITICAL: planRateModel does not have test hooks (__setGetPool, etc.). Tests CANNOT mock dependencies correctly.");
    }
}

// Restores the original functions to the planRateModel
function unpatchPlanRateModelAfterTesting(model) {
    if (model.__setGetPool && originalGetPoolInjected) {
        model.__setGetPool(originalGetPoolInjected);
    }
    if (model.__setIsValidCondition && originalIsValidConditionInjected) {
        model.__setIsValidCondition(originalIsValidConditionInjected);
    }
}

// --- Test Suites ---
(async () => {
    const tests = [];
    const describe = (name, fn) => {
        console.log(`\n--- ${name} ---`);
        fn(); // Execute the block of tests
    };
    // 'it' defines an individual test case
    const it = (name, fn) => { tests.push({ name, fn }); };

    describe('planRateModel.getPriceForReservation (Sequential Logic & Enhanced Output)', () => {
        // Test Case for the specific production scenario
        it('Test Case: Base 9300, +1500 seasonal (Jul-Sep), -22% GroupA, 500 flat fee (Nov-Apr) for 2025-07-25', async () => {
            const params = { base: 9300, seasonal: 1500, groupA_adj: -22, flatFee: 500 };
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: params.base, tax_type_id: null, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'base_rate', total_value: params.seasonal, tax_type_id: null, condition_type: 'month', condition_value: '{july,august,september}' },
                    { adjustment_type: 'percentage', tax_type_id: 2, total_value: params.groupA_adj, condition_type: 'none', condition_value: null }, // Group A
                    { adjustment_type: 'flat_fee', tax_type_id: null, total_value: params.flatFee, condition_type: 'month', condition_value: '{november,december,january,february,march,april}' } // Flat fee Nov-Apr
                ]
            };
            
            // Mock the date to be in July
            const originalIsValidCondition = planRateModel.__getOriginalIsValidCondition();
            planRateModel.__setIsValidCondition((row, date) => {
                if (row.condition_type === 'month') {
                    const month = new Date(date).toLocaleString('en-US', { month: 'long' }).toLowerCase();
                    if (row.condition_value.includes(month)) {
                        return true;
                    }
                    return false;
                }
                return true;
            });

            const price = await planRateModel.getPriceForReservation('req_prod', null, null, 'hotel1', '2025-07-25');
            
            // Expected: (9300 + 1500) = 10800
            //           10800 * (1 - 0.22) = 8424 (Group A adjustment)
            //           floor(8424 / 100) * 100 = 8400 (round down to nearest 100)
            //           +0 (Group B adjustment, none in this case)
            //           +0 (flat fee skipped for July)
            assert.strictEqual(price, 8400, `Production scenario failed. Expected 8400 but got ${price}`);
            
            // Restore original function
            planRateModel.__setIsValidCondition(originalIsValidCondition);
            return { params, price };
        });

        // Test Case 1: Your specific example
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
            assert.strictEqual(price, 1332, `Test Case 1 Failed. Input: ${JSON.stringify(params)}`);
            return { params, price };
        });

        // Test Case 2: Only Group A percentage, shows rounding to 100
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
            assert.strictEqual(price, 1100, `Test Case 2 Failed. Input: ${JSON.stringify(params)}`);
            return { params, price };
        });

        // Test Case 3: Only Group B percentage, shows final floor rounding
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
            assert.strictEqual(price, 1055, `Test Case 3 Failed. Input: ${JSON.stringify(params)}`);
            return { params, price };
        });

        // Test Case 4: Flat fee only
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
            assert.strictEqual(price, 1050, `Test Case 4 Failed. Input: ${JSON.stringify(params)}`);
            return { params, price };
        });

        // Test Case 5: Zero base rate, with all types of adjustments
        it('Test Case 5: Base 0, GroupA +10%, GroupB +5%, FF 30', async () => {
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
            assert.strictEqual(price, 30, `Test Case 5 Failed. Input: ${JSON.stringify(params)}`);
            return { params, price };
        });

        // Test Case 6: Multiple Group A and Group B adjustments
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
            assert.strictEqual(price, 1175, `Test Case 6 Failed. Input: Base=1000, GrpA_Net=0.10, GrpB_Net=0.05, FF=20`);
            return { params: {base:1000, groupA_adj:0.10, groupB_adj:0.05, flatFee:20}, price };
        });

        // Test Case 7: No percentage adjustments, only base and flat fee, rounding on base
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
            assert.strictEqual(price, 1225, `Test Case 7 Failed. Input: ${JSON.stringify(params)}`);
            return { params, price };
        });

        // Test Case 8: Price after Group A is < 100
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
            assert.strictEqual(price, 0, `Test Case 8 Failed. Input: ${JSON.stringify(params)}`);
            return { params, price };
        });
    });

    // --- Run tests ---
    let passedCount = 0;
    let failedCount = 0;

    console.log("\nINFO: Test run assumes `planRateModel.js` has been adapted for testability (e.g., with __setGetPool).");

    patchPlanRateModelForTesting(planRateModel); // Apply mocks

    for (const test of tests) {
        let resultData = {};
        try {
            resultData = await test.fn(); // Test function now returns {params, price}
            const inputSummary = resultData.params ? `Input: ${JSON.stringify(resultData.params)}` : "Input: N/A";
            console.log(`  PASSED: ${test.name} | ${inputSummary} | Output: ${resultData.price}`);
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

    unpatchPlanRateModelAfterTesting(planRateModel); // Restore original functions

    console.log(`\nTests finished. Passed: ${passedCount}, Failed: ${failedCount}`);
    if (failedCount > 0) {
        console.log("\nNote: Some tests failed. Please review the output.");
    } else {
        console.log("\nAll tests passed!");
    }

})().catch(e => {
    console.error("Critical error running test script:", e);
});
