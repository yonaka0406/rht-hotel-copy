import { ref } from 'vue';
import { useHotelStore } from './useHotelStore';
import { useReservationStore } from './useReservationStore';

const { selectedHotelId } = useHotelStore();
const { setReservationIsUpdating } = useReservationStore();

const vehicleCategories = ref([]);
const parkingLots = ref([]);
const parkingSpots = ref([]);
const reservedParkingSpots = ref([]);
const parkingReservations = ref({});
const parkingBlocks = ref([]);

export function useParkingStore() {

    // Vehicle Categories (shared across all hotels)
    const fetchVehicleCategories = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/vehicle-categories', {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            vehicleCategories.value = await response.json();
        } catch (error) {
            console.error('Failed to fetch vehicle categories', error);
            throw error; // Re-throw to handle in the component
        }
    };

    const createVehicleCategory = async (category) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/vehicle-categories', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    name: category.name, 
                    capacity_units_required: category.capacity_units_required
                }),
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to create vehicle category', error);
            throw error; // Re-throw to handle in the component
        }
    };

    const updateVehicleCategory = async (id, category) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/vehicle-categories/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: category.name, capacity_units_required: category.capacity_units_required }),
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to update vehicle category', error);
        }
    };

    const deleteVehicleCategory = async (id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            await fetch(`/api/vehicle-categories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
        } catch (error) {
            console.error('Failed to delete vehicle category', error);
        }
    };

    // Parking Lots
    const fetchParkingLots = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/parking-lots/${selectedHotelId.value}`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            parkingLots.value = await response.json();
        } catch (error) {
            console.error('Failed to fetch parking lots', error);
        }
    };

    const createParkingLot = async (lot) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/parking-lots', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    hotel_id: selectedHotelId.value,
                    name: lot.name,
                    description: lot.description
                }),
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to create parking lot', error);
            throw error;
        }
    };

    const updateParkingLot = async (id, lot) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/parking-lots/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    name: lot.name,
                    description: lot.description
                }),
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to update parking lot', error);
            throw error;
        }
    };

    const deleteParkingLot = async (id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            await fetch(`/api/parking-lots/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
        } catch (error) {
            console.error('Failed to delete parking lot', error);
            throw error;
        }
    };

    // Parking Spots
    const fetchParkingSpots = async (parkingLotId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/parking-spots/${parkingLotId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            parkingSpots.value = await response.json();
        } catch (error) {
            console.error('Failed to fetch parking spots', error);
        }
    };

    const fetchReservedParkingSpots = async (hotelId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/parking/reservations?hotel_id=${hotelId}&startDate=${startDate}&endDate=${endDate}`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Ensure we always set an array
            if (Array.isArray(data)) {
                reservedParkingSpots.value = data;
            } else {
                console.error('API returned non-array data:', data);
                reservedParkingSpots.value = [];
            }
        } catch (error) {
            console.error('Failed to fetch reserved parking spots', error);
            reservedParkingSpots.value = []; // Ensure it's always an array
        }
    };

    const fetchAllParkingSpotsByHotel = async (hotelId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/parking/spots/hotel/${hotelId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Ensure we always return an array
            if (Array.isArray(data)) {
                return data;
            } else {
                console.error('API returned non-array data:', data);
                return [];
            }
        } catch (error) {
            console.error('Failed to fetch all parking spots for hotel', error);
            return []; // Ensure it's always an array
        }
    };

    // Enhanced Parking Availability Methods with Vehicle Category Support
    const checkParkingVacancies = async (hotelId, startDate, endDate, vehicleCategoryId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/parking/vacancies/${hotelId}/${startDate}/${endDate}/${vehicleCategoryId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to check parking vacancies', error);
            throw error;
        }
    };

    const getCompatibleSpots = async (hotelId, vehicleCategoryId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/parking/compatible-spots/${hotelId}/${vehicleCategoryId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get compatible spots', error);
            throw error;
        }
    };

    const getAvailableSpotsForDates = async (hotelId, vehicleCategoryId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/parking/available-spots/${hotelId}/${vehicleCategoryId}?startDate=${startDate}&endDate=${endDate}`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get available spots for dates', error);
            throw error;
        }
    };

    const checkRealTimeAvailability = async (hotelId, vehicleCategoryId, dates, excludeReservationId = null) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/parking/real-time-availability/${hotelId}/${vehicleCategoryId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    dates,
                    excludeReservationId
                }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to check real-time availability', error);
            throw error;
        }
    };

    // Parking Addon Assignment Methods
    const addParkingAddonWithSpot = async (reservationDetailId, addonData, spotId, dates, vehicleCategoryId) => {
        setReservationIsUpdating(true);
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/parking/addon-assignment', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reservationDetailId,
                    addonData,
                    spotId,
                    dates,
                    vehicleCategoryId
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to add parking addon with spot', error);
            throw error;
        } finally {
            setReservationIsUpdating(false);
        }
    };

    const updateParkingAddonSpot = async (assignmentId, newSpotId, dates, vehicleCategoryId) => {
        setReservationIsUpdating(true);
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/parking/addon-assignment/${assignmentId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    newSpotId,
                    dates,
                    vehicleCategoryId
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to update parking addon spot', error);
            throw error;
        } finally {
            setReservationIsUpdating(false);
        }
    };

    const removeParkingAddonWithSpot = async (assignmentId) => {
        setReservationIsUpdating(true);
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/parking/addon-assignment/${assignmentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to remove parking addon with spot', error);
            throw error;
        } finally {
            setReservationIsUpdating(false);
        }
    };

    const removeBulkParkingAddonWithSpot = async (assignmentIds) => {
        setReservationIsUpdating(true);
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/parking/addon-assignment/bulk', {
                method: 'DELETE',
                headers: { 
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: assignmentIds }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to remove bulk parking addons with spots', error);
            throw error;
        } finally {
            setReservationIsUpdating(false);
        }
    };

    // Fetch parking reservations for a specific reservation
    const fetchParkingReservations = async (hotelId, reservationId) => {
        try {
            const authToken = localStorage.getItem('authToken');            
            const response = await fetch(`/api/reservation/parking/${hotelId}/${reservationId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch parking reservations');
            }
            
            const data = await response.json();
            parkingReservations.value[reservationId] = data;
            return data;
        } catch (error) {
            console.error('Error fetching parking reservations:', error);
            throw error;
        }
    };

    const saveParkingAssignments = async (assignments) => {
        setReservationIsUpdating(true);
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/parking/reservations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ assignments }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to save parking assignments', error);
            throw error;
        } finally {
            setReservationIsUpdating(false);
        }
    };

    // Parking Reservation Management
    const deleteParkingReservation = async (reservationId) => {
        setReservationIsUpdating(true);
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/reservation/parking/${reservationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete parking reservation');
            }
            
            // Remove the deleted reservation from the local state
            parkingReservations.value = {
                ...parkingReservations.value,
                parking: parkingReservations.value.parking.filter(r => r.id !== reservationId)
            };
            
            return true;
        } catch (error) {
            console.error('Failed to delete parking reservation', error);
            throw error;
        } finally {
            setReservationIsUpdating(false);
        }
    };

    // Capacity Management Methods
    const getAvailableCapacity = async (hotelId, startDate, endDate, vehicleCategoryId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const params = new URLSearchParams({
                hotelId: hotelId,
                startDate: startDate,
                endDate: endDate,
                vehicleCategoryId: vehicleCategoryId
            });
            const response = await fetch(`/api/parking/capacity/available?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get available capacity', error);
            throw error;
        }
    };

    const blockParkingCapacity = async (blockData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/parking/capacity/block', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(blockData),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to block parking capacity', error);
            throw error;
        }
    };

    const getBlockedCapacity = async (hotelId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const params = new URLSearchParams({
                hotelId: hotelId,
                startDate: startDate,
                endDate: endDate
            });
            const response = await fetch(`/api/parking/capacity/blocks?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get blocked capacity', error);
            throw error;
        }
    };

    const removeCapacityBlock = async (blockId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/parking/capacity/blocks/${blockId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to remove capacity block', error);
            throw error;
        }
    };

    const getCapacitySummary = async (hotelId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const params = new URLSearchParams({
                hotelId: hotelId,
                startDate: startDate,
                endDate: endDate
            });
            const response = await fetch(`/api/parking/capacity/summary?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to get capacity summary', error);
            throw error;
        }
    };

    // Parking Blocks Management
    const fetchParkingBlocks = async (hotelId, startDate, endDate) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const params = new URLSearchParams({
                hotelId: hotelId,
                startDate: startDate,
                endDate: endDate
            });
            const response = await fetch(`/api/parking/capacity/blocks?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            parkingBlocks.value = await response.json();
            return parkingBlocks.value;
        } catch (error) {
            console.error('Failed to fetch parking blocks', error);
            throw error;
        }
    };

    const createParkingBlock = async (blockData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/parking/capacity/block', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(blockData),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to create parking block', error);
            throw error;
        }
    };

    const deleteParkingBlock = async (blockId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/parking/capacity/blocks/${blockId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Failed to delete parking block', error);
            throw error;
        }
    };
    
    return {
        vehicleCategories,
        parkingLots,
        parkingSpots,
        reservedParkingSpots,
        parkingReservations,
        parkingBlocks,
        fetchVehicleCategories,
        createVehicleCategory,
        updateVehicleCategory,
        deleteVehicleCategory,
        fetchParkingLots,
        createParkingLot,
        updateParkingLot,
        deleteParkingLot,
        fetchParkingSpots,
        fetchReservedParkingSpots,
        fetchAllParkingSpotsByHotel,
        fetchParkingReservations,
        // Enhanced availability checking methods
        checkParkingVacancies,
        getCompatibleSpots,
        getAvailableSpotsForDates,
        checkRealTimeAvailability,
        // Parking addon assignment methods
        addParkingAddonWithSpot,
        updateParkingAddonSpot,
        removeParkingAddonWithSpot,
        removeBulkParkingAddonWithSpot,
        saveParkingAssignments,
        deleteParkingReservation,
        // Capacity management methods
        getAvailableCapacity,
        blockParkingCapacity,
        getBlockedCapacity,
        removeCapacityBlock,
        getCapacitySummary,
        // Parking blocks management
        fetchParkingBlocks,
        createParkingBlock,
        deleteParkingBlock,
    };
}
