<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/composables/useUserStore';
import { useAccountingStore } from '@/composables/useAccountingStore';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, BarChart } from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent
} from 'echarts/components';

use([
    CanvasRenderer,
    LineChart,
    BarChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent
]);

const router = useRouter();
const { logged_user, fetchUser } = useUserStore();
const accountingStore = useAccountingStore();

const metrics = ref({
    totalSales: null,
    totalPayments: null,
    lastImport: null
});

const comparisonData = ref(null);
const monthlyChartData = ref(null);
const availableYears = ref([]);
const selectedYear = ref(new Date().getFullYear());
const isLoading = ref(true);
const hasError = ref(false);

// Computed properties for last import
const lastImportDateFormatted = computed(() => {
    if (!metrics.value.lastImport || !metrics.value.lastImport.created_at) return '未実施';
    const date = new Date(metrics.value.lastImport.created_at);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
});

const lastImportUser = computed(() => {
    return metrics.value.lastImport?.user_name || '-';
});

const lastImportPeriodFormatted = computed(() => {
    const info = metrics.value.lastImport;
    if (!info || !info.min_date || !info.max_date) return '-';

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    };

    return `${formatDate(info.min_date)} 〜 ${formatDate(info.max_date)}`;
});

// Computed properties for user information
const userName = computed(() => {
    return logged_user.value?.[0]?.name || 'ユーザー';
});

const userInitial = computed(() => {
    const name = userName.value;
    return name ? name.charAt(0).toUpperCase() : 'U';
});

const userRole = computed(() => {
    const user = logged_user.value?.[0];
    if (!user) return '不明';

    // Simple role logic based on permissions or role field if available
    const permissions = user.permissions || {};

    if (permissions.manage_db && permissions.manage_users) return '管理者 (Admin)';
    if (permissions.manage_users) return 'マネージャー';
    if (permissions.manage_clients) return '編集者';
    if (permissions.crud_ok) return 'ユーザー';
    return '閲覧者';
});

const paymentsSalesDiff = computed(() => {
    if (metrics.value.totalPayments === null || metrics.value.totalSales === null) {
        return null;
    }
    const payments = Number(metrics.value.totalPayments);
    const sales = Number(metrics.value.totalSales);

    if (isNaN(payments) || isNaN(sales)) {
        return null;
    }

    return payments - sales;
});

