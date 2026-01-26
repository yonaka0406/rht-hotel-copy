<template>
    <div class="bg-slate-50 dark:bg-slate-900 min-h-screen p-6 font-sans transition-colors duration-300">
        <div class="max-w-7xl mx-auto px-4">
            <!-- Header Area -->
            <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <button @click="$router.push({ name: 'AccountingDashboard' })"
                        class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer shadow-sm h-[46px]">
                        <i class="pi pi-arrow-left text-sm"></i>
                        <span>戻る</span>
                    </button>
                    <div>
                        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">コスト内訳分析</h1>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">主要経費の推移と施設間ベンチマーク</p>
                    </div>
                </div>
            </div>

            <!-- Controls Card -->
            <div
                class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden mb-8">
                <div class="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <!-- Top N Filter -->
                        <div class="flex flex-col gap-2">
                            <label
                                class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                表示する上位経費数
                            </label>
                            <InputNumber v-model="topN" :min="1" :max="20" showButtons buttonLayout="horizontal"
                                class="w-full" incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus"
                                @update:modelValue="loadData" />
                        </div>

                        <!-- Hotel Filter -->
                        <div class="flex flex-col gap-2">
                            <label
                                class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                対象施設
                            </label>
                            <Select v-model="selectedHotelId" :options="hotelOptions" optionLabel="label"
                                optionValue="value" placeholder="施設を選択" fluid />
                        </div>

                        <!-- Refresh Button -->
                        <div class="flex items-end">
                            <button @click="loadData" :disabled="loading"
                                class="w-full bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed">
                                <i v-if="loading" class="pi pi-spin pi-spinner"></i>
                                <i v-else class="pi pi-refresh"></i>
                                <span>{{ loading ? '読み込み中...' : 'データを更新' }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Metrics and Radar Row -->
            <div v-if="!loading && topAccounts.length > 0" class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                <!-- Summary Table -->
                <div
                    class="lg:col-span-12 xl:col-span-7 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden h-full">
                    <div class="p-6 border-b border-slate-100 dark:border-slate-700">
                        <h2 class="text-lg font-black text-slate-800 dark:text-white">経費比較サマリー</h2>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr
                                    class="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <th class="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        経費科目</th>
                                    <th
                                        class="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">
                                        通期平均</th>
                                    <th
                                        class="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">
                                        直近12ヶ月</th>
                                    <th
                                        class="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">
                                        全体平均</th>
                                    <th
                                        class="py-4 px-6 text-xs font-black text-violet-500 uppercase tracking-widest text-right">
                                        売上比率</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                                <tr v-for="item in analyticsSummary" :key="item.code"
                                    class="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                    <td class="py-4 px-6">
                                        <div class="flex flex-col">
                                            <span class="font-bold text-slate-700 dark:text-slate-200">{{ item.name
                                                }}</span>
                                            <span class="text-[10px] text-slate-400 font-medium">{{ item.code }}</span>
                                        </div>
                                    </td>
                                    <td
                                        class="py-4 px-4 text-right font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                                        {{ formatCurrency(item.lifetimeAvg) }}
                                    </td>
                                    <td
                                        class="py-4 px-4 text-right font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                                        {{ formatCurrency(item.last12mAvg) }}
                                    </td>
                                    <td
                                        class="py-4 px-4 text-right font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                                        {{ formatCurrency(item.globalAvg) }}
                                    </td>
                                    <td class="py-4 px-6 text-right">
                                        <span
                                            class="inline-flex items-center px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-black text-sm tabular-nums">
                                            {{ item.salesRatio.toFixed(1) }}%
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Radar Chart -->
                <div
                    class="lg:col-span-12 xl:col-span-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl p-6 h-full flex flex-col">
                    <div class="mb-4">
                        <h2 class="text-lg font-black text-slate-800 dark:text-white">コストバランス比較</h2>
                        <p class="text-xs text-slate-400 mt-1">選択施設と全体平均の構造比較</p>
                    </div>
                    <div class="flex-1 min-h-[400px]">
                        <v-chart class="h-full w-full" :option="radarOption" autoresize />
                    </div>
                </div>
            </div>

            <!-- Dispersion (Scatter) Charts Grid -->
            <div v-if="!loading && topAccounts.length > 0" class="mb-8">
                <div class="mb-6 flex items-center gap-3">
                    <div class="h-8 w-1 bg-violet-600 rounded-full"></div>
                    <h2 class="text-xl font-bold text-slate-800 dark:text-white">科目別相関分析 (売上 vs コスト)</h2>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div v-for="account in topAccounts" :key="account.code"
                        class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-bold text-slate-700 dark:text-slate-200">{{ account.name }}</h3>
                            <span
                                class="text-[10px] py-0.5 px-2 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">{{
                                account.code }}</span>
                        </div>
                        <div class="h-[300px]">
                            <v-chart class="h-full w-full" :option="getScatterOption(account)" autoresize />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="!loading && topAccounts.length === 0"
                class="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <i class="pi pi-inbox text-6xl text-slate-200 mb-4"></i>
                <p class="text-slate-500 font-bold">データが見つかりません</p>
                <p class="text-slate-400 text-sm mt-1">会計データをインポートしてください</p>
            </div>

            <!-- Skeleton Loading -->
            <div v-if="loading" class="space-y-8">
                <div class="h-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-3xl"></div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div v-for="i in 4" :key="i" class="h-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-3xl">
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { useHotelStore } from '@/composables/useHotelStore';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { RadarChart, ScatterChart, LineChart } from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    VisualMapComponent,
    GridComponent
} from 'echarts/components';
import VChart from 'vue-echarts';

