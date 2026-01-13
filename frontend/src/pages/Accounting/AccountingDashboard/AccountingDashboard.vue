<template>
    <div class="bg-slate-50 dark:bg-slate-900 p-6 font-sans transition-colors duration-300">


        <!-- Main Content -->
        <div class="max-w-7xl mx-auto">
            
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

            <!-- Audit & Reconciliation Section -->
            <section class="mb-10">
                <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
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

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <!-- Data Export Card -->
                            <button @click="$router.push({ name: 'AccountingLedgerExport' })" class="group flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-slate-100 dark:border-slate-700 rounded-xl transition-all duration-200 cursor-pointer">
                                <div class="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4 border border-slate-100 dark:border-slate-700">
                                    <i class="pi pi-download text-xl text-violet-600 dark:text-violet-400"></i>
                                </div>
                                <span class="font-semibold text-slate-900 dark:text-white">データ出力</span>
                                <span class="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                                    監査用の月次ホテルデータをエクスポート
                                </span>
                            </button>

                            <!-- Upload OTA Slips Card (Coming Soon) -->
                            <div class="relative group flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl opacity-60 cursor-not-allowed">
                                <div class="absolute top-3 right-3 px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px] font-bold rounded uppercase tracking-wider">Coming Soon</div>
                                <div class="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100 dark:border-slate-700 grayscale">
                                    <i class="pi pi-upload text-xl text-violet-600 dark:text-violet-400"></i>
                                </div>
                                <span class="font-semibold text-slate-900 dark:text-white">OTA明細取込</span>
                                <span class="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                                    外部OTAの支払明細データをアップロード
                                </span>
                            </div>

                            <!-- Sales Comparison Card (Coming Soon) -->
                            <div class="relative group flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl opacity-60 cursor-not-allowed">
                                <div class="absolute top-3 right-3 px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px] font-bold rounded uppercase tracking-wider">Coming Soon</div>
                                <div class="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100 dark:border-slate-700 grayscale">
                                    <i class="pi pi-arrow-right-arrow-left text-xl text-violet-600 dark:text-violet-400"></i>
                                </div>
                                <span class="font-semibold text-slate-900 dark:text-white">売上照合</span>
                                <span class="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                                    PMS記録と会計データの差異をチェック
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Metrics Section (At a Glance) - Disabled -->
            <section class="opacity-50 pointer-events-none select-none relative filter grayscale">
                <div class="absolute inset-0 z-10 flex items-center justify-center">
                    <div class="bg-slate-900/80 text-white px-6 py-3 rounded-xl font-bold backdrop-blur-sm shadow-xl">
                        <i class="pi pi-wrench mr-2"></i> 開発中 (In Development)
                    </div>
                </div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-6 px-1 flex items-center gap-2">
                    <i class="pi pi-eye text-slate-400"></i>
                    概況 (At a Glance)
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Unreconciled -->
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-4">
                            <div class="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                                <i class="pi pi-clock text-orange-600 dark:text-orange-400 text-lg"></i>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">未照合</span>
                        </div>
                        <div class="mb-2">
                            <p class="text-3xl font-bold text-slate-900 dark:text-white">--</p>
                            <p class="text-sm font-medium text-slate-600 dark:text-slate-400">OTA支払件数</p>
                        </div>
                        <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <span class="text-xs font-semibold text-slate-400 flex items-center gap-1">
                                リストを確認 <i class="pi pi-arrow-right text-[10px]"></i>
                            </span>
                        </div>
                    </div>

                    <!-- Receivables -->
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-4">
                            <div class="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <i class="pi pi-list text-blue-600 dark:text-blue-400 text-lg"></i>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">未収金</span>
                        </div>
                        <div class="mb-2">
                            <p class="text-3xl font-bold text-slate-900 dark:text-white">¥---,---</p>
                            <p class="text-sm font-medium text-slate-600 dark:text-slate-400">クライアント請求残高</p>
                        </div>
                        <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <span class="text-xs font-semibold text-slate-400 flex items-center gap-1">
                                内訳を表示 <i class="pi pi-arrow-right text-[10px]"></i>
                            </span>
                        </div>
                    </div>

                    <!-- Discrepancies -->
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div class="flex items-center justify-between mb-4">
                            <div class="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                                <i class="pi pi-exclamation-triangle text-red-600 dark:text-red-400 text-lg"></i>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">差異発生率</span>
                        </div>
                        <div class="mb-2">
                            <p class="text-3xl font-bold text-slate-900 dark:text-white">--%</p>
                            <p class="text-sm font-medium text-slate-600 dark:text-slate-400">PMS 対 会計データ</p>
                        </div>
                        <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <span class="text-xs font-semibold text-slate-400 flex items-center gap-1">
                                診断を実行 <i class="pi pi-arrow-right text-[10px]"></i>
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Footer -->
            <footer class="mt-16 text-center pb-24">
            </footer>
        </div>

        <!-- FAB (Settings) -->
        <div class="fixed bottom-6 right-6 z-50">
            <button @click="$router.push({ name: 'AccountingSettings' })" class="w-14 h-14 bg-violet-600 text-white rounded-full shadow-lg hover:shadow-violet-600/40 hover:bg-violet-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group cursor-pointer">
                <i class="pi pi-cog text-xl group-hover:rotate-90 transition-transform duration-500"></i>
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, nextTick } from 'vue';
import { useUserStore } from '@/composables/useUserStore';

// User store
const { logged_user, fetchUser } = useUserStore();

// Computed properties for user information
const userName = computed(() => {
    if (!logged_user.value || !logged_user.value[0]) return 'ユーザー';
    return logged_user.value[0]?.name || 'ユーザー';
});

const userInitial = computed(() => {
    const name = userName.value;
    return name ? name.charAt(0).toUpperCase() : 'U';
});

const userRole = computed(() => {
    if (!logged_user.value || !logged_user.value[0]) return '不明';
    
    // Get role information from user data
    const user = logged_user.value[0];
    const permissions = user.permissions;
    
    if (!permissions) return '不明';
    
    // Determine role based on permissions
    if (permissions.manage_db && permissions.manage_users) {
        return '管理者 (Admin)';
    } else if (permissions.manage_users) {
        return 'マネージャー';
    } else if (permissions.manage_clients) {
        return '編集者';
    } else if (permissions.crud_ok) {
        return 'ユーザー';
    } else {
        return '閲覧者';
    }
});

// Lifecycle
onMounted(async () => {
    await fetchUser();
    await nextTick();
    window.scrollTo(0, 0);
});
</script>

<style scoped>
</style>