<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { useToast } from 'primevue/usetoast';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import BudgetActualComparisonTable from './components/BudgetActualComparisonTable.vue';

const accountingStore = useAccountingStore();
const toast = useToast();

const selectedMonth = ref(new Date());
const displayType = ref('single'); // 'single' or 'cumulative'
const displayTypeOptions = [
    { label: '単月', value: 'single' },
    { label: '累計 (年初より)', value: 'cumulative' }
];

const budgetActualData = ref({ actual: [], budget: [] });
const isLoading = ref(false);

const periodLabel = computed(() => {
    if (!selectedMonth.value) return '';
    const d = selectedMonth.value;
    if (displayType.value === 'single') {
        return `${d.getFullYear()}年${d.getMonth() + 1}月`;
    } else {
        return `${d.getFullYear()}年1月 〜 ${d.getMonth() + 1}月`;
    }
});

const fetchData = async () => {
    if (!selectedMonth.value) return;
    
    isLoading.value = true;
    try {
        const d = selectedMonth.value;
        let start, end;

        if (displayType.value === 'single') {
            start = new Date(d.getFullYear(), d.getMonth(), 1);
        } else {
            // Cumulative: from January 1st of the selected year
            start = new Date(d.getFullYear(), 0, 1);
        }
        end = new Date(d.getFullYear(), d.getMonth() + 1, 0);

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

watch([displayType, selectedMonth], () => {
    fetchData();
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

                <div class="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <SelectButton v-model="displayType" :options="displayTypeOptions" optionLabel="label" optionValue="value" class="mr-2" />
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
                            対象期間: {{ periodLabel }}
                        </div>
                    </div>

                    <BudgetActualComparisonTable :data="budgetActualData" :is-loading="isLoading" />
                </div>
            </div>
        </div>
    </div>
</template>
