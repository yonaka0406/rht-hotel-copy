<template>
    <div class="bg-slate-50 dark:bg-slate-900 p-6 font-sans transition-colors duration-300 min-h-screen">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                    <button @click="$router.push({ name: 'AccountingDashboard' })" 
                        class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer shadow-sm h-[46px]">
                        <i class="pi pi-arrow-left text-sm"></i>
                        <span>戻る</span>
                    </button>
                    <div>
                        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">データ整合性分析</h1>
                        <p class="text-sm text-slate-500 dark:text-slate-400">PMS売上計算と弥生会計データの詳細比較を行います</p>
                    </div>
                </div>

                <!-- Period Selector -->
                <div class="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-w-[240px]">
                    <span class="text-sm font-medium text-slate-600 dark:text-slate-400 ml-2 whitespace-nowrap">対象期間:</span>
                    <select v-model="selectedMonth" @change="fetchAnalysisData"
                        :disabled="availableMonths.length === 0"
                        class="flex-1 px-3 py-2 bg-transparent border-none text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent dark:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        <option v-if="availableMonths.length === 0" value="">弥生データなし</option>
                        <option v-for="month in availableMonths" :key="month.value" :value="month.value">
                            {{ month.label }}
                        </option>
                    </select>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="isLoading" class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                <span class="ml-3 text-slate-600 dark:text-slate-400">分析データを読み込み中...</span>
            </div>

            <!-- Error State -->
            <div v-else-if="hasError" 
                class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                <i class="pi pi-exclamation-circle text-red-600 dark:text-red-400 text-3xl mb-4"></i>
                <h3 class="text-lg font-bold text-red-800 dark:text-red-300 mb-2">データの読み込みに失敗しました</h3>
                <p class="text-sm text-red-600 dark:text-red-400 mb-4">
                    分析データを取得できませんでした。しばらく経ってから再試行してください。
                </p>
                <button @click="fetchAnalysisData" 
                    class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    再試行
                </button>
            </div>

            <!-- No Yayoi Data State -->
            <div v-else-if="availableMonths.length === 0" 
                class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
                <i class="pi pi-info-circle text-amber-600 dark:text-amber-400 text-3xl mb-4"></i>
                <h3 class="text-lg font-bold text-amber-800 dark:text-amber-300 mb-2">弥生会計データがありません</h3>
                <p class="text-sm text-amber-600 dark:text-amber-400 mb-4">
                    分析を行うには、まず弥生会計データをインポートしてください。
                </p>
                <button @click="$router.push({ name: 'AccountingYayoiImport' })" 
                    class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                    弥生会計インポートへ
                </button>
            </div>

            <!-- Analysis Results -->
            <div v-else-if="analysisData">
                <!-- Summary Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-4">
                            <div class="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                <i class="pi pi-list text-slate-600 dark:text-slate-400"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">総差異件数</span>
                        </div>
                        <p class="text-2xl font-bold text-slate-900 dark:text-white">
                            {{ summaryTotals.totalDiscrepancies }}
                        </p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">プラン・ホテル組み合わせ</p>
                    </div>

                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-4">
                            <div class="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                                <i class="pi pi-exclamation-triangle text-red-600 dark:text-red-400"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">料金明細なし</span>
                        </div>
                        <p class="text-2xl font-bold text-red-600 dark:text-red-400">
                            {{ summaryTotals.missingRatesCount }}
                        </p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">税区分判定不可</p>
                    </div>

                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-4">
                            <div class="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                                <i class="pi pi-link text-amber-600 dark:text-amber-400"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">マッピングなし</span>
                        </div>
                        <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {{ summaryTotals.noMappingCount }}
                        </p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">会計科目未設定</p>
                    </div>

                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-4">
                            <div class="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <i class="pi pi-search text-blue-600 dark:text-blue-400"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">類似名称マッチ</span>
                        </div>
                        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {{ summaryTotals.fuzzyMatchCount }}
                        </p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">自動推定マッチング</p>
                    </div>

                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-4">
                            <div class="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                                <i class="pi pi-calculator text-violet-600 dark:text-violet-400"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">総差額</span>
                        </div>
                        <p class="text-2xl font-bold" 
                           :class="summaryTotals.totalDifference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                            {{ summaryTotals.totalDifference >= 0 ? '+' : '' }}¥{{ Math.abs(summaryTotals.totalDifference).toLocaleString() }}
                        </p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">PMS - 弥生</p>
                    </div>
                </div>

                <!-- Results Section -->
                <div v-if="!selectedHotelId">
                    <!-- Hotel Summary Table -->
                    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div class="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <i class="pi pi-building text-violet-600 dark:text-violet-400"></i>
                                ホテル別概要
                            </h2>
                            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                各ホテルのPMS売上と弥生データの比較概要
                            </p>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead class="bg-slate-50 dark:bg-slate-900/50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            ホテル名
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            PMS売上合計
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            弥生データ合計
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            差額
                                        </th>
                                        <th class="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            問題件数
                                        </th>
                                        <th class="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            操作
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
                                    <tr v-for="hotel in hotelSummary" :key="hotel.hotel_id"
                                        class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td class="px-6 py-4">
                                            <div class="font-medium text-slate-900 dark:text-white">{{ hotel.hotel_name }}</div>
                                        </td>
                                        <td class="px-6 py-4 text-right">
                                            <div class="text-sm font-medium text-slate-900 dark:text-white">
                                                ¥{{ new Intl.NumberFormat('ja-JP').format(hotel.total_pms_amount) }}
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 text-right">
                                            <div class="text-sm font-medium text-slate-900 dark:text-white">
                                                ¥{{ new Intl.NumberFormat('ja-JP').format(hotel.total_yayoi_amount) }}
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 text-right">
                                            <div class="text-sm font-medium"
                                                 :class="hotel.total_difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                                                {{ hotel.total_difference >= 0 ? '+' : '' }}¥{{ new Intl.NumberFormat('ja-JP').format(Math.abs(hotel.total_difference)) }}
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 text-center">
                                            <div class="flex items-center justify-center gap-2">
                                                <span v-if="hotel.issue_count > 0" 
                                                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                                    {{ hotel.issue_count }}件
                                                </span>
                                                <span v-else 
                                                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                                    正常
                                                </span>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 text-center">
                                            <button @click="viewHotelDetails(hotel.hotel_id, hotel.hotel_name)"
                                                    class="inline-flex items-center px-3 py-1 bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-medium rounded-lg transition-colors">
                                                <i class="pi pi-eye mr-1"></i>
                                                詳細表示
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Hotel Details View -->
                <div v-else>
                    <!-- Back Button and Hotel Header -->
                    <div class="mb-6">
                        <button @click="selectedHotelId = null; selectedHotelName = ''"
                                class="inline-flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors mb-4">
                            <i class="pi pi-arrow-left mr-2"></i>
                            ホテル一覧に戻る
                        </button>
                        
                        <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                {{ selectedHotelName }} - プラン別詳細分析
                            </h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400">
                                PMS売上計算と弥生会計データのプラン別比較
                            </p>
                        </div>
                    </div>

                    <!-- Filters for Details View -->
                    <div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
                        <div class="flex flex-wrap items-center gap-4">
                            <div class="flex items-center gap-2">
                                <label class="text-sm font-medium text-slate-700 dark:text-slate-300">問題種別:</label>
                                <select v-model="selectedIssueType" @change="applyFilters"
                                    class="px-3 py-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm">
                                    <option value="">すべて</option>
                                    <option value="missing_rates">料金明細なし</option>
                                    <option value="no_mapping">マッピングなし</option>
                                    <option value="amount_mismatch">金額不一致</option>
                                </select>
                            </div>
                            <div class="flex items-center gap-2">
                                <label class="text-sm font-medium text-slate-700 dark:text-slate-300">最小差額:</label>
                                <input v-model.number="minDifference" @input="applyFilters" type="number" step="1000"
                                    class="px-3 py-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm w-24"
                                    placeholder="0">
                            </div>
                        </div>
                    </div>

                    <!-- Plan Details Table -->
                    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div class="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <i class="pi pi-table text-violet-600 dark:text-violet-400"></i>
                                プラン別詳細分析
                            </h2>
                            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {{ filteredHotelAnalysis.length }} 件の差異を表示中
                            </p>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead class="bg-slate-50 dark:bg-slate-900/50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            プラン名
                                        </th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            税率
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            PMS売上
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            弥生データ
                                        </th>
                                        <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            差額
                                        </th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            問題種別
                                        </th>
                                        <th class="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            詳細情報
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
                                    <tr v-for="item in filteredHotelAnalysis" :key="`${item.hotel_id}-${item.plan_name}-${item.tax_rate}`"
                                        class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td class="px-6 py-4">
                                            <div>
                                                <div class="font-medium text-slate-900 dark:text-white">{{ item.plan_name }}</div>
                                                <div v-if="item.category_name" class="text-xs text-slate-400">{{ item.category_name }}</div>
                                                <div v-if="item.match_type === 'fuzzy'" class="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                    <i class="pi pi-search text-xs mr-1"></i>類似名称でマッチング
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 text-sm text-slate-900 dark:text-white">
                                            {{ (item.tax_rate * 100).toFixed(1) }}%
                                        </td>
                                        <td class="px-6 py-4 text-right">
                                            <div class="text-sm font-medium text-slate-900 dark:text-white">
                                                ¥{{ new Intl.NumberFormat('ja-JP').format(item.pms_amount) }}
                                            </div>
                                            <div v-if="item.reservation_count > 0" class="text-xs text-slate-500 dark:text-slate-400">
                                                {{ item.reservation_count }}件の予約
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 text-right">
                                            <div class="text-sm font-medium text-slate-900 dark:text-white">
                                                ¥{{ new Intl.NumberFormat('ja-JP').format(item.yayoi_amount) }}
                                            </div>
                                            <div v-if="item.yayoi_transaction_count > 0" class="text-xs text-slate-500 dark:text-slate-400">
                                                {{ item.yayoi_transaction_count }}件の取引
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 text-right">
                                            <div class="text-sm font-medium"
                                                 :class="item.difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                                                {{ item.difference >= 0 ? '+' : '' }}¥{{ new Intl.NumberFormat('ja-JP').format(Math.abs(item.difference)) }}
                                            </div>
                                        </td>
                                        <td class="px-6 py-4">
                                            <span :class="getIssueTypeClass(item.issue_type)"
                                                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium">
                                                {{ getIssueTypeLabel(item.issue_type) }}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 text-center">
                                            <div class="text-xs text-slate-500 dark:text-slate-400">
                                                <div v-if="item.missing_rates_count > 0">
                                                    料金明細なし: {{ item.missing_rates_count }}件
                                                </div>
                                                <div v-if="item.mapping_type">
                                                    マッピング: {{ item.mapping_type }}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAccountingStore } from '@/composables/useAccountingStore';

