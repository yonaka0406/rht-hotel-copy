<template>
    <div>
        <Panel header="部屋タイプ組み合わせ">

        </Panel>
    </div>
</template>
<script setup>
    // Vue
    import { ref, computed, watch, onMounted, nextTick } from 'vue';
    import { useRouter } from 'vue-router';
    const router = useRouter();

    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { Panel } from 'primevue';

    // Stores
    import { useHotelStore } from '@/composables/useHotelStore';
    const { selectedHotel, selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel } = useHotelStore();
    import { useClientStore } from '@/composables/useClientStore';
    const { clients, fetchClients, setClientsIsLoading } = useClientStore();
    import { useReservationStore } from '@/composables/useReservationStore';
    const { availableRooms, fetchAvailableRooms, reservationId, setReservationId, fetchReservation, fetchMyHoldReservations } = useReservationStore();


    
</script>