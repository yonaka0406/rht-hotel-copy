const parkingModel = require('../models/parking');

/**
 * ParkingAddonService - Manages the relationship between parking addons and spot assignments
 * Provides capacity unit calculation logic and vehicle category compatibility checking
 */
class ParkingAddonService {
    constructor(requestId) {
        this.requestId = requestId;
    }

    /**
     * Calculate capacity units required for a vehicle category
     * @param {number} vehicleCategoryId - Vehicle category ID
     * @returns {Promise<number>} Capacity units required
     */
    async calculateCapacityUnits(vehicleCategoryId) {
        try {
            const categories = await parkingModel.getVehicleCategories(this.requestId);
            const category = categories.find(cat => cat.id === vehicleCategoryId);
            
            if (!category) {
                throw new Error('Vehicle category not found');
            }
            
            return category.capacity_units_required;
        } catch (error) {
            throw new Error(`Failed to calculate capacity units: ${error.message}`);
        }
    }

    /**
     * Check parking vacancies for a specific vehicle category
     * @param {number} hotelId - Hotel ID
     * @param {Array<string>} dateRange - Array of date strings
     * @param {number} vehicleCategoryId - Vehicle category ID
     * @returns {Promise<number>} Number of available spots
     */
    async checkParkingVacancies(hotelId, dateRange, vehicleCategoryId) {
        try {
            if (!dateRange || dateRange.length === 0) {
                throw new Error('Date range is required');
            }

            const startDate = dateRange[0];
            const endDate = new Date(dateRange[dateRange.length - 1]);
            endDate.setDate(endDate.getDate() + 1); // Add one day for exclusive end date
            
            return await parkingModel.checkParkingVacancies(
                this.requestId, 
                hotelId, 
                startDate, 
                endDate.toISOString().split('T')[0], 
                vehicleCategoryId
            );
        } catch (error) {
            throw new Error(`Failed to check parking vacancies: ${error.message}`);
        }
    }

    /**
     * Get parking spots compatible with a vehicle category
     * @param {number} hotelId - Hotel ID
     * @param {number} capacityUnitsRequired - Required capacity units
     * @returns {Promise<Array>} Array of compatible parking spots
     */
    async getCompatibleSpots(hotelId, capacityUnitsRequired) {
        try {
            const allSpots = await parkingModel.getAllParkingSpotsByHotel(this.requestId, hotelId);
            
            // Filter spots that can accommodate the required capacity
            const compatibleSpots = allSpots.filter(spot => 
                spot.capacity_units >= capacityUnitsRequired && spot.is_active
            );
            
            return compatibleSpots;
        } catch (error) {
            throw new Error(`Failed to get compatible spots: ${error.message}`);
        }
    }

    /**
     * Validate if a parking spot can accommodate a vehicle category
     * @param {number} spotId - Parking spot ID
     * @param {number} capacityUnitsRequired - Required capacity units
     * @returns {Promise<boolean>} True if spot is compatible
     */
    async validateSpotCapacity(spotId, capacityUnitsRequired) {
        try {
            const allSpots = await parkingModel.getAllParkingSpotsByHotel(this.requestId, null);
            const spot = allSpots.find(s => s.id === spotId);
            
            if (!spot) {
                throw new Error('Parking spot not found');
            }
            
            return spot.capacity_units >= capacityUnitsRequired;
        } catch (error) {
            throw new Error(`Failed to validate spot capacity: ${error.message}`);
        }
    }

    /**
     * Get available spots for specific dates with capacity validation
     * @param {number} hotelId - Hotel ID
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @param {number} capacityUnits - Required capacity units
     * @returns {Promise<Array>} Array of available parking spots
     */
    async getAvailableSpotsForDates(hotelId, startDate, endDate, capacityUnits) {
        try {
            return await parkingModel.getAvailableSpotsForDates(
                this.requestId, 
                hotelId, 
                startDate, 
                endDate, 
                capacityUnits
            );
        } catch (error) {
            throw new Error(`Failed to get available spots for dates: ${error.message}`);
        }
    }

