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
        label: `${m.substring(0, 4)}年${m.substring(5, 7)}月`,
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

    console.log('=== COST BREAKDOWN CALCULATIONS ===');
    console.log('Reference Date (Latest Available):', referenceDate.toISOString().substring(0, 7));
    console.log('12 Months Ago (from latest data):', twelveMonthsAgo.toISOString().substring(0, 7));
    console.log('Selected Hotel ID:', selectedHotelId.value);
    console.log('Raw Time Series Data:', rawData.value.timeSeries.length, 'records');

    const summary = topAccounts.value.map(account => {
        console.log(`\n--- ACCOUNT: ${account.name} (${account.code}) ---`);
        
        const accountData = rawData.value.timeSeries.filter(d => d.account_code === account.code);
        console.log('Account Data Records:', accountData.length);
        console.log('Account Data Sample:', accountData.slice(0, 3));

        // 1. Calculate metrics for the SELECTED scope
        let currentYearAvg, last12mAvg;
        
        // Get "current year" based on the latest available data, not actual current year
        const latestDataYear = latestMonth.value ? new Date(latestMonth.value).getFullYear() : new Date().getFullYear();
        const currentYearStart = new Date(latestDataYear, 0, 1); // January 1st of the data year
        const currentYearEnd = latestMonth.value ? new Date(latestMonth.value) : new Date();
        
        console.log('Data Year (from latest available data):', latestDataYear);
        console.log('Current Year Range:', currentYearStart.toISOString().substring(0, 7), 'to', currentYearEnd.toISOString().substring(0, 7));
        
        if (selectedHotelId.value === 0) {
            console.log('CALCULATION MODE: All Hotels');
            
            // For "All Hotels": Calculate average cost per hotel per month
            const monthlyData = aggregateByMonth(accountData);
            const uniqueHotels = [...new Set(accountData.map(d => d.hotel_id))];
            const hotelCount = uniqueHotels.length || 1;
            
            console.log('Monthly Aggregated Data:', monthlyData.length, 'months');
            console.log('Unique Hotels:', uniqueHotels, `(${hotelCount} hotels)`);
            console.log('Monthly Data Sample:', monthlyData.slice(0, 3));
            
            // Current Year Average (based on latest data year)
            const currentYearData = monthlyData.filter(d => {
                const monthDate = new Date(d.month);
                return monthDate >= currentYearStart && monthDate <= currentYearEnd;
            });
            const totalCurrentYearCost = currentYearData.reduce((sum, d) => sum + Number(d.cost), 0);
            currentYearAvg = currentYearData.length > 0 ? totalCurrentYearCost / currentYearData.length / hotelCount : 0;
            
            console.log('Current Year Calculation (Data Year):');
            console.log('  Data Year:', latestDataYear);
            console.log('  Current Year Data:', currentYearData.length, 'months');
            console.log('  Date Range:', currentYearData.length > 0 ? `${currentYearData[0]?.month} to ${currentYearData[currentYearData.length - 1]?.month}` : 'No data');
            console.log('  Total Cost:', totalCurrentYearCost.toLocaleString());
            console.log('  Hotels:', hotelCount);
            console.log('  Average per hotel per month:', currentYearAvg.toLocaleString());

            // Last 12 months calculation (unchanged)
            const last12mMonthlyData = monthlyData.filter(d => new Date(d.month) >= twelveMonthsAgo);
            const totalLast12mCost = last12mMonthlyData.reduce((sum, d) => sum + Number(d.cost), 0);
            last12mAvg = last12mMonthlyData.length > 0 ? totalLast12mCost / last12mMonthlyData.length / hotelCount : 0;
            
            console.log('Last 12M Calculation:');
            console.log('  Filtered Months:', last12mMonthlyData.length);
            console.log('  Total Cost:', totalLast12mCost.toLocaleString());
            console.log('  Average per hotel per month:', last12mAvg.toLocaleString());
            
        } else {
            console.log('CALCULATION MODE: Specific Hotel', selectedHotelId.value);
            
            // For specific hotel: Calculate average monthly cost for that hotel
            const hotelData = accountData.filter(d => d.hotel_id === selectedHotelId.value);
            console.log('Hotel Data Records:', hotelData.length);
            console.log('Hotel Data Sample:', hotelData.slice(0, 3));
            
            // Current Year Average (based on latest data year)
            const currentYearHotelData = hotelData.filter(d => {
                const monthDate = new Date(d.month);
                return monthDate >= currentYearStart && monthDate <= currentYearEnd;
            });
            const totalCurrentYearCost = currentYearHotelData.reduce((sum, d) => sum + Number(d.cost), 0);
            currentYearAvg = currentYearHotelData.length > 0 ? totalCurrentYearCost / currentYearHotelData.length : 0;
            
            console.log('Current Year Calculation (Data Year):');
            console.log('  Data Year:', latestDataYear);
            console.log('  Current Year Data:', currentYearHotelData.length, 'months');
            console.log('  Date Range:', currentYearHotelData.length > 0 ? `${currentYearHotelData[0]?.month} to ${currentYearHotelData[currentYearHotelData.length - 1]?.month}` : 'No data');
            console.log('  Total Cost:', totalCurrentYearCost.toLocaleString());
            console.log('  Average per month:', currentYearAvg.toLocaleString());

            // Last 12 months calculation (unchanged)
            const last12mHotelData = hotelData.filter(d => new Date(d.month) >= twelveMonthsAgo);
            const totalLast12mCost = last12mHotelData.reduce((sum, d) => sum + Number(d.cost), 0);
            last12mAvg = last12mHotelData.length > 0 ? totalLast12mCost / last12mHotelData.length : 0;
            
            console.log('Last 12M Calculation:');
            console.log('  Filtered Months:', last12mHotelData.length);
            console.log('  Total Cost:', totalLast12mCost.toLocaleString());
            console.log('  Average per month:', last12mAvg.toLocaleString());
        }

        // 2. Global Average (Benchmark)
        console.log('GLOBAL AVERAGE CALCULATION:');
        let globalAvg;
        
        if (selectedHotelId.value === 0) {
            // When "All Hotels" is selected, benchmark should equal the current year average
            // because we're comparing "all hotels" against "all hotels"
            globalAvg = currentYearAvg;
            console.log('All Hotels Selected - Benchmark equals Current Year Average:', globalAvg.toLocaleString());
        } else {
            // When specific hotel is selected, benchmark is the average across all hotels (using data year)
            const allHotelData = accountData;
            const uniqueHotels = [...new Set(allHotelData.map(d => d.hotel_id))];
            
            console.log('Specific Hotel Selected - Calculating benchmark across all hotels:', uniqueHotels);
            console.log('Using Data Year for Benchmark:', latestDataYear);
            
            // Calculate per-hotel data year averages, then average those
            const hotelDataYearAverages = uniqueHotels.map(hotelId => {
                const hotelMonthlyData = allHotelData.filter(d => d.hotel_id === hotelId);
                const hotelDataYearData = hotelMonthlyData.filter(d => {
                    const monthDate = new Date(d.month);
                    return monthDate >= currentYearStart && monthDate <= currentYearEnd;
                });
                const hotelDataYearTotal = hotelDataYearData.reduce((sum, d) => sum + Number(d.cost), 0);
                const hotelDataYearAvg = hotelDataYearData.length > 0 ? hotelDataYearTotal / hotelDataYearData.length : 0;
                
                console.log(`  Hotel ${hotelId}: ${hotelDataYearData.length} months (data year), total: ${hotelDataYearTotal.toLocaleString()}, avg: ${hotelDataYearAvg.toLocaleString()}`);
                return hotelDataYearAvg;
            });
            
            globalAvg = hotelDataYearAverages.length > 0
                ? hotelDataYearAverages.reduce((sum, avg) => sum + avg, 0) / hotelDataYearAverages.length
                : 0;
                
            console.log('Global Average Result (Data Year):', globalAvg.toLocaleString());
        }

        // 3. Revenue Impact - what percentage this expense represents of total revenue
        console.log('REVENUE IMPACT CALCULATION:');
        const selectedScopeData = selectedHotelId.value === 0
            ? aggregateByMonth(accountData)
            : accountData.filter(d => d.hotel_id === selectedHotelId.value);
            
        const accountTotalCost = selectedScopeData.reduce((sum, d) => sum + Number(d.cost), 0);
        console.log('Account Total Cost:', accountTotalCost.toLocaleString());
        console.log('Account Cost Data Period:', selectedScopeData.length, 'months');
        console.log('Account Cost Date Range:', 
            selectedScopeData.length > 0 ? 
            `${selectedScopeData[0]?.month} to ${selectedScopeData[selectedScopeData.length - 1]?.month}` : 
            'No data');
        
        // Calculate total revenue for the SAME SCOPE AND TIME PERIOD as the cost
        let totalRevenue = 0;
        if (selectedHotelId.value === 0) {
            // For all hotels: use the same monthly aggregation as cost data
            const allRevenueData = rawData.value.timeSeries;
            const monthlyRevenueTotals = aggregateByMonth(allRevenueData);
            
            // Filter to match the same months as the cost data
            const costMonths = new Set(selectedScopeData.map(d => d.month));
            const matchingRevenueData = monthlyRevenueTotals.filter(d => costMonths.has(d.month));
            
            totalRevenue = matchingRevenueData.reduce((sum, d) => sum + Number(d.sales), 0);
            console.log('All Hotels - Matching Revenue Records:', matchingRevenueData.length);
            console.log('All Hotels - Revenue Date Range:', 
                matchingRevenueData.length > 0 ? 
                `${matchingRevenueData[0]?.month} to ${matchingRevenueData[matchingRevenueData.length - 1]?.month}` : 
                'No data');
            console.log('All Hotels - Total Revenue (matching period):', totalRevenue.toLocaleString());
        } else {
            // For specific hotel: use the same time period as cost data
            const hotelRevenueData = rawData.value.timeSeries.filter(d => d.hotel_id === selectedHotelId.value);
            
            // Filter to match the same months as the cost data
            const costMonths = new Set(selectedScopeData.map(d => d.month));
            const matchingRevenueData = hotelRevenueData.filter(d => costMonths.has(d.month));
            
            totalRevenue = matchingRevenueData.reduce((sum, d) => sum + Number(d.sales), 0);
            console.log('Specific Hotel - Matching Revenue Records:', matchingRevenueData.length);
            console.log('Specific Hotel - Revenue Date Range:', 
                matchingRevenueData.length > 0 ? 
                `${matchingRevenueData[0]?.month} to ${matchingRevenueData[matchingRevenueData.length - 1]?.month}` : 
                'No data');
            console.log('Specific Hotel - Total Revenue (matching period):', totalRevenue.toLocaleString());
        }
        
        const revenueImpact = totalRevenue > 0 ? (accountTotalCost / totalRevenue) * 100 : 0;
        console.log('Revenue Impact:', `${revenueImpact.toFixed(2)}%`);

        const result = {
            ...account,
            currentYearAvg,
            last12mAvg,
            globalAvg,
            revenueImpact
        };
        
        console.log('FINAL RESULT:', {
            name: result.name,
            code: result.code,
            currentYearAvg: result.currentYearAvg.toLocaleString(),
            last12mAvg: result.last12mAvg.toLocaleString(),
            globalAvg: result.globalAvg.toLocaleString(),
            revenueImpact: `${result.revenueImpact.toFixed(2)}%`
        });
        
        return result;
    });

    // Sort by 直近12ヶ月平均 (last12mAvg) in descending order (bigger to smaller)
    const sortedSummary = summary.sort((a, b) => b.last12mAvg - a.last12mAvg);
    console.log('\n=== FINAL SORTED SUMMARY ===');
    sortedSummary.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}: ${item.last12mAvg.toLocaleString()} (${item.revenueImpact.toFixed(1)}%)`);
    });
    console.log('=== END CALCULATIONS ===\n');
    
    return sortedSummary;
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
        if (response?.success && response.data) {
            rawData.value = response.data;

            // Set default selected month if not set
            if (!selectedMonth.value && latestMonth.value) {
                selectedMonth.value = latestMonth.value;
            }
        } else {
            rawData.value = { topAccounts: [], timeSeries: [] };
        }
    } catch (e) {
        console.error('Failed to load cost breakdown data', e);
    } finally {
        loading.value = false;
    }
};

const fetchMappings = async () => {
    try {
        const response = await accountingStore.getAvailableDepartments();
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
