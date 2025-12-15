<template>
    <Card class="mb-4">
        <template #header>
            <span class="text-xl font-bold">収益（計画ｘ実績）</span>
        </template>
        <template #content>
            <div v-if="!revenueData || revenueData.length === 0" class="text-center p-4">
                データはありません。
            </div>
            <div v-else class="text-center p-4">
                <DataTable :value="revenueData" responsiveLayout="scroll" paginator :rows="5"
                    :rowsPerPageOptions="[5, 15, 30, 50]" stripedRows sortMode="multiple" removableSort>
                    <Column field="hotel_name" header="施設" frozen sortable style="width: 20%"></Column>
                    <Column field="month" header="月度" sortable style="width: 10%"></Column>
                    <Column field="forecast_revenue" header="計画" sortable style="width: 20%">
                        <template #body="{ data }">
                            <div class="flex justify-end mr-2">
                                {{ formatCurrency(data.forecast_revenue) }}
                            </div>
                        </template>
                    </Column>
                    <Column field="accommodation_revenue" header="実績①" sortable style="width: 20%">
                        <template #body="{ data }">
                            <div class="flex justify-end mr-2">
                                {{ formatCurrency(data.accommodation_revenue ?? data.period_revenue) }}
                            </div>
                        </template>
                    </Column>
                    <Column header="分散" style="width: 30%">
                        <template #body="{ data }">
                            <div class="flex justify-end mr-2">
                                {{ formatCurrency((data.accommodation_revenue ?? data.period_revenue) -
                                    data.forecast_revenue) }}
                                <Badge
                                    v-if="data.forecast_revenue !== null && data.forecast_revenue !== undefined && data.forecast_revenue !== 0"
                                    class="ml-2"
                                    :severity="getSeverity(((data.accommodation_revenue ?? data.period_revenue) / data.forecast_revenue) - 1)"
                                    size="small">
                                    {{ formatPercentage(((data.accommodation_revenue ?? data.period_revenue) /
                                        data.forecast_revenue) - 1) }}
                                </Badge>
                                <Badge v-else class="ml-2" severity="info" size="small">
                                    —
                                </Badge>
                            </div>
                        </template>
                    </Column>
                    <template #footer>
                        <div class="flex justify-content-between">
                            <small>① 会計データがない場合はPMSの数値になっています。</small>
                        </div>
                    </template>
                    <template #paginatorstart>
                    </template>
                    <template #paginatorend>
                        <Button type="button" icon="pi pi-download" text @click="$emit('export-csv', 'revenue')" />
                    </template>
                </DataTable>
            </div>
        </template>
    </Card>
</template>

<script setup>
import { Card, DataTable, Column, Badge, Button } from 'primevue';
import {
    formatCurrencyForReporting as formatCurrency,
    formatPercentage,
} from '@/utils/formatUtils';
import { getSeverity } from '@/utils/reportingUtils';

defineProps({
    revenueData: {
        type: Array,
        required: true
    }
});

defineEmits(['export-csv']);
</script>

<style scoped>
/* Add any specific styles for this component here if needed */
</style>