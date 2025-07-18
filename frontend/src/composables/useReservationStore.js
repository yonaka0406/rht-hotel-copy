import { ref, watch } from 'vue';

// Define shared state outside the function
const reservationIsUpdating = ref(false);
const availableRooms = ref([]);
const availableRoomsForCopy = ref([]);
const reservedRooms = ref([]);
const holdReservations = ref([]);
const reservationId = ref(null);
const reservationDetails = ref({});
const reservedRoomsDayView = ref([]);

import { useHotelStore } from '@/composables/useHotelStore';
const { selectedHotelId } = useHotelStore();    

export function useReservationStore() {
    // Helper
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };
    const isDateBetweenRange = (roomDate, startDate, endDate) => {
        const roomDateObj = new Date(roomDate);
        return roomDateObj >= new Date(startDate) && roomDateObj <= new Date(endDate);
    };

    // Set
    const setReservationIsUpdating = (bool) => {
        reservationIsUpdating.value = bool;
    }

    // Get 
    const getReservationId = () => {
        // console.log('From Reservation Store => getReservationId:',reservationId.value);
        return reservationId.value;
    };
    const getReservationHotelId = async (reservation_id) => {            
        // console.log('From Reservation Store => getReservationHotelId');
        if (!reservationDetails.value.reservation) {
            // console.log('From Reservation Store => getReservationHotelId made fetchReservation call');
            await fetchReservation(reservation_id);
        }

        return reservationDetails.value.reservation?.[0]?.hotel_id || null;
    };
    const getAvailableDatesForChange = async (hotelId, roomId, checkIn, checkOut) => {            
        // console.log('From Reservation Store => getAvailableDatesForChange');
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
    };
    const fetchReservationClientIds = async (hotelId, reservationId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/reservation/list/clients/${hotelId}/${reservationId}`;
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
    };

    // Set
    const setReservationId = (id) => {
        // console.log('From Reservation Store => setReservationId:',reservationId.value);
        reservationId.value = id;            
    };        
    const setReservationStatus = async (status) => {            
        // console.log('From Reservation Store => setReservationStatus:',status);
        try {
            setReservationIsUpdating(true);

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

            setReservationIsUpdating(false);
        } catch (error) {
            console.error('Error updating reservation status:', error);
        }
    };
    const setReservationDetailStatus = async (detail_id, hotel_id, status) => {
        // console.log('From Reservation Store => setReservationDetailStatus:',status);
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/reservation/update/detail/status/${detail_id}`, {
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

            setReservationIsUpdating(false);
        } catch (error) {
            console.error('Error updating reservation status:', error);
        }
    };
    const setReservationType = async (type) => {            
        // console.log('From Reservation Store => setReservationType:',status);            
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            // Get the hotel_id for the current reservation
            const hotel_id = await getReservationHotelId(reservationId.value);
            
            // Assuming you have an API endpoint to update the reservation status
            const response = await fetch(`/api/reservation/update/type/${reservationId.value}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ hotel_id, type })
            });

            if (!response.ok) {
                throw new Error('Failed to update reservation type');
            }

            // Update the local reservationDetails state
            reservationDetails.value.type = type;
            setReservationIsUpdating(false);
        } catch (error) {
            console.error('Error updating reservation status:', error);
        }
    };
    const setReservationClient = async (client_id) => {
        // console.log('From Reservation Store => setReservationClient:',client_id);
        try {
            setReservationIsUpdating(true);
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

            setReservationIsUpdating(false);
            
        } catch (error) {
            console.error('Error updating reservation client:', error);
        }
    };
    const setReservationPlan = async (detail_id, hotel_id, plan, rates, price) => {            
        // console.log('From Reservation Store => setReservationPlan');
        try {
            const authToken = localStorage.getItem('authToken');
            // Assuming you have an API endpoint to update the reservation
            const response = await fetch(`/api/reservation/update/plan/${detail_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ hotel_id, plan, rates, price })
            });

            if (!response.ok) {
                throw new Error('Failed to update reservation');
            }

            return 'Updated reservation plan.';
        } catch (error) {
            console.error('Error updating reservation:', error);
        }
    };
    const setReservationAddons = async (detail_id, addons) => {
        // console.log('From Reservation Store => setReservationAddons');
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            // Assuming you have an API endpoint to update the reservation
            const response = await fetch(`/api/reservation/update/addon/${detail_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },                    
                body: JSON.stringify(addons),
            });

            if (!response.ok) {
                throw new Error('Failed to update reservation');
            }
            setReservationIsUpdating(false);
            return 'Updated reservation addons.';
        } catch (error) {
            console.error('Error updating reservation:', error);
        }
    };
    const setReservationRoom = async (detail_id, room_id) => {
        // console.log('From Reservation Store => setReservationRoom');
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            // Assuming you have an API endpoint to update the reservation
            const response = await fetch(`/api/reservation/update/room/${detail_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ room_id })
            });

            if (!response.ok) {
                throw new Error('Failed to update reservation');
            }
            setReservationIsUpdating(false);
            return 'Updated reservation plan.';
        } catch (error) {
            console.error('Error updating reservation:', error);
        }
    };
    const setCalendarChange = async (id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people, mode) => {   
        // console.log('From Reservation Store => setCalendarChange');         
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            // Get the hotel_id for the current reservation
            const hotel_id = await getReservationHotelId(id);
            
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

            setReservationIsUpdating(false);
            
        } catch (error) {
            console.error('Error updating reservation:', error);
        }
    };

    const setCalendarFreeChange = async (data) => {
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            const id = data[0].hotel_id;

            const response = await fetch(`/api/reservation/update/free/calendar`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data })
            });

            if (!response.ok) {
                throw new Error('Failed to update reservation');
            }

            setReservationIsUpdating(false);
        } catch(err){
            console.error('Error updating reservation:', err);
        }
    };
    const setReservationComment = async (reservationId, hotelId, comment) => {
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');            

            const response = await fetch(`/api/reservation/update/comment/${reservationId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ hotelId, comment })
            });

            if (!response.ok) {
                throw new Error('Failed to update reservation');
            }

            setReservationIsUpdating(false);
        } catch(err){
            console.error('Error updating reservation:', err);
        }
    };
    const setReservationTime = async (indicator, reservationId, hotelId, time) => {
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');            

            const response = await fetch(`/api/reservation/update/time/${reservationId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ hotelId, indicator, time })
            });

            if (!response.ok) {
                throw new Error('Failed to update reservation');
            }

            setReservationIsUpdating(false);
        } catch(err){
            console.error('Error updating reservation:', err);
        }
    };

    // Bulk Update
    const setRoomPlan = async (hotelId, roomId, reservationId, plan, addons, daysOfTheWeek) => {
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            // Assuming you have an API endpoint to update the reservation
            const response = await fetch(`/api/reservation/update/room/plan/${hotelId}/${roomId}/${reservationId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ plan, addons, daysOfTheWeek })
            });

            if (!response.ok) {
                throw new Error('Failed to update reservation');
            }

            setReservationIsUpdating(false);

            return 'Updated reservation plan.';
        } catch (error) {
            console.error('Error updating reservation:', error);
        }
    };
    const setRoomPattern = async (hotelId, roomId, reservationId, pattern) => {
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            // Assuming you have an API endpoint to update the reservation
            const response = await fetch(`/api/reservation/update/room/pattern/${hotelId}/${roomId}/${reservationId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pattern })
            });

            if (!response.ok) {
                throw new Error('Failed to update reservation');
            }

            setReservationIsUpdating(false);

            return 'Updated reservation plan.';
        } catch (error) {
            console.error('Error updating reservation:', error);
        }
    };
    const setRoomGuests = async (reservationId, dataToUpdate) => {
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            const url = `/api/reservation/update/guest/${reservationId}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToUpdate),
            });
    
            if (!response.ok) {
                throw new Error('Failed to update room guest number.');
            }
            setReservationIsUpdating(false);
            return await response.json();                
        } catch (error) {
            console.error('Error updating room guest number:', error);
            throw error;
        }
    };
    const changeReservationRoomGuestNumber = async (id, room, mode) => {
        // console.log('From Reservation Store => changeReservationRoomGuestNumber');
        try {
            setReservationIsUpdating(true);
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
            setReservationIsUpdating(false);
            return await response.json();                
        } catch (error) {
            console.error('Error updating room guest number:', error);
            throw error;
        }
    };  

    // Fetch
    const fetchReservation = async (reservation_id) => {
        // console.log('From Reservation Store => fetchReservation:',reservation_id);
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

            // console.log('From Reservation Store => fetchReservation data:',data);

            if (!response.ok) {
                if (response.status === 404) {
                    reservationDetails.value = {};
                }
                throw new Error('Failed to fetch reservation details');
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
    const fetchReservationDetail = async (id) => {
        // console.log('From Reservation Store => fetchReservationDetail:',id);
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/reservation/detail/info?id=${id}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },                
            });

            const data = await response.json();

            // console.log('From Reservation Store => fetchReservationDetail data:',data);

            if (!response.ok) {
                throw new Error('Failed to fetch reservation details');
            }

            // Handle if no reservation was found
            if (data.message) {
                console.error(data.message);
                return;
            }

            // Format the date fields for each reservation in the array
            if (Array.isArray(data.reservation)) {
                data.reservation.forEach((reservation) => {
                    reservation.check_in = formatDate(new Date(reservation.check_in));
                    reservation.check_out = formatDate(new Date(reservation.check_out));
                    reservation.date = formatDate(new Date(reservation.date));
                });
            }  
            
            return data;
                
        } catch (error) {
            console.error('Error fetching reservation:', error);                
            return null;
        }            
    };        
    const fetchAvailableRooms = async (hotelId, startDate, endDate) => {
        // console.log('From Reservation Store => fetchAvailableRooms');
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
        // console.log('From Reservation Store => fetchReservedRooms');
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
                // Exclude rooms that have a date between startDate and endDate
                reservedRooms.value = reservedRooms.value.filter(room => {
                    return !isDateBetweenRange(room.date, startDate, endDate); // Assuming room.date is the field to check
                });

                // Now add the new reserved rooms in the specified date range
                reservedRooms.value.push(...data.reservedRooms);                    
            } 

            return response;

        } catch (error) {
            console.error('Failed to fetch reserved rooms', error);
            reservedRooms.value = [];
        }
    };
    const fetchMyHoldReservations = async () => {
        // console.log('From Reservation Store => fetchMyHoldReservations');
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
                // If 404 or any other error, log the message and return an empty array
                if (response.status === 404) {
                    // console.log('No hold reservations found.');
                    holdReservations.value = [];  // Empty array if no reservations found
                } else {
                    const errorText = await response.text();
                    console.error(`API Error: ${response.status} ${response.statusText} ${errorText}`);
                }
                return;  // Exit the function early if there's an error
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
    const fetchReservationsToday = async (hotelId, day) => {
        // console.log('From Reservation Store => fetchReservationsToday');
        try{
            const authToken = localStorage.getItem('authToken');
            const url = `/api/reservation/today/${hotelId}/${day}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },                
            });

            if (!response.ok) {                                        
                reservedRoomsDayView.value = [];
            }

            const data = await response.json();
            reservedRoomsDayView.value = data;
            
            return data;

        } catch (error) {
            console.error("Error fetching reservations:", error);
        }
    };
    const fetchReservationPayments = async (hotelId, reservation_id) => {
        try{
            const authToken = localStorage.getItem('authToken');
            const url = `/api/reservation/payment/list/${hotelId}/${reservation_id}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },                
            });
            
            const data = await response.json();
            
            return data;

        } catch (error) {
            console.error("Error fetching reservations:", error);
        }
    };

    // Add
    const addRoomToReservation = async (data) => {
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            const url = `/api/reservation/add/room/`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });                
    
            if (!response.ok) {
                throw new Error('Failed to add room.');
            }
            setReservationIsUpdating(false);
            return await response.json();                
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    };
    const moveReservationRoom = async (data) => {
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            const url = `/api/reservation/move/room/`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });                
    
            if (!response.ok) {
                throw new Error('Failed to add room.');
            }
            setReservationIsUpdating(false);
            return await response.json();                
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    };
    const addReservationPayment = async (data) => {
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            const url = `/api/reservation/payment/add/`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });                
    
            if (!response.ok) {
                throw new Error('Failed to add room.');
            }
            setReservationIsUpdating(false);
            return await response.json();                
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    };
    const addBulkReservationPayment = async (data) => {
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            const url = `/api/reservation/payment/bulk-add/`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });                
    
            if (!response.ok) {
                throw new Error('Failed to add room.');
            }
            setReservationIsUpdating(false);
            return await response.json();                
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    };

    // Delete
    const deleteHoldReservation = async (id) => {
        // console.log('From Reservation Store => deleteHoldReservation');
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            const url = `/api/reservation/delete/hold/${id}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
    
            if (response.ok) {
                setReservationIsUpdating(false);
                return await response.json();
            } else if (response.status === 404) {
                // Not found or already deleted
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Reservation not found or already deleted');
            } else {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to delete hold reservation');
            }
        } catch (error) {
            setReservationIsUpdating(false);
            console.error('Error deleting hold reservation:', error);
            throw error;
        }
    };
    const deleteReservationRoom = async (id, room) => {
        // console.log('From Reservation Store => deleteReservationRoom');
        try {
            setReservationIsUpdating(true);
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
            setReservationIsUpdating(false);
            return await response.json();                
        } catch (error) {
            console.error('Error deleting room from reservation:', error);
            throw error;
        }
    };
    const deleteReservationPayment = async (id) => {
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            const url = `/api/reservation/payment/delete/${id}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },                
            });
    
            if (!response.ok) {
                throw new Error('Failed to delete payment from reservation.');
            }
            setReservationIsUpdating(false);
            return await response.json();                
        } catch (error) {
            console.error('Error deleting payment from reservation:', error);
            throw error;
        }
    };

    const createHoldReservationCombo = async(header, combo) => {
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            const url = `/api/reservation/add/hold-combo`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ header, combo })
            });
    
            if (!response.ok) {
                throw new Error('Failed to create hold reservation from combo.');
            }
            setReservationIsUpdating(false);
            return await response.json();                
        } catch (error) {
            console.error('Error creating hold reservation from combo:', error);
            throw error;
        }
    };

    const fetchReservationForCopy = async (reservationId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const url = `/api/reservation/info?id=${reservationId}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch reservation details');
            }

            const data = await response.json();
            if (data.reservation && data.reservation.length > 0) {
                const { hotel_id, check_in, check_out } = data.reservation[0];
                await fetchAvailableRoomsForCopy(hotel_id, check_in, check_out);
            }
        } catch (error) {
            console.error('Error fetching reservation for copy:', error);
        }
    };

    const fetchAvailableRoomsForCopy = async (hotelId, startDate, endDate) => {
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
                throw new Error('Failed to fetch available rooms');
            }

            const data = await response.json();
            availableRoomsForCopy.value = data.availableRooms || [];
        } catch (error) {
            console.error('Failed to fetch available rooms for copy:', error);
            availableRoomsForCopy.value = [];
        }
    };

    const copyReservation = async (originalReservationId, newClientId, roomMapping) => {
        try {
            setReservationIsUpdating(true);
            const authToken = localStorage.getItem('authToken');
            const url = `/api/reservation/copy`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    original_reservation_id: originalReservationId,
                    new_client_id: newClientId,
                    room_mapping: roomMapping,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to copy reservation');
            }
            setReservationIsUpdating(false);
            return await response.json();
        } catch (error) {
            setReservationIsUpdating(false);
            console.error('Error copying reservation:', error);
            throw error;
        }
    };

    // Watchers
    watch(reservedRooms, (newValue, oldValue) => {
        if (newValue !== oldValue) {
            // Log the minimum and maximum dates
            const dates = newValue.map(item => new Date(item.date));
            const validDates = dates.filter(date => !isNaN(date.getTime()));
            if (validDates.length > 0) {
                const minDate = new Date(Math.min(...validDates));
                const maxDate = new Date(Math.max(...validDates));                    
                // console.log('reservedRooms changed in Store: min', minDate.toLocaleDateString(),'max', maxDate.toLocaleDateString(), 'rows:', newValue.length);
            } else {
                // console.log('No valid dates found in reservedRooms.');
            }
        }
    }, { deep: true });
    watch(() => selectedHotelId.value, () => {
        // console.log('From Reservation Store => selectedHotelId changed', selectedHotelId.value);
        reservedRooms.value = [];
    });

    return {
        reservationIsUpdating,
        availableRooms,
        availableRoomsForCopy,
        reservedRooms,
        holdReservations,
        reservationId,
        reservationDetails,
        reservedRoomsDayView,
        getReservationId,
        getReservationHotelId,
        getAvailableDatesForChange,
        fetchReservationClientIds,
        setReservationId,
        setReservationStatus,
        setReservationDetailStatus,
        setReservationType,
        setReservationClient,
        setReservationPlan,
        setReservationAddons,
        setReservationRoom,
        setCalendarChange,
        setCalendarFreeChange,
        setReservationComment,
        setReservationTime,
        setRoomPlan,
        setRoomPattern,
        setRoomGuests,        
        changeReservationRoomGuestNumber,        
        fetchReservation,
        fetchReservationDetail,
        fetchAvailableRooms,
        fetchReservedRooms,
        fetchMyHoldReservations, 
        fetchReservationsToday,
        fetchReservationPayments,
        addRoomToReservation,
        moveReservationRoom,
        addReservationPayment,
        addBulkReservationPayment,
        deleteHoldReservation,
        deleteReservationRoom,
        deleteReservationPayment,     
        createHoldReservationCombo,
        fetchReservationForCopy,
        copyReservation,
    };
}
