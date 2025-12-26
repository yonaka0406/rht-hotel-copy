<template>
    <div>
        <div class="flex justify-end mb-2">
            <SelectButton v-model="selectedView" :options="viewOptions" optionLabel="label" optionValue="value" />
        </div>

        <div v-if="selectedView === 'graph'">
            <Panel header="月次サマリー" class="mb-4">
                <template #default>
                    <div v-if="!hasRevenueDataForChart" class="text-center p-4">
                        データはありません。
                    </div>
                    <div v-else class="flex flex-col md:flex-row md:gap-4 p-4">
                        <!-- Column 1: Revenue Chart (Tall) -->
                        <div class="w-full md:w-1/2">
                            <RevenuePlanVsActualChart :revenueData="singleHotelRevenueChartDataSource[0]"
                                height="500px" />
                        </div>

                        <!-- Column 2: Gauge + KPIs + DoD -->
                        <div class="w-full md:w-1/2 flex flex-col gap-4">
                            <!-- Gauge + DoD -->
                            <div class="flex flex-col items-center">
                                <OccupancyGaugeChart :occupancyData="gaugeChartData" height="250px"
                                    :previousYearOccupancy="currentHotelPrevYearOccupancy" />


                            </div>

                            <!-- KPIs (ADR/RevPAR) -->
                            <div class="grid grid-cols-2 gap-4">
                                <Card class="shadow-sm bg-gray-50">
                                    <template #content>
                                        <div class="flex flex-col items-center text-center">
                                            <h6 class="text-sm font-medium text-gray-500 mb-2">実績 ADR</h6>
                                            <span class="text-2xl font-bold text-gray-800">{{
                                                formatCurrency(actualADR) }}</span>
                                            <span class="text-xs text-gray-400 mt-1">(計画: {{
                                                formatCurrency(forecastADR) }})</span>
                                        </div>
                                    </template>
                                </Card>
                                <Card class="shadow-sm bg-gray-50">
                                    <template #content>
                                        <div class="flex flex-col items-center text-center">
                                            <h6 class="text-sm font-medium text-gray-500 mb-2">実績 RevPAR</h6>
                                            <span class="text-2xl font-bold text-gray-800">{{
                                                formatCurrency(actualRevPAR) }}</span>
                                            <span class="text-xs text-gray-400 mt-1">(計画: {{
                                                formatCurrency(forecastRevPAR) }})</span>
                                        </div>
                                    </template>
                                </Card>
                            </div>
                        </div>
                    </div>
                    <Message severity="secondary" :closable="false" class="mt-2 p-2 text-sm">
                        会計データがない場合はPMSの数値になっています。期間： {{ periodMaxDate }}。
                    </Message>
                </template>
            </Panel>

            <FutureOutlookTable :data="futureOutlookData" :asOfDate="asOfDate" />

        </div>

        <div v-if="selectedView === 'table'">
            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">主要KPI（{{ currentHotelName }}）</span>
                </template>
                <template #content>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                        <div class="p-4 bg-gray-50 rounded-lg shadow">
                            <h6 class="text-sm font-medium text-gray-500">実績 ADR</h6>
                            <p class="text-2xl font-bold text-gray-800">{{ formatCurrency(actualADR) }}</p>
                        </div>
                        <div class="p-4 bg-gray-50 rounded-lg shadow">
                            <h6 class="text-sm font-medium text-gray-500">計画 ADR</h6>
                            <p class="text-2xl font-bold text-gray-800">{{ formatCurrency(forecastADR) }}</p>
                        </div>
                        <div class="p-4 bg-gray-50 rounded-lg shadow">
                            <h6 class="text-sm font-medium text-gray-500">実績 RevPAR</h6>
                            <p class="text-2xl font-bold text-gray-800">{{ formatCurrency(actualRevPAR) }}</p>
                        </div>
                        <div class="p-4 bg-gray-50 rounded-lg shadow">
                            <h6 class="text-sm font-medium text-gray-500">計画 RevPAR</h6>
                            <p class="text-2xl font-bold text-gray-800">{{ formatCurrency(forecastRevPAR) }}</p>
                        </div>
                    </div>
                </template>
                <template #footer>
                    <div class="flex justify-content-between">
                        <small>会計データがない場合はPMSの数値になっています。期間： {{ periodMaxDate }}。</small>
                    </div>
                </template>
            </Card>

            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">収益（計画ｘ実績）- {{ currentHotelName }}</span>
                </template>
                <template #content>
                    <div v-if="!props.revenueData || props.revenueData.length === 0" class="text-center p-4">
                        データはありません。
                    </div>
                    <div v-else class="text-center p-4">
                        <DataTable :value="props.revenueData" responsiveLayout="scroll" paginator :rows="5"
                            :rowsPerPageOptions="[5, 15, 30, 50]" stripedRows sortMode="multiple" removableSort>
                            <Column field="hotel_name" header="施設" frozen sortable style="width: 20%"></Column>
                            <Column field="month" header="月度" sortable style="width: 10%"></Column>
                            <Column field="forecast_revenue" header="計画" sortable style="width: 20%">
                                <template #body="{ data }">
                                    <div class="flex justify-end mr-2">
                                        {{ formatCurrency(data.forecast_revenue) }}
                                    </div>
                                </template>
                            </Column>
                            <Column field="accommodation_revenue" header="実績①" sortable style="width: 20%">
                                <template #body="{ data }">
                                    <div class="flex justify-end mr-2">
                                        {{ formatCurrency(data.accommodation_revenue) }}
                                    </div>
                                </template>
                            </Column>
                            <Column header="分散" sortable style="width: 30%">
                                <template #body="{ data }">
                                    <div class="flex justify-end mr-2">
                                        {{ formatCurrency(data.accommodation_revenue - data.forecast_revenue) }}
                                        <Badge class="ml-2"
                                            :severity="getSeverity((data.accommodation_revenue / data.forecast_revenue) - 1)"
                                            size="small">
                                            {{ formatPercentage((data.accommodation_revenue / data.forecast_revenue) -
                                                1) }}
                                        </Badge>
                                    </div>
                                </template>
                            </Column>
                            <template #footer>
                                <div class="flex justify-content-between">
                                    <small>① 会計データがない場合はPMSの数値になっています。</small>
                                </div>
                            </template>
                            <template #paginatorstart>
                            </template>
                            <template #paginatorend>
                                <Button type="button" icon="pi pi-download" text @click="exportCSV('revenue')" />
                            </template>
                        </DataTable>
                    </div>
                </template>
            </Card>

            <Card>
                <template #header>
                    <span class="text-xl font-bold">稼働状況（計画ｘ実績）- {{ currentHotelName }}</span>
                </template>
                <template #content>
                    <OccupancyPlanVsActualTable :occupancyData="props.occupancyData"
                        :rawOccupationBreakdownData="props.rawOccupationBreakdownData" :showHotelColumn="false"
                        :showNonAccommodationColumn="false" :showDetailedCsvButton="true" :rows="5"
                        :rowsPerPageOptions="[5, 15, 30, 50]" />
                </template>
            </Card>
        </div>
    </div>
