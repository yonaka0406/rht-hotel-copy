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
        <Card class="m-2" v-if="hasParkingAddon">
            <template #title>駐車場</template>
            <template #content>
                <ParkingSection
                    v-if="reservation_details && hotelId"
                    :reservation-details="reservation_details"
                    :hotel-id="hotelId"
                    :reservation-id="reservationId"
                    @parking-updated="onParkingUpdated"
                    @parking-added="onParkingAdded"
                    @parking-removed="onParkingRemoved"
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
    import ParkingSection from '@/pages/MainPage/components/ParkingSection.vue';    

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
    
    // Toast for user feedback
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    
    // Primevue
    import { Card } from 'primevue';
        
    const hotelId = ref(null);
    const reservationStatus = ref(null);
    const reservation_details = ref(null);
    const reservation_payments = ref(null);
    const parkingError = ref(null);
    
    // Computed property to detect parking addon by global addon ID 3
    const hasParkingAddon = computed(() => {
        if (!reservation_details.value || !Array.isArray(reservation_details.value)) {
            return false;
        }
        
        // Check if any reservation detail has parking addon (global addon ID 3)
        return reservation_details.value.some(detail => {
            // This would typically check for addon_id === 3 in the reservation addons
            // For now, we'll show parking section for all non-block reservations
            return reservationStatus.value !== 'block';
        });
    });
    
    // Fetch reservation details on mount
    onMounted(async () => {
        
        await setReservationId(props.reservation_id);
        await fetchReservation(reservationId.value);
        if (reservationDetails.value && reservationDetails.value.reservation && reservationDetails.value.reservation[0]) {
            reservation_details.value = reservationDetails.value.reservation;
            hotelId.value = reservation_details.value[0].hotel_id;
            const pmtData = await fetchReservationPayments(reservation_details.value[0].hotel_id, reservation_details.value[0].reservation_id);
            reservation_payments.value = pmtData.payments;
            reservationStatus.value = reservation_details.value[0].status;
        } else {
            reservation_details.value = [];
            reservation_payments.value = [];
            reservationStatus.value = null;
            hotelId.value = null;
        }
            // console.log(reservationStatus.value)

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
                hotelId.value = reservation_details.value[0].hotel_id;
                const pmtData = await fetchReservationPayments(reservation_details.value[0].hotel_id, reservation_details.value[0].reservation_id);
                reservation_payments.value = pmtData.payments;
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
                hotelId.value = reservation_details.value[0].hotel_id;
                const pmtData = await fetchReservationPayments(reservation_details.value[0].hotel_id, reservation_details.value[0].reservation_id);
                reservation_payments.value = pmtData.payments;
            } else {
                reservation_details.value = [];
                reservation_payments.value = [];
                hotelId.value = null;
            }
        }
    });
    watch(reservationId, async (newVal, oldVal) => {
        if(oldVal && newVal !== oldVal){
            // console.log('ReservationEdit reservationId', oldVal, 'to', newVal)            
            await fetchReservation(newVal);
            if (reservationDetails.value && reservationDetails.value.reservation && reservationDetails.value.reservation[0]) {
                reservation_details.value = reservationDetails.value.reservation;
                hotelId.value = reservation_details.value[0].hotel_id;
                const pmtData = await fetchReservationPayments(reservation_details.value[0].hotel_id, reservation_details.value[0].reservation_id);
                reservation_payments.value = pmtData.payments;
            } else {
                reservation_details.value = [];
                reservation_payments.value = [];
                hotelId.value = null;
            }
        }
        
    });

    // Parking event handlers
    const onParkingAdded = (parkingData) => {
        console.log('Parking added:', parkingData);
        toast.add({
            severity: 'success',
            summary: '駐車場追加',
            detail: '駐車場予約が追加されました',
            life: 3000
        });
        
        // Refresh reservation data to reflect parking changes
        refreshReservationData();
    };

    const onParkingUpdated = (parkingData) => {
        console.log('Parking updated:', parkingData);
        toast.add({
            severity: 'success',
            summary: '駐車場更新',
            detail: '駐車場予約が更新されました',
            life: 3000
        });
        
        // Refresh reservation data to reflect parking changes
        refreshReservationData();
    };

    const onParkingRemoved = (parkingData) => {
        console.log('Parking removed:', parkingData);
        toast.add({
            severity: 'info',
            summary: '駐車場削除',
            detail: '駐車場予約が削除されました',
            life: 3000
        });
        
        // Refresh reservation data to reflect parking changes
        refreshReservationData();
    };

    // Helper function to refresh reservation data
    const refreshReservationData = async () => {
        try {
            await fetchReservation(reservationId.value);
            if (reservationDetails.value && reservationDetails.value.reservation && reservationDetails.value.reservation[0]) {
                reservation_details.value = reservationDetails.value.reservation;
                hotelId.value = reservation_details.value[0].hotel_id;
                const pmtData = await fetchReservationPayments(reservation_details.value[0].hotel_id, reservation_details.value[0].reservation_id);
                reservation_payments.value = pmtData.payments;
            }
        } catch (error) {
            console.error('Error refreshing reservation data:', error);
            parkingError.value = '予約データの更新に失敗しました';
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '予約データの更新に失敗しました',
                life: 5000
            });
        }
    };

</script>

<style scoped>
</style>
