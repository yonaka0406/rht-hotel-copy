import { ref, computed } from 'vue';
import { useParkingStore } from './useParkingStore';
import { io } from 'socket.io-client';

// Reactive state for parking addon management
const isProcessing = ref(false);
const lastError = ref(null);
const conflictResolution = ref(null);
const socket = ref(null);

export function useParkingAddonManager() {
    const parkingStore = useParkingStore();

    // Initialize WebSocket connection for real-time sync
    const initializeWebSocket = () => {
        if (!socket.value) {
            socket.value = io(import.meta.env.VITE_BACKEND_URL);
            
            socket.value.on('connect', () => {
                console.log('ParkingAddonManager: Connected to WebSocket server');
            });

            socket.value.on('connect_error', (err) => {
                console.error('ParkingAddonManager: WebSocket connection error:', err);
                lastError.value = 'WebSocket connection failed';
            });

            socket.value.on('parkingUpdate', (data) => {
                handleParkingUpdate(data);
            });

            socket.value.on('parkingConflict', (data) => {
                handleParkingConflict(data);
            });
        }
    };

    // Clean up WebSocket connection
    const disconnectWebSocket = () => {
        if (socket.value) {
            socket.value.disconnect();
            socket.value = null;
        }
    };

    // Handle real-time parking updates
    const handleParkingUpdate = (data) => {
        console.log('ParkingAddonManager: Received parking update:', data);
        // Emit custom event for components to handle
        window.dispatchEvent(new CustomEvent('parkingUpdate', { detail: data }));
    };

    // Handle parking conflicts
    const handleParkingConflict = (data) => {
        console.log('ParkingAddonManager: Parking conflict detected:', data);
        conflictResolution.value = data;
        // Emit custom event for conflict resolution
        window.dispatchEvent(new CustomEvent('parkingConflict', { detail: data }));
    };

    // Data validation and consistency checking
    const validateParkingAddonData = (addonData, spotId, dates, vehicleCategoryId) => {
        const errors = [];

        // Validate addon data
        if (!addonData || typeof addonData !== 'object') {
            errors.push('Addon data is required and must be an object');
        } else {
            if (!addonData.hotel_id) errors.push('Hotel ID is required in addon data');
            if (!addonData.reservation_id) errors.push('Reservation ID is required in addon data');
            if (!addonData.addon_id) errors.push('Addon ID is required in addon data');
        }

        // Validate spot ID
        if (!spotId || !Number.isInteger(Number(spotId))) {
            errors.push('Valid parking spot ID is required');
        }

        // Validate dates
        if (!Array.isArray(dates) || dates.length === 0) {
            errors.push('Dates array is required and cannot be empty');
        } else {
            dates.forEach((date, index) => {
                if (!date || !isValidDateString(date)) {
                    errors.push(`Invalid date format at index ${index}: ${date}`);
                }
            });
        }

        // Validate vehicle category ID
        if (!vehicleCategoryId || !Number.isInteger(Number(vehicleCategoryId))) {
            errors.push('Valid vehicle category ID is required');
        }

        return errors;
    };

    // Helper function to validate date string format
    const isValidDateString = (dateString) => {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateString)) return false;
        
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date) && date.toISOString().split('T')[0] === dateString;
    };

    // Check data consistency between addons and parking tables
    const checkDataConsistency = async (reservationId) => {
        try {
            // This would typically involve checking if addon assignments match parking assignments
            // For now, we'll implement a basic consistency check
            console.log('ParkingAddonManager: Checking data consistency for reservation:', reservationId);
            
            // In a real implementation, this would query both addon and parking data
            // and ensure they are synchronized
            return { isConsistent: true, issues: [] };
        } catch (error) {
            console.error('ParkingAddonManager: Error checking data consistency:', error);
            return { isConsistent: false, issues: [error.message] };
        }
    };

    // Enhanced addon assignment with validation and conflict resolution
    const addParkingAddonWithSpot = async (reservationDetailId, addonData, spotId, dates, vehicleCategoryId) => {
        isProcessing.value = true;
        lastError.value = null;

        try {
            // Validate input data
            const validationErrors = validateParkingAddonData(addonData, spotId, dates, vehicleCategoryId);
            if (validationErrors.length > 0) {
                throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
            }

            // Check real-time availability before assignment
            const availabilityCheck = await parkingStore.checkRealTimeAvailability(
                addonData.hotel_id,
                vehicleCategoryId,
                dates
            );

            // Check if the specific spot is available for all dates
            const spotAvailable = availabilityCheck.fullyAvailableSpots.some(
                spot => spot.spotId === parseInt(spotId)
            );

            if (!spotAvailable) {
                throw new Error('Selected parking spot is not available for all requested dates');
            }

            // Attempt to create the assignment
            const result = await parkingStore.addParkingAddonWithSpot(
                reservationDetailId,
                addonData,
                spotId,
                dates,
                vehicleCategoryId
            );

            // Broadcast update via WebSocket
            if (socket.value) {
                socket.value.emit('parkingAssignmentCreated', {
                    reservationId: addonData.reservation_id,
                    spotId: spotId,
                    dates: dates,
                    vehicleCategoryId: vehicleCategoryId,
                    timestamp: new Date().toISOString()
                });
            }

            // Check data consistency after assignment
            const consistencyCheck = await checkDataConsistency(addonData.reservation_id);
            if (!consistencyCheck.isConsistent) {
                console.warn('ParkingAddonManager: Data consistency issues detected:', consistencyCheck.issues);
            }

            return result;

        } catch (error) {
            lastError.value = error.message;
            console.error('ParkingAddonManager: Error adding parking addon with spot:', error);
            throw error;
        } finally {
            isProcessing.value = false;
        }
    };

    // Enhanced spot update with conflict detection
    const updateParkingAddonSpot = async (assignmentId, newSpotId, dates, vehicleCategoryId) => {
        isProcessing.value = true;
        lastError.value = null;

        try {
            // Validate input data
            if (!assignmentId) throw new Error('Assignment ID is required');
            if (!newSpotId || !Number.isInteger(Number(newSpotId))) {
                throw new Error('Valid new spot ID is required');
            }
            if (!Array.isArray(dates) || dates.length === 0) {
                throw new Error('Dates array is required and cannot be empty');
            }

            // Check if new spot is available
            const hotelId = 1; // This should be passed as parameter or retrieved from context
            const availabilityCheck = await parkingStore.checkRealTimeAvailability(
                hotelId,
                vehicleCategoryId,
                dates
            );

            const newSpotAvailable = availabilityCheck.fullyAvailableSpots.some(
                spot => spot.spotId === parseInt(newSpotId)
            );

            if (!newSpotAvailable) {
                throw new Error('New parking spot is not available for all requested dates');
            }

            // Attempt to update the assignment
            const result = await parkingStore.updateParkingAddonSpot(
                assignmentId,
                newSpotId,
                dates,
                vehicleCategoryId
            );

            // Broadcast update via WebSocket
            if (socket.value) {
                socket.value.emit('parkingAssignmentUpdated', {
                    assignmentId: assignmentId,
                    newSpotId: newSpotId,
                    dates: dates,
                    vehicleCategoryId: vehicleCategoryId,
                    timestamp: new Date().toISOString()
                });
            }

            return result;

        } catch (error) {
            lastError.value = error.message;
            console.error('ParkingAddonManager: Error updating parking addon spot:', error);
            throw error;
        } finally {
            isProcessing.value = false;
        }
    };

    // Enhanced removal with cleanup validation
    const removeParkingAddonWithSpot = async (assignmentId) => {
        isProcessing.value = true;
        lastError.value = null;

        try {
            if (!assignmentId) throw new Error('Assignment ID is required');

            // Attempt to remove the assignment
            const result = await parkingStore.removeParkingAddonWithSpot(assignmentId);

            // Broadcast removal via WebSocket
            if (socket.value) {
                socket.value.emit('parkingAssignmentRemoved', {
                    assignmentId: assignmentId,
                    timestamp: new Date().toISOString()
                });
            }

            return result;

        } catch (error) {
            lastError.value = error.message;
            console.error('ParkingAddonManager: Error removing parking addon with spot:', error);
            throw error;
        } finally {
            isProcessing.value = false;
        }
    };

    // Conflict resolution methods
    const resolveConflict = async (conflictData, resolution) => {
        try {
            console.log('ParkingAddonManager: Resolving conflict:', conflictData, 'with resolution:', resolution);
            
            switch (resolution.type) {
                case 'override':
                    // Override the conflicting assignment
                    return await addParkingAddonWithSpot(
                        resolution.reservationDetailId,
                        resolution.addonData,
                        resolution.spotId,
                        resolution.dates,
                        resolution.vehicleCategoryId
                    );
                
                case 'alternative':
                    // Find alternative spot
                    const alternatives = await findAlternativeSpots(
                        resolution.hotelId,
                        resolution.vehicleCategoryId,
                        resolution.dates
                    );
                    if (alternatives.length > 0) {
                        return await addParkingAddonWithSpot(
                            resolution.reservationDetailId,
                            resolution.addonData,
                            alternatives[0].spotId,
                            resolution.dates,
                            resolution.vehicleCategoryId
                        );
                    }
                    throw new Error('No alternative spots available');
                
                case 'cancel':
                    // Cancel the operation
                    return { cancelled: true, reason: 'User cancelled due to conflict' };
                
                default:
                    throw new Error('Unknown conflict resolution type');
            }
        } catch (error) {
            console.error('ParkingAddonManager: Error resolving conflict:', error);
            throw error;
        } finally {
            conflictResolution.value = null;
        }
    };

    // Find alternative parking spots
    const findAlternativeSpots = async (hotelId, vehicleCategoryId, dates) => {
        try {
            const availabilityCheck = await parkingStore.checkRealTimeAvailability(
                hotelId,
                vehicleCategoryId,
                dates
            );
            
            return availabilityCheck.fullyAvailableSpots.map(spot => ({
                spotId: spot.spotId,
                spotNumber: spot.spotNumber,
                parkingLotName: spot.parkingLotName,
                availabilityRate: spot.availabilityRate
            }));
        } catch (error) {
            console.error('ParkingAddonManager: Error finding alternative spots:', error);
            return [];
        }
    };

    // Recovery mechanism for failed operations
    const recoverFromFailure = async (operation, originalParams) => {
        try {
            console.log('ParkingAddonManager: Attempting recovery for failed operation:', operation);
            
            // Wait a short time before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Retry the operation based on type
            switch (operation) {
                case 'add':
                    return await addParkingAddonWithSpot(...originalParams);
                case 'update':
                    return await updateParkingAddonSpot(...originalParams);
                case 'remove':
                    return await removeParkingAddonWithSpot(...originalParams);
                default:
                    throw new Error('Unknown operation type for recovery');
            }
        } catch (error) {
            console.error('ParkingAddonManager: Recovery failed:', error);
            throw new Error(`Recovery failed: ${error.message}`);
        }
    };

    // Computed properties for state management
    const hasActiveConflict = computed(() => conflictResolution.value !== null);
    const isReady = computed(() => socket.value && socket.value.connected);

    return {
        // State
        isProcessing,
        lastError,
        conflictResolution,
        hasActiveConflict,
        isReady,
        
        // WebSocket management
        initializeWebSocket,
        disconnectWebSocket,
        
        // Core operations with enhanced validation and conflict resolution
        addParkingAddonWithSpot,
        updateParkingAddonSpot,
        removeParkingAddonWithSpot,
        
        // Validation and consistency
        validateParkingAddonData,
        checkDataConsistency,
        
        // Conflict resolution
        resolveConflict,
        findAlternativeSpots,
        
        // Recovery mechanisms
        recoverFromFailure,
        
        // Utility methods
        isValidDateString,
    };
}