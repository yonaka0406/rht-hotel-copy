/**
 * Data Integrity Analysis Service
 * Handles fuzzy matching and data processing for PMS vs Yayoi comparison
 */

/**
 * Normalize string for comparison by removing spaces, special characters
 */
export const normalizeString = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/\s+/g, '')  // Remove spaces
        .replace(/　+/g, '')  // Remove full-width spaces
        .replace(/-+/g, '')   // Remove hyphens
        .replace(/[()（）]/g, ''); // Remove parentheses
};

/**
 * Calculate similarity score between two strings
 * Prioritizes exact matches and penalizes length differences
 */
export const calculateSimilarity = (str1, str2) => {
    const norm1 = normalizeString(str1);
    const norm2 = normalizeString(str2);
    
    if (norm1 === norm2) return 1.0; // Perfect match
    
    // Exact substring matches get high score
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
        // Prefer when the shorter string is contained in the longer one
        const shorter = norm1.length < norm2.length ? norm1 : norm2;
        const longer = norm1.length < norm2.length ? norm2 : norm1;
        
        // Higher score for exact substring matches, with penalty for length difference
        const lengthRatio = shorter.length / longer.length;
        return 0.8 + (lengthRatio * 0.15); // 0.8 to 0.95 range
    }
    
    // Simple character overlap calculation for partial matches
    const chars1 = new Set(norm1);
    const chars2 = new Set(norm2);
    const intersection = new Set([...chars1].filter(x => chars2.has(x)));
    const union = new Set([...chars1, ...chars2]);
    
    const overlapScore = intersection.size / union.size;
    
    // Penalize large length differences for partial matches
    const lengthDiff = Math.abs(norm1.length - norm2.length);
    const lengthPenalty = lengthDiff > 3 ? 0.1 : 0;
    
    return Math.max(0, overlapScore - lengthPenalty);
};

/**
 * Find the best matching Yayoi item for a PMS item using fuzzy matching
 * Prioritizes shorter matches to prevent longer names from matching shorter ones
 */
export const findBestMatch = (pmsItem, yayoiItems, threshold = 0.6) => {
    let bestMatch = null;
    let bestScore = 0;
    
    // Sort Yayoi items by length (shorter first) to prioritize shorter matches
    const sortedYayoiItems = [...yayoiItems].sort((a, b) => {
        const aName = normalizeString(a.subaccount_name);
        const bName = normalizeString(b.subaccount_name);
        return aName.length - bName.length;
    });
    
    for (const yayoiItem of sortedYayoiItems) {
        // Try matching plan name with subaccount name
        const nameScore = calculateSimilarity(pmsItem.plan_name, yayoiItem.subaccount_name);
        
        // Try matching category with subaccount name
        const categoryScore = pmsItem.category_name ? 
            calculateSimilarity(pmsItem.category_name, yayoiItem.subaccount_name) : 0;
        
        const maxScore = Math.max(nameScore, categoryScore);
        
        // Bonus for shorter matches (to prefer exact shorter matches over partial longer matches)
        const lengthBonus = maxScore >= 0.8 ? (1 / normalizeString(yayoiItem.subaccount_name).length) * 0.1 : 0;
        const finalScore = maxScore + lengthBonus;
        
        if (finalScore > bestScore && maxScore >= threshold) {
            bestScore = finalScore;
            bestMatch = {
                ...yayoiItem,
                matchScore: finalScore,
                baseScore: maxScore,
                lengthBonus: lengthBonus,
                matchType: nameScore > categoryScore ? 'name' : 'category'
            };
        }
    }
    
    return bestMatch;
};

/**
 * Process raw data into analysis format with fuzzy matching
 */
