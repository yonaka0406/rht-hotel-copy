<template>
    <div class="reporting-single-month-container" data-report-container>
        <div class="flex justify-end mb-2 no-print">
            <SelectButton v-model="selectedComparison" :options="comparisonOptions" optionLabel="label"
                optionValue="value" />
            <SelectButton v-model="selectedView" :options="viewOptions" optionLabel="label" optionValue="value"
                class="ml-2" />
            <div class="ml-2 flex gap-2">
                <Button icon="pi pi-print" label="印刷PDF" class="p-button-secondary" @click="downloadPrintPdf"
                    :loading="isPrintDownloading" :disabled="isPrintDownloading" title="ブラウザの印刷機能を使用してPDFを生成" />
                <!-- <Button 
                    icon="pi pi-file-pdf" 
                    label="サーバーPDF" 
                    class="p-button-secondary" 
                    @click="downloadPdf"
                    :loading="isDownloadingPdf" 
                    :disabled="isDownloadingPdf || isPrintDownloading"
                    title="サーバーでPDFを生成（フォールバック）"
                /> -->
            </div>
        </div>

        <div v-if="selectedView === 'graph'">

            <Panel header="月次サマリー" class="mb-4 monthly-summary-panel">
                <template #default>
                    <div v-if="!hasRevenueDataForChart" class="text-center p-4">
                        データはありません。
                    </div>
                    <div v-else class="flex flex-col md:flex-row md:gap-4 p-4">
                        <!-- Column 1: Revenue Chart (Tall) -->
                        <div class="w-full md:w-1/2 chart-container revenue-chart-column">
                            <RevenuePlanVsActualChart :revenueData="aggregateHotelZeroData" height="500px" />
                        </div>

                        <!-- Column 2: Gauge + KPIs -->
                        <div class="w-full md:w-1/2 flex flex-col gap-4 gauge-kpi-column">
                            <!-- Row 1: Gauge (Reduced Height) -->
                            <div>
                                <div>
                                    <OccupancyGaugeChart :occupancyData="aggregateHotelZeroData" height="250px"
                                        :previousYearOccupancy="aggregateHotelZeroData?.prevYearOccupancy" />
                                </div>
                            </div>

                            <!-- Row 2: KPIs -->
                            <div class="grid grid-cols-2 gap-4 kpi-section">
                                <Card class="shadow-sm bg-gray-50 dark:bg-gray-800">
                                    <template #content>
                                        <div class="flex flex-col items-center text-center">
                                            <h6 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">ADR
                                            </h6>
                                            <span class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{
                                                formatCurrency(actualADR) }}</span>
                                            <span class="text-xs text-gray-400 dark:text-gray-500 mt-1">(計画: {{
                                                formatCurrency(forecastADR) }})</span>
                                            <span v-if="ADRDifference"
                                                :class="['text-xs font-bold mt-1', ADRDifference > 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400']">
                                                {{ ADRDifference > 0 ? '+' : '' }}{{ formatCurrency(ADRDifference)
                                                }}
                                            </span>
                                        </div>
                                    </template>
                                </Card>
                                <Card class="shadow-sm bg-gray-50 dark:bg-gray-800">
                                    <template #content>
                                        <div class="flex flex-col items-center text-center">
                                            <h6 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">RevPAR
                                            </h6>
                                            <span class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{
                                                formatCurrency(actualRevPAR) }}</span>
                                            <span class="text-xs text-gray-400 dark:text-gray-500 mt-1">(計画: {{
                                                formatCurrency(forecastRevPAR) }})</span>
                                            <span v-if="revPARDifference"
                                                :class="['text-xs font-bold mt-1', revPARDifference > 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400']">
                                                {{ revPARDifference > 0 ? '+' : '' }}{{
                                                    formatCurrency(revPARDifference) }}
                                            </span>
                                        </div>
                                    </template>
                                </Card>
                            </div>
                        </div>
                    </div>
                    <Message severity="secondary" :closable="false" class="mt-2 p-2 text-sm">
                        会計データがない場合はPMSの数値になっています。期間： {{ periodMaxDate }}。選択中の施設： {{ allHotelNames }}
                    </Message>
                </template>
            </Panel>

            <FutureOutlookTable :data="futureOutlookData" :asOfDate="asOfDate" class="future-outlook-section" />

            <Card class="hotel-overview-card">
                <template #header>
                    <span class="text-xl font-bold">全施設 収益＆稼働率 概要（{{ selectedComparison === 'forecast' ? '計画' : '前年' }}
                        vs 実績）</span>
                </template>
                <template #content>
                    <div class="flex flex-col md:flex-row md:gap-4 p-4">
                        <div class="w-full md:w-1/2 mb-4 md:mb-0 hotel-sales-chart">
                            <HotelSalesComparisonChart :revenueData="props.revenueData"
                                :prevYearRevenueData="props.prevYearRevenueData" :comparisonType="selectedComparison" />
                        </div>
                        <div class="w-full md:w-1/2 hotel-occupancy-chart">
                            <h6 class="text-center">施設別 稼働率（{{ selectedComparison === 'forecast' ? '計画' : '前年' }} vs 実績）
                            </h6>
                            <div v-if="!hasAllHotelsOccupancyData" class="text-center p-4">データはありません。</div>
                            <div v-else>
                                <AllHotelsOccupancyChart :occupancyData="props.occupancyData"
                                    :prevYearOccupancyData="props.prevYearOccupancyData"
                                    :comparisonType="selectedComparison" />
                            </div>
                        </div>
                    </div>
                </template>
                <template #footer>
                    <div class="flex justify-content-between">
                        <small>会計データがない場合はPMSの数値になっています。期間： {{ periodMaxDate }}</small>
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
            </Card>
            <RevenuePlanVsActualTable :revenueData="props.revenueData" @export-csv="exportCSV" />

            <Card>
                <template #header>
                    <span class="text-xl font-bold">稼働状況（計画ｘ実績）</span>
                </template>
                <template #content>
                    <OccupancyPlanVsActualTable :occupancyData="props.occupancyData"
                        :rawOccupationBreakdownData="props.rawOccupationBreakdownData" :showHotelColumn="true"
                        :showNonAccommodationColumn="true" :showDetailedCsvButton="true" :rows="5"
                        :rowsPerPageOptions="[5, 15, 30, 50]" />
                </template>
            </Card>
        </div>
    </div>
    <Toast />
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
    rawOccupationBreakdownData: { // Renamed from occupationBreakdownData
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
import AllHotelsOccupancyChart from './charts/AllHotelsOccupancyChart.vue';
import OccupancyGaugeChart from './charts/OccupancyGaugeChart.vue';
import HotelSalesComparisonChart from './charts/HotelSalesComparisonChart.vue';
import RevenuePlanVsActualTable from './tables/RevenuePlanVsActualTable.vue';

// Primevue
import { Card, Badge, SelectButton, Button, DataTable, Column, Panel, Message, Toast } from 'primevue';
import { useToast } from 'primevue/usetoast';
import OccupancyPlanVsActualTable from './tables/OccupancyPlanVsActualTable.vue';
import FutureOutlookTable from './tables/FutureOutlookTable.vue';

// Composables
import { useReportStore } from '@/composables/useReportStore';
import { usePrintOptimization } from '@/composables/usePrintOptimization';

// Services
import chartConfigService from '../../services/ChartConfigurationService';
import printOptimizationService from '@/services/printOptimizationService.js';

// Utilities
import {
    formatCurrencyForReporting as formatCurrency,
    formatPercentage,
    formatYenInTenThousands,
    formatYenInTenThousandsNoDecimal
} from '@/utils/formatUtils';
import { getSeverity as getSeverityUtil, colorScheme } from '@/utils/reportingUtils';

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

// PDF download loading state
const isDownloadingPdf = ref(false);
const isPrintDownloading = ref(false);

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

const periodMaxDate = computed(() => {
    if (!props.revenueData || props.revenueData.length === 0) return 'N/A';
    const validTimestamps = props.revenueData
        .map(item => {
            const date = new Date(item.month);
            return isNaN(date.getTime()) ? null : date.getTime();
        })
        .filter(timestamp => timestamp !== null && isFinite(timestamp));

    if (validTimestamps.length === 0) {
        return 'N/A';
    }
    const maxDate = new Date(Math.max(...validTimestamps));
    return maxDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' });
});

// --- KPI Calculations (ADR, RevPAR) ---
const aggregateHotelZeroData = computed(() => {
    // Find the entries for hotel_id === 0. It's assumed there's one such entry per relevant data array,
    // representing the totals for the selected period.
    const revenueEntry = props.revenueData?.find(item => item.hotel_id === 0);
    const occupancyEntry = props.occupancyData?.find(item => item.hotel_id === 0);
    const prevYearRevenueEntry = props.prevYearRevenueData?.find(item => item.hotel_id === 0);
    const prevYearOccupancyEntry = props.prevYearOccupancyData?.find(item => item.hotel_id === 0);

    // Log current and previous year data to verify correct months
    //console.log('[ReportingSingleMonthAllHotels] Current year data:', {
    //    revenueEntry: revenueEntry,
    //    occupancyEntry: occupancyEntry,
    //    currentMonth: revenueEntry?.month,
    //    currentYear: revenueEntry?.month ? new Date(revenueEntry.month).getFullYear() : 'N/A'
    //});

    //console.log('[ReportingSingleMonthAllHotels] Previous year data:', {
    //    prevYearRevenueEntry: prevYearRevenueEntry,
    //    prevYearOccupancyEntry: prevYearOccupancyEntry,
    //    prevYearMonth: prevYearRevenueEntry?.month,
    //    prevYearYear: prevYearRevenueEntry?.month ? new Date(prevYearRevenueEntry.month).getFullYear() : 'N/A'
    //});

    // Verify that we're comparing the same month but different years
    if (revenueEntry?.month && prevYearRevenueEntry?.month) {
        const currentDate = new Date(revenueEntry.month);
        const prevYearDate = new Date(prevYearRevenueEntry.month);
        const currentMonth = currentDate.getMonth();
        const prevYearMonth = prevYearDate.getMonth();
        const yearDiff = currentDate.getFullYear() - prevYearDate.getFullYear();

        //console.log('[ReportingSingleMonthAllHotels] Month comparison:', {
        //    currentMonth: currentMonth,
        //    prevYearMonth: prevYearMonth,
        //    yearDifference: yearDiff,
        //    isSameMonth: currentMonth === prevYearMonth,
        //    isOneYearDiff: yearDiff === 1
        //});

        if (currentMonth !== prevYearMonth) {
            console.warn('[ReportingSingleMonthAllHotels] WARNING: Current month and previous year month do not match!');
        }
        if (yearDiff !== 1) {
            console.warn('[ReportingSingleMonthAllHotels] WARNING: Year difference is not exactly 1 year!');
        }
    }

    const result = {
        total_forecast_revenue: revenueEntry?.forecast_revenue || 0,
        total_period_accommodation_revenue: revenueEntry?.accommodation_revenue || 0,
        total_prev_year_accommodation_revenue: prevYearRevenueEntry?.accommodation_revenue || 0,
        total_fc_sold_rooms: occupancyEntry?.fc_sold_rooms || 0,
        total_fc_available_rooms: occupancyEntry?.fc_total_rooms || 0, // Restored property
        total_sold_rooms: occupancyEntry?.sold_rooms || 0,
        // total_rooms from occupancy data is total_available_rooms for actual period
        total_available_rooms: occupancyEntry?.total_rooms || 0,
        total_prev_year_sold_rooms: prevYearOccupancyEntry?.sold_rooms || 0,
        total_prev_year_available_rooms: prevYearOccupancyEntry?.total_rooms || 0,
        prevYearOccupancy: prevYearOccupancyEntry?.total_rooms > 0 ? prevYearOccupancyEntry.sold_rooms / prevYearOccupancyEntry.total_rooms : null
    };

    //console.log('[ReportingSingleMonthAllHotels] aggregateHotelZeroData result:', {
    //    result,
    //    revenueEntryMonth: revenueEntry?.month,
    //    prevYearRevenueEntryMonth: prevYearRevenueEntry?.month,
    //    occupancyEntryMonth: occupancyEntry?.month,
    //    prevYearOccupancyEntryMonth: prevYearOccupancyEntry?.month
    //});

    return result;
});

const actualADR = computed(() => {
    const { total_period_accommodation_revenue, total_sold_rooms } = aggregateHotelZeroData.value;
    if (total_sold_rooms === 0 || total_sold_rooms === null || total_sold_rooms === undefined) return NaN;
    //console.log('[ReportingSingleMonthAllHotels] ADR calculation - accommodation_revenue:', total_period_accommodation_revenue, 'sold_rooms:', total_sold_rooms);
    return Math.round(total_period_accommodation_revenue / total_sold_rooms);
});

const forecastADR = computed(() => {
    const { total_forecast_revenue, total_fc_sold_rooms } = aggregateHotelZeroData.value;
    if (total_fc_sold_rooms === 0 || total_fc_sold_rooms === null || total_fc_sold_rooms === undefined) return NaN;
    return Math.round(total_forecast_revenue / total_fc_sold_rooms);
});

const actualRevPAR = computed(() => {
    const { total_period_accommodation_revenue, total_available_rooms } = aggregateHotelZeroData.value;
    if (total_available_rooms === 0 || total_available_rooms === null || total_available_rooms === undefined) return NaN;
    return Math.round(total_period_accommodation_revenue / total_available_rooms);
});

const forecastRevPAR = computed(() => {
    const { total_forecast_revenue, total_fc_available_rooms } = aggregateHotelZeroData.value;
    if (total_fc_available_rooms === 0 || total_fc_available_rooms === null || total_fc_available_rooms === undefined) return NaN;
    return Math.round(total_forecast_revenue / total_fc_available_rooms);
});

const ADRDifference = computed(() => {
    if (isNaN(actualADR.value) || isNaN(forecastADR.value)) return 0;
    return actualADR.value - forecastADR.value;
});

const revPARDifference = computed(() => {
    if (isNaN(actualRevPAR.value) || isNaN(forecastRevPAR.value)) return 0;
    return actualRevPAR.value - forecastRevPAR.value;
});

// ECharts imports
// import * as echarts from 'echarts/core';
// import {
//     TitleComponent,
//     TooltipComponent,
//     GridComponent,
//     LegendComponent,
//     DatasetComponent,
//     TransformComponent,
// } from 'echarts/components';
// import { BarChart, LineChart } from 'echarts/charts';
// import { CanvasRenderer } from 'echarts/renderers';

// Register ECharts components
// echarts.use([
//     TitleComponent,
//     TooltipComponent,
//     GridComponent,
//     LegendComponent,
//     DatasetComponent,
//     TransformComponent,
//     BarChart,
//     CanvasRenderer
// ]);

// --- Chart Refs and Instances ---
// --- Chart Refs and Instances ---
// const allHotelsRevenueChartContainer = ref(null);
// const allHotelsRevenueChartInstance = shallowRef(null);

// const resizeChartHandler = () => {
//     if (selectedView.value === 'graph') {
//         allHotelsRevenueChartInstance.value?.resize();
//     }
// };


// --- Data Computeds for Charts ---
const filteredRevenueForChart = computed(() => {
    if (!props.revenueData) return [];
    return props.revenueData.filter(item => item.hotel_id === 0);
});
const hasRevenueDataForChart = computed(() => {
    return filteredRevenueForChart.value.length > 0;
});

const allHotelsRevenueChartData = computed(() => {
    if (!props.revenueData || props.revenueData.length === 0) return [];
    const hotelMap = new Map();
    props.revenueData.forEach(item => {
        if (item.hotel_name && item.hotel_name !== '施設合計') {
            const entry = hotelMap.get(item.hotel_name) || {
                hotel_name: item.hotel_name,
                total_forecast_revenue: 0,
                total_period_accommodation_revenue: 0,
                revenue_to_forecast: 0,
                forecast_achieved_percentage: 0
            };
            entry.total_forecast_revenue += (item.forecast_revenue || 0);
            entry.total_period_accommodation_revenue += (item.accommodation_revenue || 0);
            hotelMap.set(item.hotel_name, entry);
        }
    });
    // Calculate derived fields after summing up
    return Array.from(hotelMap.values()).map(hotel => {
        if ((hotel.total_forecast_revenue - hotel.total_period_accommodation_revenue) < 0) {
            hotel.revenue_to_forecast = 0;
        } else {
            hotel.revenue_to_forecast = hotel.total_forecast_revenue - hotel.total_period_accommodation_revenue;
        }

        if (hotel.total_forecast_revenue > 0) {
            hotel.forecast_achieved_percentage = (hotel.total_period_accommodation_revenue / hotel.total_forecast_revenue) * 100;
        } else {
            // Handle cases where forecast is 0
            hotel.forecast_achieved_percentage = hotel.total_period_accommodation_revenue > 0 ? Infinity : 0;
        }
        return hotel;
    });
});
const hasAllHotelsRevenueData = computed(() => allHotelsRevenueChartData.value.length > 0);

const hasAllHotelsOccupancyData = computed(() => {
    return props.occupancyData && props.occupancyData.length > 0 &&
        props.occupancyData.some(item => item.hotel_id !== 0);
});

// const allHotelsChartHeight = computed(() => {
//     const numHotels = allHotelsRevenueChartData.value.length;
//     const baseHeight = 150; // Base height for axes, legend, etc.
//     const heightPerHotel = 50; // Pixels per hotel bar
//     const minHeight = 450; // Minimum height to prevent it from being too small

//     const calculatedHeight = baseHeight + (numHotels * heightPerHotel);

//     return Math.max(minHeight, calculatedHeight);
// });



// --- ECharts Options ---
const allHotelsRevenueChartOptions = computed(() => {
    const data = allHotelsRevenueChartData.value;
    if (!data.length) return {};
    const hotelNames = data.map(item => item.hotel_name);
    const forecastValues = data.map(item => item.total_forecast_revenue);
    const accommodationValues = data.map(item => item.total_period_accommodation_revenue);
    const revenueToForecastValues = data.map(item => item.revenue_to_forecast); // Get data for the new series

    const extraData = data.map(item => ({
        revenue_to_forecast: item.revenue_to_forecast,
        forecast_achieved_percentage: item.forecast_achieved_percentage
    }));

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: params => {
                const dataIndex = params[0].dataIndex;
                const currentHotelExtraData = extraData[dataIndex];
                let tooltip = `${params[0].name}<br/>`;
                params.forEach(param => {
                    tooltip += `${param.marker} ${param.seriesName}: ${formatYenInTenThousands(param.value)}<br/>`;
                });
                // The '計画達成まで' is now a series, so it will be included above by default.
                // We can keep the '達成率' here.
                tooltip += `達成率: ${currentHotelExtraData.forecast_achieved_percentage === Infinity ? 'N/A' : currentHotelExtraData.forecast_achieved_percentage.toFixed(2) + '%'}<br/>`;
                return tooltip;
            }
        },
        legend: { data: ['計画売上合計', '実績売上合計', '計画達成まで'], top: 'bottom' }, // Added new series to legend
        grid: { containLabel: true, left: '3%', right: '10%', bottom: '10%' },
        xAxis: { type: 'value', name: '売上 (万円)', axisLabel: { formatter: value => (value / 10000).toLocaleString('ja-JP') } },
        yAxis: { type: 'category', data: hotelNames, inverse: true },
        series: [
            { name: '計画売上合計', type: 'bar', data: forecastValues, itemStyle: { color: colorScheme.forecast }, barGap: '5%', label: { show: true, position: 'inside', formatter: params => params.value > 0 ? formatYenInTenThousandsNoDecimal(params.value) : '' } },
            { name: '実績売上合計', type: 'bar', data: accommodationValues, itemStyle: { color: colorScheme.actual }, barGap: '5%', label: { show: true, position: 'inside', formatter: params => params.value > 0 ? formatYenInTenThousandsNoDecimal(params.value) : '' } },
            {
                name: '計画達成まで',
                type: 'bar',
                data: revenueToForecastValues,
                itemStyle: { color: colorScheme.toForecast },
                barGap: '5%',
                label: { show: true, position: 'right', formatter: params => params.value > 0 ? formatYenInTenThousandsNoDecimal(params.value) : '' }
            }
        ]
    };
});


