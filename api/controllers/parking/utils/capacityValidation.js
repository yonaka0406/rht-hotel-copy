const parkingModel = require('../../../models/parking');

/**
 * Capacity Validation Utilities
 * Provides validation functions for parking capacity operations
 */

/**
 * Validate if sufficient capacity is available for a reservation
 * @param {string} requestId - Request ID for logging
 * @param {number} hotelId - Hotel ID
 * @param {Array<string>} dates - Array of date strings (YYYY-MM-DD)
 * @param {number} vehicleCategoryId - Vehicle category ID
 * @param {number} requestedSpots - Number of spots requested
 * @returns {Promise<Object>} Validation result with availability details
 */
async function validateCapacityAvailability(requestId, hotelId, dates, vehicleCategoryId, requestedSpots) {
    try {
        if (!dates || dates.length === 0) {
            return {
                isValid: false,
                error: 'Date range is required',
                availableCapacity: 0,
                requestedCapacity: requestedSpots
            };
        }

        if (requestedSpots <= 0) {
            return {
                isValid: false,
                error: 'Requested spots must be greater than 0',
                availableCapacity: 0,
                requestedCapacity: requestedSpots
            };
        }

        // Get vehicle category details
        const categories = await parkingModel.getVehicleCategories(requestId);
        const vehicleCategory = categories.find(cat => cat.id === vehicleCategoryId);
        
        if (!vehicleCategory) {
            return {
                isValid: false,
                error: 'Vehicle category not found',
                availableCapacity: 0,
                requestedCapacity: requestedSpots
            };
        }

        // Check availability for each date
        const dateAvailability = {};
        let minAvailableSpots = Infinity;
        let bottleneckDate = null;

        for (const date of dates) {
            const startDate = date;
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            
            const availableSpots = await parkingModel.getAvailableSpotsForDates(
                requestId,
                hotelId,
                startDate,
                endDate.toISOString().split('T')[0],
                vehicleCategory.capacity_units_required
            );

            const availableCount = availableSpots.length;
            dateAvailability[date] = availableCount;

            if (availableCount < minAvailableSpots) {
                minAvailableSpots = availableCount;
                bottleneckDate = date;
            }
        }

        const isValid = minAvailableSpots >= requestedSpots;

        const result = {
            isValid,
            availableCapacity: minAvailableSpots,
            requestedCapacity: requestedSpots,
            bottleneckDate,
            dateAvailability,
            vehicleCategoryName: vehicleCategory.name
        };

        if (!isValid) {
            result.error = `Insufficient capacity: ${minAvailableSpots} spots available, ${requestedSpots} requested`;
            result.suggestion = minAvailableSpots > 0 
                ? `Maximum ${minAvailableSpots} spots available for the selected dates`
                : 'No spots available for the selected dates. Please try alternative dates.';
        }

        return result;
    } catch (error) {
        console.error('[validateCapacityAvailability] Error:', error);
        return {
            isValid: false,
            error: `Validation failed: ${error.message}`,
            availableCapacity: 0,
            requestedCapacity: requestedSpots
        };
    }
}

/**
 * Suggest alternative dates when capacity is insufficient
 * @param {string} requestId - Request ID for logging
 * @param {number} hotelId - Hotel ID
 * @param {string} startDate - Original start date
 * @param {string} endDate - Original end date
 * @param {number} vehicleCategoryId - Vehicle category ID
 * @param {number} requestedSpots - Number of spots requested
 * @param {number} daysToCheck - Number of days before/after to check (default: 7)
 * @returns {Promise<Array>} Array of alternative date ranges with availability
 */
