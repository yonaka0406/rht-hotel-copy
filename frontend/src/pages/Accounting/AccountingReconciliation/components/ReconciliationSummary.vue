<script setup>
const RECONCILIATION_HIGHLIGHT_THRESHOLD = 10;

defineProps({
    totals: {
        type: Object,
        default: () => ({ sales: 0, payments: 0, advance: 0, settlement: 0, difference: 0 })
    }
});

const formatCurrency = (val) => {
    return Number(val).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
};
</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">合計売上 (税込)</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ formatCurrency(totals.sales) }}</p>
            <p class="text-[10px] text-slate-400 mt-2">※ 対象月内に滞在（売上計上）があった予約の合計額</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">合計入金</p>
                    <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ formatCurrency(totals.payments) }}</p>
                </div>
                <div class="text-right flex flex-col gap-1 pr-1">
                    <div class="flex items-center justify-end gap-3 text-[11px]">
                        <span class="text-slate-400">精算等:</span>
                        <span class="font-bold text-slate-700 dark:text-slate-300">{{ formatCurrency(totals.settlement) }}</span>
                    </div>
                    <div class="flex items-center justify-end gap-3 text-[11px]">
                        <span class="text-violet-400">事前払:</span>
                        <span class="font-bold text-violet-600 dark:text-violet-400">{{ formatCurrency(totals.advance) }}</span>
                    </div>
                    <div class="flex items-center justify-end gap-3 text-[11px] mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span class="text-slate-400">精算差異 (売上 - 精算等):</span>
                        <span :class="[
                            Math.abs(totals.difference) > RECONCILIATION_HIGHLIGHT_THRESHOLD ? 'text-rose-500 font-bold' : 'text-slate-500'
                        ]">{{ formatCurrency(totals.difference) }}</span>
                    </div>
                </div>
            </div>
            <div class="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <p class="text-[9px] text-slate-400 leading-relaxed">
                    ※ <strong>事前払:</strong> 対象月末時点で、チェックイン日が翌月以降となっている予約に対して行われた入金です。<br/>
                    ※ <strong>精算等:</strong> 対象月末までにチェックイン済みの予約（滞在中の清算や過去分の回収等）に関連する入金です。<br/>
                    ※ <strong>精算差異:</strong> 売上と精算等入金の差額です。事前払は含まれません。
                </p>
            </div>
        </div>
    </div>
</template>