</template>
<script setup>
// Vue
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

// Props
const props = defineProps({
    revenueData: {
        type: Array,
        required: true
    },
    occupancyData: {
        type: Array,
        required: true
    },
    rawOccupationBreakdownData: { // Renamed from occupationBreakdownData
        type: Array,
        default: () => []
    },
    dayOverDayChange: {
        type: Object,
        default: () => ({ rooms: 0, occ: 0, sales: 0 })
    },
    prevYearRevenueData: {
        type: Array,
        default: () => []
    },
    prevYearOccupancyData: {
        type: Array,
        default: () => []
    },
    futureOutlookData: {
        type: Array,
        default: () => []
    },
    asOfDate: {
        type: String,
        default: null
    }
});

// Components
import RevenuePlanVsActualChart from './charts/RevenuePlanVsActualChart.vue';
import OccupancyGaugeChart from './charts/OccupancyGaugeChart.vue';
import FutureOutlookTable from './tables/FutureOutlookTable.vue'; // Added Import

// Primevue
import { Card, Badge, SelectButton, Button, DataTable, Column, Panel, Message } from 'primevue'; // Added Panel, Message
import OccupancyPlanVsActualTable from './tables/OccupancyPlanVsActualTable.vue';

// Utilities
import {
    formatCurrencyForReporting as formatCurrency,
    formatPercentage,
    formatYenInTenThousands,
} from '@/utils/formatUtils';
import { getSeverity as getSeverityUtil } from '@/utils/reportingUtils';

// View selection
const selectedView = ref('graph'); // Default view
const viewOptions = ref([
    { label: 'グラフ', value: 'graph' },
    { label: 'テーブル', value: 'table' }
]);

// --- Current Hotel Data ---
const currentHotelRevenueEntry = computed(() => {
    return props.revenueData?.[0] || {};
});

const currentHotelName = computed(() => {
    //console.log('currentHotelRevenueEntry', currentHotelRevenueEntry.value);
    return currentHotelRevenueEntry.value?.hotel_name || '選択ホテル';
});

const periodMaxDate = computed(() => {
    if (!props.revenueData || props.revenueData.length === 0) return 'N/A';
    const maxDate = new Date(Math.max(...props.revenueData.map(item => new Date(item.month))));
    return maxDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' });
});

