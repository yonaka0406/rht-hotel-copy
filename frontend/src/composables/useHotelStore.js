import { ref, computed, watch } from 'vue';

const hotels = ref([]);
const selectedHotel = ref(null);
const selectedHotelId = ref(null);
const hotelRooms = ref([]);
const hotelBlockedRooms = ref([]);
const isLoadingHotelList = ref(false);
const isInitialized = ref(false);

// Load selected hotel ID from localStorage on module load
const STORAGE_KEY = 'selectedHotelId';
const savedHotelId = localStorage.getItem(STORAGE_KEY);

if (savedHotelId && savedHotelId !== 'undefined' && savedHotelId !== 'null') {
    selectedHotelId.value = parseInt(savedHotelId, 10);
}

export function useHotelStore() {

    const setHotelId = (id) => {
        if (id !== null && id !== undefined) {
            selectedHotelId.value = id;
            localStorage.setItem(STORAGE_KEY, id.toString());
            // console.log('[useHotelStore] selectedHotelId set to:', selectedHotelId.value);
        } else {
            // console.log('[useHotelStore] setHotelId called with null/undefined id, not updating.');
        }
    };

    // Hotel
    const fetchHotels = async () => {
        isLoadingHotelList.value = true;
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/hotel-list', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            hotels.value = Array.isArray(data) ? data : [];
            
            if (hotels.value.length > 0) {
                const savedHotelId = localStorage.getItem(STORAGE_KEY);
                const savedHotel = savedHotelId ? hotels.value.find(h => h.id === parseInt(savedHotelId, 10)) : null;
                
                if (savedHotel) {
                    selectedHotelId.value = savedHotel.id;
                } else if (!selectedHotelId.value || !hotels.value.some(h => h.id === selectedHotelId.value)) {
                    selectedHotelId.value = hotels.value[0].id;
                    localStorage.setItem(STORAGE_KEY, selectedHotelId.value.toString());
                    // console.log('[useHotelStore] fetchHotels: No valid selected hotel, defaulting to first:', selectedHotelId.value);
                }
            }
        } catch (error) {
            console.error('Failed to fetch hotels', error);
            hotels.value = [];
        } finally {
            isLoadingHotelList.value = false;
            isInitialized.value = true;
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

    const createHotel = async (hotelData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/hotels', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(hotelData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create hotel');
            }

            const result = await response.json();
            // After creating a hotel, refresh the list of hotels
            await fetchHotels();
            return result;
        } catch (error) {
            console.error('Failed to create hotel', error);
            throw error; // Re-throw to be handled by the component
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

    const createRoomType = async (roomTypeData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/room-types', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(roomTypeData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create room type');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to create room type', error);
            throw error;
        }
    };

    const createRoom = async (roomData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/rooms', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(roomData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create room');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to create room', error);
            throw error;
        }
    };

    const createHotelWithDetails = async (hotel, roomTypes, rooms) => {
        try {
            // 1. Create Hotel
            const newHotel = await createHotel(hotel);
            const hotelId = newHotel.id;

            // 2. Create Room Types and map names to IDs
            const createdRoomTypes = {}; // Map of room type name -> room type ID
            if (roomTypes && roomTypes.length > 0) {
                // Create room types sequentially to avoid race conditions or database locks if any
                for (const rt of roomTypes) {
                    const result = await createRoomType({ ...rt, hotel_id: hotelId });
                    createdRoomTypes[rt.name] = result.roomTypeId;
                }
            }

            // 3. Create Rooms with correct room_type_id
            if (rooms && rooms.length > 0) {
                await Promise.all(rooms.map(room => {
                    // Resolve the correct room_type_id from the map using the room type name
                    const resolvedRoomTypeId = createdRoomTypes[room.room_type];
                    
                    if (!resolvedRoomTypeId) {
                        console.warn(`Could not resolve room type ID for room ${room.room_number} with type ${room.room_type}. Skipping.`);
                        return Promise.resolve(); // Skip or handle error
                    }

                    return createRoom({ 
                        ...room, 
                        hotel_id: hotelId,
                        room_type_id: resolvedRoomTypeId
                    });
                }));
            }

            return newHotel;
        } catch (error) {
            console.error('Failed to create hotel with details', error);
            throw error;
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
    const applyCalendarSettings = async (hotelId, startDate, endDate, roomIds, number_of_people, comment, block_type) => {
        const authToken = localStorage.getItem('authToken');

        const response = await fetch(`/api/hotel-calendar/update/${startDate}/${endDate}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ hotelId, roomIds, number_of_people, comment, block_type })
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
            await fetch(`/api/hotel-calendar/unblock/${reservationId}`, {
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
            fetchHotel(); // Re-fetch hotel and rooms when the hotel ID changes
        }
    });

    // Computed property to return sorted rooms
    const selectedHotelRooms = computed(() => {
        return [...hotelRooms.value].sort((a, b) => {
            // Sort by room_type_name first
            if (a.room_type_name < b.room_type_name) {
                return -1;
            }
            if (a.room_type_name > b.room_type_name) {
                return 1;
            }
            // If room_type_name is the same, sort by room_number
            return a.room_number - b.room_number;
        })
    });

    // Defensive computed for Select :options
    const safeHotels = computed(() => {
      if (!Array.isArray(hotels.value)) {
        // console.warn('[useHotelStore] hotels is not an array:', hotels.value);
        return [];
      }
      return hotels.value;
    });

    const getRoomAssignmentOrder = async (hotelId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/hotel-assignment-order/${hotelId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch room assignment order', error);
            return [];
        }
    };

    const updateRoomAssignmentOrder = async (hotelId, rooms) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/hotel-assignment-order/${hotelId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rooms }),
            });
            if (!response.ok) throw new Error('Failed to save room assignment order');
            return await response.json();
        } catch (error) {
            console.error('Failed to update room assignment order', error);
            throw error;
        }
    };

    const updateRoom = async (roomId, roomData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            // Use hotel_id from roomData if available, otherwise fall back to selectedHotelId.value
            const hotelId = roomData.hotel_id || selectedHotelId.value;
            if (!hotelId) {
                throw new Error('No hotel ID available for room update');
            }
            
            const response = await fetch(`/api/room/${roomId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...roomData,
                    hotel_id: hotelId
                }),
            });
            if (!response.ok) throw new Error('Failed to save room details');
            return await response.json();
        } catch (error) {
            console.error('Failed to update room details', error);
            throw error;
        }
    };

    return {
        hotels,
        safeHotels,
        selectedHotel,
        selectedHotelId,
        selectedHotelRooms,
        hotelBlockedRooms,
        isLoadingHotelList,
        isInitialized,
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
        getRoomAssignmentOrder,
        updateRoomAssignmentOrder,
        updateRoom,
        createHotel,
        createRoomType,
        createRoom,
        createHotelWithDetails,
    };    
}
