<template>
    <div class="bg-slate-50 dark:bg-slate-900 p-6 font-sans transition-colors duration-300 min-h-screen">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div class="flex items-center gap-4">
                    <button @click="$router.go(-1)" 
                        class="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <i class="pi pi-arrow-left text-slate-600 dark:text-slate-400"></i>
                    </button>
                    <div
                        class="flex-shrink-0 inline-flex items-center justify-center p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
                        <i class="pi pi-exclamation-triangle text-2xl text-amber-600 dark:text-amber-400"></i>
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            データ整合性分析
                        </h1>
                        <p class="text-sm text-slate-600 dark:text-slate-400">
                            PMS売上計算と弥生会計データの詳細比較 • プラン別・ホテル別分析
                        </p>
                    </div>
                </div>

                <!-- Period Selector -->
                <div class="flex items-center gap-3">
                    <label class="text-sm font-medium text-slate-700 dark:text-slate-300">対象期間:</label>
                    <select v-model="selectedMonth" @change="fetchAnalysisData"
                        class="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent">
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

            <!-- Analysis Results -->
            <div v-else-if="analysisData">
                <!-- Summary Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-4">
                            <div class="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                <i class="pi pi-list text-slate-600 dark:text-slate-400"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">総差異件数</span>
                        </div>
                        <p class="text-2xl font-bold text-slate-900 dark:text-white">
                            {{ analysisData.summary.totalDiscrepancies }}
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
                            {{ analysisData.summary.missingRatesCount }}
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
                            {{ analysisData.summary.noMappingCount }}
                        </p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">会計科目未設定</p>
                    </div>

                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-4">
                            <div class="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                                <i class="pi pi-calculator text-violet-600 dark:text-violet-400"></i>
                            </div>
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">総差額</span>
                        </div>
                        <p class="text-2xl font-bold" 
                           :class="analysisData.summary.totalDifference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                            {{ analysisData.summary.totalDifference >= 0 ? '+' : '' }}¥{{ Math.abs(analysisData.summary.totalDifference).toLocaleString() }}
                        </p>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">PMS - 弥生</p>
                    </div>
                </div>

                <!-- Filters -->
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
                            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">ホテル:</label>
                            <select v-model="selectedHotel" @change="applyFilters"
                                class="px-3 py-1 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-sm">
                                <option value="">すべて</option>
                                <option v-for="hotel in uniqueHotels" :key="hotel.id" :value="hotel.id">
                                    {{ hotel.name }}
                                </option>
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

                <!-- Results Table -->
                <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div class="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="pi pi-table text-violet-600 dark:text-violet-400"></i>
                            詳細分析結果
                        </h2>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {{ filteredAnalysis.length }} 件の差異を表示中
                        </p>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        ホテル・プラン
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
                                        詳細
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
                                <tr v-for="item in filteredAnalysis" :key="`${item.hotel_id}-${item.plan_name}-${item.tax_rate}`"
                                    class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td class="px-6 py-4">
                                        <div>
                                            <div class="font-medium text-slate-900 dark:text-white">{{ item.hotel_name }}</div>
                                            <div class="text-sm text-slate-500 dark:text-slate-400">{{ item.plan_name }}</div>
                                            <div v-if="item.category_name" class="text-xs text-slate-400">{{ item.category_name }}</div>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-sm text-slate-900 dark:text-white">
                                        {{ (item.tax_rate * 100).toFixed(1) }}%
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="text-sm font-medium text-slate-900 dark:text-white">
                                            ¥{{ item.pms_amount.toLocaleString() }}
                                        </div>
                                        <div v-if="item.reservation_count > 0" class="text-xs text-slate-500 dark:text-slate-400">
                                            {{ item.reservation_count }} 予約
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="text-sm font-medium text-slate-900 dark:text-white">
                                            ¥{{ item.yayoi_amount.toLocaleString() }}
                                        </div>
                                        <div v-if="item.yayoi_transaction_count > 0" class="text-xs text-slate-500 dark:text-slate-400">
                                            {{ item.yayoi_transaction_count }} 取引
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <span class="text-sm font-medium"
                                              :class="item.difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                                            {{ item.difference >= 0 ? '+' : '' }}¥{{ Math.abs(item.difference).toLocaleString() }}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                              :class="getIssueTypeClass(item.issue_type)">
                                            {{ getIssueTypeLabel(item.issue_type) }}
                                        </span>
                                        <div v-if="item.missing_rates_count > 0" class="text-xs text-red-500 mt-1">
                                            {{ item.missing_rates_count }} 件の料金明細なし
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                        <button @click="showItemDetails(item)"
                                            class="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 text-sm font-medium">
                                            詳細
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Empty State -->
                    <div v-if="filteredAnalysis.length === 0" class="p-12 text-center">
                        <i class="pi pi-check-circle text-green-500 text-4xl mb-4"></i>
                        <h3 class="text-lg font-medium text-slate-900 dark:text-white mb-2">差異が見つかりませんでした</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400">
                            選択した条件では、PMS売上計算と弥生会計データに問題のある差異はありません。
                        </p>
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

// Filters
const selectedIssueType = ref('');
const selectedHotel = ref('');
const minDifference = ref(0);

// Generate available months (last 12 months)
const availableMonths = computed(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
        months.push({ value, label });
    }
    return months;
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

const showItemDetails = (item) => {
    // TODO: Implement detailed view modal or navigation
    console.log('Show details for:', item);
};

onMounted(() => {
    // Set default to last month
    if (availableMonths.value.length > 1) {
        selectedMonth.value = availableMonths.value[1].value;
        fetchAnalysisData();
    }
});
</script>

<style scoped>
/* Custom styles if needed */
</style>