const router = useRouter();
const accountingStore = useAccountingStore();

const selectedMonth = ref('');
const analysisData = ref(null);
const isLoading = ref(false);
const hasError = ref(false);
const availableMonthsData = ref([]);

// Filters
const selectedIssueType = ref('');
const selectedHotel = ref('');
const minDifference = ref(0);

// Hotel drill-down state
const selectedHotelId = ref(null);
const selectedHotelName = ref('');

// Available months from Yayoi data
const availableMonths = computed(() => {
    return availableMonthsData.value.map(month => ({
        value: month.value,
        label: month.label
    }));
});

// Hotel summary for overview table
const hotelSummary = computed(() => {
    if (!analysisData.value || !analysisData.value.analysis) return [];
    
    const hotelMap = new Map();
    
    analysisData.value.analysis.forEach(item => {
        const hotelId = item.hotel_id;
        if (!hotelMap.has(hotelId)) {
            hotelMap.set(hotelId, {
                hotel_id: hotelId,
                hotel_name: item.hotel_name,
                total_pms_amount: 0,
                total_yayoi_amount: 0,
                total_difference: 0,
                issue_count: 0
            });
        }
        
        const hotel = hotelMap.get(hotelId);
        // Ensure proper numeric conversion
        hotel.total_pms_amount += parseFloat(item.pms_amount) || 0;
        hotel.total_yayoi_amount += parseFloat(item.yayoi_amount) || 0;
        hotel.total_difference += parseFloat(item.difference) || 0;
        
        if (item.issue_type && item.issue_type !== 'ok') {
            hotel.issue_count++;
        }
    });
    
    return Array.from(hotelMap.values()).sort((a, b) => a.hotel_name.localeCompare(b.hotel_name));
});