// Register ECharts modules
use([
    CanvasRenderer,
    RadarChart,
    ScatterChart,
    LineChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    VisualMapComponent,
    GridComponent
]);

const accountingStore = useAccountingStore();
const hotelStore = useHotelStore();

const topN = ref(5);
const selectedHotelId = ref(0); // 0 = All Hotels
const loading = ref(true);
const rawData = ref({ topAccounts: [], timeSeries: [] });

// Hotel options for select
const hotelOptions = computed(() => {
    const options = [{ label: 'すべての施設', value: 0 }];
    if (hotelStore.hotels?.length) {
        hotelStore.hotels.forEach(h => {
            options.push({ label: h.name, value: h.id });
        });
    }
    return options;
});

const topAccounts = computed(() => rawData.value.topAccounts);

/**
 * Perform frontend aggregation of cost data based on selected hotel
 */
const analyticsSummary = computed(() => {
    if (!rawData.value.timeSeries.length) return [];

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    return topAccounts.value.map(account => {
        const accountData = rawData.value.timeSeries.filter(d => d.account_code === account.code);

        // 1. Calculate metrics for the SELECTED scope
        const selectedScopeData = selectedHotelId.value === 0
            ? aggregateByMonth(accountData) // Global (sum per month)
            : accountData.filter(d => d.hotel_id === selectedHotelId.value);

        const lifetimeAvg = selectedScopeData.length > 0
            ? selectedScopeData.reduce((sum, d) => sum + Number(d.cost), 0) / selectedScopeData.length
            : 0;

        const last12mItems = selectedScopeData.filter(d => new Date(d.month) >= twelveMonthsAgo);
        const last12mAvg = last12mItems.length > 0
            ? last12mItems.reduce((sum, d) => sum + Number(d.cost), 0) / last12mItems.length
            : 0;

        // 2. Global Average (Benchmark - always across all hotels individually, then average of hotel averages?)
        // Let's do simple global monthly average for benchmark.
        const globalMonthlyData = aggregateByMonth(accountData);
        const globalAvg = globalMonthlyData.length > 0
            ? globalMonthlyData.reduce((sum, d) => sum + Number(d.cost), 0) / globalMonthlyData.length
            : 0;

        // 3. Sales Ratio
        const totalCost = selectedScopeData.reduce((sum, d) => sum + Number(d.cost), 0);
        const totalSales = selectedScopeData.reduce((sum, d) => sum + Number(d.sales), 0);
        const salesRatio = totalSales > 0 ? (totalCost / totalSales) * 100 : 0;

        return {
            ...account,
            lifetimeAvg,
            last12mAvg,
            globalAvg,
            salesRatio
        };
    });
});

/**
 * Radar Chart configuration
 */
