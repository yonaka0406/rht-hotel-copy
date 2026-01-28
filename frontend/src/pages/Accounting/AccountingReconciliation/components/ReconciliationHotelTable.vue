<script setup>
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

defineProps({
    overviewData: {
        type: Array,
        required: true
    },
    isLoading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['select-hotel']);

const formatCurrency = (val) => {
    return Number(val).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
};

const handleRowClick = (event) => {
    emit('select-hotel', event.data);
};
</script>

<template>
    <section class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 class="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <i class="pi pi-list text-violet-600"></i>
                施設別 差異一覧
            </h2>
        </div>

        <DataTable 
            :value="overviewData" 
            :loading="isLoading"
            stripedRows
            class="p-datatable-sm"
            @row-click="handleRowClick"
            rowHover
        >
            <Column field="hotel_name" header="施設名" sortable></Column>
            <Column field="total_sales" header="売上計上" sortable>
                <template #body="{ data }">{{ formatCurrency(data.total_sales) }}</template>
            </Column>
            <Column field="total_payments" header="入金額" sortable>
                <template #body="{ data }">
                    <div class="flex flex-col">
                        <span>{{ formatCurrency(data.total_payments) }}</span>
                        <span v-if="Number(data.advance_payments) > 0" class="text-[9px] text-violet-500 font-bold">
                            (事前払: {{ Number(data.advance_payments).toLocaleString() }})
                        </span>
                    </div>
                </template>
            </Column>
            <Column field="difference" header="精算差異 (売上 - 精算等)" sortable>
                <template #body="{ data }">
                    <span :class="[
                        data.difference > 1 ? 'text-emerald-500 font-bold' : '',
                        data.difference < -1 ? 'text-rose-500 font-bold' : '',
                        Math.abs(data.difference) <= 1 ? 'text-slate-500' : ''
                    ]">
                        {{ (data.difference > 0 ? '+' : '') + Number(data.difference).toLocaleString() }}
                    </span>
                </template>
            </Column>
            <Column class="w-12">
                <template #body>
                    <i class="pi pi-chevron-right text-slate-300"></i>
                </template>
            </Column>
        </DataTable>
    </section>
</template>

<style scoped>
:deep(.p-datatable-sm .p-datatable-tbody > tr > td) {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
}
</style>
