<template>
    <div class="min-h-screen p-2">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-96 space-y-4">
            <ProgressSpinner size="large" />
            <div class="text-lg font-medium text-gray-700">会計データを読み込み中...</div>
        </div>

        <!-- Main Content -->
        <div v-else class="grid grid-cols-12 gap-4">
            <ReportSelectionCard v-model:selectedMonth="selectedMonth" v-model:viewMode="viewMode"
                :viewOptions="viewOptions" />

            <div v-if="!hasData" class="col-span-12 py-20 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <i class="pi pi-info-circle text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
                <p class="text-xl font-bold text-gray-500 dark:text-gray-400">会計データがまだありません</p>
                <p class="text-gray-400 dark:text-gray-500 mt-2">選択したホテルと期間のデータが読み込まれていないか、部門の紐付けが設定されていない可能性があります。</p>
            </div>

            <template v-else>
                <!-- Evolution Chart Panel -->
                <Panel header="損益推移" toggleable class="col-span-12">
                    <Card>
                        <template #content>
                            <div ref="evolutionChartRef" class="w-full h-80"></div>
                        </template>
                    </Card>
                </Panel>

                <!-- Simplified P&L Table Panel -->
                <Panel header="要約損益計算書" toggleable class="col-span-12">
                    <Card>
                        <template #content>
                            <DataTable :value="aggregatedData" class="p-datatable-sm tabular-nums">
                                <Column field="monthLabel" header="月" />
                                <Column field="revenue" header="売上高">
                                    <template #body="slotProps">
                                        {{ formatCurrency(slotProps.data.revenue) }}
                                    </template>
                                </Column>
                                <Column field="costs" header="売上原価・経費">
                                    <template #body="slotProps">
                                        <span class="text-orange-600">
                                            {{ formatCurrency(slotProps.data.costs) }}
                                        </span>
                                    </template>
                                </Column>
                                <Column field="operatingProfit" header="営業利益">
                                    <template #body="slotProps">
                                        <span :class="slotProps.data.operatingProfit < 0 ? 'text-red-500 font-bold' : 'text-emerald-600 font-bold'">
                                            {{ formatCurrency(slotProps.data.operatingProfit) }}
                                        </span>
                                    </template>
                                </Column>
                                <Column field="costRatio" header="経費率">
                                    <template #body="slotProps">
                                        <span class="text-xs text-gray-500">
                                            {{ slotProps.data.costRatio.toFixed(1) }}%
                                        </span>
                                    </template>
                                </Column>
                                <Column field="margin" header="営業利益率">
                                    <template #body="slotProps">
                                        <span :class="['font-semibold', slotProps.data.margin < 0 ? 'text-red-400' : 'text-emerald-500']">
                                            {{ slotProps.data.margin.toFixed(1) }}%
                                        </span>
                                    </template>
                                </Column>
                            </DataTable>
                        </template>
                    </Card>
                </Panel>
            </template>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { ProgressSpinner, Card, Panel, DataTable, Column } from 'primevue';
import ReportSelectionCard from './components/ReportSelectionCard.vue';
import { useReportStore } from '@/composables/useReportStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { formatDate } from '@/utils/dateUtils';
import * as echarts from 'echarts/core';
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([TooltipComponent, GridComponent, LegendComponent, LineChart, UniversalTransition, CanvasRenderer]);

const reportStore = useReportStore();
const hotelStore = useHotelStore();

const selectedMonth = ref(new Date());
const viewMode = ref('yearCumulative');
const viewOptions = ref([
    { name: '単月表示', value: 'month' },
    { name: '年度累計表示', value: 'yearCumulative' }
]);

const isLoading = ref(false);
const rawData = ref([]);
const evolutionChartRef = ref(null);
let myChart = null;

const hasData = computed(() => rawData.value.length > 0);

