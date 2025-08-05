import { ref } from 'vue';
import { useHotelStore } from './useHotelStore';

const { selectedHotelId } = useHotelStore();

const vehicleCategories = ref([]);
const parkingLots = ref([]);
const parkingSpots = ref([]);

export function useParkingStore() {

    // Vehicle Categories
    const fetchVehicleCategories = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/vehicle-categories`, {
                headers: { 'Authorization': `Bearer ${authToken}` },
            });
            vehicleCategories.value = await response.json();
        } catch (error) {
            console.error('Failed to fetch vehicle categories', error);
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
                body: JSON.stringify({ name: category.name, capacity_units_required: category.capacity_units_required }),
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to create vehicle category', error);
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

    // ... similarly for create, update, delete parking lots

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

    return {
        vehicleCategories,
        parkingLots,
        parkingSpots,
        fetchVehicleCategories,
        createVehicleCategory,
        updateVehicleCategory,
        deleteVehicleCategory,
        fetchParkingLots,
        fetchParkingSpots,
    };
}
