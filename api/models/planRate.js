let actualGetPool = require('../config/database').getPool;

// Helper function to validate conditions
const isValidCondition = (row, date) => {
    const { condition_type, condition_value } = row;

    // Custom parser for TEXT format condition_value
    const parseConditionValue = (value) => {
        if (!value) return [];
        return value
            .replace(/[{}"]/g, '') // Remove curly braces and quotes
            .split(',')           // Split by comma
            .map((v) => v.trim().toLowerCase()); // Normalize values
    };

    const parsedCondition = parseConditionValue(condition_value);
    const targetDate = new Date(date);

    // console.log('Row:', row);
    // console.log('Parsed Date:', targetDate);
    // console.log('Raw Condition Value:', condition_value);
    // console.log('Parsed Condition Value:', parsedCondition);
    
    switch (condition_type) {
        case 'month': {
            const targetMonth = targetDate.toLocaleString('en-US', { month: 'long' }).toLowerCase(); // Get month name
            // console.log('Target Month:', targetMonth);
            const match = parsedCondition.includes(targetMonth);
            // console.log('Condition Check (Month):', match);
            return match;
        }

        case 'day_of_week': {
            const targetDay = targetDate.toLocaleString('en-US', { weekday: 'long' }).toLowerCase(); // Get day of the week
            // console.log('Target Day:', targetDay);
            const match = parsedCondition.includes(targetDay);
            // console.log('Condition Check (Day):', match);
            return match;
        }

        default:
            return true; // For 'no_restriction' or unrecognized types, assume valid
    }
};
let actualIsValidCondition = isValidCondition;

// Return all plans_rates
const getAllPlansRates = async (requestId, plans_global_id, plans_hotel_id, hotel_id) => {
    const pool = actualGetPool(requestId);
    const query = `
        SELECT * FROM plans_rates
        WHERE 
            (plans_global_id = $1 AND plans_hotel_id IS NULL) OR 
            (plans_hotel_id = $2 AND hotel_id = $3 AND plans_global_id IS NULL)
        ORDER BY adjustment_type ASC, condition_type DESC, date_start ASC, plans_global_id, hotel_id, plans_hotel_id
    `;

    try {
        const result = await pool.query(query, [
            plans_global_id || null,
            plans_hotel_id || null,
            hotel_id || null,
        ]);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving plans rates:', err);
        throw new Error('Database error');
    }
};

// Get plans_rates by ID
const getPlansRateById = async (requestId, id) => {
    const pool = actualGetPool(requestId);
    const query = 'SELECT * FROM plans_rates WHERE id = $1';

    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Plan rate not found');
        }
        return result.rows[0];
    } catch (err) {
        console.error(`Error retrieving plan rate with ID ${id}:`, err);
        throw err;
    }
};

