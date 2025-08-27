<template>
    <!-- Top Panel -->
    <Card class="m-2">
        <template #title>予約編集</template>
        <template #content>
            <ReservationPanel 
                v-if="reservationId && reservation_details"
                :reservation_id="reservationId"
                :reservation_details="reservation_details"                    
            />
        </template>  
    </Card>
    
     <div v-if="reservationStatus !== 'block'">
        <!-- Rooms Data component-->
        <Card class="m-2">
            <template #title>部屋</template>
            <template #content>
                <ReservationRoomsView 
                    v-if="reservation_details"
                    :reservation_details="reservation_details"                    
                />
            </template>            
        </Card>

        <!-- Parking Data component-->
        <Card class="m-2">
            <template #title>駐車場</template>
            <template #content>
                <ReservationParking
                    v-if="reservation_details"
                    :reservation-details="reservation_details"
                    :parking-reservations="parking_reservations || []"                    
                />            
            </template>
        </Card>

        <!-- Payments Data component-->
        <Card class="m-2">
            <template #title>清算</template>
            <template #content>
                <ReservationPayments
                    v-if="reservation_details && reservation_payments"
                    :reservation_details="reservation_details"
                    :reservation_payments="reservation_payments"
                />            
            </template>
        </Card>
    </div>
</template>

<script setup>
    // Vue
    import { ref, watch, computed, onMounted, onUnmounted } from 'vue';

    import ReservationPanel from '@/pages/MainPage/components/ReservationPanel.vue';
    import ReservationRoomsView from '@/pages/MainPage/components/ReservationRoomsView.vue';
    import ReservationPayments from '@/pages/MainPage/components/ReservationPayments.vue';
    import ReservationParking from '@/pages/MainPage/components/ReservationParking.vue';

    const props = defineProps({
        reservation_id: {
            type: String,
            required: true,
        },
        room_id: {
            type: [String, Number],
            required: false,
            default: null,
        },
    });

    // Websocket
    import { io } from 'socket.io-client';
    const socket = ref(null);

    // Stores
    import { useReservationStore } from '@/composables/useReservationStore';
    const { reservationIsUpdating, reservationId, setReservationId, reservationDetails, fetchReservation, fetchReservationPayments } = useReservationStore();
    import { useParkingStore } from '@/composables/useParkingStore';    
    const { fetchParkingReservations } = useParkingStore();
    
    // Primevue
    import { Card } from 'primevue';
        
    const reservationStatus = ref(null);    
    const reservation_details = ref(null);
    const reservation_payments = ref(null);
    const parking_reservations = ref([]);

    /**
     * ✨ Centralized data fetching function.
     * This single function fetches all necessary data for the reservation,
     * preventing logic duplication across watchers and event handlers.
     */
    const fetchAllReservationData = async () => {
        if (!reservationId.value) return;
        if (reservationIsUpdating.value) {
            //console.log('[ReservationEdit] Skipping fetch: update in progress.');
            return;
        }

        try {
            //console.log(`[ReservationEdit] ➡️ Fetching all data for reservation ID: ${reservationId.value}`);
            await fetchReservation(reservationId.value);

            if (reservationDetails.value?.reservation?.[0]) {
                const details = reservationDetails.value.reservation[0];
                reservation_details.value = reservationDetails.value.reservation;
                reservationStatus.value = details.status;

                const pmtData = await fetchReservationPayments(details.hotel_id, details.reservation_id);
                reservation_payments.value = pmtData?.payments || [];
                
                const parkData = await fetchParkingReservations(details.hotel_id, details.reservation_id);
                parking_reservations.value = parkData || [];
            } else {
                //console.warn(`[ReservationEdit] No reservation details found for ID: ${reservationId.value}. Resetting state.`);
                // Reset state if no reservation data is found
                reservation_details.value = [];
                reservation_payments.value = [];
                parking_reservations.value = [];
                reservationStatus.value = null;
            }
        } catch (error) {
            console.error("[ReservationEdit] Failed to fetch all reservation data:", error);
        }
    };

    // Lifecycle Hooks
    onMounted(async () => {
        await setReservationId(props.reservation_id);
        await fetchAllReservationData();

        socket.value = io(import.meta.env.VITE_BACKEND_URL);

        socket.value.on('connect', () => {
            //console.log('✅ [WebSocket] Connected to server.');
        });

        //console.log('[ReservationEdit] Setting up WebSocket listener for "tableUpdate".');

        // Listen for a SPECIFIC event, not a generic one
        socket.value.on('tableUpdate', (data) => {
            // This will now trigger on ANY 'tableUpdate' event from the server.
            //console.log('📬 [WebSocket] Generic "tableUpdate" event received. Refetching all data as requested.');
            fetchAllReservationData();
        });
    });

    onUnmounted(() => {
        if (socket.value) {
            //console.log('[ReservationEdit] Disconnecting WebSocket.');
            socket.value.disconnect();
        }
    });

    // Watchers now simply call the centralized function
    watch(reservationIsUpdating, (isUpdating) => {
        if (isUpdating === false) {
            //console.log('[Watcher] reservationIsUpdating is now false. Refetching data.');
            fetchAllReservationData();
        }
    });

    watch(() => props.reservation_id, async (newId) => {
        if (newId) {
            //console.log(`[Watcher] props.reservation_id changed to ${newId}. Refetching data.`);
            await setReservationId(newId);
            await fetchAllReservationData();
        }
    });
