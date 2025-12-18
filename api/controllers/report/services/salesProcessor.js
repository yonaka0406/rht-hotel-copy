const TAX_DIVISOR = 1.1;

/**
 * Processes a sales data row. Since the daily metrics job now calculates both gross and net prices correctly,
 * we no longer need to apply tax division here. The database already has separate columns for gross and net values.
 * 
 * @param {Object} row - The original sales data row.
 * @returns {Object} The row as-is, without tax normalization.
 */
const processSalesRow = (row) => {
    // Return the row as-is since daily_plan_metrics already has both gross and net columns
    return {
        ...row
    };
};

module.exports = {
    processSalesRow,
    TAX_DIVISOR, // Export the constant if it might be useful elsewhere
};