<template>
    <div>
        <div class="flex justify-end mb-2">
            <SelectButton v-model="selectedView" :options="viewOptions" optionLabel="label" optionValue="value" />
        </div>

        <div v-if="selectedView === 'graph'">

            <Panel header="月次サマリー" class="mb-4">
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
                            <small>会計データがない場合はPMSの数値になっています。期間： {{ periodMaxDate }}。選択中の施設： {{ allHotelNames
                            }}</small>
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
                            <div class="w-full md:w-1/2">
                                <RevenuePlanVsActualChart :revenueData="aggregateHotelZeroData" />
                            </div>
                            <div class="w-full md:w-1/2">
                                <OccupancyGaugeChart :occupancyData="aggregateHotelZeroData" />
                            </div>
                        </div>
                    </template>
                </Card>
            </Panel>

            <Card class="print-avoid-break">
                <template #header>
                    <span class="text-xl font-bold">全施設 収益＆稼働率 概要</span>
                </template>
                <template #content>
                    <div class="flex flex-col md:flex-row md:gap-4 p-4">
                        <div class="w-full md:w-1/2 mb-4 md:mb-0">
                            <h6 class="text-center">施設別 売上合計（計画 vs 実績）</h6>
                            <div v-if="!hasAllHotelsRevenueData" class="text-center p-4">データはありません。</div>
                            <div v-else ref="allHotelsRevenueChartContainer"
                                :style="{ height: allHotelsChartHeight + 'px', width: '100%' }"></div>
                        </div>
                        <div class="w-full md:w-1/2">
                            <h6 class="text-center">施設別 稼働率（計画 vs 実績）</h6>
                            <div v-if="!hasAllHotelsOccupancyData" class="text-center p-4">データはありません。</div>
                            <div v-else>
                                <AllHotelsOccupancyChart :occupancyData="props.occupancyData" />
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
    }
});

// Components
import RevenuePlanVsActualChart from './charts/RevenuePlanVsActualChart.vue';
import AllHotelsOccupancyChart from './charts/AllHotelsOccupancyChart.vue';
import OccupancyGaugeChart from './charts/OccupancyGaugeChart.vue';
import RevenuePlanVsActualTable from './tables/RevenuePlanVsActualTable.vue';

// Primevue
import { Card, Badge, SelectButton, Button, DataTable, Column, Panel } from 'primevue';
import OccupancyPlanVsActualTable from './tables/OccupancyPlanVsActualTable.vue';

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

    //console.log('[ReportingSingleMonthAllHotels] revenueEntry (hotel_id=0):', revenueEntry);
    //console.log('[ReportingSingleMonthAllHotels] occupancyEntry (hotel_id=0):', occupancyEntry);

    return {
        total_forecast_revenue: revenueEntry?.forecast_revenue || 0,
        total_period_accommodation_revenue: revenueEntry?.accommodation_revenue || 0,
        total_fc_sold_rooms: occupancyEntry?.fc_sold_rooms || 0,
        total_sold_rooms: occupancyEntry?.sold_rooms || 0,
        // fc_total_rooms from occupancy data is total_available_rooms for forecast period
        total_fc_available_rooms: occupancyEntry?.fc_total_rooms || 0,
        // total_rooms from occupancy data is total_available_rooms for actual period
        total_available_rooms: occupancyEntry?.total_rooms || 0,
    };
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

// ECharts imports
import * as echarts from 'echarts/core';
import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DatasetComponent,
    TransformComponent,
} from 'echarts/components';
import { BarChart, LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

// Register ECharts components
echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DatasetComponent,
    TransformComponent,
    BarChart,
    CanvasRenderer
]);

// --- Chart Refs and Instances ---
const allHotelsRevenueChartContainer = ref(null);

const allHotelsRevenueChartInstance = shallowRef(null);

const resizeChartHandler = () => {
    if (selectedView.value === 'graph') {
        allHotelsRevenueChartInstance.value?.resize();
    }
};



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

const allHotelsChartHeight = computed(() => {
    const numHotels = allHotelsRevenueChartData.value.length;
    const baseHeight = 150; // Base height for axes, legend, etc.
    const heightPerHotel = 50; // Pixels per hotel bar
    const minHeight = 450; // Minimum height to prevent it from being too small

    const calculatedHeight = baseHeight + (numHotels * heightPerHotel);

    return Math.max(minHeight, calculatedHeight);
});



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
const initOrUpdateChart = (instanceRef, containerRef, options) => {
    if (containerRef.value) { // Ensure the container element exists
        if (!instanceRef.value || instanceRef.value.isDisposed?.()) {
            // If no instance or it's disposed, initialize a new one
            instanceRef.value = echarts.init(containerRef.value);
        }
        // Always set options and resize
        instanceRef.value.setOption(options, true); // true for notMerge
        instanceRef.value.resize();
    } else if (instanceRef.value && !instanceRef.value.isDisposed?.()) {
        // Container is gone (e.g., v-if became false), but instance exists. Dispose it.
        instanceRef.value.dispose();
        instanceRef.value = null; // Clear the ref
    }
};
const refreshAllCharts = () => {
    if (hasAllHotelsRevenueData.value) {
        initOrUpdateChart(allHotelsRevenueChartInstance, allHotelsRevenueChartContainer, allHotelsRevenueChartOptions.value);
    } else {
        allHotelsRevenueChartInstance.value?.dispose(); allHotelsRevenueChartInstance.value = null;
    }



};
const disposeAllCharts = () => {
    allHotelsRevenueChartInstance.value?.dispose(); allHotelsRevenueChartInstance.value = null;
};

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
                `"${row.hotel_name || ''}"`,
                `"${row.month || ''}"`,
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

    if (selectedView.value === 'graph') {
        // Use nextTick to ensure containers are rendered before initializing
        nextTick(refreshAllCharts);
    }
    window.addEventListener('resize', resizeChartHandler);
});
onBeforeUnmount(() => {
    disposeAllCharts();
    window.removeEventListener('resize', resizeChartHandler);
});

// Watch for changes in computed chart options    
watch(selectedView, async (newView) => {
    if (newView === 'graph') {
        await nextTick();
        disposeAllCharts();
        refreshAllCharts();
    } else {
        disposeAllCharts();
    }
});

// Watch for changes in revenueData and occupancyData props to re-render charts
watch(() => props.revenueData, () => {
    if (selectedView.value === 'graph') {
        nextTick(refreshAllCharts);
    }
}, { deep: true }); // Use deep watch for array/object changes

watch(() => props.occupancyData, () => {
    if (selectedView.value === 'graph') {
        nextTick(refreshAllCharts);
    }
}, { deep: true }); // Use deep watch for array/object changes
</script>
<style scoped>
@media print {
    .print-avoid-break {
        page-break-inside: avoid !important;
    }
}
</style>