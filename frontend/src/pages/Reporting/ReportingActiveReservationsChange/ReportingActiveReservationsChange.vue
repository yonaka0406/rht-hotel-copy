<template>
    <div class="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
        <header>
            <ReportingTopMenu :initialReportType="'activeReservationsChange'" :selectedHotels="selectedHotels"
                @hotel-change="handleHotelChange" @report-type-change="handleReportTypeChange" />
        </header>
        <main class="flex-1 overflow-auto p-6">
            <ChangeInActiveReservationsReport :hotel-id="selectedHotelId" :trigger-fetch="reportTriggerKey" />
        </main>
        <footer class="bg-black dark:bg-gray-950 text-white dark:text-gray-300 p-4 text-center text-sm">
            レッドホーストラスト株式会社
        </footer>
    </div>
</template>
<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import ReportingTopMenu from '../components/ReportingTopMenu.vue';
import ChangeInActiveReservationsReport from './components/ChangeInActiveReservationsReport.vue';

const router = useRouter();
const selectedHotels = ref([0]);
const reportTriggerKey = ref(Date.now());

const selectedHotelId = computed(() => {
    if (selectedHotels.value && selectedHotels.value.length > 0) {
        return selectedHotels.value[0];
    }
    return 0;
});

const handleHotelChange = (newSelectedHotelIds) => {
    selectedHotels.value = newSelectedHotelIds;
    reportTriggerKey.value = Date.now();
};

const handleReportTypeChange = (newReportType) => {
    if (newReportType === 'reservationAnalysis') {
        router.push('/reporting/channel-summary');
    } else if (newReportType === 'monthlySummary') {
        router.push('/reporting');
    } else if (newReportType === 'dailyReport') {
        router.push('/reporting/daily');
    } else if (newReportType === 'monthlyReservationEvolution') {
        router.push('/reporting/monthly-reservation-evolution');
    }
};
</script>
