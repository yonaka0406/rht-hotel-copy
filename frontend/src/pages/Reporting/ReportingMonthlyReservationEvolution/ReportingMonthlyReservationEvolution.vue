<template>
    <div>
        <MonthlyReservationEvolutionReport :hotel-id="selectedHotelId" :target-month="firstDayOfMonthForApi"
            :trigger-fetch="reportTriggerKey" />
    </div>
</template>
<script setup>
import { computed, watch, ref } from 'vue';
import MonthlyReservationEvolutionReport from './components/MonthlyReservationEvolutionReport.vue';

// Props from ReportingMainPage
const props = defineProps({
    selectedDate: { type: Date, required: true },
    period: { type: String, required: true },
    selectedHotels: { type: Array, required: true },
    allHotels: { type: Array, required: true },
    reportType: { type: String, required: true }
});

const reportTriggerKey = ref(Date.now());

const selectedHotelId = computed(() => {
    if (props.selectedHotels && props.selectedHotels.length > 0) {
        return props.selectedHotels[0];
    }
    return '';
});

const firstDayOfMonthForApi = computed(() => {
    if (!props.selectedDate) return null;
    const date = new Date(props.selectedDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
});

// Watch for changes to trigger fetch in child
watch([() => props.selectedHotels, () => props.selectedDate], () => {
    if (props.reportType === 'monthlyReservationEvolution') {
        reportTriggerKey.value = Date.now();
    }
}, { deep: true });
</script>
