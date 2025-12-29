<template>
    <div>
        <DailyReportDownloader />
    </div>
</template>
<script setup>
import DailyReportDownloader from './components/DailyReportDownloader.vue';

// Accept props from ReportingMainPage for consistency
const props = defineProps({
    selectedDate: { type: Date, required: true },
    period: { type: String, required: true },
    selectedHotels: { type: Array, required: true },
    allHotels: { type: Array, required: true },
    reportType: { type: String, required: true }
});
</script>