// Calculate summary totals from hotel summary instead of raw analysis data
const summaryTotals = computed(() => {
    if (!hotelSummary.value.length) {
        return {
            totalDiscrepancies: 0,
            missingRatesCount: 0,
            noMappingCount: 0,
            amountMismatchCount: 0,
            fuzzyMatchCount: 0,
            totalDifference: 0
        };
    }
    
    // Use hotel summary for total difference calculation
    const totalDifference = hotelSummary.value.reduce((sum, hotel) => sum + hotel.total_difference, 0);
    
    // Use analysis data for issue counts
    const analysis = analysisData.value?.analysis || [];
    
    return {
        totalDiscrepancies: analysis.length,
        missingRatesCount: analysis.filter(a => a.issue_type === 'missing_rates').length,
        noMappingCount: analysis.filter(a => a.issue_type === 'no_mapping').length,
        amountMismatchCount: analysis.filter(a => a.issue_type === 'amount_mismatch').length,
        fuzzyMatchCount: analysis.filter(a => a.match_type === 'fuzzy').length,
        totalDifference: totalDifference
    };
});

// Filtered analysis for selected hotel details
const filteredHotelAnalysis = computed(() => {
    if (!analysisData.value || !analysisData.value.analysis || !selectedHotelId.value) return [];
    
    return analysisData.value.analysis.filter(item => {
        if (item.hotel_id !== selectedHotelId.value) return false;
        if (selectedIssueType.value && item.issue_type !== selectedIssueType.value) return false;
        if (minDifference.value && Math.abs(item.difference) < minDifference.value) return false;
        return true;
    });
});

