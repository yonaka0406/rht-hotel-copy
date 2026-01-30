<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { useToast } from 'primevue/usetoast';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';

const accountingStore = useAccountingStore();
const toast = useToast();

const selectedMonth = ref(new Date());
const budgetActualData = ref({ actual: [], budget: [] });
const isLoading = ref(false);

const lastMonthLabel = computed(() => {
    if (!selectedMonth.value) return '';
    const d = selectedMonth.value;
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
});

const formatNumber = (val) => {
    if (val === null || val === undefined) return '-';
    const rounded = Math.round(val);
    const absVal = Math.abs(rounded);
    const formatted = new Intl.NumberFormat('ja-JP').format(absVal);
    return rounded < 0 ? `(${formatted})` : formatted;
};

const formatPercent = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return `${val.toFixed(2)}%`;
};

const formatDiffPercent = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    const absVal = Math.abs(val);
    const formatted = absVal.toFixed(2);
    const sign = val > 0 ? '+' : '▲';
    return val === 0 ? '-' : `${sign}${formatted} p.p.`;
};

const fetchData = async () => {
    if (!selectedMonth.value) return;
    
    isLoading.value = true;
    try {
        const d = selectedMonth.value;
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);

        const formatDate = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const result = await accountingStore.fetchBudgetActualComparison({
            startDate: formatDate(start),
            endDate: formatDate(end)
        });
        
        budgetActualData.value = result;
    } catch (e) {
        console.error('Failed to fetch budget vs actual data:', e);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'データの取得に失敗しました。', life: 5000 });
    } finally {
        isLoading.value = false;
    }
};

const rows = computed(() => {
    if (!budgetActualData.value || !budgetActualData.value.actual || !budgetActualData.value.budget) return [];

    const findAmount = (list, mgId) => {
        const item = list.find(i => i.management_group_id === mgId || i.id === mgId);
        return item ? parseFloat(item.amount) : 0;
    };

    const actual = budgetActualData.value.actual;
    const budget = budgetActualData.value.budget;

    const createRow = (label, getVal, isProfit = false) => {
        const aVal = getVal(actual);
        const bVal = getVal(budget);
        const diff = aVal - bVal;

        const aRev = findAmount(actual, 1);
        const bRev = findAmount(budget, 1);

        const aRatio = aRev !== 0 ? Math.abs(aVal / aRev) * 100 : 0;
        const bRatio = bRev !== 0 ? Math.abs(bVal / bRev) * 100 : 0;
        const diffRatio = aRatio - bRatio;

        return {
            label,
            budget: bVal,
            actual: aVal,
            diff,
            budgetRatio: bRatio,
            actualRatio: aRatio,
            diffRatio,
            isProfit
        };
    };

    const result = [];
    result.push(createRow('売上高', (list) => findAmount(list, 1)));
    result.push(createRow('売上原価', (list) => findAmount(list, 2)));
    result.push(createRow('売上総利益', (list) => findAmount(list, 1) + findAmount(list, 2), true));
    result.push(createRow('人件費', (list) => findAmount(list, 3)));
    result.push(createRow('経費', (list) => findAmount(list, 4)));
    result.push(createRow('減価償却費', (list) => findAmount(list, 5)));
    result.push(createRow('営業利益', (list) => 
        findAmount(list, 1) + findAmount(list, 2) + findAmount(list, 3) + 
        findAmount(list, 4) + findAmount(list, 5), true));
    result.push(createRow('営業外収入', (list) => findAmount(list, 6)));
    result.push(createRow('営業外費用', (list) => findAmount(list, 7)));
    result.push(createRow('経常利益', (list) => 
        findAmount(list, 1) + findAmount(list, 2) + findAmount(list, 3) + 
        findAmount(list, 4) + findAmount(list, 5) + findAmount(list, 6) + 
        findAmount(list, 7), true));

    return result;
});

onMounted(() => {
    const today = new Date();
    selectedMonth.value = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    fetchData();
});
</script>

<template>
    <div class="bg-slate-50 dark:bg-slate-900 p-6 font-sans transition-colors duration-300 min-h-screen">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div class="flex items-center gap-4">
                    <button @click="$router.push({ name: 'AccountingDashboard' })" 
                        class="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <i class="pi pi-arrow-left text-xl text-slate-600 dark:text-slate-400"></i>
                    </button>
                    <div>
                        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            予実管理
                        </h1>
                        <p class="text-sm text-slate-600 dark:text-slate-400">
                            設定された予算と実績値の比較分析
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <DatePicker v-model="selectedMonth" view="month" dateFormat="yy/mm" class="w-40" />
                    <Button label="表示" icon="pi pi-refresh" @click="fetchData" :loading="isLoading" />
                </div>
            </div>

            <!-- Main Content -->
            <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div class="p-6 sm:p-8">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <i class="pi pi-percentage text-violet-600 dark:text-violet-400"></i>
                            損益予実対比
                        </h2>
                        <div class="text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg">
                            対象月: {{ lastMonthLabel }}
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr class="border-b border-slate-200 dark:border-slate-700">
                                    <th class="py-3 px-4 font-bold text-slate-500 dark:text-slate-400">項目</th>
                                    <th class="py-3 px-4 font-bold text-slate-900 dark:text-white text-right">予算</th>
                                    <th class="py-3 px-4 font-bold text-slate-900 dark:text-white text-right">実績</th>
                                    <th class="py-3 px-4 font-bold text-slate-900 dark:text-white text-right">予実対比</th>
                                    <th class="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-right">予算 (%)</th>
                                    <th class="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-right">実績 (%)</th>
                                    <th class="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-right">予実対比 (p.p.)</th>
                                </tr>
                            </thead>
                            <tbody v-if="isLoading">
                                <tr v-for="i in 10" :key="i" class="animate-pulse">
                                    <td class="py-3 px-4"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-24"></div></td>
                                    <td class="py-3 px-4 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-16 ml-auto"></div></td>
                                    <td class="py-3 px-4 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-16 ml-auto"></div></td>
                                    <td class="py-3 px-4 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-16 ml-auto"></div></td>
                                    <td class="py-3 px-4 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-12 ml-auto"></div></td>
                                    <td class="py-3 px-4 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-12 ml-auto"></div></td>
                                    <td class="py-3 px-4 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-12 ml-auto"></div></td>
                                </tr>
                            </tbody>
                            <tbody v-else>
                                <tr v-for="row in rows" :key="row.label" 
                                    :class="[
                                        'border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors',
                                        row.isProfit ? 'bg-violet-50/30 dark:bg-violet-900/10 font-bold' : ''
                                    ]">
                                    <td class="py-3 px-4 text-slate-700 dark:text-slate-300">{{ row.label }}</td>
                                    <td class="py-3 px-4 text-right text-slate-900 dark:text-white font-mono">{{ formatNumber(row.budget) }}</td>
                                    <td class="py-3 px-4 text-right text-slate-900 dark:text-white font-mono">{{ formatNumber(row.actual) }}</td>
                                    <td class="py-3 px-4 text-right font-mono" 
                                        :class="row.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                                        {{ row.diff > 0 ? '+' : '' }}{{ formatNumber(row.diff) }}
                                    </td>
                                    <td class="py-3 px-4 text-right text-slate-500 dark:text-slate-400 font-mono">{{ formatPercent(row.budgetRatio) }}</td>
                                    <td class="py-3 px-4 text-right text-slate-500 dark:text-slate-400 font-mono">{{ formatPercent(row.actualRatio) }}</td>
                                    <td class="py-3 px-4 text-right text-slate-500 dark:text-slate-400 font-mono">{{ formatDiffPercent(row.diffRatio) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