// --- KPI Calculations (ADR, RevPAR) for the Current Hotel ---
const currentHotelAggregateData = computed(() => {
    // Sums up values from props.revenueData and props.occupancyData.
    // This is useful if parent sends multiple month data for the single selected hotel.
    // For a single month view, it will correctly use the single entry.

    let total_forecast_revenue = 0;
    let total_period_accommodation_revenue = 0;
    props.revenueData?.forEach((item, index) => {
        total_forecast_revenue += (item.forecast_revenue || 0);
        total_period_accommodation_revenue += (item.accommodation_revenue || 0);
    });

    let total_prev_year_accommodation_revenue = 0;
    props.prevYearRevenueData?.forEach((item, index) => {
        total_prev_year_accommodation_revenue += (item.accommodation_revenue || 0);
    });


    let total_fc_sold_rooms = 0;
    let total_sold_rooms = 0;
    let total_fc_available_rooms = 0;
    let total_available_rooms = 0;
    props.occupancyData?.forEach((item, index) => {
        total_fc_sold_rooms += (item.fc_sold_rooms || 0);
        total_sold_rooms += (item.sold_rooms || 0);
        total_fc_available_rooms += (item.fc_total_rooms || 0); // fc_total_rooms is total available rooms for forecast
        total_available_rooms += (item.total_rooms || 0);    // total_rooms is total available rooms for actual
    });



    return {
        total_forecast_revenue,
        total_period_accommodation_revenue,
        total_prev_year_accommodation_revenue,
        total_fc_sold_rooms,
        total_sold_rooms,
        total_fc_available_rooms,
        total_available_rooms,
    };
    let total_prev_year_sold_rooms = 0;
    props.prevYearOccupancyData?.forEach((item, index) => {
        total_prev_year_sold_rooms += (item.sold_rooms || 0);
    });

    return {
        total_forecast_revenue,
        total_period_accommodation_revenue,
        total_prev_year_accommodation_revenue,
        total_fc_sold_rooms,
        total_sold_rooms,
        total_prev_year_sold_rooms,
        total_fc_available_rooms,
        total_available_rooms,
    };
});

watch(currentHotelAggregateData, (newValue) => {
    console.log('ReportingSingleMonthHotel: Sum of all fields by month:', newValue);
}, { immediate: true });

const currentHotelPrevYearOccupancy = computed(() => {
    if (!props.prevYearOccupancyData || props.prevYearOccupancyData.length === 0) return null;
    // Assuming single hotel view, we look for the entry matching the current hotel or just the first entry if filtered
    // But prevYearOccupancyData contains all hotels usually. We need to match by ID if possible, or name.
    // Wait, props.revenueData[0] is the current hotel.
    const currentHotelId = props.revenueData[0]?.hotel_id;
    if (!currentHotelId) return null;

    const entry = props.prevYearOccupancyData.find(item => item.hotel_id === currentHotelId);
    if (!entry || !entry.total_rooms) return null;
    return entry.sold_rooms / entry.total_rooms;
});

const actualADR = computed(() => {
    const { total_period_accommodation_revenue, total_sold_rooms } = currentHotelAggregateData.value;
    if (total_sold_rooms === 0 || total_sold_rooms === null || total_sold_rooms === undefined) return NaN;
    return Math.round(total_period_accommodation_revenue / total_sold_rooms);
});

const forecastADR = computed(() => {
    const { total_forecast_revenue, total_fc_sold_rooms } = currentHotelAggregateData.value;
    if (total_fc_sold_rooms === 0 || total_fc_sold_rooms === null || total_fc_sold_rooms === undefined) return NaN;
    return Math.round(total_forecast_revenue / total_fc_sold_rooms);
});

const actualRevPAR = computed(() => {
    const { total_period_accommodation_revenue, total_available_rooms } = currentHotelAggregateData.value;
    if (total_available_rooms === 0 || total_available_rooms === null || total_available_rooms === undefined) return NaN;
    return Math.round(total_period_accommodation_revenue / total_available_rooms);
});

const forecastRevPAR = computed(() => {
    const { total_forecast_revenue, total_fc_available_rooms } = currentHotelAggregateData.value;
    if (total_fc_available_rooms === 0 || total_fc_available_rooms === null || total_fc_available_rooms === undefined) return NaN;
    return Math.round(total_forecast_revenue / total_fc_available_rooms);
});




// Adapted data for OccupancyGaugeChart which expects 'total_sold_rooms' etc.
const gaugeChartData = computed(() => {
    // If no data, return empty object to prevent errors, defaults in chart will handle it
    if (!props.occupancyData || props.occupancyData.length === 0) return {};
    const raw = props.occupancyData[0] || {};
    return {
        total_sold_rooms: raw.sold_rooms,
        total_available_rooms: raw.total_rooms,
        total_fc_sold_rooms: raw.fc_sold_rooms,
        total_fc_available_rooms: raw.fc_total_rooms
    };
});

