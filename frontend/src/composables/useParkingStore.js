import { ref } from 'vue';
import { useHotelStore } from './useHotelStore';

const { selectedHotelId } = useHotelStore();

const vehicleCategories = ref([]);
const parkingLots = ref([]);
const parkingSpots = ref([]);
const reservedParkingSpots = ref([]);

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

    // ... similarly for create, update, delete parking spots

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

    return {
        vehicleCategories,
        parkingLots,
        parkingSpots,
        reservedParkingSpots,
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
    };
}