/*
    // Helper function to fetch parking data
    const fetchParkingData = async (hotelId, reservationId) => {
        try {
            const parkingData = await fetchParkingReservations(hotelId, reservationId);
            parking_reservations.value = parkingData || [];
            //console.log('[Reservation Edit] parking_reservations', parking_reservations.value);
        } catch (error) {
            console.error('Error fetching parking reservations:', error);
            parking_reservations.value = [];
        }
    };
    
    // Fetch reservation details on mount    
    onMounted(async () => {
        
        await setReservationId(props.reservation_id);
        await fetchReservation(reservationId.value);
        if (reservationDetails.value && reservationDetails.value.reservation && reservationDetails.value.reservation[0]) {
            reservation_details.value = reservationDetails.value.reservation;
            const pmtData = await fetchReservationPayments(reservation_details.value[0].hotel_id, reservation_details.value[0].reservation_id);
            reservation_payments.value = pmtData.payments;
            reservationStatus.value = reservation_details.value[0].status;
            
            // Fetch parking data when reservation details are loaded
            if (reservation_details.value[0].hotel_id && reservation_details.value[0].reservation_id) {
                await fetchParkingData(reservation_details.value[0].hotel_id, reservation_details.value[0].reservation_id);
            }
        } else {
            reservation_details.value = [];
            reservation_payments.value = [];
            parking_reservations.value = [];
            reservationStatus.value = null;
        }

        // Establish Socket.IO connection
        socket.value = io(import.meta.env.VITE_BACKEND_URL);

        socket.value.on('connect', () => {
            // console.log('Connected to server');
        });

        socket.value.on('tableUpdate', async (data) => {
            // Prevent fetching if bulk update is in progress
            if (reservationIsUpdating.value) {
                // console.log('Skipping fetchReservation because update is still running');
                return;
            }
            // console.log('Reservation updated detected in ReservationEdit');
            // Web Socket fetchReservation                
            await fetchReservation(reservationId.value);
            if (reservationDetails.value && reservationDetails.value.reservation && reservationDetails.value.reservation[0]) {
                reservation_details.value = reservationDetails.value.reservation;
                const pmtData = await fetchReservationPayments(reservation_details.value[0].hotel_id, reservation_details.value[0].reservation_id);
                reservation_payments.value = pmtData.payments;
                
                // Update parking data when reservation is updated
                if (reservation_details.value[0].hotel_id && reservation_details.value[0].reservation_id) {
                    await fetchParkingData(reservation_details.value[0].hotel_id, reservation_details.value[0].reservation_id);
                }
            } else {
                reservation_details.value = [];
                reservation_payments.value = [];
                parking_reservations.value = [];
            }
        });

        
        //console.log('onMounted ReservationEdit reservation_id:', reservationId.value);
        //console.log('onMounted ReservationEdit reservation_details:', reservation_details.value);
    });   
    
    
    onUnmounted(() => {
        // Close the Socket.IO connection when the component is unmounted
        if (socket.value) {
            socket.value.disconnect();
        }
    });

    // Watcher
    watch(reservationIsUpdating, async (newVal, oldVal) => {
        if (newVal === true) {
            // console.log("Updating...");            
        }
        if (newVal === false) {
            // console.log("Not Updating...");
            await fetchReservation(reservationId.value);
            if (reservationDetails.value && reservationDetails.value.reservation && reservationDetails.value.reservation[0]) {
                reservation_details.value = reservationDetails.value.reservation;
                const pmtData = await fetchReservationPayments(reservation_details.value[0].hotel_id, reservation_details.value[0].reservation_id);
                reservation_payments.value = pmtData.payments;
                // Add fetchParkingData here
                await fetchParkingData(reservation_details.value[0].hotel_id, reservation_details.value[0].reservation_id);
            } else {
                reservation_details.value = [];
                reservation_payments.value = [];
                parking_reservations.value = [];
            }
        }
    });
    watch(reservationId, async (newVal, oldVal) => {
        if (oldVal && newVal !== oldVal) {
            // console.log('ReservationEdit reservationId', oldVal, 'to', newVal)            
            await fetchReservation(newVal);
            if (reservationDetails.value && reservationDetails.value.reservation && reservationDetails.value.reservation[0]) {
                reservation_details.value = reservationDetails.value.reservation;
                const pmtData = await fetchReservationPayments(reservation_details.value[0].hotel_id, reservation_details.value[0].reservation_id);
                reservation_payments.value = pmtData.payments;
                // Add fetchParkingData here too
                await fetchParkingData(reservation_details.value[0].hotel_id, reservation_details.value[0].reservation_id);
            } else {
                reservation_details.value = [];
                reservation_payments.value = [];
                parking_reservations.value = [];
            }
        }
        
    });    
*/
</script>

<style scoped>
</style>
