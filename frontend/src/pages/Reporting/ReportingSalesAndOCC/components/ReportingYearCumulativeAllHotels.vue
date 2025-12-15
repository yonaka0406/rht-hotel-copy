<template>
    <div>
        <div class="flex justify-end mb-2">
            <SelectButton v-model="selectedView" :options="viewOptions" optionLabel="label" optionValue="value" />
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
                            <div ref="monthlyChartContainer" style="height: 450px; width: 100%;"></div>
                        </div>
                        <div class="w-full md:w-1/4">
                            <div ref="totalChartContainer" style="height: 450px; width: 100%;"></div>
                        </div>
                    </div>
                </template>
                <template #footer>
                    <div class="flex justify-content-between">
                        <small>会計データがない場合はPMSの数値になっています。選択中の施設： {{ allHotelNames }}</small>
                    </div>
                </template>
            </Card>

            <Card>
                <template #header>
                    <span class="text-xl font-bold">全施設 収益＆稼働率 概要</span>
                </template>
                <template #content>
                    <div class="flex flex-col md:flex-row md:gap-4 p-4">
                        <div class="w-full md:w-1/2 mb-4 md:mb-0">
                            <HotelSalesComparisonChart :revenueData="props.revenueData" />
                        </div>
                        <div class="w-full md:w-1/2">
                            <h6 class="text-center">施設別 稼働率（計画 vs 実績）</h6>
                            <div v-if="!hasAllHotelsOccupancyData" class="text-center p-4">データはありません。</div>
                            <div v-else ref="allHotelsOccupancyChartContainer"
                                :style="{ height: allHotelsChartHeight + 'px', width: '100%' }"></div>
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

            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">収益（計画ｘ実績）</span>
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
                            <Column field="period_revenue" header="実績①" sortable style="width: 20%">
                                <template #body="{ data }">
                                    <div class="flex justify-end mr-2">
                                        {{ formatCurrency(data.period_revenue) }}
                                    </div>
                                </template>
                            </Column>
                            <Column header="分散" sortable style="width: 30%">
                                <template #body="{ data }">
                                    <div class="flex justify-end mr-2">
                                        {{ formatCurrency(data.period_revenue - data.forecast_revenue) }}
                                        <Badge class="ml-2"
                                            :severity="getSeverity((data.period_revenue / data.forecast_revenue) - 1)"
                                            size="small">
                                            {{ formatPercentage((data.period_revenue / data.forecast_revenue) - 1) }}
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
    }
});

// Primevue
import { Card, Badge, SelectButton, Button, DataTable, Column } from 'primevue';
import OccupancyPlanVsActualTable from './tables/OccupancyPlanVsActualTable.vue';
import HotelSalesComparisonChart from './charts/HotelSalesComparisonChart.vue';

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
    LineChart,
    CanvasRenderer
]);
const resizeChartHandler = () => {
    if (selectedView.value === 'graph') {
        monthlyChartInstance.value?.resize();
        totalChartInstance.value?.resize();

        allHotelsOccupancyChartInstance.value?.resize();
    }
};

// --- Chart Refs and Instances ---
const monthlyChartContainer = ref(null);
const totalChartContainer = ref(null);
const allHotelsOccupancyChartContainer = ref(null);

const monthlyChartInstance = shallowRef(null);
const totalChartInstance = shallowRef(null);
const allHotelsOccupancyChartInstance = shallowRef(null);

// --- Data Computeds for Charts ---
const filteredRevenueForChart = computed(() => {
    if (!props.revenueData) return [];
    return props.revenueData.filter(item => item.hotel_id === 0);
});
const hasRevenueDataForChart = computed(() => {
    return filteredRevenueForChart.value.length > 0;
});


