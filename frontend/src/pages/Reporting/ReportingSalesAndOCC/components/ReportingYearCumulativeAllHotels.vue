<template>
    <div>
        <div class="flex justify-end mb-2">
            <SelectButton v-model="selectedComparison" :options="comparisonOptions" optionLabel="label"
                optionValue="value" />
            <SelectButton v-model="selectedView" :options="viewOptions" optionLabel="label" optionValue="value"
                class="ml-2" />
        </div>

        <div v-if="selectedView === 'graph'">
            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">主要KPI（全施設合計）</span>
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
                        <small>会計データがない場合はPMSの数値になっています。期間： {{ periodMinDate }}～{{ periodMaxDate }}。選択中の施設： {{
                            allHotelNames }}</small>
                    </div>
                </template>
            </Card>

            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">収益（計画ｘ実績）</span>
                </template>
                <template #content>
                    <div v-if="!hasRevenueDataForChart" class="text-center p-4">
                        データはありません。
                    </div>
                    <div v-else class="flex flex-col md:flex-row md:gap-4 p-4">
                        <div class="w-full md:w-3/4 mb-4 md:mb-0">
                            <MonthlyRevenuePlanVsActualChart :revenueData="filteredRevenueForChart"
                                :prevYearRevenueData="filteredPrevYearRevenueForChart"
                                :comparisonType="selectedComparison" height="450px" />
                        </div>
                        <div class="w-full md:w-1/4">
                            <RevenuePlanVsActualChart :revenueData="aggregateRevenueDataForChart" height="450px" />
                        </div>
                    </div>
                </template>
                <template #footer>
                    <div class="flex justify-content-between">
                        <small>会計データがない場合はPMSの数値になっています。選択中の施設： {{ allHotelNames }}</small>
                    </div>
                </template>
            </Card>

            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">稼働率（計画ｘ実績）- 全施設合計</span>
                </template>
                <template #content>
                    <div v-if="!filteredOccupancyForChart || filteredOccupancyForChart.length === 0"
                        class="text-center p-4">
                        データはありません。
                    </div>
                    <div v-else class="flex flex-col md:flex-row md:gap-4 p-4">
                        <div class="w-full md:w-3/4 mb-4 md:mb-0">
                            <MonthlyOccupancyChart :occupancyData="filteredOccupancyForChart"
                                :prevYearOccupancyData="filteredPrevYearOccupancyForChart"
                                :comparisonType="selectedComparison" title="全施設合計" height="450px" />
                        </div>
                        <div class="w-full md:w-1/4">
                            <OccupancyGaugeChart :occupancyData="aggregatedAllHotelsOccupancy" height="450px" />
                        </div>
                    </div>
                </template>
            </Card>

            <Card>
                <template #header>
                    <span class="text-xl font-bold">全施設 収益＆稼働率 概要（{{ selectedComparison === 'forecast' ? '計画' : '前年' }}
                        vs 実績）</span>
                </template>
                <template #content>
                    <div class="flex flex-col md:flex-row md:gap-4 p-4">
                        <div class="w-full md:w-1/2 mb-4 md:mb-0">
                            <HotelSalesComparisonChart :revenueData="props.revenueData"
                                :prevYearRevenueData="props.prevYearRevenueData" :comparisonType="selectedComparison" />
                        </div>
                        <div class="w-full md:w-1/2">
                            <h6 class="text-center">施設別 稼働率（{{ selectedComparison === 'forecast' ? '計画' : '前年' }} vs 実績）
                            </h6>
                            <AllHotelsOccupancyChart :occupancyData="props.occupancyData"
                                :prevYearOccupancyData="props.prevYearOccupancyData"
                                :comparisonType="selectedComparison" />
                        </div>
                    </div>
                </template>
                <template #footer>
                    <div class="flex justify-content-between">
                        <small>会計データがない場合はPMSの数値になっています。期間： {{ periodMinDate }}～{{ periodMaxDate }}</small>
                    </div>
                </template>
            </Card>
        </div>

        <div v-if="selectedView === 'table'">
            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">主要KPI（全施設合計）</span>
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
                        <small>会計データがない場合はPMSの数値になっています。期間： {{ periodMinDate }}～{{ periodMaxDate }}。選択中の施設： {{
                            allHotelNames }}</small>
                    </div>
                </template>
            </Card>

            <RevenuePlanVsActualTable :revenueData="props.revenueData" />

            <Card>
                <template #header>
                    <span class="text-xl font-bold">稼働状況（計画ｘ実績）</span>
                </template>
                <template #content>
                    <OccupancyPlanVsActualTable :occupancyData="props.occupancyData"
                        :rawOccupationBreakdownData="props.rawOccupationBreakdownData" :showHotelColumn="true"
                        :showNonAccommodationColumn="true" :rows="5" :rowsPerPageOptions="[5, 15, 30, 50]"
                        :showDetailedCsvButton="true" />
                </template>
            </Card>
        </div>
    </div>
