<template>
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
        <!-- Breadcrumb Navigation -->
        <nav class="mb-6">
            <ol class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <li>
                    <router-link to="/dashboard" class="hover:text-emerald-600 dark:hover:text-emerald-400">
                        ホーム
                    </router-link>
                </li>
                <li class="flex items-center">
                    <i class="pi pi-chevron-right mx-2"></i>
                    <span class="text-gray-900 dark:text-gray-100 font-medium">会計</span>
                </li>
            </ol>
        </nav>

        <!-- Main Content -->
        <div class="max-w-4xl mx-auto">
            <!-- Header Section -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-6">
                <div class="text-center">
                    <div class="mb-4">
                        <i class="pi pi-calculator text-4xl text-emerald-600 dark:text-emerald-400"></i>
                    </div>
                    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        会計モジュール
                    </h1>
                    <p class="text-lg text-gray-600 dark:text-gray-400 mb-6">
                        経理・会計業務の管理システム
                    </p>
                    
                    <!-- User Context Information -->
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                        <div class="flex items-center justify-center space-x-4 text-sm text-gray-700 dark:text-gray-300">
                            <div class="flex items-center space-x-2">
                                <i class="pi pi-user text-emerald-600 dark:text-emerald-400"></i>
                                <span>ユーザー: {{ userName }}</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <i class="pi pi-shield text-emerald-600 dark:text-emerald-400"></i>
                                <span>ロール: {{ userRole }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Placeholder Message -->
                    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                        <div class="flex items-center justify-center mb-3">
                            <i class="pi pi-info-circle text-2xl text-blue-600 dark:text-blue-400"></i>
                        </div>
                        <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            開発中の機能
                        </h3>
                        <p class="text-blue-700 dark:text-blue-300 mb-4">
                            会計モジュールは現在開発中です。今後、以下の機能が追加される予定です：
                        </p>
                        <ul class="text-left text-blue-700 dark:text-blue-300 space-y-2 max-w-md mx-auto">
                            <li class="flex items-center space-x-2">
                                <i class="pi pi-download text-sm"></i>
                                <span>月次ホテルデータのダウンロード（監査用）</span>
                            </li>
                            <li class="flex items-center space-x-2">
                                <i class="pi pi-upload text-sm"></i>
                                <span>OTA支払い明細のアップロード</span>
                            </li>
                            <li class="flex items-center space-x-2">
                                <i class="pi pi-chart-line text-sm"></i>
                                <span>売上データとの照合機能</span>
                            </li>
                            <li class="flex items-center space-x-2">
                                <i class="pi pi-file-export text-sm"></i>
                                <span>会計システム連携用データ出力</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Quick Access Section (Future) -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 opacity-50">
                    <div class="text-center">
                        <i class="pi pi-download text-2xl text-gray-400 mb-3"></i>
                        <h3 class="font-semibold text-gray-500 mb-2">データダウンロード</h3>
                        <p class="text-sm text-gray-400">近日公開予定</p>
                    </div>
                </div>
                
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 opacity-50">
                    <div class="text-center">
                        <i class="pi pi-upload text-2xl text-gray-400 mb-3"></i>
                        <h3 class="font-semibold text-gray-500 mb-2">ファイルアップロード</h3>
                        <p class="text-sm text-gray-400">近日公開予定</p>
                    </div>
                </div>
                
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 opacity-50">
                    <div class="text-center">
                        <i class="pi pi-cog text-2xl text-gray-400 mb-3"></i>
                        <h3 class="font-semibold text-gray-500 mb-2">設定</h3>
                        <p class="text-sm text-gray-400">近日公開予定</p>
                    </div>
                </div>
            </div>
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

const userRole = computed(() => {
    if (!logged_user.value || !logged_user.value[0]) return '不明';
    
    // Get role information from user data
    const user = logged_user.value[0];
    const permissions = user.permissions;
    
    if (!permissions) return '不明';
    
    // Determine role based on permissions (similar to existing logic)
    if (permissions.manage_db && permissions.manage_users) {
        return 'アドミン';
    } else if (permissions.manage_users) {
        return 'マネージャー';
    } else if (permissions.manage_clients) {
        return 'エディター';
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
</style>