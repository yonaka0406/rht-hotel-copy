<template>
    <div class="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
        <header>
            <ReportingTopMenu :selectedDate="selectedDate" :period="period" :selectedHotels="selectedHotels"
                :initialReportType="selectedReportType" @date-change="handleDateChange"
                @period-change="handlePeriodChange" @hotel-change="handleHotelChange"
                @report-type-change="handleReportTypeChange" />
        </header>

        <main class="flex-1 overflow-auto p-6">
            <!-- Router view for child routes, passing shared filter state -->
            <router-view v-slot="{ Component }">
                <component :is="Component" :selectedDate="selectedDate" :period="period"
                    :selectedHotels="selectedHotels" :allHotels="allHotels" :reportType="selectedReportType" />
            </router-view>
        </main>

        <footer class="bg-black dark:bg-gray-950 text-white dark:text-gray-300 p-4 text-center text-sm">
            レッドホーストラスト株式会社
        </footer>
    </div>
</template>

<script setup>
// Vue
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

import ReportingTopMenu from './components/ReportingTopMenu.vue';

// Router
const router = useRouter();
const route = useRoute();

// State for common filters
const selectedDate = ref(new Date());
const period = ref('month');
const selectedHotels = ref([]);
const allHotels = ref([]);

// State for report type
const selectedReportType = ref('monthlySummary');

// Helper to sync selectedReportType with current route
const syncReportType = () => {
    if (route.path.includes('channel-summary')) selectedReportType.value = 'reservationAnalysis';
    else if (route.path.includes('daily')) selectedReportType.value = 'dailyReport';
    else if (route.path.includes('active-reservations-change')) selectedReportType.value = 'activeReservationsChange';
    else if (route.path.includes('monthly-reservation-evolution')) selectedReportType.value = 'monthlyReservationEvolution';
    else if (route.path.includes('sales-occ') || route.path === '/reporting') selectedReportType.value = 'monthlySummary';
};

const handleDateChange = (newDate) => {
    selectedDate.value = newDate;
};
const handlePeriodChange = (newPeriod) => {
    period.value = newPeriod;
};
const handleHotelChange = (newSelectedHotelIds, hotelsFromMenu) => {
    selectedHotels.value = newSelectedHotelIds;
    allHotels.value = hotelsFromMenu;
};

const handleReportTypeChange = (newReportType) => {
    selectedReportType.value = newReportType;

    // Route based on selected report type
    if (newReportType === 'reservationAnalysis') {
        router.push({ name: 'ReportingChannelSummary' });
    } else if (newReportType === 'dailyReport') {
        router.push({ name: 'ReportingDailyReport' });
    } else if (newReportType === 'activeReservationsChange') {
        router.push({ name: 'ReportingActiveReservationsChange' });
    } else if (newReportType === 'monthlyReservationEvolution') {
        router.push({ name: 'ReportingMonthlyReservationEvolution' });
    } else if (newReportType === 'monthlySummary') {
        router.push({ name: 'ReportingSalesAndOCC' });
    }
};

// Watch for route changes to sync the menu
watch(() => route.path, syncReportType, { immediate: true });

</script>