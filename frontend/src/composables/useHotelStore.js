import { ref, computed, watch } from 'vue';

const hotels = ref([]);
const selectedHotel = ref(null);
const selectedHotelId = ref(null);
const hotelRooms = ref([]);
const hotelBlockedRooms = ref([]);

export function useHotelStore() {

    const setHotelId = (id) => {
        selectedHotelId.value = id;
    };

    // Hotel
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
    const fetchHotelSiteController = async (hotel_id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/hotel-ota/${hotel_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            const result = await response.json();

            return result;
        } catch (error) {
            console.error('Failed to fetch hotel site controller info', error);
        }
    };
    const editHotel = async (hotel_id, data) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/hotel/${hotel_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to save hotel');

            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('Failed to edit hotel', error);
        }
    };
    const editHotelSiteController = async (hotel_id, data) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/hotel-ota/${hotel_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to save hotel site controller');

            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('Failed to edit hotel', error);
        }
    };

    // Room
    const fetchHotelRoomTypes = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/hotel-room-types/${selectedHotelId.value}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            const result = await response.json();
            return result;                        
        } catch (error) {
            console.error('Failed to fetch hotels info', error);
        }
    };    
    const fetchBlockedRooms = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/hotel-calendar/blocked/${selectedHotelId.value}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            hotelBlockedRooms.value = await response.json();

            //console.log('Store fetchBlockedRooms:',hotelBlockedRooms.value)
            
        } catch (error) {
            console.error('Failed to fetch hotels info', error);
        }
    };

    // Calendar
    const applyCalendarSettings = async (hotelId, startDate, endDate, roomIds, comment) => {
        const authToken = localStorage.getItem('authToken');

        const response = await fetch(`/api/hotel-calendar/update/${startDate}/${endDate}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ hotelId, roomIds, comment })
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, message: data.message || 'Failed to update reservation status' };
        }

        return { success: true, message: data.message || 'Calendar updated successfully' };
    };
    const removeCalendarSettings = async (reservationId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/hotel-calendar/unblock/${reservationId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
        } catch (error) {
            console.error('Failed to fetch hotels info', error);
        }
    };

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
        hotelBlockedRooms,
        setHotelId,
        fetchHotels,
        fetchHotel,
        fetchHotelSiteController,
        editHotel,
        editHotelSiteController,
        fetchHotelRoomTypes,
        fetchBlockedRooms,
        applyCalendarSettings,
        removeCalendarSettings,
    };
}
