<template>
    <Panel toggleable>
        <template #header>
            <h2 class="text-xl font-bold text-gray-800 dark:text-gray-200">一般指標</h2>
        </template>
        <!-- Grid layout for stat cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <ActiveUsersCard />
            <HotelCountCard />
            <ReservationsTodayCard :hotels="hotels" :todayDateString="todayDateString" />
            <AverageLeadTimeCard :hotels="hotels" :todayDateString="todayDateString" />
            <WaitlistCountCard :hotels="hotels" :todayDateString="todayDateString" />
        </div>
    </Panel>

    <Panel toggleable class="mt-4">
        <template #header>
            <div class="flex items-center gap-2">
                <h2 class="text-xl font-bold text-gray-800 dark:text-gray-200">二重予約管理</h2>                
                <Badge :value="doubleBookingRef?.doubleBookings?.length || 0" severity="danger"></Badge>
            </div>
        </template>
        <AdminDoubleBooking ref="doubleBookingRef" />
    </Panel>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useHotelStore } from '@/composables/useHotelStore';
const { hotels, fetchHotels } = useHotelStore();

import ActiveUsersCard from './Cards/ActiveUsersCard.vue';
import HotelCountCard from './Cards/HotelCountCard.vue';
import ReservationsTodayCard from './Cards/ReservationsTodayCard.vue';
import AverageLeadTimeCard from './Cards/AverageLeadTimeCard.vue';
import WaitlistCountCard from './Cards/WaitlistCountCard.vue';
import Panel from 'primevue/panel';
import Badge from 'primevue/badge';
import AdminDoubleBooking from './AdminDoubleBooking.vue';

const doubleBookingRef = ref(null);

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const todayDateString = `${year}-${month}-${day}`;

onMounted(async () => {
    await fetchHotels();
});

onUnmounted(() => {
    // No dashboard-specific intervals to clear here anymore
});
</script>

<style scoped>
/* Any specific styles for the dashboard can go here */
</style>
