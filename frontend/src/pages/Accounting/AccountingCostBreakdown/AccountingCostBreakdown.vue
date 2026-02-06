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

                        <!-- Reference Month Filter -->
                        <div class="flex flex-col gap-2">
                            <label
                                class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                <span>基準月 (12ヶ月累計)</span>
                                <span v-if="latestMonth"
                                    class="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                    最終更新: {{ latestMonthLabel }}
                                </span>
                            </label>
                            <Select v-model="selectedMonth" :options="monthOptions" optionLabel="label"
                                optionValue="value" placeholder="基準月を選択" fluid />
                        </div>

                        <!-- Hotel Filter -->
                        <div class="flex flex-col gap-2">
                            <label
                                class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                対象施設 (マッピング済み)
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
                                        <div class="flex items-center justify-end gap-1">
                                            <span>通期平均</span>
                                            <i class="pi pi-question-circle text-slate-300 hover:text-slate-500 cursor-help text-xs"
                                                v-tooltip.top="'通期平均の計算方法（当年度）:\n• 特定施設選択時: その施設の当年度の月平均コスト\n• 全施設選択時: 全施設の当年度月間総コスト ÷ 月数 ÷ 施設数\n\n※ 当年度 = 1月1日から現在まで'"></i>
                                        </div>
                                    </th>
                                    <th
                                        class="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">
                                        <div class="flex items-center justify-end gap-1">
                                            <span>直近12ヶ月</span>
                                            <i class="pi pi-question-circle text-slate-300 hover:text-slate-500 cursor-help text-xs"
                                                v-tooltip.top="'直近12ヶ月平均の計算方法:\n• 特定施設選択時: その施設の直近12ヶ月の月平均コスト\n• 全施設選択時: 全施設の直近12ヶ月総コスト ÷ 月数 ÷ 施設数\n\n※ 基準月から遡って12ヶ月間のデータを使用'"></i>
                                        </div>
                                    </th>
                                    <th
                                        class="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">
                                        <div class="flex items-center justify-end gap-1">
                                            <span>全体平均</span>
                                            <i class="pi pi-question-circle text-slate-300 hover:text-slate-500 cursor-help text-xs"
                                                v-tooltip.top="'全体平均の計算方法（ベンチマーク）:\n1. 各施設の当年度月平均コストを個別に計算\n2. 全施設の当年度月平均コストを平均化\n\n例: 施設A=10万円/月、施設B=20万円/月 → 全体平均=15万円/月\n※ 施設規模に関係なく公平な比較基準（当年度ベース）'"></i>
                                        </div>
                                    </th>
                                    <th
                                        class="py-4 px-6 text-xs font-black text-violet-500 uppercase tracking-widest text-right">
                                        <div class="flex items-center justify-end gap-1">
                                            <span>売上比率</span>
                                            <i class="pi pi-question-circle text-violet-300 hover:text-violet-500 cursor-help text-xs"
                                                v-tooltip.top="'売上比率（収益インパクト）の計算方法:\n(この経費科目の総コスト ÷ 総売上) × 100\n\n選択した施設・期間でのこの経費が売上に占める割合\n※ 低いほど収益性への影響が小さい'"></i>
                                        </div>
                                    </th>
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
                                        {{ formatCurrency(item.currentYearAvg) }}
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
                                            {{ item.revenueImpact.toFixed(1) }}%
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Radar Chart -->
                <RevenueImpactRadarChart 
                    :analyticsSummary="analyticsSummary" 
                    :rawData="rawData"
                    :mappedHotels="mappedHotels"
                    :selectedMonth="selectedMonth"
                    :latestMonth="latestMonth"
                />
            </div>

            <!-- Utility Details Breakdown -->
            <UtilityDetailsBreakdown
                v-if="!loading"
                :selectedHotelId="selectedHotelId"
                :selectedMonth="selectedMonth"
                :latestMonth="latestMonth"
                :mappedHotels="mappedHotels"
                :occupancyData="rawData.occupancyData || []"
            />

            <!-- Scatter Charts -->
            <ScatterChartsGrid 
                v-if="!loading && topAccounts.length > 0"
                :topAccounts="topAccounts"
                :rawData="rawData"
                :selectedHotelId="selectedHotelId"
                :mappedHotels="mappedHotels"
            />

            <!-- Empty State -->
            <div v-if="!loading && topAccounts.length === 0"
                class="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <i class="pi pi-inbox text-6xl text-slate-200 dark:text-slate-700 mb-4"></i>
                <p class="text-slate-700 dark:text-slate-300 font-bold text-lg">コスト分析データが見つかりません</p>
                <p class="text-slate-500 dark:text-slate-400 text-sm mt-2 text-center max-w-md">
                    データを表示するには、以下の設定が必要です：
                </p>
                <div class="mt-4 text-left bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 max-w-md">
                    <ol class="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li>会計データ（Yayoi）をインポート</li>
                        <li class="font-bold text-amber-600 dark:text-amber-400">部門を施設にマッピング（必須）</li>
                        <li>勘定科目コードを登録</li>
                    </ol>
                </div>
                <button @click="$router.push({ name: 'AccountingSettings' })"
                    class="mt-6 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg">
                    <i class="pi pi-cog"></i>
                    <span>会計設定へ移動</span>
                </button>
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
import { ref, computed, onMounted, nextTick } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { useToast } from 'primevue/usetoast';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import { formatMonth } from '@/utils/formatUtils';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { RadarChart, ScatterChart, LineChart, BarChart } from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    VisualMapComponent,
    GridComponent
} from 'echarts/components';