const getPriceForReservation = async (requestId, plans_global_id, plans_hotel_id, hotel_id, date) => {
    const pool = actualGetPool(requestId);
    const query = `        
        SELECT 
            adjustment_type,
            condition_type,
            condition_value,
            tax_type_id,
            SUM(adjustment_value) AS total_value
        FROM plans_rates
        WHERE 
            (
                $4 BETWEEN date_start AND COALESCE(date_end, $4)  -- Date is within the range
                OR ($4 >= date_start AND date_end IS NULL)  -- Date is after the start date and no end date
            )
            AND ((plans_global_id = $1 AND plans_hotel_id IS NULL) 
            OR (plans_hotel_id = $2 AND hotel_id = $3 AND plans_global_id IS NULL))
        GROUP BY condition_type, adjustment_type, condition_value, tax_type_id
    `;
    const values = [
        plans_global_id || null,
        plans_hotel_id || null,
        hotel_id,
        date,
    ];

    try {
        const result = await pool.query(query, values);        

        // console.log('Query:', query);
        // console.log('Values:', values);
        // console.log('Result:', result);

        let baseRateTotal = 0;
        let groupAPercentageEffect = 0; // For tax_type_id != 1
        let groupBPercentageEffect = 0; // For tax_type_id == 1
        let flatFeeTotal = 0;
        
        // Loop through the result rows and sum up adjustments
        result.rows.forEach(row => {
            if (actualIsValidCondition(row, date)) {
                const value = parseFloat(row.total_value);
                if (row.adjustment_type === 'base_rate') {
                    baseRateTotal += value;
                } else if (row.adjustment_type === 'percentage') {
                    if (row.tax_type_id === 1) { // Group B: Value is direct percentage (e.g., 2.5 for 2.5%)
                        groupBPercentageEffect += value / 100;
                    } else { // Group A: Value is a multiplier (e.g., -0.04 for -4%)
                        groupAPercentageEffect += value;
                    }
                } else if (row.adjustment_type === 'flat_fee') {
                    flatFeeTotal += value;
                }
            }
        });
        
        // Debug log with timestamp
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] DEBUG - Calculation Inputs:`, {
            baseRateTotal,
            groupAPercentageEffect,
            groupBPercentageEffect,
            flatFeeTotal,
            'groupA_adj': groupAPercentageEffect * 100 + '%',
            'groupB_adj': groupBPercentageEffect * 100 + '%',
            'flat_fee': flatFeeTotal
        });

        // Sequential Calculation
        let currentTotal = baseRateTotal;
        console.log(`[${timestamp}] DEBUG - Starting with base rate:`, currentTotal);
        
        // 1. Apply Group A Percentage Effect (taxable)
        const afterGroupA = currentTotal * (1 + groupAPercentageEffect);
        console.log(`[${timestamp}] DEBUG - After Group A (${groupAPercentageEffect * 100}%):`, afterGroupA);
        currentTotal = afterGroupA;
        
        // 2. Round down to the nearest 100
        const afterRounding = Math.floor(currentTotal / 100) * 100;
        console.log(`[${timestamp}] DEBUG - After rounding to nearest 100:`, afterRounding);
        currentTotal = afterRounding;
        
        // 3. Calculate Group B Adjustment (non-taxable, applied after rounding like flat fees)
        const groupBAdjustment = currentTotal * groupBPercentageEffect;
        console.log(`[${timestamp}] DEBUG - Group B Adjustment (${groupBPercentageEffect * 100}% of ${currentTotal}):`, groupBAdjustment);
        
        // 4. Add Group B Adjustment and Flat Fee Total (both non-taxable)
        const beforeFinalFloor = currentTotal + groupBAdjustment + flatFeeTotal;
        console.log(`[${timestamp}] DEBUG - Before final floor (Total + GroupB + FlatFee):`, beforeFinalFloor);
        
        // 5. Final floor to ensure we don't have any decimal places
        currentTotal = Math.floor(beforeFinalFloor);
        
        // 6. Ensure the price is not negative
        currentTotal = Math.max(0, currentTotal);
        
        console.log(`[${timestamp}] DEBUG - Final calculated price:`, currentTotal);
        return currentTotal;
    } catch (err) {
        console.error('Error calculating price:', err);
        throw new Error('Database error');
    }
};
const getRatesForTheDay = async (requestId, plans_global_id, plans_hotel_id, hotel_id, date) => {
    const pool = actualGetPool(requestId);
    const query = `        
        SELECT 
            adjustment_type,
            condition_type,
            condition_value,
            tax_type_id,
            tax_rate,
            SUM(adjustment_value) AS adjustment_value
        FROM plans_rates
        WHERE 
            (
                $4 BETWEEN date_start AND COALESCE(date_end, $4)  -- Date is within the range
                OR ($4 >= date_start AND date_end IS NULL)  -- Date is after the start date and no end date
            )
            AND ((plans_global_id = $1 AND plans_hotel_id IS NULL) 
            OR (plans_hotel_id = $2 AND hotel_id = $3 AND plans_global_id IS NULL))
        GROUP BY condition_type, adjustment_type, condition_value, tax_type_id, tax_rate
        ORDER BY adjustment_type
    `;
    const values = [
        plans_global_id || null,
        plans_hotel_id || null,
        hotel_id,
        date,
    ];

    try {
        const result = await pool.query(query, values);  
        
        // Filter results using isValidCondition
        const filteredRates = result.rows.filter(row => actualIsValidCondition(row, date));
              
        return filteredRates;
    } catch (err) {
        console.error('Error calculating price:', err);
        throw new Error('Database error');
    }
};

// Create a new plans_rate
const createPlansRate = async (requestId, plansRate) => {
    const pool = actualGetPool(requestId);
    const query = `
        INSERT INTO plans_rates (
            hotel_id, 
            plans_global_id, 
            plans_hotel_id, 
            adjustment_type, 
            adjustment_value, 
            tax_type_id,
            tax_rate,
            condition_type, 
            condition_value, 
            date_start, 
            date_end, 
            created_by,
            updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
    `;

    const values = [
        plansRate.hotel_id,
        plansRate.plans_global_id,
        plansRate.plans_hotel_id,
        plansRate.adjustment_type,
        plansRate.adjustment_value,
        plansRate.tax_type_id,
        plansRate.tax_rate,
        plansRate.condition_type,
        plansRate.condition_value,
        plansRate.date_start,
        plansRate.date_end,
        plansRate.created_by,
        plansRate.updated_by
    ];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error creating plan rate:', err);
        throw new Error('Database error');
    }
};

// Update an existing plans_rate
const updatePlansRate = async (requestId, id, plansRate) => {
    const pool = actualGetPool(requestId);
    const query = `
        UPDATE plans_rates
        SET 
            hotel_id = $1,
            plans_global_id = $2,
            plans_hotel_id = $3,
            adjustment_type = $4,
            adjustment_value = $5,
            tax_type_id = $6,
            tax_rate = $7,
            condition_type = $8,
            condition_value = $9,
            date_start = $10,
            date_end = $11,
            updated_by = $12
        WHERE id = $13
        RETURNING *
    `;

    const values = [
        plansRate.hotel_id,
        plansRate.plans_global_id,
        plansRate.plans_hotel_id,
        plansRate.adjustment_type,
        plansRate.adjustment_value,
        plansRate.tax_type_id,
        plansRate.tax_rate,
        plansRate.condition_type,
        plansRate.condition_value,
        plansRate.date_start,
        plansRate.date_end,
        plansRate.updated_by,
        id
    ];

    try {
        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Plan rate not found');
        }
        return result.rows[0];
    } catch (err) {
        console.error(`Error updating plan rate with ID ${id}:`, err);
        throw err;
    }
};

// Delete a plans_rate by ID
const deletePlansRate = async (requestId, id) => {
    const pool = actualGetPool(requestId);
    const query = 'DELETE FROM plans_rates WHERE id = $1 RETURNING *';

    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Plan rate not found');
        }
        return result.rows[0];
    } catch (err) {
        console.error(`Error deleting plan rate with ID ${id}:`, err);
        throw err;
    }
};

// Helper functions for testing to allow injection of mocks
const __setGetPool = (newGetPool) => { actualGetPool = newGetPool; };
const __getOriginalGetPool = () => require('../config/database').getPool;
const __setIsValidCondition = (newIsValidCondition) => { actualIsValidCondition = newIsValidCondition; };
const __getOriginalIsValidCondition = () => isValidCondition; // This refers to the original isValidCondition function defined in this file

module.exports = {
    getAllPlansRates,
    getPlansRateById,
    getPriceForReservation,
    getRatesForTheDay,
    createPlansRate,
    updatePlansRate,
    deletePlansRate,
    // For testing purposes
    __setGetPool,
    __getOriginalGetPool,
    __setIsValidCondition,
    __getOriginalIsValidCondition
};