// --- ECharts Options ---
const monthlyChartOptions = computed(() => {
    const data = filteredRevenueForChart.value;
    if (!data.length) return {};

    const months = [...new Set(data.map(item => item.month))].sort();
    const getDataForMonth = (month, key) => data.find(d => d.month === month)?.[key] ?? 0;

    const forecastRevenues = months.map(month => getDataForMonth(month, 'forecast_revenue'));
    const periodRevenues = months.map(month => getDataForMonth(month, 'period_revenue'));
    const variances = months.map(month => {
        const forecast = getDataForMonth(month, 'forecast_revenue');
        const period = getDataForMonth(month, 'period_revenue');
        return parseFloat(calculateVariancePercentage(period, forecast)) || 0; // Ensure numeric for chart
    });

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
            formatter: (params) => {
                let tooltipText = `${params[0].axisValueLabel}<br/>`;
                params.forEach(param => {
                    if (param.seriesName === '分散 (%)') {
                        tooltipText += `${param.marker} ${param.seriesName}: ${param.value}%<br/>`;
                    } else {
                        tooltipText += `${param.marker} ${param.seriesName}: ${formatYenInTenThousands(param.value)}<br/>`;
                    }
                });
                return tooltipText;
            }
        },
        legend: { data: ['計画売上', '実績売上', '分散 (%)'], top: 'bottom' },
        grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
        xAxis: [{ type: 'category', data: months, axisPointer: { type: 'shadow' } }],
        yAxis: [
            { type: 'value', name: '売上 (万円)', axisLabel: { formatter: (value) => `${(value / 10000).toLocaleString('ja-JP')}` }, min: 0 },
            { type: 'value', axisLabel: { show: false }, splitLine: { show: false } }
        ],
        series: [
            { name: '計画売上', type: 'bar', data: forecastRevenues, emphasis: { focus: 'series' }, itemStyle: { color: colorScheme.forecast } },
            { name: '実績売上', type: 'bar', data: periodRevenues, emphasis: { focus: 'series' }, itemStyle: { color: colorScheme.actual } },
            { name: '分散 (%)', type: 'line', yAxisIndex: 1, data: variances, smooth: true, itemStyle: { color: colorScheme.variance }, label: { show: true, position: 'top', formatter: (params) => `${params.value}%` } }
        ]
    };
});
const totalChartOptions = computed(() => {
    const data = filteredRevenueForChart.value;
    if (!data.length) return {};

    const totalForecastRevenue = data.reduce((sum, item) => sum + (item.forecast_revenue || 0), 0);
    const totalPeriodRevenue = data.reduce((sum, item) => sum + (item.period_revenue || 0), 0);
    const varianceAmount = totalPeriodRevenue - totalForecastRevenue;

    let displayVariancePercent;
    if (totalForecastRevenue === 0 || totalForecastRevenue === null) {
        displayVariancePercent = (totalPeriodRevenue === 0 || totalPeriodRevenue === null) ? "0.00%" : "N/A";
    } else {
        const percent = (varianceAmount / totalForecastRevenue) * 100;
        displayVariancePercent = `${percent.toFixed(2)}%`;
    }

    const variancePositiveColor = '#4CAF50'; // Green for positive variance
    const varianceNegativeColor = '#F44336'; // Red for negative variance

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                const valueParam = params.find(p => p.seriesName === '売上');
                if (!valueParam || valueParam.value === undefined) { // Check for undefined value from placeholder
                    // Try to get data from the placeholder if main series has no value (e.g. for base of variance)
                    const placeholderParam = params.find(p => p.seriesName === 'PlaceholderBase');
                    if (placeholderParam && valueParam && valueParam.name === '分散') {
                        // Special handling for variance tooltip if actual value is on placeholder
                    } else if (!valueParam) {
                        return '';
                    }
                }

                let tooltipText = `${valueParam.name}<br/>`; // X-axis category

                if (valueParam.name === '分散') {
                    tooltipText += `${valueParam.marker || ''} 金額: ${formatYenInTenThousands(varianceAmount)}<br/>`; // Use varianceAmount directly
                    tooltipText += `率: ${displayVariancePercent}`;
                } else {
                    // For '計画売上' and '実績売上', valueParam.value is correct
                    tooltipText += `${valueParam.marker || ''} 金額: ${formatYenInTenThousands(valueParam.value)}`;
                }
                return tooltipText;
            }
        },
        grid: { left: '3%', right: '10%', bottom: '10%', containLabel: true },
        xAxis: [{
            type: 'category',
            data: ['計画売上', '分散', '実績売上'],
            splitLine: { show: false },
            axisLabel: { interval: 0 }
        }],
        yAxis: [{
            type: 'value',
            name: '金額 (万円)',
            axisLabel: { formatter: (value) => `${(value / 10000).toLocaleString('ja-JP')}` },
            splitLine: { show: true }
        }],
        series: [
            { // Invisible base for stacking
                name: 'PlaceholderBase',
                type: 'bar',
                stack: 'total',
                barWidth: '60%', // Adjust bar width as needed
                itemStyle: { borderColor: 'transparent', color: 'transparent' },
                emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
                data: [
                    0, // Base for '計画売上' is 0
                    varianceAmount >= 0 ? totalForecastRevenue : totalPeriodRevenue, // Base for '分散'
                    0  // Base for '実績売上' is 0
                ]
            },
            { // Visible bars
                name: '売上',
                type: 'bar',
                stack: 'total',
                barWidth: '60%',
                label: {
                    show: true,
                    formatter: (params) => {
                        if (params.name === '分散') {
                            return displayVariancePercent;
                        }
                        return formatYenInTenThousandsNoDecimal(params.value);
                    }
                },
                data: [
                    { // 計画売上
                        value: totalForecastRevenue,
                        itemStyle: { color: colorScheme.forecast },
                        label: { position: 'top' }
                    },
                    { // 分散                
                        value: Math.abs(varianceAmount),
                        itemStyle: { color: varianceAmount >= 0 ? variancePositiveColor : varianceNegativeColor },
                        label: { position: 'top' }
                    },
                    { // 実績売上
                        value: totalPeriodRevenue,
                        itemStyle: { color: colorScheme.actual },
                        label: { position: 'top' }
                    }
                ]
            }
        ]
    };
});
const allHotelsOccupancyChartOptions = computed(() => {
    const data = allHotelsOccupancyChartData.value;
    if (!data.length) return {};
    const hotels = data.map(d => d.hotel_name);
    const forecast = data.map(d => parseFloat(d.forecast_occupancy_rate.toFixed(1)));
    const actual = data.map(d => parseFloat(d.actual_occupancy_rate.toFixed(1)));
    const prevYear = data.map(d => parseFloat(d.prev_year_occupancy_rate.toFixed(1)));

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: function (params) {
                let res = params[0].name + '<br/>';
                params.forEach(p => {
                    res += p.marker + p.seriesName + ': ' + p.value + '%<br/>';
                });
                return res;
            }
        },
        legend: { data: ['前年度同月度稼働率', '実績稼働率', '計画稼働率'] },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'value', axisLabel: { formatter: '{value}%' }, max: 100 },
        yAxis: { type: 'category', data: hotels, inverse: true },
        series: [
            {
                name: '前年度同月度稼働率',
                type: 'bar',
                data: prevYear,
                itemStyle: { color: '#909399' }
            },
            {
                name: '実績稼働率',
                type: 'bar',
                data: actual,
                itemStyle: { color: colorScheme.actual }
            },
            {
                name: '計画稼働率',
                type: 'bar',
                data: forecast,
                itemStyle: { color: colorScheme.forecast },
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
    if (hasRevenueDataForChart.value) {
        initOrUpdateChart(monthlyChartInstance, monthlyChartContainer, monthlyChartOptions.value);
        initOrUpdateChart(totalChartInstance, totalChartContainer, totalChartOptions.value);
    } else {
        monthlyChartInstance.value?.dispose(); monthlyChartInstance.value = null;
        totalChartInstance.value?.dispose(); totalChartInstance.value = null;
    }
    if (hasAllHotelsOccupancyData.value) {
        initOrUpdateChart(allHotelsOccupancyChartInstance, allHotelsOccupancyChartContainer, allHotelsOccupancyChartOptions.value);
    } else {
        allHotelsOccupancyChartInstance.value?.dispose(); allHotelsOccupancyChartInstance.value = null;
    }
};
const disposeAllCharts = () => {
    monthlyChartInstance.value?.dispose(); monthlyChartInstance.value = null;
    totalChartInstance.value?.dispose(); totalChartInstance.value = null;
    allHotelsOccupancyChartInstance.value?.dispose(); allHotelsOccupancyChartInstance.value = null;
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
    //console.log('RYCAll: onMounted', props.revenueData, props.occupancyData);

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
watch([monthlyChartOptions, totalChartOptions], () => {
    if (selectedView.value === 'graph') {
        refreshAllCharts();
    }
}, { deep: true });
watch(selectedView, async (newView) => {
    if (newView === 'graph') {
        await nextTick();
        disposeAllCharts();
        refreshAllCharts();
    } else {
        disposeAllCharts();
    }
});
</script>