const dateRange = computed(() => {
    const date = new Date(selectedMonth.value);
    const year = date.getFullYear();

    if (viewMode.value === 'month') {
        const start = new Date(year, date.getMonth(), 1);
        const end = new Date(year, date.getMonth() + 1, 0);
        return { start: formatDate(start), end: formatDate(end) };
    } else {
        const start = new Date(year, 0, 1);
        const end = new Date(year, date.getMonth() + 1, 0);
        return { start: formatDate(start), end: formatDate(end) };
    }
});

const aggregatedData = computed(() => {
    if (!rawData.value.length) return [];

    // Group by month
    const monthGroups = {};
    rawData.value.forEach(item => {
        const month = formatDate(new Date(item.month)).substring(0, 7);
        if (!monthGroups[month]) {
            monthGroups[month] = {
                month,
                monthLabel: `${month.substring(0, 4)}年${month.substring(5, 7)}月`,
                revenue: 0,
                costs: 0,
                operatingProfit: 0
            };
        }

        const amount = parseFloat(item.net_amount || 0);
        const order = parseInt(item.management_group_display_order);

        if (order === 1) {
            monthGroups[month].revenue += amount;
        } else if (order >= 2 && order <= 5) {
            monthGroups[month].costs += amount;
        }
    });

    return Object.values(monthGroups).map(m => {
        const opProfit = m.revenue + m.costs;
        return {
            ...m,
            operatingProfit: opProfit,
            costRatio: m.revenue !== 0 ? (Math.abs(m.costs) / m.revenue) * 100 : 0,
            margin: m.revenue !== 0 ? (opProfit / m.revenue) * 100 : 0
        };
    }).sort((a, b) => a.month.localeCompare(b.month));
});

const fetchData = async () => {
    if (!hotelStore.selectedHotelId.value) return;

    isLoading.value = true;
    try {
        const { start, end } = dateRange.value;
        rawData.value = await reportStore.fetchAccountingProfitLoss(hotelStore.selectedHotelId.value, start, end);
        await nextTick();
        initChart();
    } catch (error) {
        console.error('Error fetching accounting P&L:', error);
    } finally {
        isLoading.value = false;
    }
};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0
    }).format(value);
};

const initChart = () => {
    if (!evolutionChartRef.value || !hasData.value) return;

    if (!myChart) {
        myChart = echarts.init(evolutionChartRef.value);
    }

    const months = aggregatedData.value.map(d => d.monthLabel);
    const revenueData = aggregatedData.value.map(d => d.revenue);
    const costsData = aggregatedData.value.map(d => Math.abs(d.costs));
    const profitData = aggregatedData.value.map(d => d.operatingProfit);

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                let res = `${params[0].name}<br/>`;
                params.forEach(p => {
                    res += `${p.marker} ${p.seriesName}: ${formatCurrency(p.value)}<br/>`;
                });
                return res;
            }
        },
        legend: {
            data: ['売上高', '費用', '営業利益'],
            bottom: 0
        },
        grid: {
            top: '10%',
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: months
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: (value) => {
                    if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                    if (Math.abs(value) >= 1000) return (value / 1000).toFixed(0) + 'K';
                    return value;
                }
            }
        },
        series: [
            {
                name: '売上高',
                type: 'line',
                data: revenueData,
                itemStyle: { color: '#10b981' }, // Emerald-500
                smooth: true
            },
            {
                name: '費用',
                type: 'line',
                data: costsData,
                itemStyle: { color: '#f97316' }, // Orange-500
                smooth: true
            },
            {
                name: '営業利益',
                type: 'line',
                data: profitData,
                itemStyle: { color: '#3b82f6' }, // Blue-500
                smooth: true,
                areaStyle: {
                    opacity: 0.1
                }
            }
        ]
    };

    myChart.setOption(option);
};

const handleResize = () => {
    if (myChart) myChart.resize();
};

onMounted(async () => {
    await hotelStore.fetchHotels();
    await hotelStore.fetchHotel();
    fetchData();
    window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (myChart) myChart.dispose();
});

watch([selectedMonth, viewMode, () => hotelStore.selectedHotelId.value], fetchData);
</script>

<style scoped>
.tabular-nums {
    font-variant-numeric: tabular-nums;
}
</style>