const radarOption = computed(() => {
    const indicators = analyticsSummary.value.map(item => ({
        name: item.name,
        // Max value should be slightly higher than the max cost found among the 3 metrics
        max: Math.max(...analyticsSummary.value.map(i => Math.max(i.lifetimeAvg, i.last12mAvg, i.globalAvg))) * 1.1 || 100
    }));

    return {
        tooltip: {
            trigger: 'item'
        },
        legend: {
            data: ['通期平均', '直近12ヶ月', '全体平均'],
            bottom: 0,
            textStyle: { color: '#94a3b8' }
        },
        radar: {
            indicator: indicators,
            shape: 'circle',
            splitNumber: 5,
            axisName: {
                color: '#64748b',
                fontWeight: 'bold'
            },
            splitLine: {
                lineStyle: {
                    color: ['rgba(148, 163, 184, 0.1)']
                }
            },
            splitArea: {
                show: false
            },
            axisLine: {
                lineStyle: {
                    color: 'rgba(148, 163, 184, 0.2)'
                }
            }
        },
        series: [
            {
                name: 'コスト構造比較',
                type: 'radar',
                data: [
                    {
                        value: analyticsSummary.value.map(i => i.lifetimeAvg),
                        name: '通期平均',
                        itemStyle: { color: '#6366f1' },
                        areaStyle: { opacity: 0.1 }
                    },
                    {
                        value: analyticsSummary.value.map(i => i.last12mAvg),
                        name: '直近12ヶ月',
                        itemStyle: { color: '#ec4899' },
                        areaStyle: { opacity: 0.1 }
                    },
                    {
                        value: analyticsSummary.value.map(i => i.globalAvg),
                        name: '全体平均',
                        itemStyle: { color: '#94a3b8' },
                        lineStyle: { type: 'dashed' }
                    }
                ]
            }
        ]
    };
});

/**
 * Scatter Chart configuration for dispersion
 */
const getScatterOption = (account) => {
    const accountData = rawData.value.timeSeries.filter(d => d.account_code === account.code);
    const selectedScopeData = selectedHotelId.value === 0
        ? aggregateByMonth(accountData)
        : accountData.filter(d => d.hotel_id === selectedHotelId.value);

    const scatterData = selectedScopeData.map(d => [Number(d.sales), Number(d.cost)]);

    return {
        grid: {
            top: 40,
            left: 50,
            right: 20,
            bottom: 40
        },
        tooltip: {
            formatter: (params) => {
                return `売上: ${formatCurrency(params.data[0])}<br/>コスト: ${formatCurrency(params.data[1])}`;
            }
        },
        xAxis: {
            name: '売上',
            nameLocation: 'middle',
            nameGap: 25,
            splitLine: { lineStyle: { type: 'dashed', color: 'rgba(148, 163, 184, 0.1)' } },
            axisLabel: { formatter: (v) => v / 10000 + '万' }
        },
        yAxis: {
            name: 'コスト',
            splitLine: { lineStyle: { type: 'dashed', color: 'rgba(148, 163, 184, 0.1)' } },
            axisLabel: { formatter: (v) => v / 1000 + 'k' }
        },
        series: [
            {
                symbolSize: 12,
                data: scatterData,
                type: 'scatter',
                itemStyle: {
                    color: '#6366f1',
                    opacity: 0.6
                }
            }
        ]
    };
};

// --- Helper Functions ---

/**
 * Aggregate costs and sales across multiple hotels for each month
 */
function aggregateByMonth(data) {
    const monthsMap = {};
    data.forEach(d => {
        if (!monthsMap[d.month]) {
            monthsMap[d.month] = { month: d.month, cost: 0, sales: 0 };
        }
        monthsMap[d.month].cost += Number(d.cost);
        monthsMap[d.month].sales += Number(d.sales);
    });
    return Object.values(monthsMap).sort((a, b) => new Date(a.month) - new Date(b.month));
}

const formatCurrency = (value) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);

const loadData = async () => {
    try {
        loading.value = true;
        const response = await accountingStore.fetchCostBreakdown({ topN: topN.value });
        if (response?.success) {
            rawData.value = response.data;
        }
    } catch (e) {
        console.error('Failed to load cost breakdown data', e);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadData();
    if (!hotelStore.hotels?.length) {
        hotelStore.fetchHotels();
    }
});
</script>

<style scoped>
.v-chart {
    width: 100%;
    height: 100%;
}
</style>
