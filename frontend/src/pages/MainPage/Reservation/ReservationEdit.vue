<template>
    <div v-if="initialLoad" class="flex justify-center">
        <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" fill="transparent" animationDuration=".5s"
            aria-label="Loading" />
    </div>
    <div v-else>
        <!-- Top Panel -->
        <Card class="m-2">
            <template #title>予約編集 - {{ reservation_details?.[0]?.hotel_name }}</template>
            <template #content>
                <ReservationPanel v-if="reservationId && reservation_details" :reservation_id="reservationId"
                    :reservation_details="reservation_details" />
            </template>
        </Card>

        <!-- New Card for Blocked Room Details -->
                <!-- Container for Blocked Room and Parking Details -->
        <div v-if="reservationStatus === 'block'" class="flex">            
            <!-- Card for Blocked Room Details -->
            <Card v-if="blockedRoomInfo" class="m-2 w-1/2">
                <template #title>ブロックされた部屋</template>
                <template #content>
                    <div class="flex flex-col gap-3">
                        <div class="flex items-center gap-2">
                            <label class="font-bold text-surface-700 dark:text-surface-0/80">部屋数:</label>
                            <Tag :value="blockedRoomInfo.count" severity="info" rounded></Tag>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <label class="font-bold text-surface-700 dark:text-surface-0/80">部屋番号:</label>
                            <Tag v-for="roomNumber in blockedRoomInfo.roomNumbers.split(', ')" :key="roomNumber" :value="roomNumber" severity="secondary" rounded></Tag>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Card for Blocked Parking Details -->
            <Card v-if="blockedRoomInfo && parking_reservations && parking_reservations.parking && parking_reservations.parking.length > 0" class="m-2 w-1/2">
                <template #title>ブロックされた駐車場</template>
                <template #content>
                    <div class="flex flex-col gap-3">
                        <div class="flex items-center gap-2">
                            <label class="font-bold text-surface-700 dark:text-surface-0/80">駐車台数:</label>
                            <Tag :value="parking_reservations.parking.length" severity="info" rounded></Tag>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <label class="font-bold text-surface-700 dark:text-surface-0/80">駐車スペース:</label>
                            <Tag v-for="parkingSpot in sortedParkingSpots" :key="parkingSpot.id" :value="parkingSpot.spot_number" severity="secondary" rounded></Tag>
                        </div>
                    </div>
                </template>
            </Card>
        </div>

        <div v-if="reservationStatus !== 'block'">
            <!-- Rooms Data component-->
            <Card class="m-2">
                <template #title>部屋</template>
                <template #content>
                    <ReservationRoomsView v-if="reservation_details" :reservation_details="reservation_details" />
                </template>
            </Card>

            <!-- Parking Data component-->
            <Card class="m-2">
                <template #title>駐車場</template>
                <template #content>
                    <ReservationParking v-if="reservation_details" :reservation-details="reservation_details"
                        :parking-reservations="parking_reservations || []" />
                </template>
            </Card>

            <!-- Payments Data component-->
            <Card class="m-2">
                <template #title>清算</template>
                <template #content>
                    <ReservationPayments v-if="reservation_details && reservation_payments"
                        :reservation_details="reservation_details" :reservation_payments="reservation_payments" />
                </template>
            </Card>
        </div>
    </div>
</template>

<script setup>
// Vue
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';

import ReservationPanel from '@/pages/MainPage/Reservation/components/ReservationPanel.vue';
import ReservationRoomsView from '@/pages/MainPage/Reservation/components/ReservationRoomsView.vue';
import ReservationPayments from '@/pages/MainPage/Reservation/components/ReservationPayments.vue';
import ReservationParking from '@/pages/MainPage/Reservation/components/ReservationParking.vue';

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
const { reservationIsUpdating, reservationId, setReservationId, reservationDetails, fetchReservation, fetchReservationPayments, getReservationHotelId } = useReservationStore();
import { useParkingStore } from '@/composables/useParkingStore';
const { fetchParkingReservations } = useParkingStore();
import { useHotelStore } from '@/composables/useHotelStore';
const { selectedHotelId, setHotelId } = useHotelStore();

// Primevue
import { Card } from 'primevue';
import { ProgressSpinner } from 'primevue';
import { Tag } from 'primevue';

const reservationStatus = ref(null);
const reservation_details = ref(null);
const reservation_payments = ref(null);
const parking_reservations = ref([]);
const initialLoad = ref(false);

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
        const hotelIdFromReservation = await getReservationHotelId(reservationId.value);
        if (hotelIdFromReservation) {
            setHotelId(hotelIdFromReservation);
        }
        await fetchReservation(reservationId.value, selectedHotelId.value);

        if (reservationDetails.value?.reservation?.[0]) {
            const details = reservationDetails.value.reservation[0];
            reservation_details.value = reservationDetails.value.reservation;
            reservationStatus.value = details.status;

            const pmtData = await fetchReservationPayments(details.hotel_id, details.reservation_id);
            reservation_payments.value = pmtData?.payments || [];

            const parkData = await fetchParkingReservations(details.hotel_id, details.reservation_id);
            parking_reservations.value = parkData || [];
            //console.log('[ReservationEdit] Fetched parking_reservations:', parking_reservations.value); // Debug log
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

// Computed property for blocked room information
const blockedRoomInfo = computed(() => {
    //console.log('[blockedRoomInfo] Evaluating...');
    //console.log('[blockedRoomInfo] reservationStatus.value:', reservationStatus.value);
    //console.log('[blockedRoomInfo] reservation_details.value:', reservation_details.value);

    if (reservationStatus.value === 'block' && reservation_details.value && reservation_details.value.length > 0) {
        // Collect all unique room_ids and room_numbers from the reservation_details array
        const uniqueRoomDetails = {};
        reservation_details.value.forEach(detail => {
            if (detail.room_id && detail.room_number) {
                uniqueRoomDetails[detail.room_id] = detail.room_number;
            }
        });

        const roomIds = Object.keys(uniqueRoomDetails);
        const roomNumbers = Object.values(uniqueRoomDetails);

        //console.log('[blockedRoomInfo] Collected roomIds:', roomIds);
        //console.log('[blockedRoomInfo] Collected roomNumbers:', roomNumbers);

        if (roomIds.length > 0) {
            //console.log('[blockedRoomInfo] Returning blocked room info.');
            return {
                count: roomIds.length,
                roomNumbers: roomNumbers.join(', ')
            };
        } else {
            //console.log('[blockedRoomInfo] No room IDs found in reservation_details.');
        }
    } else {
        //console.log('[blockedRoomInfo] Conditions not met for displaying blocked room info.');
    }
    return null;
});

// Computed property for sorted parking spots
const sortedParkingSpots = computed(() => {
    if (parking_reservations.value && parking_reservations.value.parking) {
        return [...parking_reservations.value.parking].sort((a, b) => {
            return parseInt(a.spot_number) - parseInt(b.spot_number);
        });
    }
    return [];
});

// Lifecycle Hooks
onMounted(async () => {
    initialLoad.value = true;
    await setReservationId(props.reservation_id);
    await fetchAllReservationData();
    initialLoad.value = false;
    
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

</script>

<style scoped></style>
