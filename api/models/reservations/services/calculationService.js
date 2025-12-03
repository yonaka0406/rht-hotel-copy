const logger = require('../../../config/logger');

/**
 * Calculate the total price from an array of reservation rates
 * @param {Array} rates - Array of rate objects with adjustment_type, adjustment_value, tax_type_id, etc.
 * @param {Boolean} disableRounding - Whether to disable rounding to nearest 100
 * @returns {Number} - Calculated total price
 */
const calculatePriceFromRatesService = (rates, disableRounding = false) => {
  if (!rates || rates.length === 0) {
    return 0;
  }

  // Step 1: Aggregate rates by adjustment_type and tax_type_id
  const aggregatedRates = {};
  rates.forEach((rate) => {
    const key = `${rate.adjustment_type}-${rate.tax_type_id}`;
    if (!aggregatedRates[key]) {
      aggregatedRates[key] = {
        adjustment_type: rate.adjustment_type,
        tax_type_id: rate.tax_type_id,
        tax_rate: rate.tax_rate,
        adjustment_value: 0,
      };
    }
    aggregatedRates[key].adjustment_value += parseFloat(rate.adjustment_value || 0);
  });

  // Step 2: Calculate total base rate first
  let totalBaseRate = 0;
  Object.values(aggregatedRates).forEach((rate) => {
    if (rate.adjustment_type === 'base_rate') {
      totalBaseRate += rate.adjustment_value;
    }
  });

  // Step 3: Calculate total price by summing individual rate prices
  // Percentages are ONLY applied to the base rate, not to running total
  let totalPrice = 0;

  Object.values(aggregatedRates).forEach((rate) => {
    let ratePrice = 0;

    if (rate.adjustment_type === 'base_rate') {
      ratePrice = rate.adjustment_value;
    } else if (rate.adjustment_type === 'percentage') {
      ratePrice = Math.round((totalBaseRate * (rate.adjustment_value / 100)) * 100) / 100;
    } else if (rate.adjustment_type === 'flat_fee') {
      ratePrice = rate.adjustment_value;
    }

    totalPrice += ratePrice;
  });

  // Round down to nearest 100 yen (Japanese pricing convention)
  if (!disableRounding) {
    const finalPrice = Math.floor(totalPrice / 100) * 100;
    return finalPrice;
  } else {
    return totalPrice;
  }
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
  calculatePriceFromRatesService,
  calculateIsAccommodation
};