</template>
<script setup>
// Vue
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef, nextTick } from 'vue';

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
    rawOccupationBreakdownData: {
        type: Array,
        default: () => []
    },
    prevYearRevenueData: {
        type: Array,
        default: () => []
    },
    prevYearOccupancyData: {
        type: Array,
        default: () => []
    }
});

// Primevue
import { Card, Badge, SelectButton, Button, DataTable, Column } from 'primevue';
import OccupancyPlanVsActualTable from './tables/OccupancyPlanVsActualTable.vue';
import RevenuePlanVsActualTable from './tables/RevenuePlanVsActualTable.vue';
import HotelSalesComparisonChart from './charts/HotelSalesComparisonChart.vue';
import RevenuePlanVsActualChart from './charts/RevenuePlanVsActualChart.vue';
import MonthlyRevenuePlanVsActualChart from './charts/MonthlyRevenuePlanVsActualChart.vue';
import AllHotelsOccupancyChart from './charts/AllHotelsOccupancyChart.vue';
import MonthlyOccupancyChart from './charts/MonthlyOccupancyChart.vue';
import OccupancyGaugeChart from './charts/OccupancyGaugeChart.vue';

// Utilities
import {
    formatCurrencyForReporting as formatCurrency,
    formatPercentage,
    formatYenInTenThousands,
    formatYenInTenThousandsNoDecimal
} from '@/utils/formatUtils';
import { getSeverity as getSeverityUtil, colorScheme, calculateVariancePercentage } from '@/utils/reportingUtils';

// View selection
const selectedView = ref('graph'); // Default view
const viewOptions = ref([
    { label: 'グラフ', value: 'graph' },
    { label: 'テーブル', value: 'table' }
]);

// Comparison selection
const selectedComparison = ref('forecast'); // Default comparison
const comparisonOptions = ref([
    { label: '計画', value: 'forecast' },
    { label: '前年', value: 'yoy' }
]);

// Computed property to get all unique hotel names from revenueData    
const allHotelNames = computed(() => {
    if (!props.revenueData || props.revenueData.length === 0) {
        return 'N/A';
    }
    const names = props.revenueData
        .map(item => item.hotel_name)
        .filter(name => name && name !== '施設合計'); // Exclude null/undefined and "施設合計"

    const uniqueNames = [...new Set(names)];
    return uniqueNames.join(', ');
});
const periodMinDate = computed(() => {
    if (!props.revenueData || props.revenueData.length === 0) return 'N/A';
    const minDate = new Date(Math.min(...props.revenueData.map(item => new Date(item.month))));
    return minDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' });
});
const periodMaxDate = computed(() => {
    if (!props.revenueData || props.revenueData.length === 0) return 'N/A';
    const maxDate = new Date(Math.max(...props.revenueData.map(item => new Date(item.month))));
    return maxDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' });
});

// --- KPI Calculations (ADR, RevPAR) ---
const aggregatedAllHotelsRevenue = computed(() => {
    //console.log('aggregatedAllHotelsRevenue before', props.revenueData);
    const revenueEntry = props.revenueData?.filter(item => item.hotel_id === 0);
    //console.log('aggregatedAllHotelsRevenue after', revenueEntry);
    if (!revenueEntry) return { total_forecast_revenue: 0, total_period_revenue: 0 };

    return revenueEntry.reduce((acc, item) => {
        acc.total_forecast_revenue += (item.forecast_revenue || 0);
        acc.total_period_revenue += (item.period_revenue || 0);
        return acc;
    }, { total_forecast_revenue: 0, total_period_revenue: 0 });
});

