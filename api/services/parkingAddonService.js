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
     * Check parking vacancies for a specific vehicle category with enhanced filtering
     * @param {number} hotelId - Hotel ID
     * @param {Array<string>} dateRange - Array of date strings
     * @param {number} vehicleCategoryId - Vehicle category ID
     * @returns {Promise<Object>} Vacancy information with detailed breakdown
     */
    async checkParkingVacancies(hotelId, dateRange, vehicleCategoryId) {
        try {
            if (!dateRange || dateRange.length === 0) {
                throw new Error('Date range is required');
            }

            const startDate = dateRange[0];
            const endDate = new Date(dateRange[dateRange.length - 1]);
            endDate.setDate(endDate.getDate() + 1); // Add one day for exclusive end date
            
            // Get vehicle category details for capacity requirements
            const categories = await parkingModel.getVehicleCategories(this.requestId);
            const vehicleCategory = categories.find(cat => cat.id === vehicleCategoryId);
            
            if (!vehicleCategory) {
                throw new Error('Vehicle category not found');
            }

            // Check basic vacancy count
            const availableSpots = await parkingModel.checkParkingVacancies(
                this.requestId, 
                hotelId, 
                startDate, 
                endDate.toISOString().split('T')[0], 
                vehicleCategoryId
            );

            // Get compatible spots for detailed information
            const compatibleSpots = await parkingModel.getCompatibleSpots(
                this.requestId,
                hotelId,
                vehicleCategoryId
            );

            // Get available spots for the specific date range
            const availableSpotsForDates = await parkingModel.getAvailableSpotsForDates(
                this.requestId,
                hotelId,
                startDate,
                endDate.toISOString().split('T')[0],
                vehicleCategory.capacity_units_required
            );

            return {
                hotelId,
                vehicleCategoryId,
                vehicleCategoryName: vehicleCategory.name,
                capacityUnitsRequired: vehicleCategory.capacity_units_required,
                dateRange: {
                    startDate,
                    endDate: endDate.toISOString().split('T')[0]
                },
                availableSpots,
                hasVacancies: availableSpots > 0,
                totalCompatibleSpots: compatibleSpots.length,
                availableSpotsForDates: availableSpotsForDates.length,
                compatibleSpots: compatibleSpots.map(spot => ({
                    id: spot.id,
                    spotNumber: spot.spot_number,
                    capacityUnits: spot.capacity_units,
                    parkingLotName: spot.parking_lot_name,
                    spotType: spot.spot_type
                }))
            };
        } catch (error) {
            throw new Error(`Failed to check parking vacancies: ${error.message}`);
        }
    }

    /**
     * Get parking spots compatible with a vehicle category with enhanced capacity-based filtering
     * @param {number} hotelId - Hotel ID
     * @param {number} vehicleCategoryId - Vehicle category ID
     * @returns {Promise<Object>} Compatible spots with detailed capacity information
     */
    async getCompatibleSpots(hotelId, vehicleCategoryId) {
        try {
            // Get vehicle category details
            const categories = await parkingModel.getVehicleCategories(this.requestId);
            const vehicleCategory = categories.find(cat => cat.id === vehicleCategoryId);
            
            if (!vehicleCategory) {
                throw new Error('Vehicle category not found');
            }

            const capacityUnitsRequired = vehicleCategory.capacity_units_required;

            // Use the model method for getting compatible spots
            const compatibleSpots = await parkingModel.getCompatibleSpots(
                this.requestId,
                hotelId,
                vehicleCategoryId
            );

            // Enhance the response with additional capacity information
            const enhancedSpots = compatibleSpots.map(spot => ({
                id: spot.id,
                spotNumber: spot.spot_number,
                spotType: spot.spot_type,
                capacityUnits: spot.capacity_units,
                parkingLotId: spot.parking_lot_id,
                parkingLotName: spot.parking_lot_name,
                parkingLotDescription: spot.parking_lot_description,
                isActive: spot.is_active,
                layoutInfo: spot.layout_info,
                blocksSpotId: spot.blocks_parking_spot_id,
                capacityMatch: {
                    required: capacityUnitsRequired,
                    available: spot.capacity_units,
                    excess: spot.capacity_units - capacityUnitsRequired,
                    isExactMatch: spot.capacity_units === capacityUnitsRequired,
                    canAccommodate: spot.capacity_units >= capacityUnitsRequired
                }
            }));

            // Sort by capacity match (exact matches first, then by excess capacity)
            enhancedSpots.sort((a, b) => {
                if (a.capacityMatch.isExactMatch && !b.capacityMatch.isExactMatch) return -1;
                if (!a.capacityMatch.isExactMatch && b.capacityMatch.isExactMatch) return 1;
                return a.capacityMatch.excess - b.capacityMatch.excess;
            });

            return {
                hotelId,
                vehicleCategoryId,
                vehicleCategoryName: vehicleCategory.name,
                capacityUnitsRequired,
                totalCompatibleSpots: enhancedSpots.length,
                compatibleSpots: enhancedSpots,
                capacityBreakdown: {
                    exactMatches: enhancedSpots.filter(s => s.capacityMatch.isExactMatch).length,
                    oversizedSpots: enhancedSpots.filter(s => !s.capacityMatch.isExactMatch).length,
                    averageExcessCapacity: enhancedSpots.length > 0 
                        ? enhancedSpots.reduce((sum, s) => sum + s.capacityMatch.excess, 0) / enhancedSpots.length 
                        : 0
                }
            };
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
     * Get available spots for specific dates with enhanced capacity validation
     * @param {number} hotelId - Hotel ID
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @param {number} vehicleCategoryId - Vehicle category ID
     * @returns {Promise<Object>} Available spots with detailed availability and capacity information
     */
    async getAvailableSpotsForDates(hotelId, startDate, endDate, vehicleCategoryId) {
        try {
            // Get vehicle category details
            const categories = await parkingModel.getVehicleCategories(this.requestId);
            const vehicleCategory = categories.find(cat => cat.id === vehicleCategoryId);
            
            if (!vehicleCategory) {
                throw new Error('Vehicle category not found');
            }

            const capacityUnits = vehicleCategory.capacity_units_required;

            // Get available spots from model
            const availableSpots = await parkingModel.getAvailableSpotsForDates(
                this.requestId, 
                hotelId, 
                startDate, 
                endDate, 
                capacityUnits
            );

            // Get all compatible spots for comparison
            const allCompatibleSpots = await parkingModel.getCompatibleSpots(
                this.requestId,
                hotelId,
                vehicleCategoryId
            );

            // Calculate availability statistics
            const totalCompatibleSpots = allCompatibleSpots.length;
            const availableCount = availableSpots.length;
            const occupiedCount = totalCompatibleSpots - availableCount;

            // Enhance available spots with detailed information
            const enhancedAvailableSpots = availableSpots.map(spot => ({
                id: spot.id,
                spotNumber: spot.spot_number,
                spotType: spot.spot_type,
                capacityUnits: spot.capacity_units,
                parkingLotId: spot.parking_lot_id,
                parkingLotName: spot.parking_lot_name,
                parkingLotDescription: spot.parking_lot_description,
                isActive: spot.is_active,
                layoutInfo: spot.layout_info,
                blocksSpotId: spot.blocks_parking_spot_id,
                availabilityInfo: {
                    isAvailable: true,
                    dateRange: { startDate, endDate },
                    capacityMatch: {
                        required: capacityUnits,
                        available: spot.capacity_units,
                        excess: spot.capacity_units - capacityUnits,
                        isExactMatch: spot.capacity_units === capacityUnits
                    }
                }
            }));

            // Sort by parking lot and spot number for better organization
            enhancedAvailableSpots.sort((a, b) => {
                if (a.parkingLotName !== b.parkingLotName) {
                    return a.parkingLotName.localeCompare(b.parkingLotName);
                }
                return parseInt(a.spotNumber) - parseInt(b.spotNumber);
            });

            return {
                hotelId,
                vehicleCategoryId,
                vehicleCategoryName: vehicleCategory.name,
                capacityUnitsRequired: capacityUnits,
                dateRange: { startDate, endDate },
                availabilityStats: {
                    totalCompatibleSpots,
                    availableSpots: availableCount,
                    occupiedSpots: occupiedCount,
                    availabilityRate: totalCompatibleSpots > 0 ? (availableCount / totalCompatibleSpots * 100).toFixed(1) : 0
                },
                availableSpots: enhancedAvailableSpots,
                parkingLotBreakdown: this._groupSpotsByParkingLot(enhancedAvailableSpots)
            };
        } catch (error) {
            throw new Error(`Failed to get available spots for dates: ${error.message}`);
        }
    }

    /**
     * Helper method to group spots by parking lot
     * @private
     * @param {Array} spots - Array of parking spots
     * @returns {Array} Grouped spots by parking lot
     */
    _groupSpotsByParkingLot(spots) {
        const grouped = spots.reduce((acc, spot) => {
            const lotName = spot.parkingLotName;
            if (!acc[lotName]) {
                acc[lotName] = {
                    parkingLotName: lotName,
                    parkingLotId: spot.parkingLotId,
                    description: spot.parkingLotDescription,
                    availableSpots: [],
                    totalAvailable: 0
                };
            }
            acc[lotName].availableSpots.push(spot);
            acc[lotName].totalAvailable++;
            return acc;
        }, {});

        return Object.values(grouped).sort((a, b) => a.parkingLotName.localeCompare(b.parkingLotName));
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

    /**
     * Real-time availability checking with capacity unit consideration
     * @param {number} hotelId - Hotel ID
     * @param {Array<string>} dates - Array of specific dates to check
     * @param {number} vehicleCategoryId - Vehicle category ID
     * @param {number} excludeReservationId - Optional reservation ID to exclude from availability check
     * @returns {Promise<Object>} Real-time availability information
     */
    async checkRealTimeAvailability(hotelId, dates, vehicleCategoryId, excludeReservationId = null) {
        try {
            if (!dates || dates.length === 0) {
                throw new Error('Dates array is required');
            }

            // Get vehicle category details
            const categories = await parkingModel.getVehicleCategories(this.requestId);
            const vehicleCategory = categories.find(cat => cat.id === vehicleCategoryId);
            
            if (!vehicleCategory) {
                throw new Error('Vehicle category not found');
            }

            // Get all compatible spots
            const compatibleSpots = await parkingModel.getCompatibleSpots(
                this.requestId,
                hotelId,
                vehicleCategoryId
            );

            // Check availability for each date
            const dateAvailability = {};
            const spotAvailability = {};

            for (const date of dates) {
                const startDate = date;
                const endDate = new Date(date);
                endDate.setDate(endDate.getDate() + 1);
                
                const availableSpots = await parkingModel.getAvailableSpotsForDates(
                    this.requestId,
                    hotelId,
                    startDate,
                    endDate.toISOString().split('T')[0],
                    vehicleCategory.capacity_units_required
                );

                dateAvailability[date] = {
                    date,
                    availableSpots: availableSpots.length,
                    totalCompatibleSpots: compatibleSpots.length,
                    occupiedSpots: compatibleSpots.length - availableSpots.length,
                    availabilityRate: compatibleSpots.length > 0 
                        ? ((availableSpots.length / compatibleSpots.length) * 100).toFixed(1)
                        : 0,
                    availableSpotIds: availableSpots.map(spot => spot.id)
                };

                // Track individual spot availability across dates
                availableSpots.forEach(spot => {
                    if (!spotAvailability[spot.id]) {
                        spotAvailability[spot.id] = {
                            spotId: spot.id,
                            spotNumber: spot.spot_number,
                            parkingLotName: spot.parking_lot_name,
                            capacityUnits: spot.capacity_units,
                            availableDates: [],
                            unavailableDates: []
                        };
                    }
                    spotAvailability[spot.id].availableDates.push(date);
                });
            }

            // Mark unavailable dates for each spot
            compatibleSpots.forEach(spot => {
                if (spotAvailability[spot.id]) {
                    const availableDates = new Set(spotAvailability[spot.id].availableDates);
                    spotAvailability[spot.id].unavailableDates = dates.filter(date => !availableDates.has(date));
                } else {
                    // Spot is not available for any of the requested dates
                    spotAvailability[spot.id] = {
                        spotId: spot.id,
                        spotNumber: spot.spot_number,
                        parkingLotName: spot.parking_lot_name,
                        capacityUnits: spot.capacity_units,
                        availableDates: [],
                        unavailableDates: [...dates]
                    };
                }
            });

            // Find spots available for all requested dates
            const fullyAvailableSpots = Object.values(spotAvailability).filter(
                spot => spot.availableDates.length === dates.length
            );

            // Calculate overall availability statistics
            const overallStats = {
                totalDatesRequested: dates.length,
                totalCompatibleSpots: compatibleSpots.length,
                fullyAvailableSpots: fullyAvailableSpots.length,
                partiallyAvailableSpots: Object.values(spotAvailability).filter(
                    spot => spot.availableDates.length > 0 && spot.availableDates.length < dates.length
                ).length,
                unavailableSpots: Object.values(spotAvailability).filter(
                    spot => spot.availableDates.length === 0
                ).length,
                averageAvailabilityRate: dates.length > 0 
                    ? (Object.values(dateAvailability).reduce((sum, day) => sum + parseFloat(day.availabilityRate), 0) / dates.length).toFixed(1)
                    : 0
            };

            return {
                hotelId,
                vehicleCategoryId,
                vehicleCategoryName: vehicleCategory.name,
                capacityUnitsRequired: vehicleCategory.capacity_units_required,
                requestedDates: dates,
                excludeReservationId,
                timestamp: new Date().toISOString(),
                overallStats,
                dateAvailability,
                spotAvailability: Object.values(spotAvailability),
                fullyAvailableSpots,
                recommendations: this._generateAvailabilityRecommendations(dateAvailability, spotAvailability, dates)
            };
        } catch (error) {
            throw new Error(`Failed to check real-time availability: ${error.message}`);
        }
    }

    /**
     * Generate availability recommendations based on current availability data
     * @private
     * @param {Object} dateAvailability - Date-based availability data
     * @param {Object} spotAvailability - Spot-based availability data
     * @param {Array<string>} requestedDates - Requested dates
     * @returns {Object} Availability recommendations
     */
    _generateAvailabilityRecommendations(dateAvailability, spotAvailability, requestedDates) {
        const recommendations = {
            bestAvailabilityDates: [],
            alternativeSpots: [],
            suggestedActions: []
        };

        // Find dates with best availability
        const sortedDates = Object.values(dateAvailability).sort(
            (a, b) => parseFloat(b.availabilityRate) - parseFloat(a.availabilityRate)
        );
        recommendations.bestAvailabilityDates = sortedDates.slice(0, 3).map(day => ({
            date: day.date,
            availabilityRate: day.availabilityRate,
            availableSpots: day.availableSpots
        }));

        // Find spots with best availability across requested dates
        const spotsByAvailability = Object.values(spotAvailability).sort(
            (a, b) => b.availableDates.length - a.availableDates.length
        );
        recommendations.alternativeSpots = spotsByAvailability.slice(0, 5).map(spot => ({
            spotId: spot.spotId,
            spotNumber: spot.spotNumber,
            parkingLotName: spot.parkingLotName,
            availableDates: spot.availableDates.length,
            totalDates: requestedDates.length,
            availabilityRate: ((spot.availableDates.length / requestedDates.length) * 100).toFixed(1)
        }));

        // Generate suggested actions
        const fullyAvailableCount = Object.values(spotAvailability).filter(
            spot => spot.availableDates.length === requestedDates.length
        ).length;

        if (fullyAvailableCount === 0) {
            recommendations.suggestedActions.push('No spots available for all requested dates. Consider splitting the reservation or choosing alternative dates.');
        } else if (fullyAvailableCount < 3) {
            recommendations.suggestedActions.push('Limited availability. Consider booking soon to secure a spot.');
        } else {
            recommendations.suggestedActions.push('Good availability. Multiple options available for your dates.');
        }

        return recommendations;
    }

    /**
     * Remove multiple parking addon assignments with their associated addon records
     * @param {Array<string>} assignmentIds - Array of assignment IDs to delete
     * @returns {Promise<Object>} Result with deleted count and removed assignments
     */
    async removeBulkParkingAddonAssignments(assignmentIds) {
        if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
            throw new Error('An array of assignment IDs is required');
        }

        // Validate all IDs are valid UUIDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const invalidIds = assignmentIds.filter(id => !uuidRegex.test(id));
        
        if (invalidIds.length > 0) {
            throw new Error(`Invalid assignment ID(s) provided: ${invalidIds.join(', ')}`);
        }

        // Use the model to handle the database operations
        return await parkingModel.bulkDeleteParkingAddonAssignments(this.requestId, assignmentIds);
    }
}

module.exports = ParkingAddonService;