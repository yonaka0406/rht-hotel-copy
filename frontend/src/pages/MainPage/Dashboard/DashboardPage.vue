<template>
    <Panel class="bg-white dark:bg-gray-900 dark:text-gray-100 rounded-xl shadow-lg dark:shadow-xl">
        <template #header>
            <DashboardHeader v-model:selectedDate="selectedDate" @open-dialog="openHelpDialog" />
        </template>

        <!-- Charts Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-2">
            <OccupancyBarChart :xAxisData="barChartxAxis" :maxValue="barChartyAxisMax" :roomCountData="barChartyAxisBar"
                :occRateData="barChartyAxisLine" :maleCountData="barChartyAxisMale"
                :femaleCountData="barChartyAxisFemale" :unspecifiedCountData="barChartyAxisUnspecified" />
            <OccupancyGaugeChart :gaugeData="gaugeData" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-2 mt-2">
            <PlanStackChart :xAxisData="barStackChartData.xAxis" :seriesData="barStackChartData.series"
                :chartKey="chartKey" />
            <AddonChart :xAxisData="barAddonChartData.xAxis" :seriesData="barAddonChartData.series"
                :chartKey="chartKey" />
        </div>

        <!-- Reservation List -->
        <div>
            <ReservationListTable :reservationList="reservationList" :loading="tableLoading"
                @row-dblclick="openEditReservation" />
        </div>

        <!-- Reservation Edit Drawer -->
        <Drawer v-model:visible="drawerVisible" :modal="true" :position="'bottom'" :style="{ height: '75vh' }"
            @hide="handleDrawerClose" :closable="true" class="dark:bg-gray-800">
            <div class="flex justify-end" v-if="hasReservation">
                <Button @click="goToReservation" severity="info">
                    <i class="pi pi-arrow-right"></i><span>編集ページへ</span>
                </Button>
            </div>
            <ReservationEdit v-if="hasReservation" :reservation_id="selectedReservationID" />
        </Drawer>

        <!-- Dashboard Dialog -->
        <DashboardDialog :visible="helpDialogVisible" @update:visible="helpDialogVisible = $event"
            :dashboardSelectedDate="selectedDate" :reportDisplayStartDate="reportStartDate"
            :checkInOutReportData="checkInOutReportData" :hotelName="selectedHotel?.name"
            :mealReportData="mealReportData" />
    </Panel>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';

// Components
import ReservationEdit from '../Reservation/ReservationEdit.vue';
import DashboardDialog from './components/DashboardDialog.vue';
import DashboardHeader from './components/DashboardHeader.vue';
import ReservationListTable from './components/ReservationListTable.vue';
import OccupancyBarChart from './charts/OccupancyBarChart.vue';
import OccupancyGaugeChart from './charts/OccupancyGaugeChart.vue';
import PlanStackChart from './charts/PlanStackChart.vue';
import AddonChart from './charts/AddonChart.vue';

// PrimeVue
import { Panel, Drawer, Button } from 'primevue';

// Composables
import { useReportStore } from '@/composables/useReportStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { useDashboardCharts } from './composables/useDashboardCharts';

const router = useRouter();

// Store
const { reservationList, fetchReservationListView, fetchCheckInOutReport } = useReportStore();
const { selectedHotelId, fetchHotels, fetchHotel, selectedHotel } = useHotelStore();

// Chart composable
const {
    barChartxAxis,
    barChartyAxisMax,
    barChartyAxisBar,
    barChartyAxisLine,
    barChartyAxisMale,
    barChartyAxisFemale,
    barChartyAxisUnspecified,
    barStackChartData,
    barAddonChartData,
    gaugeData,
    mealReportData,
    chartKey,
    fetchBarChartData,
    fetchBarStackChartData,
    fetchGaugeChartData,
    formatDate
} = useDashboardCharts();

// State
const selectedDate = ref(new Date());
const tableLoading = ref(true);
const drawerVisible = ref(false);
const selectedReservationID = ref(null);
const hasReservation = ref(false);
const helpDialogVisible = ref(false);
const checkInOutReportData = ref(null);
const reportStartDate = ref(formatDate(new Date(new Date().setDate(new Date().getDate() - 1))));
const reportEndDate = ref(formatDate(new Date(new Date().setDate(new Date().getDate() + 6))));

// Computed
const startDate = computed(() => {
    const date = new Date(selectedDate.value);
    date.setDate(date.getDate() - 1);
    return formatDate(date);
});

const endDate = computed(() => {
    const date = new Date(selectedDate.value);
    date.setDate(date.getDate() + 6);
    return formatDate(date);
});

// Methods
const openHelpDialog = () => {
    helpDialogVisible.value = true;
};

const openEditReservation = (event) => {
    selectedReservationID.value = event.data.id;
    hasReservation.value = true;
    drawerVisible.value = true;
};

const handleDrawerClose = async () => {
    await fetchReservationListView(selectedHotelId.value, startDate.value, endDate.value);
};

const goToReservation = () => {
    router.push({ name: 'ReservationEdit', params: { reservation_id: selectedReservationID.value } });
};

const loadDashboardData = async () => {
    tableLoading.value = true;

    await fetchHotels();
    await fetchHotel();
    await fetchReservationListView(selectedHotelId.value, startDate.value, endDate.value);

    tableLoading.value = false;

    // Fetch chart data
    await fetchBarChartData(selectedHotelId.value, selectedDate.value);
    await fetchBarStackChartData(selectedHotelId.value, startDate.value, endDate.value, selectedDate.value);
    await fetchGaugeChartData(selectedHotelId.value, startDate.value);

    // Fetch check-in/out report data
    const tempReportStartDate = new Date(selectedDate.value);
    tempReportStartDate.setDate(tempReportStartDate.getDate() - 1);
    reportStartDate.value = formatDate(tempReportStartDate);

    const tempReportEndDate = new Date(tempReportStartDate);
    tempReportEndDate.setDate(tempReportEndDate.getDate() + 7);
    reportEndDate.value = formatDate(tempReportEndDate);

    checkInOutReportData.value = await fetchCheckInOutReport(
        selectedHotelId.value,
        reportStartDate.value,
        reportEndDate.value
    );
};

// Lifecycle
onMounted(async () => {
    await fetchHotels();
    await fetchHotel();
});

watch(
    () => [selectedDate.value, selectedHotelId.value],
    async () => {
        await loadDashboardData();
    },
    { immediate: true }
);
</script>

<style scoped></style>