const aggregatedAllHotelsOccupancy = computed(() => {
    const occupancyEntry = props.occupancyData?.filter(item => item.hotel_id === 0);
    if (!occupancyEntry) return {
        total_sold_rooms: 0, total_fc_sold_rooms: 0,
        total_available_rooms: 0, total_fc_available_rooms: 0
    };
    return occupancyEntry.reduce((acc, item) => {
        acc.total_sold_rooms += (item.sold_rooms || 0);
        acc.total_fc_sold_rooms += (item.fc_sold_rooms || 0);
        acc.total_available_rooms += (item.total_rooms || 0);
        acc.total_fc_available_rooms += (item.fc_total_rooms || 0);
        return acc;
    }, {
        total_sold_rooms: 0, total_fc_sold_rooms: 0,
        total_available_rooms: 0, total_fc_available_rooms: 0
    });
});

const actualADR = computed(() => {
    const revenue = aggregatedAllHotelsRevenue.value.total_period_revenue;
    const soldRooms = aggregatedAllHotelsOccupancy.value.total_sold_rooms;
    return soldRooms ? Math.round(revenue / soldRooms) : NaN;
});
const forecastADR = computed(() => {
    const revenue = aggregatedAllHotelsRevenue.value.total_forecast_revenue;
    const soldRooms = aggregatedAllHotelsOccupancy.value.total_fc_sold_rooms;
    return soldRooms ? Math.round(revenue / soldRooms) : NaN;
});
const actualRevPAR = computed(() => {
    const revenue = aggregatedAllHotelsRevenue.value.total_period_revenue;
    const availableRooms = aggregatedAllHotelsOccupancy.value.total_available_rooms;
    return availableRooms ? Math.round(revenue / availableRooms) : NaN;
});
const forecastRevPAR = computed(() => {
    const revenue = aggregatedAllHotelsRevenue.value.total_forecast_revenue;
    const availableRooms = aggregatedAllHotelsOccupancy.value.total_fc_available_rooms;
    return availableRooms ? Math.round(revenue / availableRooms) : NaN;
});

// --- Data Computeds for Charts ---

// --- Data Computeds for Charts ---
const filteredRevenueForChart = computed(() => {
    if (!props.revenueData) return [];
    return props.revenueData.filter(item => item.hotel_id === 0);
});
const hasRevenueDataForChart = computed(() => {
    return filteredRevenueForChart.value.length > 0;
});

const filteredPrevYearRevenueForChart = computed(() => {
    if (!props.prevYearRevenueData) return [];
    return props.prevYearRevenueData.filter(item => item.hotel_id === 0);
});

const filteredOccupancyForChart = computed(() => {
    if (!props.occupancyData) return [];
    return props.occupancyData.filter(item => item.hotel_id === 0);
});

const filteredPrevYearOccupancyForChart = computed(() => {
    if (!props.prevYearOccupancyData) return [];
    return props.prevYearOccupancyData.filter(item => item.hotel_id === 0);
});

// Aggregate revenue data for the RevenuePlanVsActualChart
const aggregateRevenueDataForChart = computed(() => {
    const data = filteredRevenueForChart.value;
    if (!data.length) return { total_forecast_revenue: 0, total_period_accommodation_revenue: 0, total_prev_year_accommodation_revenue: 0 };

    // Calculate previous year revenue from filteredPrevYearRevenueForChart
    const prevYearRevenue = filteredPrevYearRevenueForChart.value.reduce((sum, item) => {
        return sum + (item.accommodation_revenue || item.period_revenue || 0);
    }, 0);

    return {
        total_forecast_revenue: data.reduce((sum, item) => sum + (item.forecast_revenue || 0), 0),
        total_period_accommodation_revenue: data.reduce((sum, item) => sum + (item.period_revenue || 0), 0),
        total_prev_year_accommodation_revenue: prevYearRevenue
    };
});

