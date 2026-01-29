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
 */
export const calculateSimilarity = (str1, str2) => {
    const norm1 = normalizeString(str1);
    const norm2 = normalizeString(str2);
    
    if (norm1 === norm2) return 1.0; // Perfect match
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8; // Substring match
    
    // Simple character overlap calculation
    const chars1 = new Set(norm1);
    const chars2 = new Set(norm2);
    const intersection = new Set([...chars1].filter(x => chars2.has(x)));
    const union = new Set([...chars1, ...chars2]);
    
    return intersection.size / union.size;
};

/**
 * Find the best matching Yayoi item for a PMS item using fuzzy matching
 */
export const findBestMatch = (pmsItem, yayoiItems, threshold = 0.6) => {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const yayoiItem of yayoiItems) {
        // Try matching plan name with subaccount name
        const nameScore = calculateSimilarity(pmsItem.plan_name, yayoiItem.subaccount_name);
        
        // Try matching category with subaccount name
        const categoryScore = pmsItem.category_name ? 
            calculateSimilarity(pmsItem.category_name, yayoiItem.subaccount_name) : 0;
        
        const maxScore = Math.max(nameScore, categoryScore);
        
        if (maxScore > bestScore && maxScore >= threshold) {
            bestScore = maxScore;
            bestMatch = {
                ...yayoiItem,
                matchScore: maxScore,
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
        
        // 2. Create subaccount comparisons with strict one-to-one matching
        console.log(`--- Processing Subaccount Comparisons for ${hotel_name} ---`);
        const usedYayoiItems = new Set(); // Track used Yayoi items by their unique identifier
        const pmsMatches = []; // Store all PMS matches
        
        // Create unique identifier for Yayoi items to prevent duplicates
        const createYayoiId = (item) => `${item.hotel_id}-${item.subaccount_name}-${item.tax_rate}-${item.yayoi_amount}`;
        
        console.log(`Available Yayoi subaccounts for ${hotel_name}:`, 
            yayoiSubItems.map(y => ({ name: y.subaccount_name, amount: y.yayoi_amount, id: createYayoiId(y) }))
        );
        
        // Step 1: Process exact matches first (highest priority)
        console.log(`Step 1: Processing exact matches for ${hotel_name}`);
        pmsItems.forEach(pmsItem => {
            if (pmsMatches.find(m => m.pmsItem === pmsItem)) return; // Already processed
            
            const exactMatch = yayoiSubItems.find(y => {
                const pmsRate = parseFloat(pmsItem.tax_rate) || 0.10;
                const yayoiRate = parseFloat(y.tax_rate) || 0.10;
                const yayoiId = createYayoiId(y);
                
                return Math.abs(pmsRate - yayoiRate) < 0.001 && 
                       normalizeString(y.subaccount_name) === normalizeString(pmsItem.plan_name) &&
                       !usedYayoiItems.has(yayoiId);
            });
            
            if (exactMatch) {
                const yayoiId = createYayoiId(exactMatch);
                usedYayoiItems.add(yayoiId);
                pmsMatches.push({ pmsItem, yayoiItem: exactMatch, matchType: 'exact' });
                console.log(`Exact match: ${pmsItem.plan_name} -> ${exactMatch.subaccount_name} (¥${exactMatch.yayoi_amount})`);
            }
        });
        
        // Step 2: Process fuzzy matches for remaining PMS items
        console.log(`Step 2: Processing fuzzy matches for ${hotel_name}`);
        pmsItems.forEach(pmsItem => {
            if (pmsMatches.find(m => m.pmsItem === pmsItem)) return; // Already matched
            
            const availableYayoiItems = yayoiSubItems.filter(y => {
                const pmsRate = parseFloat(pmsItem.tax_rate) || 0.10;
                const yayoiRate = parseFloat(y.tax_rate) || 0.10;
                const yayoiId = createYayoiId(y);
                
                return Math.abs(pmsRate - yayoiRate) < 0.001 && !usedYayoiItems.has(yayoiId);
            });
            
            const fuzzyMatch = findBestMatch(pmsItem, availableYayoiItems);
            if (fuzzyMatch) {
                const yayoiId = createYayoiId(fuzzyMatch);
                usedYayoiItems.add(yayoiId);
                pmsMatches.push({ pmsItem, yayoiItem: fuzzyMatch, matchType: 'fuzzy' });
                console.log(`Fuzzy match: ${pmsItem.plan_name} -> ${fuzzyMatch.subaccount_name} (¥${fuzzyMatch.yayoi_amount})`);
            }
        });
        
        // Step 3: Create analysis items from matches
        console.log(`Step 3: Creating analysis items for ${hotel_name}`);
        console.log(`Total matches created: ${pmsMatches.length}, Used Yayoi items: ${usedYayoiItems.size}`);
        
        // Process matched PMS items
        pmsMatches.forEach(({ pmsItem, yayoiItem, matchType }) => {
            const yayoiAmount = parseFloat(yayoiItem.yayoi_amount) || 0;
            const pmsAmount = parseFloat(pmsItem.pms_amount) || 0;
            const difference = pmsAmount - yayoiAmount;
            
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
                match_type: matchType,
                mapping_type: 'subaccount',
                status: yayoiAmount === 0 ? 'pms_only' : (Math.abs(difference) > 1000 ? 'significant_diff' : 'matched'),
                issue_type: pmsItem.missing_rates_count > 0 ? 'missing_rates' : 
                           (Math.abs(difference) > 1000 ? 'amount_mismatch' : 'ok')
            });
        });
        
        // Process unmatched PMS items
        pmsItems.forEach(pmsItem => {
            if (pmsMatches.find(m => m.pmsItem === pmsItem)) return; // Already matched
            
            const pmsAmount = parseFloat(pmsItem.pms_amount) || 0;
            
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
        
        // 3. Add unmatched Yayoi subaccounts
        console.log(`Step 4: Adding unmatched Yayoi subaccounts for ${hotel_name}`);
        yayoiSubItems.forEach(yayoiItem => {
            const yayoiId = createYayoiId(yayoiItem);
            if (!usedYayoiItems.has(yayoiId)) {
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
        
        console.log(`Completed processing ${hotel_name}: ${pmsMatches.length} PMS matches, ${usedYayoiItems.size} Yayoi items used`);
    });
    
    const sortedItems = analysisItems.sort((a, b) => {
        if (a.hotel_id !== b.hotel_id) return a.hotel_id - b.hotel_id;
        if (a.item_type !== b.item_type) return a.item_type === 'account_total' ? -1 : 1;
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
        }
        
        if (pmsDiff < 1 && yayoiDiff < 1) {
            console.log(`✅ Validation passed for ${validation.hotel_name}`);
        }
    });
    
    console.log('=== Final Analysis Items ===');
    console.log('Total items:', sortedItems.length);
    
    return sortedItems;
};