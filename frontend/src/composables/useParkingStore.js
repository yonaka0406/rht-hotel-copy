import { ref } from 'vue';
import { useHotelStore } from './useHotelStore';

const { selectedHotelId } = useHotelStore();

const vehicleCategories = ref([]);
const parkingLots = ref([]);
const parkingSpots = ref([]);
const reservedParkingSpots = ref([]);
const parkingReservations = ref({});

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
        }
    };

    const updateParkingAddonSpot = async (assignmentId, newSpotId, dates, vehicleCategoryId) => {
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
        }
    };

    const removeParkingAddonWithSpot = async (assignmentId) => {
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

    const saveParkingAssignments = async (reservationDetailIds, assignments) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/parking/reservations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reservationDetailIds, assignments }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to save parking assignments', error);
            throw error;
        }
    };

    // Parking Reservation Management
    const deleteParkingReservation = async (reservationId) => {
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
        }
    };

    const deleteMultipleParkingReservations = async (reservationIds) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/reservation/parking/bulk-delete', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids: reservationIds }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete parking reservations');
            }
            
            // Remove the deleted reservations from the local state
            parkingReservations.value = {
                ...parkingReservations.value,
                parking: parkingReservations.value.parking.filter(r => !reservationIds.includes(r.id))
            };
            
            return true;
        } catch (error) {
            console.error('Failed to delete parking reservations', error);
            throw error;
        }
    };

    return {
        vehicleCategories,
        parkingLots,
        parkingSpots,
        reservedParkingSpots,
        parkingReservations,
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
        saveParkingAssignments,
        deleteParkingReservation,
        deleteMultipleParkingReservations,
    };
}