// All hotels occupancy chart data
const allHotelsOccupancyChartData = computed(() => {
    if (!props.occupancyData || props.occupancyData.length === 0) return [];
    const hotelMap = new Map();
    props.occupancyData.forEach(item => {
        if (item.hotel_id !== 0 && item.hotel_name) {
            const entry = hotelMap.get(item.hotel_name) || {
                hotel_name: item.hotel_name,
                total_sold_rooms: 0,
                total_fc_sold_rooms: 0,
                total_rooms: 0,
                total_fc_total_rooms: 0,
                total_prev_year_sold_rooms: 0,
                total_prev_year_rooms: 0
            };
            entry.total_sold_rooms += (item.sold_rooms || 0);
            entry.total_fc_sold_rooms += (item.fc_sold_rooms || 0);
            entry.total_rooms += (item.total_rooms || 0);
            entry.total_fc_total_rooms += (item.fc_total_rooms || 0);
            hotelMap.set(item.hotel_name, entry);
        }
    });
    return Array.from(hotelMap.values()).map(hotel => ({
        hotel_name: hotel.hotel_name,
        actual_occupancy_rate: hotel.total_rooms > 0 ? (hotel.total_sold_rooms / hotel.total_rooms) * 100 : 0,
        forecast_occupancy_rate: hotel.total_fc_total_rooms > 0 ? (hotel.total_fc_sold_rooms / hotel.total_fc_total_rooms) * 100 : 0,
        prev_year_occupancy_rate: 0 // No prev year data in this view
    }));
});

const hasAllHotelsOccupancyData = computed(() => allHotelsOccupancyChartData.value.length > 0);

const allHotelsChartHeight = computed(() => {
    const numHotels = allHotelsOccupancyChartData.value.length;
    const baseHeight = 150;
    const heightPerHotel = 50;
    const minHeight = 300;
    return Math.max(minHeight, baseHeight + (numHotels * heightPerHotel));
});


// Initialize charts
// Chart lifecycle functions are no longer needed since charts are now components
const refreshAllCharts = () => { };
const disposeAllCharts = () => { };

// Table
const getSeverity = getSeverityUtil;

const exportCSV = (tableType) => {
    let csvString = '';
    let filename = 'data.csv';

    if (tableType === 'revenue' && props.revenueData && props.revenueData.length > 0) {
        filename = '複数施設・年度・収益データ.csv';
        const headers = ["施設", "月度", "計画売上 (円)", "実績売上 (円)", "分散額 (円)", "分散率 (%)"];
        const csvRows = [headers.join(',')];
        props.revenueData.forEach(row => {
            const forecastRevenue = row.forecast_revenue || 0;
            const periodRevenue = row.period_revenue || 0;
            const varianceAmount = periodRevenue - forecastRevenue;
            let variancePercentage = 0;
            if (forecastRevenue !== 0) variancePercentage = ((periodRevenue / forecastRevenue) - 1) * 100;
            else if (periodRevenue !== 0) variancePercentage = Infinity; // Or "N/A" or specific handling

            const csvRow = [
                `"${row.hotel_name || ''}"`,
                `"${row.month || ''}"`,
                forecastRevenue,
                periodRevenue,
                varianceAmount,
                (forecastRevenue === 0 && periodRevenue !== 0) ? "N/A" : variancePercentage.toFixed(2)
            ];
            csvRows.push(csvRow.join(','));
        });
        csvString = csvRows.join('\n');

    } else if (tableType === 'occupancy' && props.occupancyData && props.occupancyData.length > 0) {
        filename = '複数施設・年度・稼働率データ.csv';
        const headers = [
            "施設", "月度",
            "計画販売室数", "実績販売室数", "販売室数差異", "非宿泊数",
            "計画稼働率 (%)", "実績稼働率 (%)", "稼働率差異 (p.p.)",
            "計画総室数", "実績総室数"
        ];
        const csvRows = [headers.join(',')];
        props.occupancyData.forEach(row => {
            const fcSold = row.fc_sold_rooms || 0;
            const sold = row.sold_rooms || 0;
            const nonAcc = row.non_accommodation_stays || 0;
            const fcOcc = row.fc_occ || 0;
            const occ = row.occ || 0;

            const csvRow = [
                `"${row.hotel_name || ''}"`,
                `"${row.month || ''}"`,
                fcSold,
                sold,
                sold - fcSold,
                nonAcc,
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
        //console.log(`RYCAll: No data to export for ${tableType} or invalid table type.`);
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
    // Charts are now handled by child components
});
onBeforeUnmount(() => {
    // Charts are now handled by child components
});

// Chart options watches removed - charts are now handled by child components
</script>