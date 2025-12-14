<template>
    <div class="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
        <header>
            <ReportingTopMenu :initialReportType="'dailyReport'" @report-type-change="handleReportTypeChange" />
        </header>
        <main class="flex-1 overflow-auto p-6">
            <DailyReportDownloader />
        </main>
        <footer class="bg-black dark:bg-gray-950 text-white dark:text-gray-300 p-4 text-center text-sm">
            レッドホーストラスト株式会社
        </footer>
    </div>
</template>
<script setup>
import { useRouter } from 'vue-router';
import ReportingTopMenu from '../components/ReportingTopMenu.vue';
import DailyReportDownloader from './components/DailyReportDownloader.vue';

const router = useRouter();

const handleReportTypeChange = (newReportType) => {
    if (newReportType === 'reservationAnalysis') {
        router.push('/reporting/channel-summary');
    } else if (newReportType === 'monthlySummary') {
        router.push('/reporting');
    } else if (newReportType === 'activeReservationsChange') {
        router.push('/reporting/active-reservations-change');
    } else if (newReportType === 'monthlyReservationEvolution') {
        router.push('/reporting/monthly-reservation-evolution');
    }
};
</script>
