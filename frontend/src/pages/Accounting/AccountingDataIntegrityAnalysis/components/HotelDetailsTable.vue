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
                
                <!-- Validation Status -->
                <div v-if="validationResult" class="mt-4 p-3 rounded-lg" 
                     :class="validationResult.isValid ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'">
                    <div class="flex items-center gap-2">
                        <i :class="validationResult.isValid ? 'pi pi-check-circle text-green-600 dark:text-green-400' : 'pi pi-exclamation-triangle text-red-600 dark:text-red-400'"></i>
                        <span class="text-sm font-medium" :class="validationResult.isValid ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'">
                            {{ validationResult.isValid ? '合計値検証: 正常' : '合計値検証: 不一致あり' }}
                        </span>
                    </div>
                    <div v-if="!validationResult.isValid" class="mt-2 text-xs" :class="'text-red-700 dark:text-red-300'">
                        <div v-if="validationResult.pmsDiff >= 1">
                            PMS: 合計 ¥{{ new Intl.NumberFormat('ja-JP').format(validationResult.pmsTotal) }} ≠ 明細合計 ¥{{ new Intl.NumberFormat('ja-JP').format(validationResult.pmsSubtotal) }}
                        </div>
                        <div v-if="validationResult.yayoiDiff >= 1">
                            弥生: 合計 ¥{{ new Intl.NumberFormat('ja-JP').format(validationResult.yayoiTotal) }} ≠ 明細合計 ¥{{ new Intl.NumberFormat('ja-JP').format(validationResult.yayoiSubtotal) }}
                        </div>
                    </div>
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
                                        <span v-if="item.match_score" class="ml-1 text-xs opacity-75">({{ (item.match_score * 100).toFixed(1) }}%)</span>
                                    </div>
                                    <!-- Show PMS plan name in secondary severity -->
                                    <div v-if="item.item_type === 'subaccount' && item.plan_name" class="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-6">
                                        <i class="pi pi-tag text-xs mr-1"></i>PMS: {{ item.plan_name }}
                                    </div>
                                    <!-- Show Yayoi subaccount name in info severity for all subaccount items -->
                                    <div v-if="item.item_type === 'subaccount' && item.subaccount_name" class="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-6">
                                        <i class="pi pi-info-circle text-xs mr-1"></i>弥生: {{ item.subaccount_name }}
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
import { computed } from 'vue';

const props = defineProps({
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

// Validation: Check if subaccounts match totals
const validationResult = computed(() => {
    if (!props.hotelAnalysisData || props.hotelAnalysisData.length === 0) return null;
    
    const totals = { pms: 0, yayoi: 0 };
    const subaccounts = { pms: 0, yayoi: 0 };
    
    props.hotelAnalysisData.forEach(item => {
        if (item.item_type === 'account_total') {
            totals.pms += item.pms_amount || 0;
            totals.yayoi += item.yayoi_amount || 0;
        } else if (item.item_type === 'subaccount') {
            subaccounts.pms += item.pms_amount || 0;
            subaccounts.yayoi += item.yayoi_amount || 0;
        }
    });
    
    const pmsDiff = Math.abs(totals.pms - subaccounts.pms);
    const yayoiDiff = Math.abs(totals.yayoi - subaccounts.yayoi);
    
    return {
        isValid: pmsDiff < 1 && yayoiDiff < 1,
        pmsTotal: totals.pms,
        pmsSubtotal: subaccounts.pms,
        pmsDiff: pmsDiff,
        yayoiTotal: totals.yayoi,
        yayoiSubtotal: subaccounts.yayoi,
        yayoiDiff: yayoiDiff
    };
});

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