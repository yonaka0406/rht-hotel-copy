<template>
    <div class="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 font-sans transition-colors duration-300">
        <!-- Breadcrumb Navigation -->
        <nav class="mb-6">
            <ol class="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                <li>
                    <router-link to="/dashboard" class="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                        ホーム
                    </router-link>
                </li>
                <li class="flex items-center">
                    <i class="pi pi-chevron-right mx-2 text-xs"></i>
                    <span class="text-slate-900 dark:text-slate-100 font-medium">会計</span>
                </li>
            </ol>
        </nav>

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto">
            
            <!-- Hero Section -->
            <div class="mb-10 text-center sm:text-left">
                <div class="inline-flex items-center justify-center p-3 bg-violet-100 dark:bg-violet-900/30 rounded-2xl mb-4">
                    <i class="pi pi-calculator text-3xl text-violet-600 dark:text-violet-400"></i>
                </div>
                <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                    会計モジュール
                </h1>
                <p class="text-slate-600 dark:text-slate-400 max-w-2xl">
                    プロパティ管理システム (PMS) • データ監査・照合センター
                </p>
                
                <!-- User Badge (Optional, keeping consistent with previous logic but styled differently) -->
                <div class="mt-4 inline-flex items-center space-x-3 px-4 py-2 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div class="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">
                        {{ userInitial }}
                    </div>
                    <div class="text-xs">
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
                            <span class="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full self-start flex items-center gap-1">
                                <i class="pi pi-check-circle text-[10px]"></i>
                                システム稼働中
                            </span>
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

                            <!-- Upload OTA Slips Card -->
                            <button class="group flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-slate-100 dark:border-slate-700 rounded-xl transition-all duration-200 cursor-pointer">
                                <div class="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4 border border-slate-100 dark:border-slate-700">
                                    <i class="pi pi-upload text-xl text-violet-600 dark:text-violet-400"></i>
                                </div>
                                <span class="font-semibold text-slate-900 dark:text-white">OTA明細取込</span>
                                <span class="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                                    外部OTAの支払明細データをアップロード
                                </span>
                            </button>

                            <!-- Sales Comparison Card -->
                            <button class="group flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-slate-100 dark:border-slate-700 rounded-xl transition-all duration-200 cursor-pointer">
                                <div class="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4 border border-slate-100 dark:border-slate-700">
                                    <i class="pi pi-arrow-right-arrow-left text-xl text-violet-600 dark:text-violet-400"></i>
                                </div>
                                <span class="font-semibold text-slate-900 dark:text-white">売上照合</span>
                                <span class="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                                    PMS記録と会計データの差異をチェック
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Metrics Section (At a Glance) -->
            <section>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-6 px-1 flex items-center gap-2">
                    <i class="pi pi-eye text-slate-400"></i>
                    概況 (At a Glance)
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Unreconciled -->
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                        <div class="flex items-center justify-between mb-4">
                            <div class="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                                <i class="pi pi-clock text-orange-600 dark:text-orange-400 text-lg"></i>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">未照合</span>
                        </div>
                        <div class="mb-2">
                            <p class="text-3xl font-bold text-slate-900 dark:text-white">12</p>
                            <p class="text-sm font-medium text-slate-600 dark:text-slate-400">OTA支払件数</p>
                        </div>
                        <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <a href="#" class="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
                                リストを確認 <i class="pi pi-arrow-right text-[10px]"></i>
                            </a>
                        </div>
                    </div>

                    <!-- Receivables -->
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                        <div class="flex items-center justify-between mb-4">
                            <div class="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <i class="pi pi-list text-blue-600 dark:text-blue-400 text-lg"></i>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">未収金</span>
                        </div>
                        <div class="mb-2">
                            <p class="text-3xl font-bold text-slate-900 dark:text-white">¥4,285,000</p>
                            <p class="text-sm font-medium text-slate-600 dark:text-slate-400">クライアント請求残高</p>
                        </div>
                        <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <a href="#" class="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
                                内訳を表示 <i class="pi pi-arrow-right text-[10px]"></i>
                            </a>
                        </div>
                    </div>

                    <!-- Discrepancies -->
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                        <div class="flex items-center justify-between mb-4">
                            <div class="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                                <i class="pi pi-exclamation-triangle text-red-600 dark:text-red-400 text-lg"></i>
                            </div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">差異発生率</span>
                        </div>
                        <div class="mb-2">
                            <p class="text-3xl font-bold text-slate-900 dark:text-white">0.4%</p>
                            <p class="text-sm font-medium text-slate-600 dark:text-slate-400">PMS 対 会計データ</p>
                        </div>
                        <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <a href="#" class="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
                                診断を実行 <i class="pi pi-arrow-right text-[10px]"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Footer -->
            <footer class="mt-16 text-center pb-24">
                <p class="text-sm text-slate-500 dark:text-slate-500">
                    会計モジュールに関するサポートが必要ですか？
                    <a href="#" class="text-violet-600 dark:text-violet-400 hover:underline font-medium">サポートへ連絡</a> または 
                    <a href="#" class="text-violet-600 dark:text-violet-400 hover:underline font-medium">ユーザーガイドを表示</a>
                </p>
            </footer>
        </div>

        <!-- FAB (Settings) -->
        <div class="fixed bottom-6 right-6 z-50">
            <button class="w-14 h-14 bg-violet-600 text-white rounded-full shadow-lg hover:shadow-violet-600/40 hover:bg-violet-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group cursor-pointer">
                <i class="pi pi-cog text-xl group-hover:rotate-90 transition-transform duration-500"></i>
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
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
});
</script>

<style scoped>
/* No specific styles needed as we use Tailwind classes */
</style>