<template>
    <div class="flex flex-col gap-6 animate-fade-in">
        <!-- Summary Widgets -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-200 dark:bg-slate-700 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
            <div class="bg-white dark:bg-slate-800 p-5 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">対象期間</span>
                <div class="flex items-center gap-2">
                    <i class="pi pi-calendar text-violet-600 dark:text-violet-400 text-lg"></i>
                    <p class="text-sm font-bold text-slate-900 dark:text-white">{{ filters.startDate }} - {{ filters.endDate }}</p>
                </div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-5 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">選択されたホテル</span>
                <div class="flex items-center gap-2">
                    <i class="pi pi-building text-violet-600 dark:text-violet-400 text-lg"></i>
                    <p class="text-sm font-bold text-slate-900 dark:text-white">{{ filters.hotelIds.length }} ホテル</p>
                </div>
            </div>
            <div class="bg-white dark:bg-slate-800 p-5 flex flex-col gap-1">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">勘定プラン</span>
                <div class="flex items-center gap-2">
                    <i class="pi pi-wallet text-violet-600 dark:text-violet-400 text-lg"></i>
                    <p class="text-sm font-bold text-slate-900 dark:text-white">{{ filters.planTypeCategoryIds.length }} カテゴリ</p>
                </div>
            </div>
        </div>

        <!-- Preview Table Card -->
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                <div class="flex flex-col">
                    <h3 class="font-bold text-lg text-slate-900 dark:text-white">売上帳票プレビュー</h3>
                    <p class="text-xs text-slate-500">ホテルおよびプランタイプ別の詳細内訳</p>
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex flex-col text-right">
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">推定合計額</span>
                        <span class="text-lg font-black text-violet-600 dark:text-violet-400 tabular-nums">¥{{ totalAmount.toLocaleString() }}</span>
                    </div>
                </div>
            </div>

            <div v-if="loading" class="py-20 flex flex-col items-center justify-center gap-4">
                <i class="pi pi-spin pi-spinner text-4xl text-violet-600"></i>
                <span class="text-slate-500 font-medium">データを集計中...</span>
            </div>

            <div v-else-if="previewData.length === 0" class="py-20 text-center text-slate-500">
                選択された条件に一致するデータが見つかりませんでした。
            </div>

            <div v-else class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-[11px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700">
                            <th class="px-6 py-4">ホテル</th>
                            <th class="px-6 py-4">プランタイプ</th>
                            <th class="px-6 py-4">勘定コード</th>
                            <th class="px-6 py-4 text-right">合計金額</th>
                            <th class="px-6 py-4 text-center">状態</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                        <tr v-for="(row, index) in previewData" :key="index" class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td class="px-6 py-4">
                                <div class="flex flex-col">
                                    <span class="font-bold text-slate-900 dark:text-white">{{ row.hotel_name }}</span>
                                    <span class="text-[10px] text-slate-500">ID: {{ row.hotel_id }}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <span class="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-1 rounded text-xs font-bold">
                                    {{ row.plan_type_category_name }}
                                </span>
                            </td>
                            <td class="px-6 py-4">
                                <span v-if="row.account_code" class="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                    {{ row.account_code }}
                                </span>
                                <span v-else class="text-[10px] text-amber-500 font-bold italic">未マッピング</span>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <span class="font-bold tabular-nums text-slate-900 dark:text-white">¥{{ parseInt(row.total_amount).toLocaleString() }}</span>
                            </td>
                            <td class="px-6 py-4 text-center">
                                <i v-if="row.account_code" class="pi pi-check-circle text-green-500 text-lg" title="準備完了"></i>
                                <i v-else class="pi pi-exclamation-circle text-amber-500 text-lg" title="勘定コードが設定されていません"></i>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="flex justify-between mt-4">
            <button @click="$emit('back')" class="flex items-center justify-center gap-2 rounded-lg h-11 px-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer">
                <i class="pi pi-arrow-left"></i>
                <span>戻る</span>
            </button>
            <button @click="handleNext" :disabled="loading || previewData.length === 0" class="flex items-center justify-center gap-2 rounded-lg h-11 px-6 bg-violet-600 text-white text-sm font-bold shadow-lg shadow-violet-200 dark:shadow-none hover:bg-violet-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <span>次へ：出力形式</span>
                <i class="pi pi-arrow-right"></i>
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAccounting } from '@/composables/useAccounting';

const props = defineProps({
    filters: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['back', 'next']);
const { getLedgerPreview, loading } = useAccounting();

const previewData = ref([]);

const totalAmount = computed(() => {
    return previewData.value.reduce((sum, row) => sum + parseInt(row.total_amount || 0), 0);
});

onMounted(async () => {
    try {
        previewData.value = await getLedgerPreview(props.filters);
    } catch (err) {
        console.error('Failed to fetch preview data', err);
    }
});

const handleNext = () => {
    emit('next', previewData.value);
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

<style scoped>
@keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
    animation: fade-in 0.3s ease-out forwards;
}
</style>