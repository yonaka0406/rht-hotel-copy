<template>
    <div>
        <ChangeInActiveReservationsReport :hotel-id="selectedHotelId" :trigger-fetch="reportTriggerKey" />
    </div>
</template>
<script setup>
import { computed, watch, ref } from 'vue';
import ChangeInActiveReservationsReport from './components/ChangeInActiveReservationsReport.vue';

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
    return 0;
});

// Watch for changes to trigger fetch in child
watch(() => props.selectedHotels, () => {
    if (props.reportType === 'activeReservationsChange') {
        reportTriggerKey.value = Date.now();
    }
}, { deep: true });
</script>