// Initialize charts
// const initOrUpdateChart = (instanceRef, containerRef, options) => {
//     if (containerRef.value) { // Ensure the container element exists
//         if (!instanceRef.value || instanceRef.value.isDisposed?.()) {
//             // If no instance or it's disposed, initialize a new one
//             instanceRef.value = echarts.init(containerRef.value);
//         }
//         // Always set options and resize
//         instanceRef.value.setOption(options, true); // true for notMerge
//         instanceRef.value.resize();
//     } else if (instanceRef.value && !instanceRef.value.isDisposed?.()) {
//         // Container is gone (e.g., v-if became false), but instance exists. Dispose it.
//         instanceRef.value.dispose();
//         instanceRef.value = null; // Clear the ref
//     }
// };
// const refreshAllCharts = () => {
//     if (hasAllHotelsRevenueData.value) {
//         initOrUpdateChart(allHotelsRevenueChartInstance, allHotelsRevenueChartContainer, allHotelsRevenueChartOptions.value);
//     } else {
//         allHotelsRevenueChartInstance.value?.dispose(); allHotelsRevenueChartInstance.value = null;
//     }



// };
// const disposeAllCharts = () => {
//     allHotelsRevenueChartInstance.value?.dispose(); allHotelsRevenueChartInstance.value = null;
// };


