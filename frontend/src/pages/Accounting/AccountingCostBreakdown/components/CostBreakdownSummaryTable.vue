<template>
    <div class="lg:col-span-12 xl:col-span-7 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden h-full">
        <div class="p-6 border-b border-slate-100 dark:border-slate-700">
            <h2 class="text-lg font-black text-slate-800 dark:text-white">経費比較サマリー</h2>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                        <th class="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">
                            経費科目
                        </th>
                        <th class="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">
                            <div class="flex items-center justify-end gap-1">
                                <span>通期平均</span>
                                <i class="pi pi-question-circle text-slate-300 hover:text-slate-500 cursor-help text-xs"
                                    v-tooltip.top="'通期平均の計算方法（当年度）:\n• 特定施設選択時: その施設の当年度の月平均コスト\n• 全施設選択時: 全施設の当年度月間総コスト ÷ 月数 ÷ 施設数\n\n※ 当年度 = 1月1日から現在まで'"></i>
                            </div>
                        </th>
                        <th class="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">
                            <div class="flex items-center justify-end gap-1">
                                <span>直近12ヶ月</span>
                                <i class="pi pi-question-circle text-slate-300 hover:text-slate-500 cursor-help text-xs"
                                    v-tooltip.top="'直近12ヶ月平均の計算方法:\n• 特定施設選択時: その施設の直近12ヶ月の月平均コスト\n• 全施設選択時: 全施設の直近12ヶ月総コスト ÷ 月数 ÷ 施設数\n\n※ 基準月から遡って12ヶ月間のデータを使用'"></i>
                            </div>
                        </th>
                        <th class="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">
                            <div class="flex items-center justify-end gap-1">
                                <span>全体平均</span>
                                <i class="pi pi-question-circle text-slate-300 hover:text-slate-500 cursor-help text-xs"
                                    v-tooltip.top="'全体平均の計算方法（ベンチマーク）:\n1. 各施設の当年度月平均コストを個別に計算\n2. 全施設の当年度月平均コストを平均化\n\n例: 施設A=10万円/月、施設B=20万円/月 → 全体平均=15万円/月\n※ 施設規模に関係なく公平な比較基準（当年度ベース）'"></i>
                            </div>
                        </th>
                        <th class="py-4 px-6 text-xs font-black text-violet-500 uppercase tracking-widest text-right">
                            <div class="flex items-center justify-end gap-1">
                                <span>売上比率</span>
                                <i class="pi pi-question-circle text-violet-300 hover:text-violet-500 cursor-help text-xs"
                                    v-tooltip.top="'売上比率（収益インパクト）の計算方法:\n(この経費科目の全期間総コスト ÷ 全期間総売上) × 100\n\n全データ期間でのこの経費が売上に占める割合\n※ 低いほど収益性への影響が小さい'"></i>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                    <tr v-for="item in analyticsSummary" :key="item.code"
                        class="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td class="py-4 px-6">
                            <div class="flex flex-col">
                                <span class="font-bold text-slate-700 dark:text-slate-200">{{ item.name }}</span>
                                <span class="text-[10px] text-slate-400 font-medium">{{ item.code }}</span>
                            </div>
                        </td>
                        <td class="py-4 px-4 text-right font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                            {{ formatCurrency(item.currentYearAvg) }}
                        </td>
                        <td class="py-4 px-4 text-right font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                            {{ formatCurrency(item.last12mAvg) }}
                        </td>
                        <td class="py-4 px-4 text-right font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                            {{ formatCurrency(item.globalAvg) }}
                        </td>
                        <td class="py-4 px-6 text-right">
                            <span class="inline-flex items-center px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-black text-sm tabular-nums">
                                {{ item.revenueImpact.toFixed(1) }}%
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    analyticsSummary: {
        type: Array,
        required: true
    }
});

const formatCurrency = (value) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);
</script>