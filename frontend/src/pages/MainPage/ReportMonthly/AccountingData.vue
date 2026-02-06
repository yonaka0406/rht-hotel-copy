<template>
    <div class="min-h-screen p-2">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-96 space-y-4">
            <ProgressSpinner size="large" />
            <div class="text-lg font-medium text-gray-700">会計データを読み込み中...</div>
        </div>

        <!-- Main Content -->
        <div v-else class="grid grid-cols-12 gap-4">
            <AccountingDataFilters
                v-model:selectedMonth="selectedMonth"
                v-model:viewMode="viewMode"
                :viewOptions="viewOptions"
            />

            <div v-if="!hasData" class="col-span-12 py-20 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <i class="pi pi-info-circle text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
                <p class="text-xl font-bold text-gray-500 dark:text-gray-400">会計データがまだありません</p>
                <p class="text-gray-400 dark:text-gray-500 mt-2">選択したホテルと期間のデータが読み込まれていないか、部門の紐付けが設定されていない可能性があります。</p>
            </div>

            <template v-else>
                <AccountingDataChart
                    :data="displayData"
                    :hasData="hasData"
                    v-model:comparePreviousYear="comparePreviousYear"
                    :viewMode="viewMode"
                />

                <AccountingDataTable
                    :data="displayData"
                    :viewMode="viewMode"
                />
            </template>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { ProgressSpinner } from 'primevue';
import AccountingDataFilters from './components/AccountingDataFilters.vue';
import AccountingDataChart from './components/AccountingDataChart.vue';
import AccountingDataTable from './components/AccountingDataTable.vue';
import { useReportStore } from '@/composables/useReportStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { formatDate } from '@/utils/dateUtils';

const reportStore = useReportStore();
const hotelStore = useHotelStore();

const selectedMonth = ref(new Date());
const viewMode = ref('yearCumulative');
const comparePreviousYear = ref(false);
const viewOptions = ref([
    { name: '単月表示', value: 'month' },
    { name: '年度累計表示', value: 'yearCumulative' }
]);

const isLoading = ref(false);
const rawData = ref([]);

const hasData = computed(() => rawData.value.some(item => {
    const itemDate = new Date(item.month);
    return itemDate.getFullYear() === selectedMonth.value.getFullYear();
}));

const fetchData = async () => {
    if (!hotelStore.selectedHotelId.value) return;

    isLoading.value = true;
    try {
        const date = new Date(selectedMonth.value);
        const year = date.getFullYear();

        // Fetch from Jan of previous year to support YoY and MoM
        const start = new Date(year - 1, 0, 1);
        const end = new Date(year, date.getMonth() + 1, 0);

        rawData.value = await reportStore.fetchAccountingProfitLoss(hotelStore.selectedHotelId.value, formatDate(start), formatDate(end));
    } catch (error) {
        console.error('Error fetching accounting P&L:', error);
    } finally {
        isLoading.value = false;
    }
};

const processedDataByMonth = computed(() => {
    const monthGroups = {};
    rawData.value.forEach(item => {
        const month = formatDate(new Date(item.month)).substring(0, 7);
        if (!monthGroups[month]) {
            monthGroups[month] = {
                month,
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

    // Compute operating profit for all months
    Object.values(monthGroups).forEach(m => {
        m.operatingProfit = m.revenue + m.costs;
        m.costRatio = m.revenue !== 0 ? (Math.abs(m.costs) / m.revenue) * 100 : 0;
        m.margin = m.revenue !== 0 ? (m.operatingProfit / m.revenue) * 100 : 0;
    });

    return monthGroups;
});

const displayData = computed(() => {
    const year = selectedMonth.value.getFullYear();
    const result = [];

    let startMonthIdx = 0;
    let endMonthIdx = selectedMonth.value.getMonth();

    if (viewMode.value === 'month') {
        startMonthIdx = endMonthIdx;
    }

    let cumulativeRevenue = 0;
    let cumulativeCosts = 0;
    let cumulativeOperatingProfit = 0;

    let prevCumulativeRevenue = 0;
    let prevCumulativeOperatingProfit = 0;

    // We need to calculate cumulative values from the start of the year, even if we only display one month
    for (let i = 0; i <= endMonthIdx; i++) {
        const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`;
        const currentData = processedDataByMonth.value[monthStr] || { month: monthStr, revenue: 0, costs: 0, operatingProfit: 0, costRatio: 0, margin: 0 };

        cumulativeRevenue += currentData.revenue;
        cumulativeCosts += currentData.costs;
        cumulativeOperatingProfit += currentData.operatingProfit;

        const prevYearMonthStr = `${year - 1}-${String(i + 1).padStart(2, '0')}`;
        const prevYearData = processedDataByMonth.value[prevYearMonthStr] || { revenue: 0, operatingProfit: 0 };

        prevCumulativeRevenue += prevYearData.revenue;
        prevCumulativeOperatingProfit += prevYearData.operatingProfit;

        if (i >= startMonthIdx) {
            // Calculate MoM
            const prevMonthDate = new Date(year, i - 1, 1);
            const prevMonthStr = formatDate(prevMonthDate).substring(0, 7);
            const prevMonthData = processedDataByMonth.value[prevMonthStr];

            const revenueMoM = (prevMonthData && prevMonthData.revenue !== 0)
                ? ((currentData.revenue - prevMonthData.revenue) / Math.abs(prevMonthData.revenue)) * 100
                : null;
            const profitMoM = (prevMonthData && prevMonthData.operatingProfit !== 0)
                ? ((currentData.operatingProfit - prevMonthData.operatingProfit) / Math.abs(prevMonthData.operatingProfit)) * 100
                : null;

            // Calculate YoY
            const revenueYoY = (prevYearData.revenue !== 0)
                ? ((currentData.revenue - prevYearData.revenue) / Math.abs(prevYearData.revenue)) * 100
                : null;
            const profitYoY = (prevYearData.operatingProfit !== 0)
                ? ((currentData.operatingProfit - prevYearData.operatingProfit) / Math.abs(prevYearData.operatingProfit)) * 100
                : null;

            result.push({
                ...currentData,
                monthLabel: `${year}年${i + 1}月`,
                revenueMoM,
                profitMoM,
                revenueYoY,
                profitYoY,
                prevRevenue: prevYearData.revenue,
                prevOperatingProfit: prevYearData.operatingProfit,
                cumulativeRevenue,
                cumulativeCosts,
                cumulativeOperatingProfit,
                prevCumulativeRevenue,
                prevCumulativeOperatingProfit
            });
        }
    }

    return result;
});

onMounted(async () => {
    await hotelStore.fetchHotels();
    await hotelStore.fetchHotel();
    fetchData();
});

watch([selectedMonth, () => hotelStore.selectedHotelId.value], fetchData);
</script>
