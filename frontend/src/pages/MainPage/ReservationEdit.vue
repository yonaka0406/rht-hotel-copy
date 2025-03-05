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

    <!-- Payments Data component-->
    <Card class="m-2">
        <template #title>清算</template>
        <template #content>
            <ReservationPayments
                v-if="reservation_details"
                :reservation_details="reservation_details"              
            />
        </template>
    </Card>
</template>

<script setup>
    // Vue
    import { ref, watch, computed, onMounted, onUnmounted } from 'vue';

    import ReservationPanel from '@/pages/MainPage/components/ReservationPanel.vue';
    import ReservationRoomsView from '@/pages/MainPage/components/ReservationRoomsView.vue';
    import ReservationPayments from '@/pages/MainPage/components/ReservationPayments.vue';    

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
    const { reservationIsUpdating, reservationId, setReservationId, reservationDetails, fetchReservation } = useReservationStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { selectedHotelRooms, setHotelId, fetchHotel } = useHotelStore();
    
    // Primevue
    import { Card } from 'primevue';
        
    const hotelId = ref(null);
    const reservation_details = ref(null);
    
    // Fetch reservation details on mount
    onMounted(async () => {
        
        await setReservationId(props.reservation_id);
        await fetchReservation(reservationId.value);
            reservation_details.value = reservationDetails.value.reservation;        

        // Establish Socket.IO connection
        socket.value = io(import.meta.env.VITE_BACKEND_URL);

        socket.value.on('connect', () => {
            console.log('Connected to server');
        });

        socket.value.on('tableUpdate', async (data) => {
            // Prevent fetching if bulk update is in progress
            if (reservationIsUpdating.value) {
                console.log('Skipping fetchReservation because update is still running');
                return;
            }
            console.log('Reservation updated detected in ReservationEdit');
            // Web Socket fetchReservation                
            await fetchReservation(reservationId.value);
                reservation_details.value = reservationDetails.value.reservation;
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
            console.log("Updating...");
            //await fetchReservation(reservationId.value);
                //reservation_details.value = reservationDetails.value.reservation;
        }
        if (newVal === false) {
            console.log("Not Updating...");
            await fetchReservation(reservationId.value);
                reservation_details.value = reservationDetails.value.reservation;
        }
    });

</script>

<style scoped>
</style>
