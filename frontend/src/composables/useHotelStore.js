import { ref, watch } from 'vue';

const hotels = ref([]);
const selectedHotel = ref(null);
const selectedHotelId = ref(null);
const selectedHotelRooms = ref([]);

export function useHotelStore() {

    const setHotelId = (id) => {
        selectedHotelId.value = id;
    };

    // Fetch the list of hotels
    const fetchHotels = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/hotel-list', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            hotels.value = await response.json();

            // Set the first hotel as selected if none is selected
            if (hotels.value.length > 0 && !selectedHotelId.value) {
                selectedHotelId.value = hotels.value[0].id;
            }
        } catch (error) {
            console.error('Failed to fetch hotels', error);
        }
    };

    // Fetch data for the selected hotel
    const fetchHotel = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/hotel-rooms/${selectedHotelId.value}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            selectedHotelRooms.value = await response.json();

            // Update selectedHotel based on selectedHotelId
            selectedHotel.value = hotels.value.find(
                (hotel) => hotel.id === selectedHotelId.value
            );
            
        } catch (error) {
            console.error('Failed to fetch hotel rooms', error);
        }
    };

    // Watch for changes to selectedHotelId and fetch the corresponding hotel data
    watch(selectedHotelId, (newHotelId) => {
        if (newHotelId) {
            fetchHotel(); // Re-fetch hotel and rooms when the hotel ID changes
        }
    });

    return {
        hotels,
        selectedHotel,
        selectedHotelId,
        selectedHotelRooms,
        setHotelId,
        fetchHotels,
        fetchHotel,
    };
}
