<template>
    <div class="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
        <header>
            <ReportingTopMenu :initialReportType="'monthlyReservationEvolution'" :selectedDate="selectedDate"
                :selectedHotels="selectedHotels" @date-change="handleDateChange" @hotel-change="handleHotelChange"
                @report-type-change="handleReportTypeChange" />
        </header>
        <main class="flex-1 overflow-auto p-6">
            <MonthlyReservationEvolutionReport :hotel-id="selectedHotelId" :target-month="firstDayOfMonthForApi"
                :trigger-fetch="reportTriggerKey" />
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
import MonthlyReservationEvolutionReport from './components/MonthlyReservationEvolutionReport.vue';

const router = useRouter();
const selectedDate = ref(new Date());
const selectedHotels = ref([]);
const reportTriggerKey = ref(Date.now());

const selectedHotelId = computed(() => {
    if (selectedHotels.value && selectedHotels.value.length > 0) {
        return selectedHotels.value[0];
    }
    return '';
});

const firstDayOfMonthForApi = computed(() => {
    if (!selectedDate.value) return null;
    const date = new Date(selectedDate.value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
});

const handleDateChange = (newDate) => {
    selectedDate.value = newDate;
    reportTriggerKey.value = Date.now();
};

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
    } else if (newReportType === 'activeReservationsChange') {
        router.push('/reporting/active-reservations-change');
    }
};
</script>