    /**
     * Add parking addon with spot assignment and capacity validation
     * @param {string} reservationDetailId - Reservation detail ID
     * @param {Object} addonData - Addon data
     * @param {number} spotId - Parking spot ID
     * @param {Array<string>} dates - Array of date strings
     * @param {number} vehicleCategoryId - Vehicle category ID
     * @returns {Promise<Object>} Created parking assignment
     */
    async addParkingAddonWithSpot(reservationDetailId, addonData, spotId, dates, vehicleCategoryId) {
        try {
            // Validate spot capacity for vehicle category
            const capacityValidation = await parkingModel.validateSpotCapacity(
                this.requestId, 
                spotId, 
                vehicleCategoryId
            );
            
            if (!capacityValidation.is_compatible) {
                throw new Error('Parking spot cannot accommodate the selected vehicle category');
            }

            // Create parking assignment with addon relationship
            const assignmentData = {
                hotel_id: addonData.hotel_id,
                reservation_id: addonData.reservation_id,
                reservation_addon_id: addonData.addon_id,
                vehicle_category_id: vehicleCategoryId,
                parking_spot_id: spotId,
                dates: dates,
                status: 'reserved',
                comment: addonData.comment || null,
                price: addonData.price || 0.00,
                created_by: addonData.created_by,
                updated_by: addonData.updated_by
            };

            return await parkingModel.createParkingAssignmentWithAddon(this.requestId, assignmentData);
        } catch (error) {
            throw new Error(`Failed to add parking addon with spot: ${error.message}`);
        }
    }

    /**
     * Update parking addon spot assignment
     * @param {string} addonId - Addon ID
     * @param {number} newSpotId - New parking spot ID
     * @param {Array<string>} dates - Array of date strings
     * @param {number} vehicleCategoryId - Vehicle category ID
     * @returns {Promise<Object>} Updated parking assignment
     */
    async updateParkingAddonSpot(addonId, newSpotId, dates, vehicleCategoryId) {
        try {
            // Validate new spot capacity for vehicle category
            const capacityValidation = await parkingModel.validateSpotCapacity(
                this.requestId, 
                newSpotId, 
                vehicleCategoryId
            );
            
            if (!capacityValidation.is_compatible) {
                throw new Error('New parking spot cannot accommodate the selected vehicle category');
            }

            // Update the addon relationship
            return await parkingModel.updateParkingAssignmentAddon(this.requestId, addonId, addonId);
        } catch (error) {
            throw new Error(`Failed to update parking addon spot: ${error.message}`);
        }
    }

    /**
     * Remove parking addon with spot assignment cleanup
     * @param {string} addonId - Addon ID
     * @returns {Promise<Array>} Removed parking assignments
     */
    async removeParkingAddonWithSpot(addonId) {
        try {
            return await parkingModel.removeParkingAssignmentsByAddon(this.requestId, addonId);
        } catch (error) {
            throw new Error(`Failed to remove parking addon with spot: ${error.message}`);
        }
    }

    /**
     * Get vehicle categories with capacity requirements
     * @returns {Promise<Array>} Array of vehicle categories
     */
    async getVehicleCategories() {
        try {
            return await parkingModel.getVehicleCategories(this.requestId);
        } catch (error) {
            throw new Error(`Failed to get vehicle categories: ${error.message}`);
        }
    }

    /**
     * Check if vehicle category is compatible with parking spot
     * @param {number} vehicleCategoryId - Vehicle category ID
     * @param {number} spotId - Parking spot ID
     * @returns {Promise<Object>} Compatibility information
     */
    async checkVehicleCategoryCompatibility(vehicleCategoryId, spotId) {
        try {
            return await parkingModel.validateSpotCapacity(this.requestId, spotId, vehicleCategoryId);
        } catch (error) {
            throw new Error(`Failed to check vehicle category compatibility: ${error.message}`);
        }
    }
}

module.exports = ParkingAddonService;