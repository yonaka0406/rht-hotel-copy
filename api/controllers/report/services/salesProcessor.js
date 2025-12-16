const TAX_DIVISOR = 1.1;

/**
 * Processes a sales data row by dividing specific sales fields by a tax divisor and rounding the result.
 * This ensures tax normalization logic is centralized.
 * 
 * @param {Object} row - The original sales data row.
 * @returns {Object} A new object with tax-normalized sales fields.
 */
const processSalesRow = (row) => {
    return {
        ...row,
        normal_sales: row.normal_sales ? Math.round(row.normal_sales / TAX_DIVISOR) : row.normal_sales,
        cancellation_sales: row.cancellation_sales ? Math.round(row.cancellation_sales / TAX_DIVISOR) : row.cancellation_sales,
        accommodation_sales: row.accommodation_sales ? Math.round(row.accommodation_sales / TAX_DIVISOR) : row.accommodation_sales,
        other_sales: row.other_sales ? Math.round(row.other_sales / TAX_DIVISOR) : row.other_sales,
        accommodation_sales_cancelled: row.accommodation_sales_cancelled ? Math.round(row.accommodation_sales_cancelled / TAX_DIVISOR) : row.accommodation_sales_cancelled,
        other_sales_cancelled: row.other_sales_cancelled ? Math.round(row.other_sales_cancelled / TAX_DIVISOR) : row.other_sales_cancelled,
    };
};

module.exports = {
    processSalesRow,
    TAX_DIVISOR, // Export the constant if it might be useful elsewhere
};