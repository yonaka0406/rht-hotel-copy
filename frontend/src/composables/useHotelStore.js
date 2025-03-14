import { ref, computed, watch } from 'vue';

const hotels = ref([]);
const selectedHotel = ref(null);
const selectedHotelId = ref(null);
const hotelRooms = ref([]);

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
                // console.log('From Hotel Store => No hotel was previously selected.');
                selectedHotelId.value = hotels.value[0].id;
            }
            // console.log('From Hotel Store => fetchHotels Hotel ID',selectedHotelId.value);

        } catch (error) {
            console.error('Failed to fetch hotels', error);
        }
    };

    // Fetch data for the selected hotel
    const fetchHotel = async () => {
        
        if (hotels.value.length > 0 && !selectedHotelId.value) {
            // console.log('From Hotel Store => No hotel was previously selected.');
            selectedHotelId.value = hotels.value[0].id;
        }
        // console.log('From Hotel Store => fetchHotel Hotel ID',selectedHotelId.value);

        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/hotel-rooms/${selectedHotelId.value}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            hotelRooms.value = await response.json();

            // Update selectedHotel based on selectedHotelId
            selectedHotel.value = hotels.value.find(
                (hotel) => hotel.id === selectedHotelId.value
            );
            
        } catch (error) {
            console.error('Failed to fetch hotel rooms', error);
        }
    };

    const applyCalendarSettings = async (hotelId, startDate, endDate, roomIds) => {
        const authToken = localStorage.getItem('authToken');

        const response = await fetch(`/api/hotel-calendar/update/${startDate}/${endDate}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ hotelId, roomIds })
        });

        if (!response.ok) {
            throw new Error('Failed to update reservation status');
        }
    }

    // Watch for changes to selectedHotelId and fetch the corresponding hotel data
    watch(selectedHotelId, (newHotelId) => {
        if (newHotelId) {
            // console.log('From Hotel Store => selectedHotelId changed.');
            // fetchHotel when necessary
            // fetchHotel(); // Re-fetch hotel and rooms when the hotel ID changes
        }
    });

    // Computed property to return sorted rooms
    const selectedHotelRooms = computed(() => {
        return [...hotelRooms.value].sort((a, b) => a.room_number - b.room_number);
    });

    return {
        hotels,
        selectedHotel,
        selectedHotelId,
        selectedHotelRooms,
        setHotelId,
        fetchHotels,
        fetchHotel,
        applyCalendarSettings,
    };
}