// Import components
import RevenueImpactRadarChart from './components/RevenueImpactRadarChart.vue';
import ScatterChartsGrid from './components/ScatterChartsGrid.vue';
import UtilityDetailsBreakdown from './components/UtilityDetailsBreakdown.vue';

// Register ECharts modules
use([
    CanvasRenderer,
    RadarChart,
    ScatterChart,
    LineChart,
    BarChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    VisualMapComponent,
    GridComponent
]);

const accountingStore = useAccountingStore();
const hotelStore = useHotelStore();
const toast = useToast();

const topN = ref(5);
const selectedHotelId = ref(0); // 0 = All Hotels
const selectedMonth = ref(null);
const loading = ref(true);
const rawData = ref({ topAccounts: [], timeSeries: [] });
const mappedHotels = ref([]); // Hotels that have assigned departments

// Hotel options for select - Only show mapped hotels
const hotelOptions = computed(() => {
    const options = [{ label: 'すべての施設 (全体平均と比較)', value: 0 }];
    if (mappedHotels.value?.length) {
        mappedHotels.value.forEach(h => {
            options.push({ label: h.hotel_name, value: h.hotel_id });
        });
    }
    return options;
});

// Month options from time series
const monthOptions = computed(() => {
    if (!rawData.value?.timeSeries?.length) return [];

    const months = [...new Set(rawData.value.timeSeries.map(d => d.month))];
    return months.sort().reverse().map(m => ({
        label: formatMonth(m),
        value: m
    }));
});

const latestMonth = computed(() => {
    if (!rawData.value?.timeSeries?.length) return null;
    const months = rawData.value.timeSeries.map(d => d.month);
    return months.sort().reverse()[0];
});

const latestMonthLabel = computed(() => {
    if (!latestMonth.value) return '';
    return `${latestMonth.value.substring(0, 4)}/${latestMonth.value.substring(5, 7)}`;
});

const topAccounts = computed(() => rawData.value?.topAccounts || []);

/**
 * Perform frontend aggregation of cost data based on selected hotel
 */
