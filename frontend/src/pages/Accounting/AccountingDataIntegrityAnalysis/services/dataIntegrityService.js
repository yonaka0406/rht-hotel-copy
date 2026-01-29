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
    console.log('=== Processing Raw Data ===');
    console.log('Raw data input:', rawData);
    
    const { pmsData, yayoiMainAccounts, yayoiSubAccounts } = rawData;
    const analysisItems = [];
    
    console.log('PMS Data:', pmsData?.length || 0, 'items');
    console.log('Yayoi Main Accounts:', yayoiMainAccounts?.length || 0, 'items');
    console.log('Yayoi Sub Accounts:', yayoiSubAccounts?.length || 0, 'items');
    
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
    
    console.log('Hotel groups created:', hotelGroups.size);
    
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
            const yayoiMain = yayoiMainItems.find(y => y.tax_rate === taxRate);
            const yayoiAmount = yayoiMain ? parseFloat(yayoiMain.yayoi_amount) || 0 : 0;
            const difference = pmsTotal.pms_amount - yayoiAmount;
            
            console.log(`Account total for ${hotel_name} tax rate ${taxRate}:`, {
                pmsAmount: pmsTotal.pms_amount,
                yayoiAmount,
                difference,
                yayoiMain
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
        
        // 2. Create subaccount comparisons with fuzzy matching
        const matchedYayoiItems = new Set();
        
        pmsItems.forEach(pmsItem => {
            // First try exact match
            let yayoiMatch = yayoiSubItems.find(y => 
                y.tax_rate === pmsItem.tax_rate && 
                normalizeString(y.subaccount_name) === normalizeString(pmsItem.plan_name)
            );
            
            let matchType = 'exact';
            
            // If no exact match, try fuzzy matching
            if (!yayoiMatch) {
                const availableYayoiItems = yayoiSubItems.filter(y => 
                    y.tax_rate === pmsItem.tax_rate && !matchedYayoiItems.has(y)
                );
                const fuzzyMatch = findBestMatch(pmsItem, availableYayoiItems);
                if (fuzzyMatch) {
                    yayoiMatch = fuzzyMatch;
                    matchType = 'fuzzy';
                }
            }
            
            if (yayoiMatch) {
                matchedYayoiItems.add(yayoiMatch);
            }
            
            const yayoiAmount = yayoiMatch ? parseFloat(yayoiMatch.yayoi_amount) || 0 : 0;
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
                yayoi_transaction_count: yayoiMatch ? yayoiMatch.transaction_count : 0,
                missing_rates_count: pmsItem.missing_rates_count,
                item_type: 'subaccount',
                subaccount_name: yayoiMatch ? yayoiMatch.subaccount_name : null,
                match_type: matchType,
                mapping_type: yayoiMatch ? 'subaccount' : null,
                status: yayoiAmount === 0 ? 'pms_only' : (Math.abs(difference) > 1000 ? 'significant_diff' : 'matched'),
                issue_type: pmsItem.missing_rates_count > 0 ? 'missing_rates' : 
                           (!yayoiMatch ? 'no_mapping' : 
                           (Math.abs(difference) > 1000 ? 'amount_mismatch' : 'ok'))
            });
        });
        
        // 3. Add unmatched Yayoi subaccounts
        yayoiSubItems.forEach(yayoiItem => {
            if (!matchedYayoiItems.has(yayoiItem)) {
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
    });
    
    const sortedItems = analysisItems.sort((a, b) => {
        if (a.hotel_id !== b.hotel_id) return a.hotel_id - b.hotel_id;
        if (a.item_type !== b.item_type) return a.item_type === 'account_total' ? -1 : 1;
        return Math.abs(b.difference) - Math.abs(a.difference);
    });
    
    console.log('=== Final Analysis Items ===');
    console.log('Total items:', sortedItems.length);
    console.log('Sample items:', sortedItems.slice(0, 3));
    
    return sortedItems;
};