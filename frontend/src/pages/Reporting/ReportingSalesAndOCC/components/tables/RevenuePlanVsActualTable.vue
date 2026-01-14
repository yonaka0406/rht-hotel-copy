<template>
    <Card class="mb-4">
        <template #header>
            <span class="text-xl font-bold">収益（計画ｘ実績・予約）</span>
        </template>
        <template #content>
            <div v-if="!revenueData || revenueData.length === 0" class="text-center p-4">
                データはありません。
            </div>
            <div v-else class="text-center p-4">
                <DataTable :value="processedRevenueData" responsiveLayout="scroll" paginator :rows="5"
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
                    <Column field="actual_revenue" header="実績・予約①" sortable style="width: 20%">
                        <template #body="{ data }">
                            <div class="flex justify-end mr-2">
                                {{ formatCurrency(data.actual_revenue) }}
                            </div>
                        </template>
                    </Column>
                    <Column field="variance_amount" header="分散" sortable style="width: 25%">
                        <template #body="{ data }">
                            <div class="flex justify-end mr-2">
                                <span v-if="data.variance_amount != null">
                                    {{ formatCurrency(data.variance_amount) }}
                                </span>
                                <span v-else>—</span>
                                <Badge v-if="data.variance_percentage != null" class="ml-2"
                                    :severity="getSeverity(data.variance_percentage)" size="small">
                                    {{ formatPercentage(data.variance_percentage) }}
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
import { computed } from 'vue';
import { Card, DataTable, Column, Badge, Button } from 'primevue';
import {
    formatCurrencyForReporting as formatCurrency,
    formatPercentage,
} from '@/utils/formatUtils';
import { getSeverity } from '@/utils/reportingUtils';

const props = defineProps({
    revenueData: {
        type: Array,
        required: true
    }
});

defineEmits(['export-csv']);

const processedRevenueData = computed(() => {
    return props.revenueData.map(data => {
        const actualRevenue = data.accommodation_revenue ?? data.period_revenue;
        const forecast = data.forecast_revenue;

        const varianceAmount = (actualRevenue != null && forecast != null) ? (actualRevenue - forecast) : null;

        let variancePercentage = null;
        if (actualRevenue != null && forecast != null && forecast !== 0) {
            const ratio = (actualRevenue / forecast) - 1;
            if (Number.isFinite(ratio)) {
                variancePercentage = ratio;
            }
        }

        return {
            ...data,
            actual_revenue: actualRevenue, // Add for convenience
            variance_amount: varianceAmount,
            variance_percentage: variancePercentage
        };
    });
});
</script>

<style scoped>
/* Add any specific styles for this component here if needed */
</style>