async function suggestAlternativeDates(requestId, hotelId, startDate, endDate, vehicleCategoryId, requestedSpots, daysToCheck = 7) {
    try {
        const alternatives = [];
        const originalStart = new Date(startDate);
        const originalEnd = new Date(endDate);
        const stayDuration = Math.ceil((originalEnd - originalStart) / (1000 * 60 * 60 * 24));

        // Check dates before the original range
        for (let offset = 1; offset <= daysToCheck; offset++) {
            const altStart = new Date(originalStart);
            altStart.setDate(altStart.getDate() - offset);
            const altEnd = new Date(altStart);
            altEnd.setDate(altEnd.getDate() + stayDuration);

            const altStartStr = altStart.toISOString().split('T')[0];
            const altEndStr = altEnd.toISOString().split('T')[0];

            const dates = generateDateRange(altStartStr, altEndStr);
            const validation = await validateCapacityAvailability(requestId, hotelId, dates, vehicleCategoryId, requestedSpots);

            if (validation.isValid) {
                alternatives.push({
                    startDate: altStartStr,
                    endDate: altEndStr,
                    availableCapacity: validation.availableCapacity,
                    offsetDays: -offset
                });
            }
        }

        // Check dates after the original range
        for (let offset = 1; offset <= daysToCheck; offset++) {
            const altStart = new Date(originalStart);
            altStart.setDate(altStart.getDate() + offset);
            const altEnd = new Date(altStart);
            altEnd.setDate(altEnd.getDate() + stayDuration);

            const altStartStr = altStart.toISOString().split('T')[0];
            const altEndStr = altEnd.toISOString().split('T')[0];

            const dates = generateDateRange(altStartStr, altEndStr);
            const validation = await validateCapacityAvailability(requestId, hotelId, dates, vehicleCategoryId, requestedSpots);

            if (validation.isValid) {
                alternatives.push({
                    startDate: altStartStr,
                    endDate: altEndStr,
                    availableCapacity: validation.availableCapacity,
                    offsetDays: offset
                });
            }
        }

        // Sort by offset (closest dates first)
        alternatives.sort((a, b) => Math.abs(a.offsetDays) - Math.abs(b.offsetDays));

        return alternatives.slice(0, 5); // Return top 5 alternatives
    } catch (error) {
        console.error('[suggestAlternativeDates] Error:', error);
        return [];
    }
}

/**
 * Generate array of dates between start and end
 * @private
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD, exclusive)
 * @returns {string[]} Array of date strings
 */
function generateDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current < end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    
    return dates;
}

/**
 * Validate date range parameters
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} Validation result
 */
function validateDateRange(startDate, endDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!dateRegex.test(startDate)) {
        return {
            isValid: false,
            error: 'Invalid start date format. Expected YYYY-MM-DD'
        };
    }
    
    if (!dateRegex.test(endDate)) {
        return {
            isValid: false,
            error: 'Invalid end date format. Expected YYYY-MM-DD'
        };
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime())) {
        return {
            isValid: false,
            error: 'Invalid start date'
        };
    }
    
    if (isNaN(end.getTime())) {
        return {
            isValid: false,
            error: 'Invalid end date'
        };
    }
    
    if (end <= start) {
        return {
            isValid: false,
            error: 'End date must be after start date'
        };
    }
    
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
        return {
            isValid: false,
            error: 'Date range cannot exceed 365 days'
        };
    }
    
    return {
        isValid: true,
        daysDiff
    };
}

/**
 * Validate capacity amount
 * @param {number} capacity - Capacity amount to validate
 * @returns {Object} Validation result
 */
function validateCapacityAmount(capacity) {
    if (typeof capacity !== 'number') {
        return {
            isValid: false,
            error: 'Capacity must be a number'
        };
    }
    
    if (!Number.isInteger(capacity)) {
        return {
            isValid: false,
            error: 'Capacity must be an integer'
        };
    }
    
    if (capacity <= 0) {
        return {
            isValid: false,
            error: 'Capacity must be greater than 0'
        };
    }
    
    if (capacity > 1000) {
        return {
            isValid: false,
            error: 'Capacity cannot exceed 1000'
        };
    }
    
    return {
        isValid: true
    };
}

module.exports = {
    validateCapacityAvailability,
    suggestAlternativeDates,
    validateDateRange,
    validateCapacityAmount
};
