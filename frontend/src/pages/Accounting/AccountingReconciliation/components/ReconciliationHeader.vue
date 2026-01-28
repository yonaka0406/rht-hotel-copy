<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import DatePicker from 'primevue/datepicker';

const props = defineProps({
    selectedDate: {
        type: Date,
        required: true
    }
});

const emit = defineEmits(['update:selectedDate']);

const router = useRouter();

const dateValue = computed({
    get: () => props.selectedDate,
    set: (val) => emit('update:selectedDate', val)
});
</script>

<template>
    <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
            <button @click="router.push({ name: 'AccountingDashboard' })" class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer shadow-sm h-[46px]">
                <i class="pi pi-arrow-left text-sm"></i>
                <span>戻る</span>
            </button>
            <div>
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white">入金照合・差異分析</h1>
                <p class="text-sm text-slate-500 dark:text-slate-400">売上計上額と実際の入金額の突合を行います</p>
            </div>
        </div>

        <div class="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-w-[240px]">
            <span class="text-sm font-medium text-slate-600 dark:text-slate-400 ml-2 whitespace-nowrap">対象月:</span>
            <DatePicker 
                v-model="dateValue" 
                view="month" 
                dateFormat="yy/mm" 
                showIcon 
                iconDisplay="input"
                fluid
                class="flex-1"
                :pt="{
                    input: { class: 'dark:bg-slate-900 dark:text-slate-50 dark:border-slate-700' }
                }"
            />
        </div>
    </div>
</template>

<style scoped>
/* DatePicker Dark Mode Fixes */
.dark :deep(.p-datepicker .p-inputtext),
.dark :deep(.p-datepicker .p-datepicker-input) {
    background: #0f172a !important;
    border-color: #334155 !important;
    color: #f8fafc !important;
}

.dark :deep(.p-datepicker .p-datepicker-dropdown) {
    background: #1e293b !important;
    color: #f8fafc !important;
}
</style>
