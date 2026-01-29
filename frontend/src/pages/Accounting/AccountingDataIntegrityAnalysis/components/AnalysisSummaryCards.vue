<template>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between mb-4">
                <div class="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <i class="pi pi-list text-slate-600 dark:text-slate-400"></i>
                </div>
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">総差異件数</span>
            </div>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">
                {{ summaryTotals.totalDiscrepancies }}
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">プラン・ホテル組み合わせ</p>
        </div>

        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between mb-4">
                <div class="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <i class="pi pi-exclamation-triangle text-red-600 dark:text-red-400"></i>
                </div>
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">料金明細なし</span>
            </div>
            <p class="text-2xl font-bold text-red-600 dark:text-red-400">
                {{ summaryTotals.missingRatesCount }}
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">税区分判定不可</p>
        </div>

        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between mb-4">
                <div class="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                    <i class="pi pi-link text-amber-600 dark:text-amber-400"></i>
                </div>
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">マッピングなし</span>
            </div>
            <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {{ summaryTotals.noMappingCount }}
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">会計科目未設定</p>
        </div>

        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between mb-4">
                <div class="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <i class="pi pi-search text-blue-600 dark:text-blue-400"></i>
                </div>
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">類似名称マッチ</span>
            </div>
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {{ summaryTotals.fuzzyMatchCount }}
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">自動推定マッチング</p>
        </div>

        <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between mb-4">
                <div class="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                    <i class="pi pi-calculator text-violet-600 dark:text-violet-400"></i>
                </div>
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">総差額</span>
            </div>
            <p class="text-2xl font-bold" 
               :class="summaryTotals.totalDifference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                {{ summaryTotals.totalDifference >= 0 ? '+' : '' }}¥{{ Math.abs(summaryTotals.totalDifference).toLocaleString() }}
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">PMS - 弥生</p>
        </div>
    </div>
</template>

<script setup>
defineProps({
    summaryTotals: {
        type: Object,
        required: true
    }
});
</script>