// Use report store for PDF generation API call
const { generatePdfReport: generatePdfReportApi } = useReportStore();

// Use print optimization composable with browser compatibility
const {
    isPrintMode,
    delayedPrint,
    getPrintCapabilities,
    getProgressiveEnhancementFallback,
    applyBrowserSpecificOptimizations
} = usePrintOptimization();

// Use toast for notifications
const toast = useToast();

const downloadPdf = async () => {
    if (isDownloadingPdf.value) return; // Prevent multiple simultaneous downloads

    isDownloadingPdf.value = true;

    // Generate serialized chart configurations using the service
    let serializedChartConfigs = {};

    try {

        try {
            // Serialize RevenuePlanVsActual chart configuration
            if (aggregateHotelZeroData.value) {
                const revenuePlanVsActualConfig = chartConfigService.getRevenuePlanVsActualConfig(aggregateHotelZeroData.value);
                serializedChartConfigs.revenuePlanVsActual = chartConfigService.serializeConfig(revenuePlanVsActualConfig, 'revenuePlanVsActual');
            }

            // Serialize OccupancyGauge chart configuration
            if (aggregateHotelZeroData.value) {
                const occupancyGaugeConfig = chartConfigService.getOccupancyGaugeConfig(aggregateHotelZeroData.value);
                serializedChartConfigs.occupancyGauge = chartConfigService.serializeConfig(occupancyGaugeConfig, 'occupancyGauge');
            }

            // Serialize AllHotelsRevenue chart configuration
            if (hasAllHotelsRevenueData.value && allHotelsRevenueChartData.value.length > 0) {
                const allHotelsRevenueConfig = chartConfigService.getAllHotelsRevenueConfig(allHotelsRevenueChartData.value);
                serializedChartConfigs.allHotelsRevenue = chartConfigService.serializeConfig(allHotelsRevenueConfig, 'allHotelsRevenue');
            }

            // Serialize AllHotelsOccupancy chart configuration
            if (hasAllHotelsOccupancyData.value) {
                const occupancyDataFiltered = props.occupancyData.filter(item => item.hotel_id !== 0);
                const allHotelsOccupancyConfig = chartConfigService.getAllHotelsOccupancyConfig(occupancyDataFiltered);
                serializedChartConfigs.allHotelsOccupancy = chartConfigService.serializeConfig(allHotelsOccupancyConfig, 'allHotelsOccupancy');
            }
        } catch (serializationError) {
            console.error('Error serializing chart configurations:', serializationError);
            // Continue with empty serialized configs - the backend will handle fallbacks
        }

        const pdfRequestData = {
            selectedView: selectedView.value,
            periodMaxDate: periodMaxDate.value,
            allHotelNames: allHotelNames.value,
            // Pass KPI data
            kpiData: {
                actualADR: actualADR.value,
                forecastADR: forecastADR.value,
                actualRevPAR: actualRevPAR.value,
                forecastRevPAR: forecastRevPAR.value
            },
            // Pass chart data for the specific charts needed
            chartData: {
                // Data for RevenuePlanVsActualChart and OccupancyGaugeChart
                aggregateData: aggregateHotelZeroData.value,
                // Data for all hotels charts
                allHotelsRevenueData: allHotelsRevenueChartData.value,
                allHotelsOccupancyData: props.occupancyData.filter(item => item.hotel_id !== 0)
            },
            // Send serialized chart configurations instead of raw options
            serializedChartConfigs: serializedChartConfigs,
            // Keep legacy support for now
            allHotelsRevenueChartOptions: hasAllHotelsRevenueData.value ? allHotelsRevenueChartOptions.value : null
        };

        console.log('PDF Request Data:', pdfRequestData);
        console.log('Debug - Serialized Chart Configurations:', {
            serializedConfigKeys: Object.keys(serializedChartConfigs),
            configCount: Object.keys(serializedChartConfigs).length,
            hasRevenuePlanVsActual: !!serializedChartConfigs.revenuePlanVsActual,
            hasOccupancyGauge: !!serializedChartConfigs.occupancyGauge,
            hasAllHotelsRevenue: !!serializedChartConfigs.allHotelsRevenue,
            hasAllHotelsOccupancy: !!serializedChartConfigs.allHotelsOccupancy
        });
        console.log('Debug - Props data:', {
            revenueDataLength: props.revenueData ? props.revenueData.length : 0,
            occupancyDataLength: props.occupancyData ? props.occupancyData.length : 0,
            revenueDataSample: props.revenueData ? props.revenueData.slice(0, 2) : null,
            occupancyDataSample: props.occupancyData ? props.occupancyData.slice(0, 2) : null
        });
        console.log('Debug - Individual data values:', {
            actualADR: actualADR.value,
            forecastADR: forecastADR.value,
            actualRevPAR: actualRevPAR.value,
            forecastRevPAR: forecastRevPAR.value,
            aggregateHotelZeroData: aggregateHotelZeroData.value,
            allHotelsRevenueChartData: allHotelsRevenueChartData.value,
            occupancyDataFiltered: props.occupancyData.filter(item => item.hotel_id !== 0),
            hasAllHotelsRevenueData: hasAllHotelsRevenueData.value,
            hasAllHotelsOccupancyData: hasAllHotelsOccupancyData.value
        });

        const responseBlob = await generatePdfReportApi(
            'singleMonthMultipleHotels', // Specific report type for this component
            pdfRequestData
        );

        // Create a blob URL and trigger download
        const url = window.URL.createObjectURL(new Blob([responseBlob]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `monthly_summary_report_${Date.now()}.pdf`); // Set dynamic filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log('PDF download initiated successfully!');
    } catch (error) {
        console.error('Error generating PDF:', error);

        // Enhanced error handling with user feedback
        let errorMessage = 'PDFの生成中にエラーが発生しました。';

        if (error.message.includes('timeout')) {
            errorMessage = 'PDFの生成がタイムアウトしました。しばらく待ってから再試行してください。';
        } else if (error.message.includes('network')) {
            errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
        } else if (error.message.includes('serialization')) {
            errorMessage = 'チャート設定の処理中にエラーが発生しました。';
        } else if (error.message.includes('resource')) {
            errorMessage = 'サーバーリソースが不足しています。しばらく待ってから再試行してください。';
        }

        // Show user-friendly error message using toast notification
        toast.add({
            severity: 'error',
            summary: 'PDF生成エラー',
            detail: errorMessage,
            life: 5000
        });

        // Log detailed error for debugging
        console.error('Detailed PDF generation error:', {
            message: error.message,
            stack: error.stack,
            requestData: {
                selectedView: selectedView.value,
                hasAggregateData: !!aggregateHotelZeroData.value,
                hasAllHotelsRevenueData: hasAllHotelsRevenueData.value,
                hasAllHotelsOccupancyData: hasAllHotelsOccupancyData.value,
                serializedConfigCount: serializedChartConfigs ? Object.keys(serializedChartConfigs).length : 0
            }
        });
    } finally {
        isDownloadingPdf.value = false;
    }
};

// New print-based PDF download method with browser compatibility and static image support
const downloadPrintPdf = async () => {
    if (isPrintDownloading.value || isDownloadingPdf.value) return; // Prevent multiple simultaneous downloads

    isPrintDownloading.value = true;

    try {
        // Check browser compatibility and show warnings if needed
        const capabilities = getPrintCapabilities();
        const fallbackInfo = getProgressiveEnhancementFallback();

        if (fallbackInfo) {
            toast.add({
                severity: 'warn',
                summary: 'ブラウザ互換性',
                detail: fallbackInfo.message,
                life: 8000
            });

            // For very old browsers, recommend using server PDF instead
            if (!capabilities.supportsMediaQueries) {
                isPrintDownloading.value = false;
                toast.add({
                    severity: 'error',
                    summary: 'ブラウザ非対応',
                    detail: 'このブラウザでは印刷PDFがサポートされていません。サーバーPDFをご利用ください。',
                    life: 10000
                });
                return;
            }
        }

        // Apply browser-specific optimizations
        applyBrowserSpecificOptimizations();

        console.log('Print PDF initiated with browser:', capabilities.browser.name, capabilities.browser.version);
        // Setup fallback to backend PDF generation if print mode fails
        printOptimizationService.setFallbackCallback(async (reason, error) => {
            console.warn('Print PDF failed, falling back to server PDF:', reason, error);
            isPrintDownloading.value = false;

            // Show user feedback about fallback
            toast.add({
                severity: 'warn',
                summary: '印刷PDF失敗',
                detail: '印刷PDFの生成に失敗しました。サーバーPDFを使用してください。',
                life: 5000
            });
        });

        // Activate print mode with optimizations
        const printActivated = await printOptimizationService.activatePrintMode({
            hideElements: [
                '.no-print',
                '.reporting-top-menu', // Hide the top menu with filters and navigation
                '.report-filters',
                '.report-navigation',
                '.p-selectbutton', // Hide view selector
                'button:not(.print-keep)', // Hide all buttons except those marked to keep
                '.p-button:not(.print-keep)',
                '.interactive-only',
                '.screen-only'
            ],
            optimizeCharts: true,
            pageBreakRules: [
                {
                    selector: '.monthly-summary-panel',
                    breakInside: 'avoid'
                },
                {
                    selector: '.kpi-section',
                    breakInside: 'avoid'
                },
                {
                    selector: '.print-chart-wrapper',
                    breakInside: 'avoid'
                },
                {
                    selector: '.hotel-overview-card',
                    breakBefore: 'auto',
                    breakInside: 'auto'
                }
            ]
        });

        if (printActivated) {
            // Add print-specific classes to the main container
            const reportContainer = document.querySelector('.reporting-single-month-container') ||
                document.querySelector('[data-report-container]') ||
                document.body;

            if (reportContainer) {
                reportContainer.classList.add('print-optimized', 'print-black-text', 'print-white-bg');
            }

            // Add report title for print headers
            document.body.setAttribute('data-report-title', `Monthly Report ${periodMaxDate.value}`);

            // Use delayed print to ensure static images are ready
            await delayedPrint();

            console.log('Print PDF dialog opened successfully with static images');
        } else {
            throw new Error('Failed to activate print mode');
        }

    } catch (error) {
        console.error('Error in print PDF workflow:', error);

        // Enhanced error handling with user feedback
        let errorMessage = '印刷PDFの生成中にエラーが発生しました。';

        if (error.message.includes('browser')) {
            errorMessage = 'ブラウザが印刷機能をサポートしていません。サーバーPDFをご利用ください。';
        } else if (error.message.includes('permission')) {
            errorMessage = '印刷の許可が必要です。ブラウザの設定を確認してください。';
        } else if (error.message.includes('activation')) {
            errorMessage = '印刷モードの有効化に失敗しました。サーバーPDFをご利用ください。';
        }

        toast.add({
            severity: 'error',
            summary: '印刷PDFエラー',
            detail: errorMessage,
            life: 5000
        });

        // Log detailed error for debugging
        console.error('Detailed print PDF error:', {
            message: error.message,
            stack: error.stack,
            selectedView: selectedView.value,
            hasAggregateData: !!aggregateHotelZeroData.value,
            hasAllHotelsRevenueData: hasAllHotelsRevenueData.value,
            hasAllHotelsOccupancyData: hasAllHotelsOccupancyData.value
        });

    } finally {
        isPrintDownloading.value = false;

        // Setup reliable print-completion handlers
        const cleanupPrintMode = () => {
            const reportContainer = document.querySelector('.print-optimized');
            if (reportContainer) {
                reportContainer.classList.remove('print-optimized', 'print-black-text', 'print-white-bg');
            }
            document.body.removeAttribute('data-report-title');
        };

        // Primary handler: afterprint event
        const handleAfterPrint = () => {
            cleanupPrintMode();
            window.removeEventListener('afterprint', handleAfterPrint);
        };

        // Fallback handler: MediaQueryList for broader browser support
        let printMediaQuery = null;
        let mediaQueryHandler = null;

        if (window.matchMedia) {
            printMediaQuery = window.matchMedia('print');
            mediaQueryHandler = (e) => {
                // When print media query no longer matches, print is complete
                if (!e.matches) {
                    cleanupPrintMode();
                    printMediaQuery.removeEventListener('change', mediaQueryHandler);
                }
            };
            printMediaQuery.addEventListener('change', mediaQueryHandler);
        }

        // Setup primary afterprint listener
        window.addEventListener('afterprint', handleAfterPrint);

        // Fallback timeout as last resort (reduced from 1000ms to 500ms)
        setTimeout(() => {
            // Only cleanup if handlers haven't already done so
            if (document.querySelector('.print-optimized')) {
                cleanupPrintMode();
                window.removeEventListener('afterprint', handleAfterPrint);
                if (printMediaQuery && mediaQueryHandler) {
                    printMediaQuery.removeEventListener('change', mediaQueryHandler);
                }
            }
        }, 500);
    }
};

// Table
const getSeverity = getSeverityUtil;

const csvEscape = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // Replace all double quotes with two double quotes, then wrap the whole string in double quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
};

