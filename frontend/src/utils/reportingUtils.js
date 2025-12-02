// Reporting-specific utility functions

/**
 * Calculate variance percentage between actual and forecast values
 * @param {number} period - Actual period value
 * @param {number} forecast - Forecast value
 * @returns {string} Variance percentage formatted to 2 decimal places or 'N/A'
 */
export const calculateVariancePercentage = (period, forecast) => {
    if (forecast === 0 || forecast === null || forecast === undefined) {
        return (period === 0 || period === null || period === undefined) ? '0.00' : 'N/A';
    }
    const variance = ((period - forecast) / forecast) * 100;
    return variance.toFixed(2);
};

/**
 * Get PrimeVue severity level based on variance value
 * @param {number} value - Variance value (can be percentage or absolute)
 * @returns {string} PrimeVue severity: 'success', 'warn', 'danger', or 'secondary'
 */
export const getSeverity = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 'secondary';
    if (value >= 0.05) return 'success';  // 5% or more positive
    if (value >= 0) return 'warn';        // 0-5% positive
    if (value >= -0.05) return 'warn';    // 0-5% negative
    return 'danger';                      // More than 5% negative
};

/**
 * Color scheme for reporting charts
 * Consistent colors across all reporting components
 */
export const colorScheme = {
    // Solid base colors
    actual: '#C8102E',      // Deep red for actual revenue
    forecast: '#F2A900',    // Golden yellow for projected revenue
    variance: '#555555',    // Neutral gray for variance label
    toForecast: '#5AB1BB',  // Light blue for gap to forecast

    // Gradient for Actual (from dark red to light red)
    actual_gradient_top: '#A60D25',
    actual_gradient_middle: '#C8102E',
    actual_gradient_bottom: '#E94A57',

    // Gradient for Forecast (from golden to soft yellow)
    forecast_gradient_top: '#D48F00',
    forecast_gradient_middle: '#F2A900',
    forecast_gradient_bottom: '#FFE066',

    // Gradient for Variance (negative to positive)
    variance_gradient_top: '#888888',      // Light gray (low variance)
    variance_gradient_middle: '#555555',   // Medium gray (baseline)
    variance_gradient_bottom: '#222222',   // Dark gray (high variance)

    // Gradient for To Forecast
    toForecast_gradient_top: '#7FC5CC',
    toForecast_gradient_middle: '#5AB1BB',
    toForecast_gradient_bottom: '#3C8E93',

    // Additional colors
    neutral_gray: '#CCCCCC'
};
