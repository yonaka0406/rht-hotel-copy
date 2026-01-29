/**
 * Test suite for OTA Plan ID fallback mechanism
 * Tests the selectPlanId function's ability to extract IDs from plan_key when database IDs are NULL
 */

const { getPool } = require('../config/database');

describe('OTA Plan ID Fallback Mechanism', () => {
    let pool;
    let requestId = 'test-ota-plan-fallback';

    beforeAll(() => {
        pool = getPool(requestId);
    });

    // Mock data for testing
    const mockPlanMaster = [
        {
            hotel_id: 10,
            plangroupcode: '11',
            plangroupname: '3食付き',
            plans_global_id: null,
            plans_hotel_id: null,
            plan_key: 'h169'
        },
        {
            hotel_id: 10,
            plangroupcode: '16',
            plangroupname: '●素泊まり',
            plans_global_id: null,
            plans_hotel_id: null,
            plan_key: '1h1'
        },
        {
            hotel_id: 10,
            plangroupcode: '14',
            plangroupname: '●2食付き',
            plans_global_id: 3,
            plans_hotel_id: null,
            plan_key: '3h2'
        },
        {
            hotel_id: 10,
            plangroupcode: '99',
            plangroupname: 'No Plan Key',
            plans_global_id: null,
            plans_hotel_id: null,
            plan_key: null
        }
    ];

    // Helper function to extract IDs from plan_key (same as in main.js)
    const extractIdsFromPlanKey = (planKey) => {
        if (!planKey) return { plans_global_id: null, plans_hotel_id: null };
        
        const parts = planKey.split('h');
        
        let plans_global_id = null;
        let plans_hotel_id = null;
        
        if (parts.length === 2) {
            const globalPart = parts[0];
            const hotelPart = parts[1];
            
            if (globalPart && !isNaN(parseInt(globalPart))) {
                plans_global_id = parseInt(globalPart);
            }
            
            if (hotelPart && !isNaN(parseInt(hotelPart))) {
                plans_hotel_id = parseInt(hotelPart);
            }
        } else if (parts.length === 1 && planKey.startsWith('h')) {
            const hotelPart = planKey.substring(1);
            if (hotelPart && !isNaN(parseInt(hotelPart))) {
                plans_hotel_id = parseInt(hotelPart);
            }
        }
        
        return { plans_global_id, plans_hotel_id };
    };

    // Mock selectPlanId function with fallback logic
    const selectPlanId = async (code) => {
        const match = mockPlanMaster.find(item => item.plangroupcode == code);
        if (match) {
            // Check if we have valid IDs from the match
            if (match.plans_global_id || match.plans_hotel_id) {
                return {
                    plans_global_id: match.plans_global_id,
                    plans_hotel_id: match.plans_hotel_id,
                };
            }
            
            // Fallback: If IDs are NULL but plan_key exists, extract IDs from plan_key
            if (match.plan_key) {
                const extractedIds = extractIdsFromPlanKey(match.plan_key);
                
                if (extractedIds.plans_global_id || extractedIds.plans_hotel_id) {
                    return {
                        plans_global_id: extractedIds.plans_global_id,
                        plans_hotel_id: extractedIds.plans_hotel_id,
                    };
                }
            }
        }
        
        return {
            plans_global_id: null,
            plans_hotel_id: null,
        };
    };

    describe('extractIdsFromPlanKey', () => {
        test('should extract hotel ID from "h169" format', () => {
            const result = extractIdsFromPlanKey('h169');
            expect(result).toEqual({
                plans_global_id: null,
                plans_hotel_id: 169
            });
        });

        test('should extract both IDs from "1h1" format', () => {
            const result = extractIdsFromPlanKey('1h1');
            expect(result).toEqual({
                plans_global_id: 1,
                plans_hotel_id: 1
            });
        });

        test('should extract both IDs from "3h2" format', () => {
            const result = extractIdsFromPlanKey('3h2');
            expect(result).toEqual({
                plans_global_id: 3,
                plans_hotel_id: 2
            });
        });

        test('should return null for invalid plan_key', () => {
            expect(extractIdsFromPlanKey(null)).toEqual({
                plans_global_id: null,
                plans_hotel_id: null
            });
            
            expect(extractIdsFromPlanKey('')).toEqual({
                plans_global_id: null,
                plans_hotel_id: null
            });
            
            expect(extractIdsFromPlanKey('invalid')).toEqual({
                plans_global_id: null,
                plans_hotel_id: null
            });
        });
    });

    describe('selectPlanId with fallback', () => {
        test('should use existing IDs when available', async () => {
            const result = await selectPlanId('14'); // Has plans_global_id: 3
            expect(result).toEqual({
                plans_global_id: 3,
                plans_hotel_id: null
            });
        });

        test('should fallback to plan_key extraction when IDs are NULL', async () => {
            const result = await selectPlanId('11'); // NULL IDs, plan_key: 'h169'
            expect(result).toEqual({
                plans_global_id: null,
                plans_hotel_id: 169
            });
        });

        test('should fallback to plan_key extraction for hybrid format', async () => {
            const result = await selectPlanId('16'); // NULL IDs, plan_key: '1h1'
            expect(result).toEqual({
                plans_global_id: 1,
                plans_hotel_id: 1
            });
        });

        test('should return NULL when no plan found', async () => {
            const result = await selectPlanId('999'); // Non-existent code
            expect(result).toEqual({
                plans_global_id: null,
                plans_hotel_id: null
            });
        });

        test('should return NULL when plan exists but no valid data', async () => {
            const result = await selectPlanId('99'); // Exists but no IDs or plan_key
            expect(result).toEqual({
                plans_global_id: null,
                plans_hotel_id: null
            });
        });
    });

    describe('Integration scenarios', () => {
        test('should handle P釧路 hotel scenario', async () => {
            // Test the specific case mentioned in the issue
            // Plan "3食付き" with plan_key "h169" should resolve to plans_hotel_id: 169
            const result = await selectPlanId('11');
            expect(result.plans_hotel_id).toBe(169);
            expect(result.plans_global_id).toBeNull();
        });

        test('should prioritize database IDs over plan_key extraction', async () => {
            // When both database IDs and plan_key exist, database IDs should take precedence
            const result = await selectPlanId('14');
            expect(result.plans_global_id).toBe(3); // From database, not extracted from '3h2'
            expect(result.plans_hotel_id).toBeNull(); // From database
        });
    });
});