const exportCSV = (tableType) => {
    let csvString = '';
    let filename = 'data.csv';

    if (tableType === 'revenue' && props.revenueData && props.revenueData.length > 0) {
        filename = '複数施設・年度・収益データ.csv';
        const headers = ["施設", "月度", "計画売上 (円)", "実績売上 (円)", "分散額 (円)", "分散率 (%)"];
        const csvRows = [headers.join(',')];
        props.revenueData.forEach(row => {
            const forecastRevenue = row.forecast_revenue || 0;
            const accommodationRevenue = row.accommodation_revenue || 0;
            const varianceAmount = accommodationRevenue - forecastRevenue;
            let variancePercentage = 0;
            if (forecastRevenue !== 0) variancePercentage = ((accommodationRevenue / forecastRevenue) - 1) * 100;
            else if (accommodationRevenue !== 0) variancePercentage = Infinity; // Or "N/A" or specific handling

            const csvRow = [
                csvEscape(row.hotel_name),
                csvEscape(row.month),
                forecastRevenue,
                accommodationRevenue,
                varianceAmount,
                (forecastRevenue === 0 && accommodationRevenue !== 0) ? "N/A" : variancePercentage.toFixed(2)
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
            const fcOcc = row.fc_occ || 0;
            const occ = row.occ || 0;

            const csvRow = [
                csvEscape(row.hotel_name),
                csvEscape(row.month),
                fcSold,
                sold,
                sold - fcSold,
                row.non_accommodation_stays || 0,
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
        // console.log(`RSMAll: No data to export for ${tableType} or invalid table type.`);
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
    //console.log('RSMAll: onMounted', props.revenueData, props.occupancyData);

    // No need to refresh charts here, as HotelSalesComparisonChart handles its own lifecycle.
    // if (selectedView.value === 'graph') {
    //     // Use nextTick to ensure containers are rendered before initializing
    //     nextTick(refreshAllCharts);
    // }
    // window.addEventListener('resize', resizeChartHandler);
});
onBeforeUnmount(() => {
    // disposeAllCharts();
    // window.removeEventListener('resize', resizeChartHandler);
});

// Watch for changes in computed chart options
watch(selectedView, async (newView) => {
    if (newView === 'graph') {
        await nextTick();
        // disposeAllCharts();
        // refreshAllCharts();
    } else {
        // disposeAllCharts();
    }
});

// Watch for changes in revenueData and occupancyData props to re-render charts
watch(() => props.revenueData, () => {
    if (selectedView.value === 'graph') {
        // nextTick(refreshAllCharts);
    }
}, { deep: true }); // Use deep watch for array/object changes

watch(() => props.occupancyData, () => {
    if (selectedView.value === 'graph') {
        // nextTick(refreshAllCharts);
    }
}, { deep: true }); // Use deep watch for array/object changes</script>

<style>
@import '@/assets/css/print-styles.css';

/* Component-specific print optimizations */
@media print {
    .reporting-single-month-container {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
    }

    /* Add data attributes for print identification */
    .monthly-summary-panel {
        page-break-inside: avoid !important;
    }

    .kpi-section {
        page-break-inside: avoid !important;
    }

    .chart-container {
        page-break-inside: avoid !important;
    }
}
</style>