const analyticsSummary = computed(() => {
    if (!topAccounts.value?.length || !rawData.value?.timeSeries?.length) return [];

    const referenceDate = selectedMonth.value ? new Date(selectedMonth.value) : (latestMonth.value ? new Date(latestMonth.value) : new Date());
    const twelveMonthsAgo = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 11, 1);

    const latestDataYear = latestMonth.value ? new Date(latestMonth.value).getFullYear() : new Date().getFullYear();

    const summary = topAccounts.value.map(account => {
        const accountData = rawData.value.timeSeries.filter(d => d.account_code === account.code);

        // 1. Calculate metrics for the SELECTED scope
        let currentYearAvg, last12mAvg;
        
        if (selectedHotelId.value === 0) {
            // For "All Hotels": Calculate average cost per hotel per month
            const monthlyData = aggregateByMonth(accountData);
            const uniqueHotels = [...new Set(accountData.map(d => d.hotel_id))];
            const hotelCount = uniqueHotels.length || 1;
            
            // Current Year Average (based on latest data year) - using string comparison to avoid timezone issues
            const currentYearData = monthlyData.filter(d => {
                // Extract year from the ISO string (e.g., "2025" from "2025-11-30T15:00:00.000Z")
                const monthString = d.month.substring(0, 7); // "YYYY-MM"
                const year = parseInt(monthString.substring(0, 4));
                const month = parseInt(monthString.substring(5, 7));
                
                // Only include months from the data year (2025) starting from January
                // This excludes December of previous year (2024-12) that might be included in last 12 months
                return year === latestDataYear && month >= 1;
            });
            const totalCurrentYearCost = currentYearData.reduce((sum, d) => sum + Number(d.cost), 0);
            currentYearAvg = currentYearData.length > 0 ? totalCurrentYearCost / currentYearData.length / hotelCount : 0;
            
            // Last 12 months calculation (unchanged)
            const last12mMonthlyData = monthlyData.filter(d => new Date(d.month) >= twelveMonthsAgo);
            const totalLast12mCost = last12mMonthlyData.reduce((sum, d) => sum + Number(d.cost), 0);
            last12mAvg = last12mMonthlyData.length > 0 ? totalLast12mCost / last12mMonthlyData.length / hotelCount : 0;
            
        } else {
            // For specific hotel: Calculate average monthly cost for that hotel
            const hotelData = accountData.filter(d => d.hotel_id === selectedHotelId.value);
            
            // Current Year Average (based on latest data year) - using string comparison to avoid timezone issues
            const currentYearHotelData = hotelData.filter(d => {
                // Extract year-month from the ISO string (e.g., "2025-11" from "2025-11-30T15:00:00.000Z")
                const monthString = d.month.substring(0, 7); // "YYYY-MM"
                const year = parseInt(monthString.substring(0, 4));
                const month = parseInt(monthString.substring(5, 7));
                
                // Only include months from the data year (2025) starting from January
                // This excludes December of previous year (2024-12) that might be included in last 12 months
                return year === latestDataYear && month >= 1;
            });
            const totalCurrentYearCost = currentYearHotelData.reduce((sum, d) => sum + Number(d.cost), 0);
            currentYearAvg = currentYearHotelData.length > 0 ? totalCurrentYearCost / currentYearHotelData.length : 0;
            
            // Last 12 months calculation
            const last12mHotelData = hotelData.filter(d => new Date(d.month) >= twelveMonthsAgo);
            const totalLast12mCost = last12mHotelData.reduce((sum, d) => sum + Number(d.cost), 0);
            last12mAvg = last12mHotelData.length > 0 ? totalLast12mCost / last12mHotelData.length : 0;
        }

        // 2. Global Average (Benchmark)
        const allHotelData = accountData;
        const uniqueHotels = [...new Set(allHotelData.map(d => d.hotel_id))];
        
        // Calculate per-hotel data year averages, then average those
        const hotelDataYearAverages = uniqueHotels.map(hotelId => {
            const hotelMonthlyData = allHotelData.filter(d => d.hotel_id === hotelId);
            const hotelDataYearData = hotelMonthlyData.filter(d => {
                // Extract year-month from the ISO string and ensure it's from the data year starting from January
                const monthString = d.month.substring(0, 7); // "YYYY-MM"
                const year = parseInt(monthString.substring(0, 4));
                const month = parseInt(monthString.substring(5, 7));
                
                // Only include months from the data year (2025) starting from January
                return year === latestDataYear && month >= 1;
            });
            const hotelDataYearTotal = hotelDataYearData.reduce((sum, d) => sum + Number(d.cost), 0);
            const hotelDataYearAvg = hotelDataYearData.length > 0 ? hotelDataYearTotal / hotelDataYearData.length : 0;
            
            return hotelDataYearAvg;
        });
        
        const globalAvg = hotelDataYearAverages.length > 0
            ? hotelDataYearAverages.reduce((sum, avg) => sum + avg, 0) / hotelDataYearAverages.length
            : 0;
            
        // 3. Revenue Impact - total lifetime cost over total accumulated revenue until selected date
        // Use ALL data for this account across ALL hotels and ALL time periods
        const allAccountData = rawData.value.timeSeries.filter(d => d.account_code === account.code);
        const lifetimeTotalCost = allAccountData.reduce((sum, d) => sum + Number(d.cost), 0);
        
        // For revenue denominator, use ALL revenue data up to the selected date (2025-11)
        // This ensures all accounts use the same revenue base for comparison
        const selectedDate = selectedMonth.value ? new Date(selectedMonth.value) : (latestMonth.value ? new Date(latestMonth.value) : new Date());
        const allRevenueDataUpToDate = rawData.value.timeSeries.filter(d => new Date(d.month) <= selectedDate);
        const totalAccumulatedRevenue = allRevenueDataUpToDate.reduce((sum, d) => sum + Number(d.sales), 0);
        
        const revenueImpact = totalAccumulatedRevenue > 0 ? (lifetimeTotalCost / totalAccumulatedRevenue) * 100 : 0;

        const result = {
            ...account,
            currentYearAvg,
            last12mAvg,
            globalAvg,
            revenueImpact
        };
        
        return result;
    });

    // Sort by 直近12ヶ月平均 (last12mAvg) in descending order (bigger to smaller)
    const sortedSummary = [...summary].sort((a, b) => b.last12mAvg - a.last12mAvg);
    
    return sortedSummary;
});

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
        if (response?.success && response.data) {
            rawData.value = response.data;
            await nextTick();

            // Set default selected month if not set
            if (!selectedMonth.value && latestMonth.value) {
                selectedMonth.value = latestMonth.value;
            }
        } else {
            rawData.value = { topAccounts: [], timeSeries: [] };
        }
    } catch (e) {
        console.error('Failed to load cost breakdown data', e);
        toast.add({
            severity: 'error',
            summary: 'データ読み込み失敗',
            detail: `経費データの取得に失敗しました: ${e.message || '予期せぬエラー'}`,
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

const fetchMappings = async () => {
    try {
        const response = await accountingStore.fetchProfitLossDepartments();
        if (response?.success) {
            // Aggregate unique hotels from all historical department mappings
            const hotelMap = new Map();
            response.data.forEach(d => {
                if (d.hotel_id && !hotelMap.has(d.hotel_id)) {
                    hotelMap.set(d.hotel_id, {
                        hotel_id: d.hotel_id,
                        hotel_name: d.hotel_name
                    });
                }
            });
            mappedHotels.value = Array.from(hotelMap.values()).sort((a, b) =>
                (a.hotel_name || '').localeCompare(b.hotel_name || '', 'ja')
            );
        }
    } catch (e) {
        console.error('Failed to fetch departments', e);
        toast.add({
            severity: 'error',
            summary: 'マッピング取得失敗',
            detail: `施設マッピングの取得に失敗しました: ${e.message || '予期せぬエラー'}`,
            life: 5000
        });
    }
};

onMounted(() => {
    loadData();
    fetchMappings();
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
