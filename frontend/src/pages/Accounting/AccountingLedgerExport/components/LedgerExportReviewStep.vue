<template>
    <div class="flex flex-col gap-6 animate-fade-in">
        <!-- Summary Widgets -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 dark:bg-slate-700 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="bg-white dark:bg-slate-800 p-5 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">対象月</span>
                <div class="flex items-center gap-2">
                    <i class="pi pi-calendar text-violet-600 dark:text-violet-400 text-lg"></i>
                    <p class="text-sm font-bold text-slate-900 dark:text-white">{{ filters.selectedMonth.replace('-', ' / ') }}</p>
                </div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-5 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">選択されたホテル</span>
                <div class="flex items-center gap-2">
                    <i class="pi pi-building text-violet-600 dark:text-violet-400 text-lg"></i>
                    <p class="text-sm font-bold text-slate-900 dark:text-white">{{ filters.hotelIds.length }} ホテル</p>
                </div>
            </div>
        </div>

        <!-- Data Integrity Validation Warnings -->
        <div v-if="ledgerValidationData && ledgerValidationData.length > 0" class="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-6 shadow-sm">
            <div class="flex items-start gap-4">
                <i class="pi pi-exclamation-triangle text-amber-600 dark:text-amber-400 text-3xl mt-1"></i>
                <div class="flex-1">
                    <h3 class="font-bold text-lg text-amber-900 dark:text-amber-100 mb-2">データ整合性の警告</h3>
                    <p class="text-sm text-amber-800 dark:text-amber-200 mb-4">
                        予約詳細（reservation_details）に対応する料金明細（reservation_rates）が見つかりません。
                        料金明細は正確な税区分を決定するために必要です。これらの予約は帳票に含まれない可能性があります。
                    </p>
                    
                    <div class="space-y-4">
                        <div v-for="hotel in ledgerValidationData" :key="hotel.hotel_id" class="bg-white dark:bg-slate-800 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center gap-2">
                                    <i class="pi pi-building text-amber-600 dark:text-amber-400"></i>
                                    <span class="font-bold text-slate-900 dark:text-white">{{ hotel.hotel_name }}</span>
                                </div>
                                <span class="text-xs font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">
                                    {{ hotel.missing_rates_count }} 件の料金明細なし
                                </span>
                            </div>
                            
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-slate-600 dark:text-slate-400">影響額</span>
                                <span class="font-bold text-red-600 dark:text-red-400 text-lg">¥{{ parseInt(hotel.missing_rates_amount || 0).toLocaleString() }}</span>
                            </div>
                            
                            <div v-if="hotel.significant_issues && hotel.significant_issues.length > 0" class="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
                                <details class="cursor-pointer" open>
                                    <summary class="text-xs font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 mb-3">
                                        詳細を表示 ({{ hotel.missing_rates_count }} 件)
                                    </summary>
                                    <div class="mt-3 space-y-2 max-h-60 overflow-y-auto">
                                        <a 
                                            v-for="(issue, idx) in hotel.significant_issues.filter(i => i.missing_rates)" 
                                            :key="idx" 
                                            :href="`/reservations/${issue.reservation_id}`"
                                            target="_blank"
                                            class="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-amber-300 dark:hover:border-amber-700 group cursor-pointer"
                                        >
                                            <div class="flex-1">
                                                <div class="flex items-center gap-2 mb-1">
                                                    <span class="font-mono text-slate-700 dark:text-slate-300 font-medium">{{ issue.plan_name }}</span>
                                                    <span class="text-red-600 dark:text-red-400 font-bold text-[10px] bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded">料金明細なし</span>
                                                </div>
                                                <div class="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                                                    <span class="flex items-center gap-1">
                                                        <i class="pi pi-calendar text-[10px]"></i>
                                                        {{ new Date(issue.date).toLocaleDateString('ja-JP') }}
                                                    </span>
                                                    <span class="font-bold text-red-600 dark:text-red-400">¥{{ parseInt(issue.rd_total_price).toLocaleString() }}</span>
                                                </div>
                                            </div>
                                            <i class="pi pi-external-link text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2"></i>
                                        </a>
                                    </div>
                                </details>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-4 p-3 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                        <p class="text-xs text-amber-900 dark:text-amber-100">
                            <i class="pi pi-info-circle mr-2"></i>
                            <strong>重要:</strong> 料金明細（reservation_rates）は税区分と税額の計算に使用されます。
                            料金明細が欠落している予約は、正確な税区分で帳票に反映されない可能性があります。
                            該当する予約を確認し、料金を再計算してください。
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Preview Table Card -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                <div class="flex flex-col">
                    <h3 class="font-bold text-lg text-slate-900 dark:text-white">売上帳票プレビュー</h3>
                    <div class="flex items-center gap-2">
                        <p class="text-xs text-slate-500">ホテルおよびプランタイプ別の詳細内訳</p>
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">税込み / 税率別</span>
                    </div>
                </div>
                <div class="flex items-center gap-6">
                    <div v-if="ledgerPreviewData.length > 0" class="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <i class="pi pi-check-circle text-green-600 dark:text-green-400"></i>
                        <span class="text-[10px] font-black text-green-700 dark:text-green-300 uppercase tracking-widest">借貸一致 (Balanced)</span>
                    </div>
                    <div v-if="hasUnmappedRows" class="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <i class="pi pi-exclamation-triangle text-amber-600 dark:text-amber-400"></i>
                        <span class="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest">未設定の勘定項目あり</span>
                    </div>
                    <div class="flex flex-col text-right">
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">合計金額</span>
                        <span class="text-xl font-black text-violet-600 dark:text-violet-400 tabular-nums">¥{{ totalAmount.toLocaleString() }}</span>
                    </div>
                </div>
            </div>

            <div v-if="loading" class="py-24 flex flex-col items-center justify-center gap-4">
                <i class="pi pi-spin pi-spinner text-5xl text-violet-600"></i>
                <span class="text-slate-500 font-bold">データを集計中...</span>
            </div>

            <div v-else-if="ledgerPreviewData.length === 0" class="py-24 text-center">
                <i class="pi pi-search text-4xl text-slate-300 mb-4 block"></i>
                <p class="text-slate-500 font-medium">選択された条件に一致するデータが見つかりませんでした。</p>
            </div>

            <div v-else class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                            <th class="px-6 py-4 w-28">区分</th>
                            <th class="px-6 py-4">勘定科目 / 内容</th>
                            <th class="px-6 py-4">補助科目 / ホテル</th>
                            <th class="px-6 py-4 w-32">税区分</th>
                            <th class="px-6 py-4 text-right w-36">金額</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                        <template v-for="group in formattedPreview" :key="group.hotel_id">
                            <!-- Debit Row (Accounts Receivable) -->
                            <tr class="bg-blue-50/20 dark:bg-blue-900/10 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                                <td class="px-6 py-4">
                                    <span class="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded text-[10px] uppercase font-black">借方</span>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex flex-col">
                                        <span class="text-slate-900 dark:text-white">売掛金</span>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-2">
                                        <span class="text-slate-600 dark:text-slate-400 font-medium">{{ group.hotel_name }}</span>
                                        <i v-if="!group.is_dept_configured" class="pi pi-exclamation-triangle text-amber-500 text-xs" v-tooltip="'部門設定が未完了です'"></i>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase">対象外</span>
                                </td>
                                <td class="px-6 py-4 text-right tabular-nums text-slate-900 dark:text-white">
                                    ¥{{ group.total.toLocaleString() }}
                                </td>
                            </tr>
                            <!-- Credit Rows (Sales Breakdown) -->
                            <tr v-for="(row, idx) in group.categories" :key="idx" class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                <td class="px-6 py-4 pl-10">
                                    <span class="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded text-[10px] uppercase font-black">貸方</span>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex flex-col">
                                        <span class="font-medium text-slate-700 dark:text-slate-300">売上</span>
                                        <span class="text-[10px] text-slate-400 font-mono">{{ row.account_code || '未設定' }}</span>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="flex items-center gap-2">
                                        <span class="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 uppercase tracking-tight">{{ row.display_category_name }}</span>
                                        <span class="text-[11px] text-slate-400">({{ group.hotel_name }})</span>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <span class="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{{ row.tax_category }}</span>
                                </td>
                                <td class="px-6 py-4 text-right tabular-nums text-slate-600 dark:text-slate-400">
                                    ¥{{ parseInt(row.total_amount).toLocaleString() }}
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="flex justify-between mt-8">
            <button @click="handleBack" class="flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer">
                <i class="pi pi-arrow-left"></i>
                <span>戻る</span>
            </button>
            <button @click="handleNext" :disabled="loading || ledgerPreviewData.length === 0" class="flex items-center justify-center gap-2 rounded-lg h-12 px-10 bg-violet-600 text-white text-sm font-bold shadow-lg shadow-violet-200 dark:shadow-none hover:bg-violet-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <span>次へ：出力形式</span>
                <i class="pi pi-arrow-right"></i>
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';

