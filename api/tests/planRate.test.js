const assert = require('assert');
// Assuming planRateModel.js is in ../models/
const planRateModel = require('../models/planRate');

// --- Mocking Infrastructure ---
let mockDbQueryResult = { rows: [] };
const mockPool = {
    query: async (queryText, values) => {
        // console.log('Mock DB Query:', queryText, values); // Keep for debugging if needed
        return mockDbQueryResult; // Use the centrally defined mock result
    }
};

const mockGetPool = () => mockPool;

// Store original functions from planRateModel to restore them
let originalGetPoolInjected;
let originalIsValidConditionInjected;

// These functions would ideally be part of planRateModel.js for testability
// e.g., module.exports.setTestDependencies = (deps) => { getPool = deps.getPool; isValidCondition = deps.isValidCondition; }
// For now, we assume planRateModel.js has been adapted to use these setters/getters.
// If not, these tests won't correctly mock dependencies without a proper test framework.

function patchPlanRateModelForTesting(model) {
    if (model.__setGetPool && model.__setIsValidCondition && model.__getOriginalGetPool && model.__getOriginalIsValidCondition) {
        originalGetPoolInjected = model.__getOriginalGetPool();
        originalIsValidConditionInjected = model.__getOriginalIsValidCondition();
        model.__setGetPool(mockGetPool);
        model.__setIsValidCondition(() => true); // Mock isValidCondition to always return true for price calculation tests
    } else {
        console.warn("planRateModel does not have __setGetPool/__setIsValidCondition or __getOriginalGetPool/__getOriginalIsValidCondition. Tests may not mock dependencies correctly.");
    }
}

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
        fn();
    };
    const it = (name, fn) => { tests.push({ name, fn }); };

    describe('planRateModel.getPriceForReservation with new rounding', () => {

        it('Test Case 1: 0% tax type (tax_type_id = 1), no rounding effect', async () => {
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: 1000, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'percentage', tax_type_id: 1, total_value: 10, condition_type: 'none', condition_value: null }
                ]
            };
            const price = await planRateModel.getPriceForReservation('req1', 'global1', null, 'hotel1', '2023-01-01');
            // Raw: 1000 * (1 + 0.10) = 1100. Rounded: Math.floor(1100/100)*100 = 1100.
            assert.strictEqual(price, 1100, 'Test Case 1 Failed. Expected 1100, Got ' + price);
        });

        it('Test Case 2: Other tax types, no rounding effect', async () => {
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: 1000, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'percentage', tax_type_id: 2, total_value: 0.2, condition_type: 'none', condition_value: null }
                ]
            };
            const price = await planRateModel.getPriceForReservation('req2', 'global1', null, 'hotel1', '2023-01-01');
            // Raw: 1000 * (1 + 0.2) = 1200. Rounded: Math.floor(1200/100)*100 = 1200.
            assert.strictEqual(price, 1200, 'Test Case 2 Failed. Expected 1200, Got ' + price);
        });

        it('Test Case 3: Combination of percentages, shows rounding', async () => {
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: 1000, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'percentage', tax_type_id: 1, total_value: 10, condition_type: 'none', condition_value: null },    // 0.10 effect
                    { adjustment_type: 'percentage', tax_type_id: 2, total_value: 0.05, condition_type: 'none', condition_value: null }  // 0.05 effect
                ]
            };
            const price = await planRateModel.getPriceForReservation('req3', 'global1', null, 'hotel1', '2023-01-01');
            // Raw: 1000 * (1 + 0.10 + 0.05) = 1150. Rounded: Math.floor(1150/100)*100 = 1100.
            assert.strictEqual(price, 1100, 'Test Case 3 Failed. Expected 1100, Got ' + price);
        });

        it('Test Case 4: With flat fee, shows rounding on percentage part', async () => {
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: 1030, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'percentage', tax_type_id: 1, total_value: 10, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'flat_fee', total_value: 50, condition_type: 'none', condition_value: null }
                ]
            };
            const price = await planRateModel.getPriceForReservation('req4', 'global1', null, 'hotel1', '2023-01-01');
            // Raw percentage part: 1030 * 1.10 = 1133. Rounded: Math.floor(1133/100)*100 = 1100. Final: 1100 + 50 = 1150.
            assert.strictEqual(price, 1150, 'Test Case 4 Failed. Expected 1150, Got ' + price);
        });

        it('Test Case 5: Only base rate and flat fee', async () => {
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: 1090, condition_type: 'none', condition_value: null }, // Base to show rounding
                    { adjustment_type: 'flat_fee', total_value: 50, condition_type: 'none', condition_value: null }
                ]
            };
            const price = await planRateModel.getPriceForReservation('req5', 'global1', null, 'hotel1', '2023-01-01');
            // Raw percentage part: 1090 * (1+0) = 1090. Rounded: Math.floor(1090/100)*100 = 1000. Final: 1000 + 50 = 1050.
            assert.strictEqual(price, 1050, 'Test Case 5 Failed. Expected 1050, Got ' + price);
        });

        it('Test Case 6: Zero base rate', async () => {
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: 0, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'percentage', tax_type_id: 1, total_value: 10, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'flat_fee', total_value: 50, condition_type: 'none', condition_value: null }
                ]
            };
            const price = await planRateModel.getPriceForReservation('req6', 'global1', null, 'hotel1', '2023-01-01');
            // Raw: 0 * 1.10 = 0. Rounded: 0. Final: 0 + 50 = 50.
            assert.strictEqual(price, 50, 'Test Case 6 Failed. Expected 50, Got ' + price);
        });

        it('Test Case 7: Percentage as units of 100, shows rounding', async () => {
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: 120, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'percentage', tax_type_id: 2, total_value: 0.2, condition_type: 'none', condition_value: null }
                ]
            };
            const price = await planRateModel.getPriceForReservation('req7', 'global1', null, 'hotel1', '2023-01-01');
            // Raw: 120 * (1 + 0.2) = 144. Rounded: Math.floor(144/100)*100 = 100.
            assert.strictEqual(price, 100, 'Test Case 7 Failed. Expected 100, Got ' + price);
        });

        it('Test Case 8: No applicable rates found', async () => {
            mockDbQueryResult = { rows: [] };
            const price = await planRateModel.getPriceForReservation('req8', 'global1', null, 'hotel1', '2023-01-01');
            // Raw: 0. Rounded: 0. Final: 0.
            assert.strictEqual(price, 0, 'Test Case 8 Failed. Expected 0, Got ' + price);
        });

        it('Test Case 9: Price just under 100, after percentage', async () => {
            mockDbQueryResult = {
                rows: [
                    { adjustment_type: 'base_rate', total_value: 90, condition_type: 'none', condition_value: null },
                    { adjustment_type: 'percentage', tax_type_id: 1, total_value: 10, condition_type: 'none', condition_value: null } // 10% of 90 is 9. Total 99.
                ]
            };
            const price = await planRateModel.getPriceForReservation('req9', 'global1', null, 'hotel1', '2023-01-01');
            // Raw: 90 * (1 + 0.10) = 99. Rounded: Math.floor(99/100)*100 = 0.
            assert.strictEqual(price, 0, 'Test Case 9 Failed. Expected 0, Got ' + price);
        });
    });

    // --- Run tests ---
    let passed = 0;
    let failed = 0;

    console.log("\nINFO: For these tests to correctly mock dependencies, `planRateModel.js` needs to be adapted for testability (e.g., by exporting setters like __setGetPool, __setIsValidCondition, or by using Jest/Proxyquire for mocking). The following test run assumes this adaptation is in place.");

    patchPlanRateModelForTesting(planRateModel);

    for (const test of tests) {
        try {
            await test.fn();
            console.log(`  PASSED: ${test.name}`);
            passed++;
        } catch (e) {
            console.error(`  FAILED: ${test.name}`);
            console.error(e.message); // More concise error for output
            failed++;
        }
    }

    unpatchPlanRateModelAfterTesting(planRateModel);

    console.log(`\nTests finished. Passed: ${passed}, Failed: ${failed}`);
    if (failed > 0) {
        console.log("\nNote: Some tests failed. Please review the output.");
        // process.exit(1); // Consider uncommenting if running in CI
    } else {
        console.log("\nAll tests passed (based on the simplified runner and assuming model adaptations).");
    }

})().catch(e => {
    console.error("Critical error running test script:", e);
    // process.exit(1); // Consider uncommenting if running in CI
});
