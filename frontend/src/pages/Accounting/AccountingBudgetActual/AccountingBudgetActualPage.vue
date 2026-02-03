<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { useToast } from 'primevue/usetoast';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Select from 'primevue/select';
import BudgetActualComparisonTable from './components/BudgetActualComparisonTable.vue';
import AccountingBudgetActualHeader from './components/AccountingBudgetActualHeader.vue';
import OccupancyComparisonTable from './components/OccupancyComparisonTable.vue';
import OperatingProfitComparisonTable from './components/OperatingProfitComparisonTable.vue';

const accountingStore = useAccountingStore();
const toast = useToast();

const selectedMonth = ref(new Date());
const selectedDepartmentGroup = ref(null);
const departmentGroups = ref([]);
const displayType = ref('single'); // 'single' or 'cumulative'
const displayTypeOptions = [
    { label: '単月', value: 'single' },
    { label: '累計 (年初より)', value: 'cumulative' }
];

const budgetActualData = ref({
    actual: [],
    budget: [],
    occupancy: { actual: [], budget: [] },
    operatingProfit: { actual: [], budget: [] }
});
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

        const params = {
            startDate: formatDate(start),
            endDate: formatDate(end)
        };

        if (selectedDepartmentGroup.value) {
            params.departmentGroupId = selectedDepartmentGroup.value;
        }

        const result = await accountingStore.fetchBudgetActualComparison(params);
        
        budgetActualData.value = result;
    } catch (e) {
        console.error('Failed to fetch budget vs actual data:', e);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'データの取得に失敗しました。', life: 5000 });
    } finally {
        isLoading.value = false;
    }
};

const loadDepartmentGroups = async () => {
    try {
        const groups = await accountingStore.fetchDepartmentGroups();
        departmentGroups.value = [
            { label: 'すべての部門', value: null },
            ...groups.map(g => ({ label: g.name, value: g.id }))
        ];
    } catch (e) {
        console.error('Failed to fetch department groups:', e);
    }
};

watch([displayType, selectedMonth, selectedDepartmentGroup], () => {
    fetchData();
});

onMounted(() => {
    const today = new Date();
    selectedMonth.value = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    loadDepartmentGroups();
    fetchData();
});
</script>

<template>
    <div class="bg-slate-50 dark:bg-slate-900 p-6 font-sans transition-colors duration-300 min-h-screen">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <AccountingBudgetActualHeader />

            <div class="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">表示形式:</span>
                    <SelectButton v-model="displayType" :options="displayTypeOptions" optionLabel="label" optionValue="value" />
                </div>

                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">対象月:</span>
                    <DatePicker v-model="selectedMonth" view="month" dateFormat="yy/mm" class="w-40" />
                </div>

                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">部門区分:</span>
                    <Select v-model="selectedDepartmentGroup" :options="departmentGroups" optionLabel="label" optionValue="value" placeholder="部門を選択" class="w-56" />
                </div>

                <Button label="データを更新" icon="pi pi-refresh" @click="fetchData" :loading="isLoading" class="ml-auto" />
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

            <!-- New Tables -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                <OccupancyComparisonTable :data="budgetActualData.occupancy" :is-loading="isLoading" />
                <OperatingProfitComparisonTable :data="budgetActualData.operatingProfit" :is-loading="isLoading" />
            </div>
        </div>
    </div>
</template>