export const processRawDataIntoAnalysis = (rawData) => {
    console.log('=== Processing Raw Data Into Analysis ===');
    
    const { pmsData, yayoiMainAccounts, yayoiSubAccounts } = rawData;
    const analysisItems = [];
    
    console.log('Input counts:', {
        pmsData: pmsData?.length || 0,
        yayoiMainAccounts: yayoiMainAccounts?.length || 0,
        yayoiSubAccounts: yayoiSubAccounts?.length || 0
    });
    
    // Group data by hotel
    const hotelGroups = new Map();
    
    // Group PMS data by hotel
    pmsData?.forEach(item => {
        if (!hotelGroups.has(item.hotel_id)) {
            hotelGroups.set(item.hotel_id, {
                hotel_id: item.hotel_id,
                hotel_name: item.hotel_name,
                pmsItems: [],
                yayoiMainItems: [],
                yayoiSubItems: []
            });
        }
        hotelGroups.get(item.hotel_id).pmsItems.push(item);
    });
    
    // Group Yayoi main accounts by hotel
    yayoiMainAccounts?.forEach(item => {
        if (!hotelGroups.has(item.hotel_id)) {
            hotelGroups.set(item.hotel_id, {
                hotel_id: item.hotel_id,
                hotel_name: item.hotel_name,
                pmsItems: [],
                yayoiMainItems: [],
                yayoiSubItems: []
            });
        }
        hotelGroups.get(item.hotel_id).yayoiMainItems.push(item);
    });
    
    // Group Yayoi subaccounts by hotel
    yayoiSubAccounts?.forEach(item => {
        if (!hotelGroups.has(item.hotel_id)) {
            hotelGroups.set(item.hotel_id, {
                hotel_id: item.hotel_id,
                hotel_name: item.hotel_name,
                pmsItems: [],
                yayoiMainItems: [],
                yayoiSubItems: []
            });
        }
        hotelGroups.get(item.hotel_id).yayoiSubItems.push(item);
    });
    
    console.log(`Processing ${hotelGroups.size} hotels`);
    
    // Process each hotel
    hotelGroups.forEach((hotelGroup, hotelId) => {
        const { hotel_id, hotel_name, pmsItems, yayoiMainItems, yayoiSubItems } = hotelGroup;
        
        console.log(`Processing hotel ${hotel_name} (${hotel_id}):`, {
            pmsItems: pmsItems.length,
            yayoiMainItems: yayoiMainItems.length,
            yayoiSubItems: yayoiSubItems.length
        });
        
        // Log sample data for debugging
        if (pmsItems.length > 0) {
            console.log('Sample PMS item:', pmsItems[0]);
        }
        if (yayoiMainItems.length > 0) {
            console.log('Sample Yayoi main item:', yayoiMainItems[0]);
        }
        if (yayoiSubItems.length > 0) {
            console.log('Sample Yayoi sub item:', yayoiSubItems[0]);
        }
        
        // 1. Create account total comparison (PMS total vs Yayoi main account total)
        const pmsTotalByTaxRate = new Map();
        pmsItems.forEach(item => {
            const key = item.tax_rate;
            if (!pmsTotalByTaxRate.has(key)) {
                pmsTotalByTaxRate.set(key, {
                    pms_amount: 0,
                    reservation_count: 0,
                    missing_rates_count: 0
                });
            }
            const total = pmsTotalByTaxRate.get(key);
            total.pms_amount += parseFloat(item.pms_amount) || 0;
            total.reservation_count += parseInt(item.reservation_count) || 0;
            total.missing_rates_count += parseInt(item.missing_rates_count) || 0;
        });
        
        console.log(`PMS totals by tax rate for ${hotel_name}:`, pmsTotalByTaxRate);
        
        pmsTotalByTaxRate.forEach((pmsTotal, taxRate) => {
            // Handle both null and numeric tax rates for matching
            const yayoiMain = yayoiMainItems.find(y => {
                const pmsRate = parseFloat(taxRate) || 0.10;
                const yayoiRate = parseFloat(y.tax_rate) || 0.10;
                return Math.abs(pmsRate - yayoiRate) < 0.001; // Allow for small floating point differences
            });
            
            const yayoiAmount = yayoiMain ? parseFloat(yayoiMain.yayoi_amount) || 0 : 0;
            const difference = pmsTotal.pms_amount - yayoiAmount;
            
            console.log(`Account total for ${hotel_name} tax rate ${taxRate}:`, {
                pmsAmount: pmsTotal.pms_amount,
                yayoiAmount,
                difference,
                yayoiMain,
                available_yayoi_main_items: yayoiMainItems,
                tax_rate_comparison: {
                    pms_tax_rate: taxRate,
                    normalized_pms_rate: parseFloat(taxRate) || 0.10,
                    yayoi_rates: yayoiMainItems.map(y => ({ tax_rate: y.tax_rate, normalized: parseFloat(y.tax_rate) || 0.10 }))
                }
            });
            
            analysisItems.push({
                hotel_id,
                hotel_name,
                plan_name: 'PMS合計',
                category_name: null,
                tax_rate: taxRate,
                pms_amount: pmsTotal.pms_amount,
                yayoi_amount: yayoiAmount,
                difference,
                reservation_count: pmsTotal.reservation_count,
                yayoi_transaction_count: yayoiMain ? yayoiMain.transaction_count : 0,
                missing_rates_count: pmsTotal.missing_rates_count,
                item_type: 'account_total',
                subaccount_name: null,
                match_type: 'exact',
                mapping_type: 'main_account',
                status: yayoiAmount === 0 ? 'pms_only' : (Math.abs(difference) > 1000 ? 'significant_diff' : 'matched'),
                issue_type: pmsTotal.missing_rates_count > 0 ? 'missing_rates' : 
                           (Math.abs(difference) > 1000 ? 'amount_mismatch' : 'ok')
            });
        });
        
        // 2. Create subaccount comparisons with direct flagging approach
        console.log(`--- Processing Subaccount Comparisons for ${hotel_name} ---`);
        
        // Add a 'used' flag to each Yayoi item to track usage
        yayoiSubItems.forEach(item => {
            item._used = false;
        });
        
        console.log(`Available Yayoi subaccounts for ${hotel_name}:`, 
            yayoiSubItems.map(y => ({ name: y.subaccount_name, amount: y.yayoi_amount, used: y._used }))
        );
        
        // Step 1: Process exact matches first (highest priority)
        console.log(`Step 1: Processing exact matches for ${hotel_name}`);
        
        // Sort PMS items by plan name length (shorter first) to prioritize shorter exact matches
        const sortedPmsItems = [...pmsItems].sort((a, b) => {
            const aName = normalizeString(a.plan_name);
            const bName = normalizeString(b.plan_name);
            return aName.length - bName.length;
        });
        
        sortedPmsItems.forEach(pmsItem => {
            const pmsRate = parseFloat(pmsItem.tax_rate) || 0.10;
            
            // Find exact match among unused Yayoi items
            for (let i = 0; i < yayoiSubItems.length; i++) {
                const yayoiItem = yayoiSubItems[i];
                if (yayoiItem._used) continue; // Skip already used items
                
                const yayoiRate = parseFloat(yayoiItem.tax_rate) || 0.10;
                
                if (Math.abs(pmsRate - yayoiRate) < 0.001 && 
                    normalizeString(yayoiItem.subaccount_name) === normalizeString(pmsItem.plan_name)) {
                    
                    // Mark as used and create analysis item
                    yayoiItem._used = true;
                    
                    const yayoiAmount = parseFloat(yayoiItem.yayoi_amount) || 0;
                    const pmsAmount = parseFloat(pmsItem.pms_amount) || 0;
                    const difference = pmsAmount - yayoiAmount;
                    
                    console.log(`Exact match: "${pmsItem.plan_name}" (${normalizeString(pmsItem.plan_name).length} chars) -> "${yayoiItem.subaccount_name}" (${normalizeString(yayoiItem.subaccount_name).length} chars) ¥${yayoiAmount}`);
                    
                    analysisItems.push({
                        hotel_id,
                        hotel_name,
                        plan_name: pmsItem.plan_name,
                        category_name: pmsItem.category_name,
                        tax_rate: pmsItem.tax_rate,
                        pms_amount: pmsAmount,
                        yayoi_amount: yayoiAmount,
                        difference,
                        reservation_count: pmsItem.reservation_count,
                        yayoi_transaction_count: yayoiItem.transaction_count,
                        missing_rates_count: pmsItem.missing_rates_count,
                        item_type: 'subaccount',
                        subaccount_name: yayoiItem.subaccount_name,
                        match_type: 'exact',
                        mapping_type: 'subaccount',
                        status: yayoiAmount === 0 ? 'pms_only' : (Math.abs(difference) > 1000 ? 'significant_diff' : 'matched'),
                        issue_type: pmsItem.missing_rates_count > 0 ? 'missing_rates' : 
                                   (Math.abs(difference) > 1000 ? 'amount_mismatch' : 'ok')
                    });
                    
                    // Mark PMS item as processed
                    pmsItem._processed = true;
                    break; // Move to next PMS item
                }
            }
        });
        
        // Step 2: Process fuzzy matches for remaining PMS items (sorted by length)
        console.log(`Step 2: Processing fuzzy matches for ${hotel_name}`);
        
        // Sort remaining unprocessed PMS items by plan name length (shorter first)
        const unprocessedPmsItems = pmsItems.filter(item => !item._processed)
            .sort((a, b) => {
                const aName = normalizeString(a.plan_name);
                const bName = normalizeString(b.plan_name);
                return aName.length - bName.length;
            });
        
        unprocessedPmsItems.forEach(pmsItem => {
            const pmsRate = parseFloat(pmsItem.tax_rate) || 0.10;
            
            // Collect available Yayoi items for fuzzy matching (sorted by length - shorter first)
            const availableYayoiItems = yayoiSubItems.filter(y => {
                if (y._used) return false;
                const yayoiRate = parseFloat(y.tax_rate) || 0.10;
                return Math.abs(pmsRate - yayoiRate) < 0.001;
            }).sort((a, b) => {
                const aName = normalizeString(a.subaccount_name);
                const bName = normalizeString(b.subaccount_name);
                return aName.length - bName.length;
            });
            
            console.log(`Fuzzy matching for PMS item "${pmsItem.plan_name}" (length: ${normalizeString(pmsItem.plan_name).length}): ${availableYayoiItems.length} available Yayoi items`);
            if (availableYayoiItems.length > 0) {
                console.log('Available Yayoi items (sorted by length):', availableYayoiItems.map(y => `"${y.subaccount_name}" (${normalizeString(y.subaccount_name).length})`));
            }
            
            const fuzzyMatch = findBestMatch(pmsItem, availableYayoiItems);
            if (fuzzyMatch) {
                // Find the actual item in the array and mark as used
                for (let i = 0; i < yayoiSubItems.length; i++) {
                    if (yayoiSubItems[i].hotel_id === fuzzyMatch.hotel_id &&
                        yayoiSubItems[i].subaccount_name === fuzzyMatch.subaccount_name &&
                        yayoiSubItems[i].yayoi_amount === fuzzyMatch.yayoi_amount &&
                        yayoiSubItems[i].tax_rate === fuzzyMatch.tax_rate &&
                        !yayoiSubItems[i]._used) {
                        yayoiSubItems[i]._used = true;
                        break;
                    }
                }
                
                const yayoiAmount = parseFloat(fuzzyMatch.yayoi_amount) || 0;
                const pmsAmount = parseFloat(pmsItem.pms_amount) || 0;
                const difference = pmsAmount - yayoiAmount;
                
                console.log(`Fuzzy match: "${pmsItem.plan_name}" (${normalizeString(pmsItem.plan_name).length} chars) -> "${fuzzyMatch.subaccount_name}" (${normalizeString(fuzzyMatch.subaccount_name).length} chars) ¥${yayoiAmount} [score: ${fuzzyMatch.matchScore.toFixed(3)}, base: ${fuzzyMatch.baseScore.toFixed(3)}, bonus: ${fuzzyMatch.lengthBonus.toFixed(3)}]`);
                
                analysisItems.push({
                    hotel_id,
                    hotel_name,
                    plan_name: pmsItem.plan_name,
                    category_name: pmsItem.category_name,
                    tax_rate: pmsItem.tax_rate,
                    pms_amount: pmsAmount,
                    yayoi_amount: yayoiAmount,
                    difference,
                    reservation_count: pmsItem.reservation_count,
                    yayoi_transaction_count: fuzzyMatch.transaction_count,
                    missing_rates_count: pmsItem.missing_rates_count,
                    item_type: 'subaccount',
                    subaccount_name: fuzzyMatch.subaccount_name,
                    match_type: 'fuzzy',
                    match_score: fuzzyMatch.matchScore, // Add match score for display
                    mapping_type: 'subaccount',
                    status: yayoiAmount === 0 ? 'pms_only' : (Math.abs(difference) > 1000 ? 'significant_diff' : 'matched'),
                    issue_type: pmsItem.missing_rates_count > 0 ? 'missing_rates' : 
                               (Math.abs(difference) > 1000 ? 'amount_mismatch' : 'ok')
                });
                
                pmsItem._processed = true;
            } else {
                console.log(`No fuzzy match found for PMS item "${pmsItem.plan_name}"`);
            }
        });
        
        // Step 3: Process unmatched PMS items
        console.log(`Step 3: Processing unmatched PMS items for ${hotel_name}`);
        pmsItems.forEach(pmsItem => {
            if (pmsItem._processed) return; // Skip already processed items
            
            const pmsAmount = parseFloat(pmsItem.pms_amount) || 0;
            
            console.log(`Unmatched PMS item: ${pmsItem.plan_name} (¥${pmsAmount})`);
            
            analysisItems.push({
                hotel_id,
                hotel_name,
                plan_name: pmsItem.plan_name,
                category_name: pmsItem.category_name,
                tax_rate: pmsItem.tax_rate,
                pms_amount: pmsAmount,
                yayoi_amount: 0,
                difference: pmsAmount,
                reservation_count: pmsItem.reservation_count,
                yayoi_transaction_count: 0,
                missing_rates_count: pmsItem.missing_rates_count,
                item_type: 'subaccount',
                subaccount_name: null,
                match_type: 'none',
                mapping_type: null,
                status: 'pms_only',
                issue_type: pmsItem.missing_rates_count > 0 ? 'missing_rates' : 'no_mapping'
            });
        });
        
        // Step 4: Add unmatched Yayoi subaccounts
        console.log(`Step 4: Adding unmatched Yayoi subaccounts for ${hotel_name}`);
        yayoiSubItems.forEach(yayoiItem => {
            if (!yayoiItem._used) {
                console.log(`Unmatched Yayoi item: ${yayoiItem.subaccount_name} (¥${yayoiItem.yayoi_amount})`);
                
                analysisItems.push({
                    hotel_id,
                    hotel_name,
                    plan_name: yayoiItem.subaccount_name,
                    category_name: null,
                    tax_rate: yayoiItem.tax_rate,
                    pms_amount: 0,
                    yayoi_amount: parseFloat(yayoiItem.yayoi_amount) || 0,
                    difference: -(parseFloat(yayoiItem.yayoi_amount) || 0),
                    reservation_count: 0,
                    yayoi_transaction_count: yayoiItem.transaction_count,
                    missing_rates_count: 0,
                    item_type: 'subaccount',
                    subaccount_name: yayoiItem.subaccount_name,
                    match_type: 'exact',
                    mapping_type: 'subaccount',
                    status: 'yayoi_only',
                    issue_type: 'no_mapping'
                });
            }
        });
        
        // Count used items for logging
        const usedYayoiCount = yayoiSubItems.filter(item => item._used).length;
        console.log(`Completed processing ${hotel_name}: ${usedYayoiCount} Yayoi items used out of ${yayoiSubItems.length}`);
    });
    
    const sortedItems = analysisItems.sort((a, b) => {
        // First sort by hotel_id
        if (a.hotel_id !== b.hotel_id) return a.hotel_id - b.hotel_id;
        
        // Then by item_type (account_total first)
        if (a.item_type !== b.item_type) return a.item_type === 'account_total' ? -1 : 1;
        
        // For subaccount items, sort by PMS amount (highest first)
        if (a.item_type === 'subaccount' && b.item_type === 'subaccount') {
            return b.pms_amount - a.pms_amount;
        }
        
        // Fallback to difference for account_total items
        return Math.abs(b.difference) - Math.abs(a.difference);
    });
    
    // Validation: Check if subaccounts match the totals
    console.log('=== Validation: Subaccounts vs Totals ===');
    const hotelValidation = new Map();
    
    sortedItems.forEach(item => {
        if (!hotelValidation.has(item.hotel_id)) {
            hotelValidation.set(item.hotel_id, {
                hotel_name: item.hotel_name,
                totals: { pms: 0, yayoi: 0 },
                subaccounts: { pms: 0, yayoi: 0 },
                items: { total_items: [], subaccount_items: [] }
            });
        }
        
        const validation = hotelValidation.get(item.hotel_id);
        
        if (item.item_type === 'account_total') {
            validation.totals.pms += item.pms_amount;
            validation.totals.yayoi += item.yayoi_amount;
            validation.items.total_items.push(item);
        } else if (item.item_type === 'subaccount') {
            validation.subaccounts.pms += item.pms_amount;
            validation.subaccounts.yayoi += item.yayoi_amount;
            validation.items.subaccount_items.push(item);
        }
    });
    
    // Report validation results
    hotelValidation.forEach((validation, hotelId) => {
        const pmsDiff = Math.abs(validation.totals.pms - validation.subaccounts.pms);
        const yayoiDiff = Math.abs(validation.totals.yayoi - validation.subaccounts.yayoi);
        
        console.log(`Hotel ${validation.hotel_name} (${hotelId}) Validation:`, {
            pms_total: validation.totals.pms,
            pms_subaccounts_sum: validation.subaccounts.pms,
            pms_difference: pmsDiff,
            pms_matches: pmsDiff < 1,
            yayoi_total: validation.totals.yayoi,
            yayoi_subaccounts_sum: validation.subaccounts.yayoi,
            yayoi_difference: yayoiDiff,
            yayoi_matches: yayoiDiff < 1,
            total_items_count: validation.items.total_items.length,
            subaccount_items_count: validation.items.subaccount_items.length
        });
        
        if (pmsDiff >= 1) {
            console.warn(`❌ PMS validation failed for ${validation.hotel_name}: Total (¥${validation.totals.pms}) != Subaccounts sum (¥${validation.subaccounts.pms})`);
        }
        
        if (yayoiDiff >= 1) {
            console.warn(`❌ Yayoi validation failed for ${validation.hotel_name}: Total (¥${validation.totals.yayoi}) != Subaccounts sum (¥${validation.subaccounts.yayoi})`);
            
            // Debug: Show which Yayoi items were used multiple times
            const yayoiUsageMap = new Map();
            validation.items.subaccount_items.forEach(item => {
                if (item.yayoi_amount > 0 && item.subaccount_name) {
                    const key = `${item.subaccount_name}_${item.yayoi_amount}_${item.tax_rate}`;
                    if (!yayoiUsageMap.has(key)) {
                        yayoiUsageMap.set(key, []);
                    }
                    yayoiUsageMap.get(key).push(item.plan_name);
                }
            });
            
            console.log('Yayoi item usage analysis:');
            yayoiUsageMap.forEach((planNames, key) => {
                if (planNames.length > 1) {
                    console.warn(`⚠️ Yayoi item "${key}" matched ${planNames.length} times: ${planNames.join(', ')}`);
                }
            });
        }
        
        if (pmsDiff < 1 && yayoiDiff < 1) {
            console.log(`✅ Validation passed for ${validation.hotel_name}`);
        }
    });
    
    console.log('=== Final Analysis Items ===');
    console.log('Total items:', sortedItems.length);
    
    return sortedItems;
};