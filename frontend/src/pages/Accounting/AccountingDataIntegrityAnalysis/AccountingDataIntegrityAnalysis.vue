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
                <AnalysisSummaryCards :summaryTotals="summaryTotals" />

                <!-- Results Section -->
                <div v-if="!selectedHotelId">
                    <!-- Hotel Summary Table -->
                    <HotelSummaryTable 
                        :hotelSummary="hotelSummary" 
                        @viewHotelDetails="viewHotelDetails" 
                    />
                </div>

                <!-- Hotel Details View -->
                <div v-else>
                    <HotelDetailsTable 
                        :selectedHotelName="selectedHotelName"
                        :selectedMonthLabel="getSelectedMonthLabel()"
                        :hotelAnalysisData="hotelAnalysisForSelectedHotel"
                        @backToSummary="selectedHotelId = null; selectedHotelName = ''"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAccountingStore } from '@/composables/useAccountingStore';
import AnalysisSummaryCards from './components/AnalysisSummaryCards.vue';
import HotelSummaryTable from './components/HotelSummaryTable.vue';
import HotelDetailsTable from './components/HotelDetailsTable.vue';

const router = useRouter();
const accountingStore = useAccountingStore();

const selectedMonth = ref('');
const analysisData = ref(null);
const isLoading = ref(false);
const hasError = ref(false);
const availableMonthsData = ref([]);

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
    if (!analysisData.value || !analysisData.value.hotelTotals) return [];
    
    // Use the hotelTotals data directly from the API
    return analysisData.value.hotelTotals.map(hotel => ({
        hotel_id: hotel.hotel_id,
        hotel_name: hotel.hotel_name,
        total_pms_amount: parseFloat(hotel.total_pms_amount) || 0,
        total_yayoi_amount: parseFloat(hotel.total_yayoi_amount) || 0,
        total_difference: parseFloat(hotel.total_difference) || 0,
        issue_count: hotel.missing_rates_count || 0 // Use missing rates as issue count for now
    })).sort((a, b) => a.hotel_name.localeCompare(b.hotel_name));
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
const hotelAnalysisForSelectedHotel = computed(() => {
    if (!analysisData.value || !analysisData.value.analysis || !selectedHotelId.value) return [];
    
    return analysisData.value.analysis.filter(item => {
        return item.hotel_id === selectedHotelId.value;
    });
});

const getSelectedMonthLabel = () => {
    if (!selectedMonth.value) return '';
    const monthData = availableMonths.value.find(m => m.value === selectedMonth.value);
    return monthData ? monthData.label : selectedMonth.value;
};

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

const viewHotelDetails = (hotelId, hotelName) => {
    selectedHotelId.value = hotelId;
    selectedHotelName.value = hotelName;
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