<template>
    <div>
        <!-- Back Button and Hotel Header -->
        <div class="mb-6">
            <button @click="$emit('backToSummary')"
                    class="inline-flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors mb-4">
                <i class="pi pi-arrow-left mr-2"></i>
                ホテル一覧に戻る
            </button>
            
            <div class="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {{ selectedHotelName }} - プラン別詳細分析 ({{ selectedMonthLabel }})
                </h3>
                <p class="text-sm text-slate-500 dark:text-slate-400">
                    PMS売上計算と弥生会計データのプラン別比較
                </p>
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
                    {{ hotelAnalysisData.length }} 件の差異を表示中
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
                        <tr v-for="item in hotelAnalysisData" :key="`${item.hotel_id}-${item.plan_name}-${item.tax_rate}`"
                            :class="[
                                'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                                item.item_type === 'account_total' ? 'bg-violet-50 dark:bg-violet-900/10 border-l-4 border-violet-500' : ''
                            ]">
                            <td class="px-6 py-4">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <div v-if="item.item_type === 'account_total'" class="flex items-center gap-2">
                                            <i class="pi pi-building text-violet-600 dark:text-violet-400 text-sm"></i>
                                            <span class="font-bold text-slate-900 dark:text-white">{{ item.plan_name }}</span>
                                            <span class="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2 py-1 rounded">
                                                主勘定
                                            </span>
                                        </div>
                                        <div v-else class="flex items-center gap-2">
                                            <i class="pi pi-angle-right text-slate-400 text-sm ml-4"></i>
                                            <span class="font-medium text-slate-900 dark:text-white">{{ item.plan_name }}</span>
                                            <span v-if="item.subaccount_name" class="text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded">
                                                {{ item.subaccount_name }}
                                            </span>
                                        </div>
                                    </div>
                                    <div v-if="item.category_name" class="text-xs text-slate-400 ml-6">{{ item.category_name }}</div>
                                    <div v-if="item.match_type === 'fuzzy'" class="text-xs text-amber-600 dark:text-amber-400 mt-1 ml-6">
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
</template>

<script setup>
defineProps({
    selectedHotelName: {
        type: String,
        required: true
    },
    selectedMonthLabel: {
        type: String,
        required: true
    },
    hotelAnalysisData: {
        type: Array,
        required: true
    }
});

defineEmits(['backToSummary']);

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
</script>