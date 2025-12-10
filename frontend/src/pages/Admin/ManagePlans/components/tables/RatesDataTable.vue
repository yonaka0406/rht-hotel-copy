<template>
    <DataTable :value="rates">
        <Column field="date_start" header="開始" style="min-width: 150px;"></Column>
        <Column field="date_end" header="終了" style="min-width: 150px;"></Column>
        <Column header="料金" style="min-width: 180px;">
            <template #body="slotProps">
                <div v-if="slotProps.data.adjustment_type !== 'percentage'">
                    {{ formatNumber(slotProps.data.adjustment_value, 'currency') }}
                </div>
                <div v-else>
                    {{ formatNumber(slotProps.data.adjustment_value, 'decimal') }}%
                </div>
                <div v-if="slotProps.data.adjustment_type === 'base_rate'">
                    <Badge value="基本料金" severity="secondary"></Badge>
                </div>
                <div v-if="slotProps.data.adjustment_type === 'flat_fee'">
                    <Badge value="定額料金" severity="info"></Badge>
                </div>
                <div v-if="slotProps.data.adjustment_type === 'percentage'">
                    <Badge value="パーセント" severity="warn"></Badge>
                </div>
                <Badge v-if="(slotProps.data.adjustment_type === 'flat_fee' || slotProps.data.adjustment_type === 'percentage') && slotProps.data.include_in_cancel_fee"
                    value="キャンセル料対象"
                    severity="danger"
                    class="ml-1">
                </Badge>
                <Badge :value="formatSalesCategory(slotProps.data.sales_category)"
                       :severity="slotProps.data.sales_category === 'other' ? 'warn' : 'success'"
                       class="ml-1">
                </Badge>
            </template>
        </Column>
        <Column header="条件" style="min-width: 200px;">
            <template #body="slotProps">
                <div v-if="slotProps.data.condition_type === 'day_of_week'">
                    <Badge
                        v-for="(day, index) in daysOfWeek"
                        :key="index"
                        :value="day.label"
                        :class="{'p-badge-success': slotProps.data.condition_value.includes(day.value.toLowerCase()), 'p-badge-secondary': !slotProps.data.condition_value.includes(day.value.toLowerCase())}"
                        class="p-m-1"
                    />
                </div>
                <div v-else-if="slotProps.data.condition_type === 'month'">
                    <Badge
                        v-for="(month, index) in months"
                        :key="index"
                        :value="month.label"
                        :class="{'p-badge-success': slotProps.data.condition_value.includes(month.value.toLowerCase()), 'p-badge-secondary': !slotProps.data.condition_value.includes(month.value.toLowerCase())}"
                        class="p-m-1"
                    />
                </div>
            </template>
        </Column>
        <Column header="操作">
            <template #body="slotProps">
                <Button
                    icon="pi pi-pencil"
                    class="p-button-text p-button-sm"
                    @click="$emit('editAdjustment', slotProps.data)"
                />
            </template>
        </Column>
    </DataTable>
</template>

<script setup>
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Badge from 'primevue/badge';
import { formatNumber } from '@/utils/numberUtils';

const props = defineProps({
    rates: {
        type: Array,
        required: true,
    },
    daysOfWeek: {
        type: Array,
        required: true,
    },
    months: {
        type: Array,
        required: true,
    },
});

defineEmits(['editAdjustment']);

const formatSalesCategory = (categories) => {
    if (!Array.isArray(categories)) {
        categories = [categories];
    }
    return categories.map(category => {
        switch (category) {
            case 'accommodation':
                return '宿泊';
            case 'other':
                return 'その他';
            default:
                return category;
        }
    }).join(', ');
};
</script>