const props = defineProps({
    filters: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['back', 'next']);
const { fetchLedgerPreview, ledgerPreviewData, ledgerValidationData, loading } = useAccountingStore();

const totalAmount = computed(() => {
    return ledgerPreviewData.value.reduce((sum, row) => sum + parseInt(row.total_amount || 0), 0);
});

const hasUnmappedRows = computed(() => {
    return ledgerPreviewData.value.some(row => !row.account_code);
});

const formattedPreview = computed(() => {
    const groups = {};
    ledgerPreviewData.value.forEach(row => {
        if (!groups[row.hotel_id]) {
            groups[row.hotel_id] = {
                hotel_id: row.hotel_id,
                hotel_name: row.hotel_name,
                is_dept_configured: row.is_dept_configured,
                total: 0,
                categories: []
            };
        }
        groups[row.hotel_id].total += parseInt(row.total_amount);
        groups[row.hotel_id].categories.push(row);
    });
    return Object.values(groups);
});

onMounted(async () => {
    try {
        await fetchLedgerPreview(props.filters);
    } catch (err) {
        console.error('Failed to fetch preview data', err);
    }
});

const handleBack = () => {
    emit('back');
};

const handleNext = () => {
    emit('next');
};
</script>

<style scoped>
@keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
    animation: fade-in 0.3s ease-out forwards;
}
</style>