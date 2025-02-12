    import { ref, watch } from 'vue';

    // Define shared state outside the function
    const availableRooms = ref([]);
    const reservedRooms = ref([]);
    const holdReservations = ref([]);
    const reservationId = ref(null);
    const reservationDetails = ref({});

    export function useReservationStore() {
        // Helper
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };

        // Set
        const setReservationId = (id) => {
            console.log('From Reservation Store => setReservationId:',reservationId.value);
            reservationId.value = id;            
        };
        
        const setReservationStatus = async (status) => {            
            console.log('From Reservation Store => setReservationStatus:',status);
            try {
                const authToken = localStorage.getItem('authToken');
                // Get the hotel_id for the current reservation
                const hotel_id = await getReservationHotelId(reservationId.value);

                // Assuming you have an API endpoint to update the reservation status
                const response = await fetch(`/api/reservation/update/status/${reservationId.value}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ hotel_id, status })
                });

                if (!response.ok) {
                    throw new Error('Failed to update reservation status');
                }

                // Update the local reservationDetails state
                reservationDetails.value.status = status;
            } catch (error) {
                console.error('Error updating reservation status:', error);
            }
        };

        const setReservationClient = async (client_id) => {
            console.log('From Reservation Store => setReservationClient:',client_id);
            try {
              const authToken = localStorage.getItem('authToken');
              // Get the hotel_id for the current reservation
              const hotel_id = await getReservationHotelId(reservationId.value);
              const response = await fetch(`/api/reservation/update/client/${reservationId.value}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ client_id, hotel_id })
              });
        
              if (!response.ok) {
                throw new Error('Failed to update reservation client');
              }
        
              const updatedReservation = await response.json();
              await fetchReservation(reservationId.value);
              
            } catch (error) {
              console.error('Error updating reservation client:', error);
            }
          };

        const setCalendarChange = async (id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people, mode) => {   
            console.log('From Reservation Store => setCalendarChange');         
            try {
                const authToken = localStorage.getItem('authToken');
                // Get the hotel_id for the current reservation
                const hotel_id = await getReservationHotelId(id);

                // Assuming you have an API endpoint to update the reservation status
                const response = await fetch(`/api/reservation/update/calendar/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ hotel_id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people, mode })
                });

                if (!response.ok) {
                    throw new Error('Failed to update reservation');
                }
                
            } catch (error) {
                console.error('Error updating reservation:', error);
            }
        };

        const changeReservationRoomGuestNumber = async (id, room, mode) => {
            console.log('From Reservation Store => changeReservationRoomGuestNumber');
            try {
                const authToken = localStorage.getItem('authToken');
                const url = `/api/reservation/update/room/guestnumber/${id}`;
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(room),
                });
        
                if (!response.ok) {
                    throw new Error('Failed to update room guest number.');
                }
        
                return await response.json();                
            } catch (error) {
                console.error('Error updating room guest number:', error);
                throw error;
            }
        };

        // Get reservationId from the store
        const getReservationId = () => {
            console.log('From Reservation Store => getReservationId:',reservationId.value);
            return reservationId.value;
        };

        const getReservationHotelId = async (reservation_id) => {            
            console.log('From Reservation Store => getReservationHotelId');
            if (!reservationDetails.value.reservation) {
                console.log('From Reservation Store => getReservationHotelId made fetchReservation call');
                await fetchReservation(reservation_id);
            }

            return reservationDetails.value.reservation?.[0]?.hotel_id || null;
        };

        const getAvailableDatesForChange = async (hotelId, roomId, checkIn, checkOut) => {            
            console.log('From Reservation Store => getAvailableDatesForChange');
            try {
                const authToken = localStorage.getItem('authToken');
                const url = `/api/reservation/query/${hotelId}/${roomId}/${checkIn}/${checkOut}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },                
                });
    
                const data = await response.json();

                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }

                return data;
                    
            } catch (error) {
                console.error('Error fetching data:', error);                
                return null;
            }
        }
    
        // Fetch 
        
        const fetchReservation = async (reservation_id) => {
            console.log('From Reservation Store => fetchReservation:',reservation_id);
            reservationId.value = reservation_id;            
            try {
                const authToken = localStorage.getItem('authToken');
                const url = `/api/reservation/info?id=${reservation_id}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },                
                });
    
                const data = await response.json();

                console.log('From Reservation Store => fetchReservation data:',data);

                if (!response.ok) {
                    throw new Error('Failed to fetch reservation details');
                }

                // Handle if no reservation was found
                if (data.message) {
                    console.error(data.message); // Log message for debugging
                    reservationDetails.value = {}; // Reset reservationDetails
                    return; // Exit the function early since no reservation was found
                }

                // Format the date fields for each reservation in the array
                if (Array.isArray(data.reservation)) {
                    data.reservation.forEach((reservation) => {
                        reservation.check_in = formatDate(new Date(reservation.check_in));
                        reservation.check_out = formatDate(new Date(reservation.check_out));
                        reservation.date = formatDate(new Date(reservation.date));
                    });
                }
                
                reservationDetails.value = data;                
                    
            } catch (error) {
                console.error('Error fetching reservation:', error);
                reservationDetails.value = {};
                return null;
            }
        };
        
        const fetchAvailableRooms = async (hotelId, startDate, endDate) => {
            console.log('From Reservation Store => fetchAvailableRooms');
            try {
                const authToken = localStorage.getItem('authToken');            
                const url = `/api/reservation/available-rooms?hotel_id=${hotelId}&start_date=${startDate}&end_date=${endDate}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },                
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("fetchAvailableRooms API Error:", response.status, response.statusText, errorText);
                    throw new Error(`API returned an error: ${response.status} ${response.statusText} ${errorText}`);
                }

                const data = await response.json();

                if (data && data.availableRooms && Array.isArray(data.availableRooms)) {
                    availableRooms.value = data.availableRooms;
                } else if (data && data.message === 'No available rooms for the specified period.') {
                    availableRooms.value = []; // Correctly handle the "no rooms" message
                } else if (data && Object.keys(data).length === 0) {
                    availableRooms.value = [];
                }
                else {
                    console.error("Invalid API response format:", data);
                    availableRooms.value = [];
                }
                return response;

            } catch (error) {
                console.error('Failed to fetch available rooms', error);
                availableRooms.value = [];
            }
        };

        const fetchReservedRooms = async (hotelId, startDate, endDate) => {
            console.log('From Reservation Store => fetchReservedRooms');
            try {
                const authToken = localStorage.getItem('authToken');            
                const url = `/api/reservation/reserved-rooms?hotel_id=${hotelId}&start_date=${startDate}&end_date=${endDate}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },                
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("fetchReservedRooms API Error:", response.status, response.statusText, errorText);
                    throw new Error(`API returned an error: ${response.status} ${response.statusText} ${errorText}`);
                }

                const data = await response.json();

                if (data && data.reservedRooms && Array.isArray(data.reservedRooms)) {
                    reservedRooms.value = data.reservedRooms;
                } else if (data && data.message === 'No reserved rooms for the specified period.') {
                    reservedRooms.value = []; // Correctly handle the "no rooms" message
                } else if (data && Object.keys(data).length === 0) {
                    reservedRooms.value = [];
                }
                else {
                    console.error("Invalid API response format:", data);
                    reservedRooms.value = [];
                }
                return response;

            } catch (error) {
                console.error('Failed to fetch reserved rooms', error);
                reservedRooms.value = [];
            }
        };

        const fetchMyHoldReservations = async () => {
            console.log('From Reservation Store => fetchMyHoldReservations');
            try{
                const authToken = localStorage.getItem('authToken');
                const url = `/api/reservation/hold-list`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },                
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    //console.error("fetchMyHoldReservations API Error:", response.status, response.statusText, errorText);
                    //throw new Error(`API returned an error: ${response.status} ${response.statusText} ${errorText}`);
                    holdReservations.value = [];
                }

                const data = await response.json();
                if (data.reservations) {
                    // Group by unique combinations of the fields
                    const groupedReservations = {};

                    data.reservations.forEach(reservation => {
                        const key = `${reservation.hotel_name}-${reservation.reservation_id}-${reservation.client_name}-${reservation.check_in}-${reservation.check_out}-${reservation.number_of_people}`;
                        
                        if (!groupedReservations[key]) {
                            // Store the first occurrence of each unique combination
                            groupedReservations[key] = {
                                hotel_id: reservation.hotel_id,
                                hotel_name: reservation.name,
                                reservation_id: reservation.reservation_id,
                                client_name: reservation.client_name,
                                check_in: formatDate(new Date(reservation.check_in)),
                                check_out: formatDate(new Date(reservation.check_out)),
                                number_of_people: reservation.number_of_people,
                            };
                        }
                    });

                    // Convert groupedReservations object to an array
                    holdReservations.value = Object.values(groupedReservations);
                }

                return data;

            } catch (error) {
                console.error("Error fetching hold reservations:", error);
            }
        };

        // Delete

        const deleteHoldReservation = async (id) => {
            console.log('From Reservation Store => deleteHoldReservation');
            try {
                const authToken = localStorage.getItem('authToken');
                const url = `/api/reservation/delete/hold/${id}`;
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                });
        
                if (!response.ok) {
                    throw new Error('Failed to delete hold reservation');
                }
        
                return await response.json();                
            } catch (error) {
                console.error('Error deleting hold reservation:', error);
                throw error;
            }
        };

        const deleteReservationRoom = async (id, room) => {
            console.log('From Reservation Store => deleteReservationRoom');
            try {
                const authToken = localStorage.getItem('authToken');
                const url = `/api/reservation/delete/room/${id}`;
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(room),
                });
        
                if (!response.ok) {
                    throw new Error('Failed to delete room from reservation.');
                }
        
                return await response.json();                
            } catch (error) {
                console.error('Error deleting room from reservation:', error);
                throw error;
            }
        };

        // Watcher

        watch(availableRooms, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                // console.log('availableRooms changed in Store:', newValue);
            }
        }, { deep: true });

        watch(reservationDetails, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                console.log('reservationDetails changed in Store from ',oldValue,'to', newValue);
            }
        }, { deep: true });


    return {
        availableRooms,
        reservedRooms,
        holdReservations,
        reservationId,
        reservationDetails,
        setReservationId,
        setReservationStatus,
        setReservationClient,
        setCalendarChange,
        changeReservationRoomGuestNumber,
        getReservationId,
        getReservationHotelId,
        getAvailableDatesForChange,
        fetchReservation,
        fetchAvailableRooms,
        fetchReservedRooms,
        fetchMyHoldReservations, 
        deleteHoldReservation,
        deleteReservationRoom,     
    };
}
