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
                v-if="hotelId && reservationId"
                :hotel_id="hotelId"
                :reservation_id="reservationId"              
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
    const { reservationId, setReservationId, reservationDetails, fetchReservation } = useReservationStore();
    
    // Primevue
    import { Card } from 'primevue';
        
    const hotelId = ref(null);
    const reservation_details = ref(null);
    
    // Fetch reservation details on mount
    onMounted(async () => {
        await setReservationId(props.reservation_id);
        await fetchReservation(reservationId.value);
            reservation_details.value = reservationDetails.value.reservation;

        
        //console.log('onMounted ReservationEdit reservation_id:', reservationId.value);
        //console.log('onMounted ReservationEdit reservation_details:', reservation_details.value);
    });    

</script>

<style scoped>
</style>