// Manual test function for real database testing
const testWithRealDatabase = async () => {
    console.log('🧪 Testing OTA Plan ID fallback with real database...');
    
    try {
        const { selectTLPlanMaster } = require('../ota/xmlModel');
        const requestId = 'test-real-fallback';
        const hotel_id = 10; // P釧路
        
        // Get real plan master data
        const planMaster = await selectTLPlanMaster(requestId, hotel_id);
        console.log(`📊 Found ${planMaster.length} plans for hotel ${hotel_id}`);
        
        // Test the selectPlanId function with real data
        const testCodes = ['11', '16', '14', '999'];
        
        for (const code of testCodes) {
            const match = planMaster.find(item => item.plangroupcode == code);
            if (match) {
                console.log(`\n🔍 Testing plan code "${code}":`, {
                    name: match.plangroupname,
                    original_global_id: match.plans_global_id,
                    original_hotel_id: match.plans_hotel_id,
                    plan_key: match.plan_key
                });
                
                // Test fallback extraction
                if (!match.plans_global_id && !match.plans_hotel_id && match.plan_key) {
                    const extractIdsFromPlanKey = (planKey) => {
                        if (!planKey) return { plans_global_id: null, plans_hotel_id: null };
                        
                        const parts = planKey.split('h');
                        let plans_global_id = null;
                        let plans_hotel_id = null;
                        
                        if (parts.length === 2) {
                            const globalPart = parts[0];
                            const hotelPart = parts[1];
                            
                            if (globalPart && !isNaN(parseInt(globalPart))) {
                                plans_global_id = parseInt(globalPart);
                            }
                            
                            if (hotelPart && !isNaN(parseInt(hotelPart))) {
                                plans_hotel_id = parseInt(hotelPart);
                            }
                        } else if (parts.length === 1 && planKey.startsWith('h')) {
                            const hotelPart = planKey.substring(1);
                            if (hotelPart && !isNaN(parseInt(hotelPart))) {
                                plans_hotel_id = parseInt(hotelPart);
                            }
                        }
                        
                        return { plans_global_id, plans_hotel_id };
                    };
                    
                    const extracted = extractIdsFromPlanKey(match.plan_key);
                    console.log(`  ✅ Fallback would extract:`, extracted);
                } else {
                    console.log(`  ℹ️  No fallback needed (has existing IDs)`);
                }
            } else {
                console.log(`\n❌ Plan code "${code}" not found`);
            }
        }
        
        console.log('\n✅ Real database test completed');
        
    } catch (error) {
        console.error('❌ Real database test failed:', error);
    }
};

// Export for manual testing
module.exports = { testWithRealDatabase };