<template>
    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div class="p-6 border-b border-slate-100 dark:border-slate-700">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">登録済みデータ</h2>
        </div>
        <DataTable :value="utilityDetails" :loading="loading" size="small" class="p-datatable-sm">
            <template #empty>データがありません。</template>
            <Column field="transaction_date" header="取引日">
                <template #body="slotProps">{{ formatDate(slotProps.data.transaction_date) }}</template>
            </Column>
            <Column field="sub_account_name" header="科目/補助科目">
                <template #body="slotProps">
                    <div class="flex flex-col">
                        <span class="font-bold">{{ slotProps.data.sub_account_name }}</span>
                        <span class="text-[10px] text-slate-400">{{ slotProps.data.account_name }}</span>
                    </div>
                </template>
            </Column>
            <Column field="quantity" header="数量" text-right>
                <template #body="slotProps">
                    <div class="text-right">
                        {{ slotProps.data.quantity }} <small class="text-slate-400">{{ getUtilityUnit(slotProps.data.sub_account_name) }}</small>
                    </div>
                </template>
            </Column>
            <Column field="total_value" header="合計金額" text-right>
                <template #body="slotProps">
                    <div class="text-right font-mono">
                        {{ formatCurrency(slotProps.data.total_value) }}
                    </div>
                </template>
            </Column>
            <Column field="average_price" header="平均単価" text-right>
                <template #body="slotProps">
                    <div class="text-right font-mono">
                        {{ formatCurrency(slotProps.data.average_price) }}
                    </div>
                </template>
            </Column>
            <Column header="操作" class="w-24">
                <template #body="slotProps">
                    <div class="flex gap-1">
                        <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" @click="$emit('edit', slotProps.data)" aria-label="編集" />
                        <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="$emit('delete', slotProps.data.id)" aria-label="削除" />
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<script setup>
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { getUtilityUnit } from '@/utils/accountingUtils';

defineProps({
    utilityDetails: {
        type: Array,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    }
});

defineEmits(['edit', 'delete']);

const formatCurrency = (val) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(val);
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP');
};
</script>

<style scoped>
:deep(.p-datatable-sm .p-datatable-thead > tr > th) {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
:deep(.p-datatable-sm .p-datatable-tbody > tr > td) {
    padding: 0.75rem 1rem;
}
</style>
