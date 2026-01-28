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

// Import components
import RevenueImpactRadarChart from './components/RevenueImpactRadarChart.vue';
import ScatterChartsGrid from './components/ScatterChartsGrid.vue';

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

    // Get "current year" based on the latest available data, not actual current year
    // console.log('DEBUG: latestMonth.value =', latestMonth.value);
    // console.log('DEBUG: new Date(latestMonth.value) =', latestMonth.value ? new Date(latestMonth.value) : 'null');
    
    const latestDataYear = latestMonth.value ? new Date(latestMonth.value).getFullYear() : new Date().getFullYear();
    const currentYearStart = new Date(latestDataYear, 0, 1); // January 1st of the data year
    const currentYearEnd = latestMonth.value ? new Date(latestMonth.value) : new Date();
    
    // console.log('DEBUG: latestDataYear =', latestDataYear);
    // console.log('DEBUG: currentYearStart =', currentYearStart);

    // Helper function to format dates without timezone issues
    const formatDateLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    // === COST BREAKDOWN CALCULATIONS (COMMENTED OUT FOR PERFORMANCE) ===
    // console.log('=== COST BREAKDOWN CALCULATIONS ===');
    // console.log('Reference Date (Latest Available):', referenceDate.toISOString().substring(0, 7));
    // console.log('12 Months Ago (from latest data):', twelveMonthsAgo.toISOString().substring(0, 7));
    // console.log('Data Year (from latest available data):', latestDataYear);
    // console.log('Current Year Start (FIXED):', formatDateLocal(currentYearStart));
    // console.log('Current Year End:', currentYearEnd.toISOString().substring(0, 7));
    // console.log('Selected Hotel ID:', selectedHotelId.value);
    // console.log('Raw Time Series Data:', rawData.value.timeSeries.length, 'records');

    const summary = topAccounts.value.map(account => {
        // === ACCOUNT ANALYSIS (COMMENTED OUT FOR PERFORMANCE) ===
        // console.log(`\n--- ACCOUNT: ${account.name} (${account.code}) ---`);
        
        const accountData = rawData.value.timeSeries.filter(d => d.account_code === account.code);
        // console.log('Account Data Records:', accountData.length);
        
        // Special detailed logging for 水道光熱費 and Hotel 10 (COMMENTED OUT)
        /*
        if (account.code === '6110105' || account.name === '水道光熱費') {
            console.log('\n=== DETAILED ANALYSIS FOR 水道光熱費 ===');
            
            // Show all data for this account
            console.log('All data for this account:');
            accountData.forEach(d => {
                console.log(`  ${d.month}: Hotel ${d.hotel_id} - Cost: ${Number(d.cost).toLocaleString()}, Sales: ${Number(d.sales).toLocaleString()}`);
            });
            
            // Focus on selected hotel data (or Hotel 27 for detailed analysis)
            const selectedHotelForAnalysis = selectedHotelId.value === 0 ? 27 : selectedHotelId.value;
            const selectedHotelData = accountData.filter(d => d.hotel_id === selectedHotelForAnalysis);
            console.log(`\nHotel ${selectedHotelForAnalysis} month-by-month data:`);
            selectedHotelData.sort((a, b) => new Date(a.month) - new Date(b.month)).forEach(d => {
                console.log(`  ${d.month}: Cost: ¥${Number(d.cost).toLocaleString()}, Sales: ¥${Number(d.sales).toLocaleString()}`);
            });
            
            console.log('\nDate range analysis:');
            console.log('  Current Year Start (FIXED):', formatDateLocal(currentYearStart));
            console.log('  Current Year End:', currentYearEnd.toISOString().substring(0, 7));
            console.log('  12 Months Ago:', twelveMonthsAgo.toISOString().substring(0, 7));
            console.log('  Reference Date:', referenceDate.toISOString().substring(0, 7));
            console.log('  Latest Data Year:', latestDataYear);
            
            // Show which months fall into each category for the selected hotel
            const currentYearMonths = selectedHotelData.filter(d => {
                const monthDate = new Date(d.month);
                return monthDate >= currentYearStart && monthDate <= currentYearEnd;
            });
            
            const last12Months = selectedHotelData.filter(d => new Date(d.month) >= twelveMonthsAgo);
            
            console.log(`\nHotel ${selectedHotelForAnalysis} - Current Year months (通期平均):`);
            currentYearMonths.forEach(d => {
                console.log(`  ${d.month}: ¥${Number(d.cost).toLocaleString()}`);
            });
            
            console.log(`\nHotel ${selectedHotelForAnalysis} - Last 12 months (直近12ヶ月):`);
            last12Months.forEach(d => {
                console.log(`  ${d.month}: ¥${Number(d.cost).toLocaleString()}`);
            });
            
            // Calculate and show the averages
            const currentYearTotal = currentYearMonths.reduce((sum, d) => sum + Number(d.cost), 0);
            const currentYearAverage = currentYearMonths.length > 0 ? currentYearTotal / currentYearMonths.length : 0;
            
            const last12MonthsTotal = last12Months.reduce((sum, d) => sum + Number(d.cost), 0);
            const last12MonthsAverage = last12Months.length > 0 ? last12MonthsTotal / last12Months.length : 0;
            
            console.log(`\nCalculated Averages for Hotel ${selectedHotelForAnalysis}:`);
            console.log(`  通期平均 (${currentYearMonths.length} months): ¥${currentYearAverage.toLocaleString()}`);
            console.log(`  直近12ヶ月 (${last12Months.length} months): ¥${last12MonthsAverage.toLocaleString()}`);
            console.log(`  Should be different? ${currentYearAverage !== last12MonthsAverage ? 'YES' : 'NO'}`);
            
            console.log('=== END DETAILED ANALYSIS ===\n');
        }
        */
        
        // console.log('Account Data Sample:', accountData.slice(0, 3));

        // 1. Calculate metrics for the SELECTED scope
        let currentYearAvg, last12mAvg;
        
        // console.log('Data Year (from latest available data):', latestDataYear);
        // console.log('Current Year Range:', currentYearStart.toISOString().substring(0, 7), 'to', currentYearEnd.toISOString().substring(0, 7));
        
        if (selectedHotelId.value === 0) {
            // console.log('CALCULATION MODE: All Hotels');
            
            // For "All Hotels": Calculate average cost per hotel per month
            const monthlyData = aggregateByMonth(accountData);
            const uniqueHotels = [...new Set(accountData.map(d => d.hotel_id))];
            const hotelCount = uniqueHotels.length || 1;
            
            // console.log('Monthly Aggregated Data:', monthlyData.length, 'months');
            // console.log('Unique Hotels:', uniqueHotels, `(${hotelCount} hotels)`);
            // console.log('Monthly Data Sample:', monthlyData.slice(0, 3));
            
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
            
            // console.log('Current Year Calculation (Data Year):');
            // console.log('  Data Year:', latestDataYear);
            // console.log('  Current Year Data:', currentYearData.length, 'months');
            // console.log('  Date Range:', currentYearData.length > 0 ? `${currentYearData[0]?.month} to ${currentYearData[currentYearData.length - 1]?.month}` : 'No data');
            // console.log('  Total Cost:', totalCurrentYearCost.toLocaleString());
            // console.log('  Hotels:', hotelCount);
            // console.log('  Average per hotel per month:', currentYearAvg.toLocaleString());
            
            // Last 12 months calculation (unchanged)
            const last12mMonthlyData = monthlyData.filter(d => new Date(d.month) >= twelveMonthsAgo);
            const totalLast12mCost = last12mMonthlyData.reduce((sum, d) => sum + Number(d.cost), 0);
            last12mAvg = last12mMonthlyData.length > 0 ? totalLast12mCost / last12mMonthlyData.length / hotelCount : 0;
            
            // console.log('Last 12M Calculation:');
            // console.log('  Filtered Months:', last12mMonthlyData.length);
            // console.log('  Total Cost:', totalLast12mCost.toLocaleString());
            // console.log('  Average per hotel per month:', last12mAvg.toLocaleString());
            
            // Debug: Show each month included in current year calculation for 水道光熱費 (COMMENTED OUT)
            /*
            if (account.code === '6110105' || account.name === '水道光熱費') {
                console.log('  DEBUG - All Hotels Current Year months included (STRING-BASED, JANUARY+ ONLY):');
                currentYearData.forEach(d => {
                    const monthString = d.month.substring(0, 7);
                    console.log(`    ${d.month} (${monthString}): ¥${Number(d.cost).toLocaleString()}`);
                });
                
                console.log('  DEBUG - All Hotels Last 12 months included:');
                last12mMonthlyData.forEach(d => {
                    console.log(`    ${d.month}: ¥${Number(d.cost).toLocaleString()}`);
                });
                
                console.log('  DEBUG - Key difference:');
                console.log(`    Current Year: Only ${latestDataYear} months from January onwards`);
                console.log(`    Last 12M: Includes ${latestDataYear-1}-12 if available`);
            }
            */
            
        } else {
            // console.log('CALCULATION MODE: Specific Hotel', selectedHotelId.value);
            
            // For specific hotel: Calculate average monthly cost for that hotel
            const hotelData = accountData.filter(d => d.hotel_id === selectedHotelId.value);
            // console.log('Hotel Data Records:', hotelData.length);
            // console.log('Hotel Data Sample:', hotelData.slice(0, 3));
            
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
            
            // console.log('Current Year Calculation (Data Year):');
            // console.log('  Data Year:', latestDataYear);
            // console.log('  Current Year Data:', currentYearHotelData.length, 'months');
            // console.log('  Date Range:', currentYearHotelData.length > 0 ? `${currentYearHotelData[0]?.month} to ${currentYearHotelData[currentYearHotelData.length - 1]?.month}` : 'No data');
            // console.log('  Total Cost:', totalCurrentYearCost.toLocaleString());
            // console.log('  Average per month:', currentYearAvg.toLocaleString());

            // Last 12 months calculation
            const last12mHotelData = hotelData.filter(d => new Date(d.month) >= twelveMonthsAgo);
            const totalLast12mCost = last12mHotelData.reduce((sum, d) => sum + Number(d.cost), 0);
            last12mAvg = last12mHotelData.length > 0 ? totalLast12mCost / last12mHotelData.length : 0;
            
            // console.log('Last 12M Calculation:');
            // console.log('  Filtered Months:', last12mHotelData.length);
            // console.log('  Total Cost:', totalLast12mCost.toLocaleString());
            // console.log('  Average per month:', last12mAvg.toLocaleString());
            
            // Debug: Show each month included in current year calculation (COMMENTED OUT)
            /*
            if (account.code === '6110105' || account.name === '水道光熱費') {
                console.log('  DEBUG - Current Year months included (STRING-BASED, JANUARY+ ONLY):');
                currentYearHotelData.forEach(d => {
                    const monthString = d.month.substring(0, 7);
                    console.log(`    ${d.month} (${monthString}): ¥${Number(d.cost).toLocaleString()}`);
                });
                
                console.log('  DEBUG - Last 12 months included:');
                last12mHotelData.forEach(d => {
                    console.log(`    ${d.month}: ¥${Number(d.cost).toLocaleString()}`);
                });
                
                console.log('  DEBUG - Key difference:');
                console.log(`    Current Year: Only ${latestDataYear} months from January onwards`);
                console.log(`    Last 12M: Includes ${latestDataYear-1}-12 if available`);
                console.log('  DEBUG - Are the arrays identical?', 
                    JSON.stringify(currentYearHotelData.map(d => d.month)) === JSON.stringify(last12mHotelData.map(d => d.month)));
            }
            */
        }

        // 2. Global Average (Benchmark) - COMMENTED OUT FOR PERFORMANCE
        // console.log('GLOBAL AVERAGE CALCULATION:');
        
        // Always calculate benchmark as average of individual hotel performances
        const allHotelData = accountData;
        const uniqueHotels = [...new Set(allHotelData.map(d => d.hotel_id))];
        
        // console.log('Calculating benchmark across all hotels:', uniqueHotels);
        // console.log('Using Data Year for Benchmark:', latestDataYear);
        
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
            
            // console.log(`  Hotel ${hotelId}: ${hotelDataYearData.length} months (data year), total: ${hotelDataYearTotal.toLocaleString()}, avg: ${hotelDataYearAvg.toLocaleString()}`);
            return hotelDataYearAvg;
        });
        
        const globalAvg = hotelDataYearAverages.length > 0
            ? hotelDataYearAverages.reduce((sum, avg) => sum + avg, 0) / hotelDataYearAverages.length
            : 0;
            
        // console.log('Global Average Result (Average of individual hotels):', globalAvg.toLocaleString());
        
        // Debug: Compare the three values (COMMENTED OUT)
        // console.log('COMPARISON:');
        // console.log('  通期平均 (Current Year):', currentYearAvg.toLocaleString());
        // console.log('  直近12ヶ月 (Last 12M):', last12mAvg.toLocaleString());
        // console.log('  全体平均 (Global):', globalAvg.toLocaleString());
        // console.log('  Are they all equal?', currentYearAvg === last12mAvg && last12mAvg === globalAvg);

        // 3. Revenue Impact - total lifetime cost over total accumulated revenue until selected date
        // === REVENUE IMPACT CALCULATION (COMMENTED OUT FOR PERFORMANCE) ===
        // console.log('REVENUE IMPACT CALCULATION (CONSISTENT DENOMINATOR):');
        
        // Use ALL data for this account across ALL hotels and ALL time periods
        const allAccountData = rawData.value.timeSeries.filter(d => d.account_code === account.code);
        const lifetimeTotalCost = allAccountData.reduce((sum, d) => sum + Number(d.cost), 0);
        
        // For revenue denominator, use ALL revenue data up to the selected date (2025-11)
        // This ensures all accounts use the same revenue base for comparison
        const selectedDate = selectedMonth.value ? new Date(selectedMonth.value) : (latestMonth.value ? new Date(latestMonth.value) : new Date());
        const allRevenueDataUpToDate = rawData.value.timeSeries.filter(d => new Date(d.month) <= selectedDate);
        const totalAccumulatedRevenue = allRevenueDataUpToDate.reduce((sum, d) => sum + Number(d.sales), 0);
        
        // console.log('Account Lifetime Total Cost:', lifetimeTotalCost.toLocaleString());
        // console.log('Total Accumulated Revenue (up to', selectedDate.toISOString().substring(0, 7), '):', totalAccumulatedRevenue.toLocaleString());
        // console.log('Account Cost Data Records:', allAccountData.length);
        // console.log('Total Revenue Data Records (up to selected date):', allRevenueDataUpToDate.length);
        // console.log('Account Lifetime Date Range:', 
        //     allAccountData.length > 0 ? 
        //     `${allAccountData[0]?.month} to ${allAccountData[allAccountData.length - 1]?.month}` : 
        //     'No data');
        
        const revenueImpact = totalAccumulatedRevenue > 0 ? (lifetimeTotalCost / totalAccumulatedRevenue) * 100 : 0;
        // console.log('Lifetime Revenue Impact (vs total accumulated revenue):', `${revenueImpact.toFixed(2)}%`);

        const result = {
            ...account,
            currentYearAvg,
            last12mAvg,
            globalAvg,
            revenueImpact
        };
        
        // === FINAL RESULT (COMMENTED OUT FOR PERFORMANCE) ===
        // console.log('FINAL RESULT:', {
        //     name: result.name,
        //     code: result.code,
        //     currentYearAvg: result.currentYearAvg.toLocaleString(),
        //     last12mAvg: result.last12mAvg.toLocaleString(),
        //     globalAvg: result.globalAvg.toLocaleString(),
        //     revenueImpact: `${result.revenueImpact.toFixed(2)}%`
        // });
        
        return result;
    });

    // Sort by 直近12ヶ月平均 (last12mAvg) in descending order (bigger to smaller)
    const sortedSummary = summary.sort((a, b) => b.last12mAvg - a.last12mAvg);
    /*
    console.log('\n=== FINAL SORTED SUMMARY ===');
    sortedSummary.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}: ${item.last12mAvg.toLocaleString()} (${item.revenueImpact.toFixed(1)}%)`);
    });
    console.log('=== END CALCULATIONS ===\n');
    */
    
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