// Get unique hotels from analysis data
const uniqueHotels = computed(() => {
    if (!analysisData.value || !analysisData.value.analysis) return [];
    const hotels = new Map();
    analysisData.value.analysis.forEach(item => {
        if (!hotels.has(item.hotel_id)) {
            hotels.set(item.hotel_id, { id: item.hotel_id, name: item.hotel_name });
        }
    });
    return Array.from(hotels.values()).sort((a, b) => a.name.localeCompare(b.name));
});

// Filtered analysis results
const filteredAnalysis = computed(() => {
    if (!analysisData.value || !analysisData.value.analysis) return [];
    
    return analysisData.value.analysis.filter(item => {
        if (selectedIssueType.value && item.issue_type !== selectedIssueType.value) return false;
        if (selectedHotel.value && item.hotel_id !== parseInt(selectedHotel.value)) return false;
        if (minDifference.value && Math.abs(item.difference) < minDifference.value) return false;
        return true;
    });
});

const fetchAvailableMonths = async () => {
    try {
        const response = await accountingStore.getAvailableYayoiMonths();
        availableMonthsData.value = response.months || [];
        
        // Set default to the latest available month if no selection
        if (!selectedMonth.value && response.latestMonth) {
            selectedMonth.value = response.latestMonth;
        }
    } catch (error) {
        console.error('Failed to fetch available Yayoi months:', error);
        // Fallback to empty array
        availableMonthsData.value = [];
    }
};

const fetchAnalysisData = async () => {
    if (!selectedMonth.value) return;
    
    try {
        isLoading.value = true;
        hasError.value = false;
        
        const result = await accountingStore.getDetailedDiscrepancyAnalysis({
            selectedMonth: selectedMonth.value,
            hotelIds: null // Let backend determine hotels with department mappings
        });
        
        analysisData.value = result;
    } catch (error) {
        console.error('Failed to fetch analysis data:', error);
        hasError.value = true;
    } finally {
        isLoading.value = false;
    }
};

const applyFilters = () => {
    // Filters are applied automatically via computed property
};

const getIssueTypeClass = (issueType) => {
    switch (issueType) {
        case 'missing_rates':
            return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
        case 'no_mapping':
            return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300';
        case 'amount_mismatch':
            return 'bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-300';
        default:
            return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
};

const getIssueTypeLabel = (issueType) => {
    switch (issueType) {
        case 'missing_rates':
            return '料金明細なし';
        case 'no_mapping':
            return 'マッピングなし';
        case 'amount_mismatch':
            return '金額不一致';
        default:
            return '正常';
    }
};

const viewHotelDetails = (hotelId, hotelName) => {
    selectedHotelId.value = hotelId;
    selectedHotelName.value = hotelName;
    // Reset filters when viewing hotel details
    selectedIssueType.value = '';
    minDifference.value = 0;
};

const showItemDetails = (item) => {
    // TODO: Implement detailed view modal or navigation
    console.log('Show details for:', item);
};

onMounted(async () => {
    // Fetch available months first
    await fetchAvailableMonths();
    
    // Then fetch analysis data if we have a selected month
    if (selectedMonth.value) {
        await fetchAnalysisData();
    }
});
</script>

<style scoped>
/* Select Dark Mode Fixes */
.dark select {
    background: #0f172a !important;
    border-color: #334155 !important;
    color: #f8fafc !important;
}

.dark select option {
    background: #1e293b !important;
    color: #f8fafc !important;
}
</style>