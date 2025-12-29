<template>
    <div>
        <div v-if="loading" class="flex justify-content-center align-items-center h-full">
            <ProgressSpinner />
        </div>

        <!-- Single Month Views -->
        <ChannelSummarySingleMonthAllHotels v-else-if="period === 'month' && selectedHotels.length > 1"
            :selected-hotels="selectedHotels" :trigger-fetch="reportTriggerKey" :selected-date="selectedDate"
            :reservation-data="reservationListData" :booker-type-data="bookerTypeData" />
        <ChannelSummarySingleMonthHotel v-else-if="period === 'month' && selectedHotels.length === 1"
            :hotel-id="selectedHotelIdForReport" :trigger-fetch="reportTriggerKey" :selected-date="selectedDate"
            :reservation-data="reservationListData" :booker-type-data="bookerTypeData" />

        <!-- Year Cumulative Views -->
        <ChannelSummaryYearCumulativeAllHotels v-else-if="period === 'year' && selectedHotels.length > 1"
            :selected-hotels="selectedHotels" :trigger-fetch="reportTriggerKey" :selected-date="selectedDate"
            :reservation-data="reservationListData" :booker-type-data="bookerTypeData" />
        <ChannelSummaryYearCumulativeHotel v-else-if="period === 'year' && selectedHotels.length === 1"
            :hotel-id="selectedHotelIdForReport" :trigger-fetch="reportTriggerKey" :selected-date="selectedDate"
            :reservation-data="reservationListData" :booker-type-data="bookerTypeData" />

        <!-- No Selection State -->
        <div v-else class="text-center p-8">
            <div class="text-gray-500 dark:text-gray-400">
                <h3 class="text-lg font-medium mb-2">チャネルサマリーレポート</h3>
                <p>期間とホテルを選択してレポートを表示してください。</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, toRefs } from 'vue';

// Components
import ChannelSummarySingleMonthAllHotels from './components/ChannelSummarySingleMonthAllHotels.vue';
import ChannelSummarySingleMonthHotel from './components/ChannelSummarySingleMonthHotel.vue';
import ChannelSummaryYearCumulativeAllHotels from './components/ChannelSummaryYearCumulativeAllHotels.vue';
import ChannelSummaryYearCumulativeHotel from './components/ChannelSummaryYearCumulativeHotel.vue';

// PrimeVue
import { ProgressSpinner } from 'primevue';

// Stores
import { useReportStore } from '@/composables/useReportStore';

// Props
const props = defineProps({
    selectedDate: { type: Date, required: true },
    period: { type: String, required: true },
    selectedHotels: { type: Array, required: true },
    allHotels: { type: Array, required: true },
    reportType: { type: String, required: true }
});

const { selectedDate, period, selectedHotels } = toRefs(props);

// State
const loading = ref(false);
const reportTriggerKey = ref(Date.now());
const reservationListData = ref([]);
const bookerTypeData = ref({});

// Store functions
const { fetchBatchReservationListView, fetchBatchBookerTypeBreakdown } = useReportStore();

// Helper functions
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Computed properties
const selectedHotelIdForReport = computed(() => {
    if (selectedHotels.value && selectedHotels.value.length === 1) {
        return selectedHotels.value[0];
    }
    return 'all';
});

const firstDayOfFetch = computed(() => {
    if (!selectedDate.value) {
        return null;
    }
    if (period.value === 'year') {
        const date = new Date(selectedDate.value);
        date.setMonth(0);
        date.setDate(1);
        return date;
    } else {
        const date = new Date(selectedDate.value);
        date.setDate(1);
        return date;
    }
});

const lastDayOfFetch = computed(() => {
    if (!selectedDate.value) {
        return null;
    }
    const date = new Date(selectedDate.value);
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    return date;
});

// Data fetching
const fetchReservationData = async () => {
    if (!firstDayOfFetch.value || !lastDayOfFetch.value || selectedHotels.value.length === 0) {
        reservationListData.value = [];
        bookerTypeData.value = {};
        return;
    }

    loading.value = true;

    try {
        const startDate = formatDate(firstDayOfFetch.value);
        const endDate = formatDate(lastDayOfFetch.value);

        const [batchReservationData, batchBookerTypeData] = await Promise.all([
            fetchBatchReservationListView(
                selectedHotels.value,
                startDate,
                endDate,
                'stay_period'
            ),
            fetchBatchBookerTypeBreakdown(
                selectedHotels.value,
                startDate,
                endDate
            )
        ]);

        // Process the batch data into a flat array
        if (Array.isArray(batchReservationData)) {
            reservationListData.value = batchReservationData;
        } else {
            // If it's an object with hotel IDs as keys
            let allReservations = [];
            for (const hotelId in batchReservationData) {
                const hotelReservations = batchReservationData[hotelId];
                if (Array.isArray(hotelReservations)) {
                    allReservations = allReservations.concat(hotelReservations);
                }
            }
            reservationListData.value = allReservations;
        }

        // Process booker type data
        bookerTypeData.value = batchBookerTypeData || {};

    } catch (error) {
        console.error('Error fetching data for channel summary:', error);
        reservationListData.value = [];
        bookerTypeData.value = {};
    } finally {
        loading.value = false;
    }
};

// Debounced fetch
let fetchTimeout = null;
const debouncedFetch = () => {
    if (fetchTimeout) clearTimeout(fetchTimeout);
    fetchTimeout = setTimeout(() => {
        reportTriggerKey.value = Date.now();
    }, 300);
};

// Watch for trigger changes from child components
watch(reportTriggerKey, () => {
    fetchReservationData();
});

// React to prop changes
watch([selectedDate, period, selectedHotels], () => {
    if (props.reportType === 'reservationAnalysis') {
        debouncedFetch();
    }
});

onMounted(() => {
    // Initial fetch - trigger the watcher by updating reportTriggerKey
    if (props.reportType === 'reservationAnalysis') {
        reportTriggerKey.value = Date.now();
    }
});
</script>