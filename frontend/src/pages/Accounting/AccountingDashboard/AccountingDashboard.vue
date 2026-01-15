<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/composables/useUserStore';
import { useAccountingStore } from '@/composables/useAccountingStore';

const router = useRouter();
const { logged_user, fetchUser } = useUserStore();
const accountingStore = useAccountingStore();

const metrics = ref({
    totalSales: null,
    totalPayments: null
});

const isLoading = ref(true);
const hasError = ref(false);

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
        
        const data = await accountingStore.fetchDashboardMetrics({
            startDate: formatDate(start),
            endDate: formatDate(end)
        });
        
        metrics.value = data;
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
            <div v-if="hasError" class="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
                <i class="pi pi-exclamation-circle text-red-600 dark:text-red-400 text-xl"></i>
                <div class="flex-1">
                    <h3 class="text-sm font-bold text-red-800 dark:text-red-300">データの読み込みに失敗しました</h3>
                    <p class="text-xs text-red-600 dark:text-red-400 mt-1">
                        ダッシュボードの指標を取得できませんでした。ネットワーク接続を確認するか、しばらく経ってから再読み込みしてください。
                    </p>
                </div>
                <button @click="router.go(0)" class="px-3 py-1.5 bg-white dark:bg-slate-800 text-xs font-bold text-red-600 dark:text-red-400 rounded-lg shadow-sm border border-red-100 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors">
                    再読み込み
                </button>
            </div>

            <!-- Hero Section (Compact) -->
            <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div class="flex items-center gap-4">
                    <div class="flex-shrink-0 inline-flex items-center justify-center p-3 bg-violet-100 dark:bg-violet-900/30 rounded-2xl">
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
                <div class="inline-flex items-center space-x-3 px-4 py-2 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm self-start sm:self-center">
                    <div class="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold">
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
                    <section class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden h-full">
                        <div class="p-6 sm:p-8">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <i class="pi pi-chart-bar text-violet-600 dark:text-violet-400"></i>
                                        監査と照合
                                    </h2>
                                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        財務記録の同期と検証を行うアクションを選択してください。
                                    </p>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <!-- Data Export Card -->
                                <button @click="$router.push({ name: 'AccountingLedgerExport' })" class="group flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-slate-100 dark:border-slate-700 rounded-xl transition-all duration-200 cursor-pointer text-center h-full">
                                    <div class="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4 border border-slate-100 dark:border-slate-700">
                                        <i class="pi pi-download text-xl text-violet-600 dark:text-violet-400"></i>
                                    </div>
                                    <span class="font-semibold text-slate-900 dark:text-white text-lg mb-2">売上仕訳出力</span>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">先月の全施設売上合計</p>
                                    <p v-if="isLoading" class="text-xl font-bold text-slate-700 dark:text-slate-300 animate-pulse mb-4">読み込み中...</p>
                                    <p v-else class="text-xl font-bold text-slate-900 dark:text-white mb-4">
                                        {{ metrics.totalSales ? `¥${metrics.totalSales.toLocaleString()}` : '¥0' }}
                                    </p>
                                    <span class="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all mt-auto">
                                        エクスポートへ進む <i class="pi pi-arrow-right"></i>
                                    </span>
                                </button>
                                
                                <!-- OTA Import (Placeholder) -->
                                <div class="group bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed relative overflow-hidden flex flex-col items-center text-center h-full">
                                    <div class="absolute top-3 right-3 px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px] font-bold rounded uppercase tracking-wider">近日公開</div>
                                    <div class="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-200 dark:border-slate-600 opacity-50">
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
                        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div class="flex items-center justify-between mb-4">
                                <div class="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                    <i class="pi pi-wallet text-slate-600 dark:text-slate-400 text-lg"></i>
                                </div>
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">先月の入金合計</span>
                            </div>
                            <div class="mb-2">
                                <p v-if="isLoading" class="text-3xl font-bold text-slate-900 dark:text-white animate-pulse">...</p>
                                <p v-else class="text-3xl font-bold text-slate-900 dark:text-white text-center sm:text-left">
                                    {{ metrics.totalPayments ? `¥${metrics.totalPayments.toLocaleString()}` : '¥0' }}
                                </p>
                                <div v-if="!isLoading && paymentsSalesDiff !== null" class="mt-1 text-center sm:text-left">
                                    <small :class="Math.abs(paymentsSalesDiff) > 1 ? 'text-rose-500 font-medium' : 'text-slate-500'">
                                        売上計上との差額: {{ paymentsSalesDiff > 0 ? '+' : '' }}{{ paymentsSalesDiff.toLocaleString() }}
                                    </small>
                                </div>
                                <p class="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1 text-center sm:text-left text-[10px] sm:text-sm">カード・現金・請求書等</p>
                            </div>
                            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button @click="$router.push({ name: 'AccountingReconciliation' })" class="w-full sm:w-auto text-xs font-semibold text-slate-500 hover:text-violet-600 flex items-center justify-center sm:justify-start gap-1 transition-colors cursor-pointer bg-transparent border-none p-0">
                                    差異分析・詳細を表示 <i class="pi pi-arrow-right text-[10px]"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Discrepancies (近日公開 Style) -->
                        <div class="group bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed relative overflow-hidden">
                             <div class="flex items-center justify-between mb-4 opacity-50">
                                <div class="p-2 bg-rose-100 dark:bg-rose-900/20 rounded-lg">
                                    <i class="pi pi-exclamation-triangle text-rose-500 text-lg"></i>
                                </div>
                                <span class="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-500 text-xs font-bold rounded-full">近日公開</span>
                            </div>
                            <h3 class="text-lg font-bold text-slate-400 mb-2">要確認事項</h3>
                            <p class="text-sm text-slate-400 mb-4">不突合・要確認の取引を自動検出</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- FAB (Settings) -->
        <div class="fixed bottom-6 right-6 z-50">
            <button @click="$router.push({ name: 'AccountingSettings' })" aria-label="会計設定を開く" class="w-14 h-14 bg-violet-600 text-white rounded-full shadow-lg hover:shadow-violet-600/40 hover:bg-violet-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group cursor-pointer">
                <i class="pi pi-cog text-xl group-hover:rotate-90 transition-transform duration-500"></i>
            </button>
        </div>
    </div>
</template>

<style scoped>
/* No specific styles needed as Tailwind is used */
</style>