// Chart configuration
const chartOption = computed(() => {
    if (!monthlyChartData.value || !monthlyChartData.value.monthlyData) {
        return null;
    }

    const data = monthlyChartData.value.monthlyData;
    console.log('📊 Raw chart data:', data);
    
    const months = data.map(d => d.month_label);
    const pmsData = data.map(d => {
        const amount = parseFloat(d.pms_amount) || 0;
        const result = Math.round(amount / 1000);
        console.log(`PMS: ${d.pms_amount} (${typeof d.pms_amount}) -> ${amount} -> ${result}`);
        return result;
    });
    const yayoiData = data.map(d => {
        const amount = parseFloat(d.yayoi_amount) || 0;
        const result = Math.round(amount / 1000);
        console.log(`Yayoi: ${d.yayoi_amount} (${typeof d.yayoi_amount}) -> ${amount} -> ${result}`);
        return result;
    });

    console.log('📊 Processed chart data:', { months, pmsData, yayoiData });

    return {
        title: {
            text: `${selectedYear.value}年 売上比較`,
            textStyle: {
                fontSize: 14,
                fontWeight: 'bold'
            },
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                let result = `${params[0].axisValue}<br/>`;
                params.forEach(param => {
                    console.log('Tooltip param:', param);
                    const rawValue = param.value;
                    console.log('Raw value:', rawValue, 'Type:', typeof rawValue);
                    
                    let value = 0;
                    if (rawValue !== null && rawValue !== undefined) {
                        const numValue = parseFloat(rawValue);
                        if (!isNaN(numValue)) {
                            value = numValue * 1000;
                        }
                    }
                    
                    console.log('Calculated value:', value);
                    const formattedValue = new Intl.NumberFormat('ja-JP').format(value);
                    console.log('Formatted value:', formattedValue);
                    
                    result += `${param.seriesName}: ¥${formattedValue}<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: ['PMS売上', '弥生データ'],
            bottom: 0,
            textStyle: {
                fontSize: 11
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: months,
            axisLabel: {
                fontSize: 10
            }
        },
        yAxis: {
            type: 'value',
            name: '売上 (千円)',
            nameTextStyle: {
                fontSize: 10
            },
            axisLabel: {
                fontSize: 10,
                formatter: '{value}K'
            }
        },
        series: [
            {
                name: 'PMS売上',
                type: 'bar',
                data: pmsData,
                itemStyle: {
                    color: '#8b5cf6'
                }
            },
            {
                name: '弥生データ',
                type: 'line',
                data: yayoiData,
                itemStyle: {
                    color: '#f59e0b'
                },
                lineStyle: {
                    width: 2
                },
                symbol: 'circle',
                symbolSize: 4
            }
        ]
    };
});

// Year navigation
const canGoPreviousYear = computed(() => {
    if (availableYears.value.length === 0) return false;
    const minYear = Math.min(...availableYears.value.map(y => y.year));
    return selectedYear.value > minYear;
});

const canGoNextYear = computed(() => {
    if (availableYears.value.length === 0) return false;
    const maxYear = Math.max(...availableYears.value.map(y => y.year));
    return selectedYear.value < maxYear;
});

const changeYear = async (direction) => {
    const newYear = selectedYear.value + direction;
    
    // Check if the year has data
    const hasYearData = availableYears.value.some(y => y.year === newYear);
    if (!hasYearData) return;
    
    selectedYear.value = newYear;
    
    // Fetch new chart data for the selected year
    try {
        const monthlyData = await accountingStore.getMonthlySalesComparison(selectedYear.value, null);
        monthlyChartData.value = monthlyData;
    } catch (error) {
        console.error('Failed to fetch chart data for year:', selectedYear.value, error);
    }
};

onMounted(async () => {
    try {
        isLoading.value = true;
        hasError.value = false;
        if (!logged_user.value || !logged_user.value.length) {
            await fetchUser();
        }

        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);

        const formatDate = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const selectedMonth = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;

        // Fetch available years first to determine the correct year for the chart
        const yearsData = await accountingStore.getAvailableYayoiYears().catch(err => {
            console.warn('Failed to fetch available Yayoi years:', err);
            return { years: [], latestYear: new Date().getFullYear(), hasData: false };
        });

        availableYears.value = yearsData.years || [];
        
        // Set the selected year to the latest year with data, or current year if no data
        if (yearsData.latestYear && yearsData.hasData) {
            selectedYear.value = yearsData.latestYear;
        } else {
            selectedYear.value = new Date().getFullYear();
        }

        // Fetch dashboard metrics, comparison data, and monthly chart data in parallel
        const [metricsData, comparisonResult, monthlyData] = await Promise.all([
            accountingStore.fetchDashboardMetrics({
                startDate: formatDate(start),
                endDate: formatDate(end)
            }),
            // Only compare if we have hotels available
            accountingStore.comparePmsVsYayoi({
                selectedMonth,
                hotelIds: null // Let backend determine hotels with department mappings
            }).catch(err => {
                console.warn('Failed to fetch comparison data:', err);
                return null;
            }),
            // Fetch monthly chart data for the latest Yayoi year
            accountingStore.getMonthlySalesComparison(selectedYear.value, null).catch(err => {
                console.warn('Failed to fetch monthly chart data:', err);
                return null;
            })
        ]);

        metrics.value = metricsData;
        comparisonData.value = comparisonResult;
        monthlyChartData.value = monthlyData;
    } catch (e) {
        console.error('Failed to load dashboard metrics', e);
        hasError.value = true;
    } finally {
        isLoading.value = false;
        await nextTick();
        window.scrollTo(0, 0);
    }
});
</script>

<template>
    <div class="bg-slate-50 dark:bg-slate-900 p-6 font-sans transition-colors duration-300 min-h-screen">


        <!-- Main Content -->
        <div class="max-w-7xl mx-auto">

            <!-- Error Banner -->
            <div v-if="hasError"
                class="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
                <i class="pi pi-exclamation-circle text-red-600 dark:text-red-400 text-xl"></i>
                <div class="flex-1">
                    <h3 class="text-sm font-bold text-red-800 dark:text-red-300">データの読み込みに失敗しました</h3>
                    <p class="text-xs text-red-600 dark:text-red-400 mt-1">
                        ダッシュボードの指標を取得できませんでした。ネットワーク接続を確認するか、しばらく経ってから再読み込みしてください。
                    </p>
                </div>
                <button @click="router.go(0)"
                    class="px-3 py-1.5 bg-white dark:bg-slate-800 text-xs font-bold text-red-600 dark:text-red-400 rounded-lg shadow-sm border border-red-100 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors">
                    再読み込み
                </button>
            </div>

            <!-- Hero Section (Compact) -->
            <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div class="flex items-center gap-4">
                    <div
                        class="flex-shrink-0 inline-flex items-center justify-center p-3 bg-violet-100 dark:bg-violet-900/30 rounded-2xl">
                        <i class="pi pi-calculator text-2xl text-violet-600 dark:text-violet-400"></i>
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            会計モジュール
                        </h1>
                        <p class="text-sm text-slate-600 dark:text-slate-400">
                            プロパティ管理システム (PMS) • データ監査・照合センター
                        </p>
                    </div>
                </div>

                <!-- User Badge -->
                <div
                    class="inline-flex items-center space-x-3 px-4 py-2 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm self-start sm:self-center">
                    <div
                        class="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold">
                        {{ userInitial }}
                    </div>
                    <div class="text-xs text-left">
                        <span class="font-semibold text-slate-900 dark:text-white block">{{ userName }}</span>
                        <span class="text-slate-500 dark:text-slate-400 block">{{ userRole }}</span>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Left Column: Audit & Actions -->
                <div class="lg:col-span-2">
                    <section
                        class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden h-full">
                        <div class="p-6 sm:p-8">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h2
                                        class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <i class="pi pi-chart-bar text-violet-600 dark:text-violet-400"></i>
                                        監査と照合
                                    </h2>
                                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        財務記録の同期と検証を行うアクションを選択してください。
                                    </p>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <!-- Data Export Card -->
                                <button @click="$router.push({ name: 'AccountingLedgerExport' })"
                                    class="group flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-slate-100 dark:border-slate-700 rounded-xl transition-all duration-200 cursor-pointer text-center h-full">
                                    <div
                                        class="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4 border border-slate-100 dark:border-slate-700">
                                        <i class="pi pi-download text-xl text-violet-600 dark:text-violet-400"></i>
                                    </div>
                                    <span
                                        class="font-semibold text-slate-900 dark:text-white text-lg mb-2">売上仕訳出力</span>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">先月の全施設売上合計</p>
                                    <p v-if="isLoading"
                                        class="text-xl font-bold text-slate-700 dark:text-slate-300 animate-pulse mb-4">
                                        読み込み中...</p>
                                    <p v-else class="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                        {{ metrics.totalSales ? `¥${metrics.totalSales.toLocaleString()}` : '¥0' }}
                                    </p>
                                    <span
                                        class="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all mt-auto">
                                        エクスポートへ進む <i class="pi pi-arrow-right"></i>
                                    </span>
                                </button>

                                <!-- Receivables Management Card -->
                                <button @click="$router.push({ name: 'AccountingReceivables' })"
                                    class="group flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-slate-100 dark:border-slate-700 rounded-xl transition-all duration-200 cursor-pointer text-center h-full">
                                    <div
                                        class="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4 border border-slate-100 dark:border-slate-700">
                                        <i class="pi pi-wallet text-xl text-violet-600 dark:text-violet-400"></i>
                                    </div>
                                    <span class="font-semibold text-slate-900 dark:text-white text-lg mb-2">売掛金管理</span>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">顧客別の残高確認・督促</p>
                                    <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                        サブアカウント別の残高を確認しフォローアップ
                                    </p>
                                    <span
                                        class="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all mt-auto">
                                        管理画面を表示 <i class="pi pi-arrow-right"></i>
                                    </span>
                                </button>

                                <!-- Yayoi Accounting Import Card -->
                                <button @click="$router.push({ name: 'AccountingYayoiImport' })"
                                    class="group flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-slate-100 dark:border-slate-700 rounded-xl transition-all duration-200 cursor-pointer text-center h-full">
                                    <div
                                        class="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4 border border-slate-100 dark:border-slate-700">
                                        <i class="pi pi-upload text-xl text-violet-600 dark:text-violet-400"></i>
                                    </div>
                                    <span class="font-semibold text-slate-900 dark:text-white text-lg mb-2">弥生会計</span>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">会計データのインポート</p>

                                    <div class="mt-2 mb-4">
                                        <p class="text-xs text-slate-400">最終アップロード: <span
                                                class="font-medium text-slate-500 dark:text-slate-300">{{
                                                lastImportDateFormatted }}</span></p>
                                        <p class="text-[10px] text-slate-400 mt-1">{{ lastImportUser }} • {{
                                            lastImportPeriodFormatted }}</p>
                                    </div>

                                    <span
                                        class="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all mt-auto">
                                        インポートへ進む <i class="pi pi-arrow-right"></i>
                                    </span>
                                </button>

                                <!-- Profit & Loss Statement Card -->
                                <button @click="$router.push({ name: 'AccountingProfitLoss' })"
                                    class="group flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-slate-100 dark:border-slate-700 rounded-xl transition-all duration-200 cursor-pointer text-center h-full">
                                    <div
                                        class="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4 border border-slate-100 dark:border-slate-700">
                                        <i class="pi pi-chart-bar text-xl text-violet-600 dark:text-violet-400"></i>
                                    </div>
                                    <span class="font-semibold text-slate-900 dark:text-white text-lg mb-2">損益計算書</span>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">P&L Statement</p>
                                    <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                        部門別・ホテル別の損益分析
                                    </p>
                                    <span
                                        class="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all mt-auto">
                                        レポートを表示 <i class="pi pi-arrow-right"></i>
                                    </span>
                                </button>

                                <!-- Cost Breakdown Card -->
                                <button @click="$router.push({ name: 'AccountingCostBreakdown' })"
                                    class="group flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-slate-100 dark:border-slate-700 rounded-xl transition-all duration-200 cursor-pointer text-center h-full">
                                    <div
                                        class="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4 border border-slate-100 dark:border-slate-700">
                                        <i class="pi pi-chart-pie text-xl text-violet-600 dark:text-violet-400"></i>
                                    </div>
                                    <span class="font-semibold text-slate-900 dark:text-white text-lg mb-2">コスト内訳</span>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">Cost Analysis</p>
                                    <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                        主要経費の推移と施設別比較
                                    </p>
                                    <span
                                        class="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all mt-auto">
                                        分析画面を表示 <i class="pi pi-arrow-right"></i>
                                    </span>
                                </button>

                                <!-- OTA Import (Placeholder) -->
                                <div
                                    class="group bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed relative overflow-hidden flex flex-col items-center text-center h-full">
                                    <div
                                        class="absolute top-3 right-3 px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px] font-bold rounded uppercase tracking-wider">
                                        近日公開</div>
                                    <div
                                        class="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-200 dark:border-slate-600 opacity-50">
                                        <i class="pi pi-cloud-upload text-xl text-slate-500"></i>
                                    </div>
                                    <span class="font-semibold text-slate-400">OTA入金取込</span>
                                    <span class="text-xs text-slate-400 mt-2">
                                        OTAからの入金通知書をインポートして自動消込
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <!-- Right Column: Status Overview -->
                <div class="space-y-6">
                    <div class="flex items-center gap-3 mb-2">
                        <div class="h-8 w-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                        <h2 class="text-xl font-bold text-slate-800 dark:text-white">概況概要</h2>
                    </div>

                    <div class="space-y-4">
                        <!-- Total Payments Last Month -->
                        <div
                            class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div class="flex items-center justify-between mb-4">
                                <div class="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                    <i class="pi pi-wallet text-slate-600 dark:text-slate-400 text-lg"></i>
                                </div>
                                <span
                                    class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">先月の入金合計</span>
                            </div>
                            <div class="mb-2">
                                <p v-if="isLoading"
                                    class="text-3xl font-bold text-slate-900 dark:text-white animate-pulse">...</p>
                                <p v-else
                                    class="text-3xl font-bold text-slate-900 dark:text-white text-center sm:text-left">
                                    {{ metrics.totalPayments ? `¥${metrics.totalPayments.toLocaleString()}` : '¥0' }}
                                </p>
                                <div v-if="!isLoading && paymentsSalesDiff !== null"
                                    class="mt-1 text-center sm:text-left">
                                    <small
                                        :class="Math.abs(paymentsSalesDiff) > 1 ? 'text-rose-500 font-medium' : 'text-slate-500'">
                                        売上計上との差額: {{ paymentsSalesDiff > 0 ? '+' : '' }}{{
                                        paymentsSalesDiff.toLocaleString() }}
                                    </small>
                                </div>
                                <p
                                    class="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1 text-center sm:text-left text-[10px] sm:text-sm">
                                    カード・現金・請求書等</p>
                            </div>
                            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button @click="$router.push({ name: 'AccountingReconciliation' })"
                                    class="w-full sm:w-auto text-xs font-semibold text-slate-500 hover:text-violet-600 flex items-center justify-center sm:justify-start gap-1 transition-colors cursor-pointer bg-transparent border-none p-0">
                                    差異分析・詳細を表示 <i class="pi pi-arrow-right text-[10px]"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Monthly Sales Comparison Chart -->
                        <div v-if="monthlyChartData && chartOption"
                            class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-3">
                                    <div class="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                                        <i class="pi pi-chart-line text-violet-600 dark:text-violet-400 text-lg"></i>
                                    </div>
                                    <div class="flex items-center justify-center gap-2">
                                        <button @click="changeYear(-1)" 
                                            :disabled="!canGoPreviousYear"
                                            class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                            <i class="pi pi-chevron-left text-slate-600 dark:text-slate-400 text-sm"></i>
                                        </button>
                                        <span class="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[4rem] text-center">
                                            {{ selectedYear }}年
                                        </span>
                                        <button @click="changeYear(1)" 
                                            :disabled="!canGoNextYear"
                                            class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                            <i class="pi pi-chevron-right text-slate-600 dark:text-slate-400 text-sm"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="h-64">
                                <VChart :option="chartOption" class="w-full h-full" />
                            </div>
                            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <p class="text-xs text-slate-500 dark:text-slate-400 text-center mb-2">
                                    PMS売上計算と弥生会計データの月次比較
                                </p>
                                <button @click="$router.push({ name: 'AccountingDataIntegrityAnalysis' })"
                                    class="w-full sm:w-auto text-xs font-semibold text-slate-500 hover:text-violet-600 flex items-center justify-center sm:justify-start gap-1 transition-colors cursor-pointer bg-transparent border-none p-0">
                                    差異分析・詳細を表示 <i class="pi pi-arrow-right text-[10px]"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- FAB (Settings) -->
        <div class="fixed bottom-6 right-6 z-50">
            <button @click="$router.push({ name: 'AccountingSettings' })" aria-label="会計設定を開く"
                class="w-14 h-14 bg-violet-600 text-white rounded-full shadow-lg hover:shadow-violet-600/40 hover:bg-violet-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group cursor-pointer">
                <i class="pi pi-cog text-xl group-hover:rotate-90 transition-transform duration-500"></i>
            </button>
        </div>
    </div>
</template>

<style scoped>
/* No specific styles needed as Tailwind is used */
</style>