// ECharts imports    
const resizeChartHandler = () => {
    if (selectedView.value === 'graph') {
        // Nothing to resize here, as charts are now components
    }
};

// --- Chart Refs and Instances ---    
// --- Data Computeds for Charts ---
// Provides the data for the main revenue chart (now for the single hotel)
const singleHotelRevenueChartDataSource = computed(() => {
    // currentHotelAggregateData sums up all entries in props.revenueData
    // The chart expects an array of data points, here it's a single point for the period total.
    if (!currentHotelAggregateData.value) return [];
    return [currentHotelAggregateData.value]; // Wrap in array
});

const hasRevenueDataForChart = computed(() => {
    return singleHotelRevenueChartDataSource.value.length > 0 &&
        (singleHotelRevenueChartDataSource.value[0].total_forecast_revenue !== undefined ||
            singleHotelRevenueChartDataSource.value[0].total_period_accommodation_revenue !== undefined);
});

// Table
const getSeverity = (value) => getSeverityUtil(value);
const exportCSV = (tableType) => {
    let csvString = '';
    let filename = 'data.csv';
    const hotelNameForFile = currentHotelName.value.replace(/\s+/g, '_') || 'selected_hotel'; // Sanitize name for filename
    const periodForFile = periodMaxDate.value.replace(/[^0-9]/g, ''); // Get YYYYMM from period

    if (tableType === 'revenue' && props.revenueData && props.revenueData.length > 0) {
        filename = `${hotelNameForFile}_収益データ_${periodForFile}.csv`;
        const headers = ["施設", "月度", "計画売上 (円)", "実績売上 (円)", "分散額 (円)", "分散率 (%)"];
        const csvRows = [headers.join(',')];
        // props.revenueData here should already be filtered for the single hotel by the parent.
        // If it contains multiple months for that hotel, they will be exported.
        props.revenueData.forEach(row => {
            const forecastRevenue = row.forecast_revenue || 0;
            const accommodationRevenue = row.accommodation_revenue || 0;
            const varianceAmount = accommodationRevenue - forecastRevenue;
            let variancePercentage = 0;
            if (forecastRevenue !== 0) variancePercentage = ((accommodationRevenue / forecastRevenue) - 1) * 100;
            else if (accommodationRevenue !== 0) variancePercentage = Infinity; // Or "N/A" or specific handling

            const csvRow = [
                `"${row.hotel_name || ''}"`,
                `"${row.month || ''}"`,
                forecastRevenue,
                accommodationRevenue,
                varianceAmount,
                (forecastRevenue === 0 && accommodationRevenue !== 0) ? "N/A" : variancePercentage.toFixed(2)
            ];
            csvRows.push(csvRow.join(','));
        });
        csvString = csvRows.join('\n');

    } else if (tableType === 'occupancy' && props.occupancyData && props.occupancyData.length > 0) {
        filename = `${hotelNameForFile}_稼働率データ_${periodForFile}.csv`;
        const headers = [
            "施設", "月度",
            "計画販売室数", "実績販売室数", "販売室数差異",
            "計画稼働率 (%)", "実績稼働率 (%)", "稼働率差異 (p.p.)",
            "計画総室数", "実績総室数"
        ];
        const csvRows = [headers.join(',')];
        props.occupancyData.forEach(row => {
            const fcSold = row.fc_sold_rooms || 0;
            const sold = row.sold_rooms || 0;
            const fcOcc = row.fc_occ || 0;
            const occ = row.occ || 0;

            const csvRow = [
                `"${row.hotel_name || ''}"`,
                `"${row.month || ''}"`,
                fcSold,
                sold,
                sold - fcSold,
                fcOcc.toFixed(2),
                occ.toFixed(2),
                (occ - fcOcc).toFixed(2),
                row.fc_total_rooms || 0,
                row.total_rooms || 0
            ];
            csvRows.push(csvRow.join(','));
        });
        csvString = csvRows.join('\n');
    } else {
        console.log(`RSMHotel: No data to export for ${tableType} or invalid table type.`); // Updated console log prefix
        return;
    }

    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

onMounted(async () => {
    // console.log('RSMHotel: onMounted', props.revenueData, props.occupancyData); // Updated console log prefix
    window.addEventListener('resize', resizeChartHandler);
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeChartHandler);
});

// Watch for changes in computed chart options    
watch(selectedView, async (newView) => {
    if (newView === 'graph') {
        await nextTick();
    }
});

</script>