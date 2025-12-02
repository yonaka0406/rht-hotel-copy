const logger = require('../../../config/logger');

/**
 * Calculate the total price from an array of reservation rates
 * @param {Array} rates - Array of rate objects with adjustment_type, adjustment_value, tax_type_id, etc.
 * @param {Boolean} disableRounding - Whether to disable rounding to nearest 100
 * @returns {Number} - Calculated total price
 */
const calculatePriceFromRates = (rates, disableRounding = false) => {
  if (!rates || rates.length === 0) {
    return 0;
  }

  let baseRateTotal = 0;
  let groupAPercentageEffect = 0; // For tax_type_id != 1
  let groupBPercentageEffect = 0; // For tax_type_id == 1
  let flatFeeTotal = 0;

  // Sum up all adjustments by type
  rates.forEach(rate => {
    const value = parseFloat(rate.adjustment_value || 0);
    
    if (rate.adjustment_type === 'base_rate') {
      baseRateTotal += value;
    } else if (rate.adjustment_type === 'percentage') {
      if (rate.tax_type_id === 1) {
        // Group B: Direct percentage (e.g., 2.5 for 2.5%)
        groupBPercentageEffect += value / 100;
      } else {
        // Group A: Percentage (e.g., -20 for -20%)
        groupAPercentageEffect += value / 100;
      }
    } else if (rate.adjustment_type === 'flat_fee') {
      flatFeeTotal += value;
    }
  });

  // Sequential calculation
  let currentTotal = baseRateTotal;

  // 1. Apply Group A Percentage Effect (taxable)
  currentTotal = currentTotal * (1 + groupAPercentageEffect);

  // 2. Conditionally round down to nearest 100 (Japanese pricing convention)
  if (!disableRounding) {
    currentTotal = Math.floor(currentTotal / 100) * 100;
  }

  // 3. Calculate Group B Adjustment (non-taxable, applied after rounding)
  const groupBAdjustment = currentTotal * groupBPercentageEffect;

  // 4. Add Group B Adjustment and Flat Fee Total (both non-taxable)
  const beforeFinalFloor = currentTotal + groupBAdjustment + flatFeeTotal;

  // 5. Final floor to ensure no decimal places
  currentTotal = Math.floor(beforeFinalFloor);

  // 6. Ensure price is not negative
  currentTotal = Math.max(0, currentTotal);

  return currentTotal;
};

/**
 * Calculate is_accommodation flag based on reservation rates
 * @param {Array} rates - Array of rate objects with sales_category field
 * @param {Boolean} isSystemBlock - Whether this is a system block reservation
 * @returns {Boolean} - True if accommodation, false otherwise
 */
const calculateIsAccommodation = (rates, isSystemBlock = false) => {
  // System blocks are never accommodation
  if (isSystemBlock) {
    return false;
  }

  // If no rates, default to true (backward compatibility)
  if (!rates || rates.length === 0) {
    return true;
  }

  // is_accommodation = TRUE if ANY rate has sales_category = 'accommodation' or NULL
  // is_accommodation = FALSE if ALL rates have sales_category = 'other'
  const hasAccommodationRate = rates.some(r => 
    r.sales_category === 'accommodation' || r.sales_category === null
  );

  return hasAccommodationRate;
};

module.exports = {
  calculatePriceFromRates,
  calculateIsAccommodation
};
