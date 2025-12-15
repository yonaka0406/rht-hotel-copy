<template>
    <Panel header="今後の見通し (6ヶ月)" class="mb-4">
        <DataTable ref="dt" :value="data" responsiveLayout="scroll" stripedRows showGridlines csvSeparator=","
            :exportFilename="'future_outlook_export'">
            <template #header>
                <div class="flex justify-end">
                    <Button type="button" icon="pi pi-download" text @click="exportCSV($event)" />
                </div>
            </template>
            <Column field="month" header="月度" style="width: 10%">
                <template #body="{ data }">
                    {{ data.month }}
                </template>
            </Column>
            <!-- Forecast Sales -->
            <Column field="forecast_sales" header="計画売上" style="width: 20%">
                <template #body="{ data }">
                    <div class="text-right">
                        {{ data.forecast_sales > 0 ? formatCurrency(data.forecast_sales) : '-' }}
                    </div>
                </template>
            </Column>
            <!-- Actual Sales with DoD -->
            <Column field="sales" header="実績売上 / 前日比" style="width: 25%">
                <template #body="{ data }">
                    <div class="flex justify-end items-center">
                        <span class="mr-2">{{ formatCurrency(data.sales) }}</span>
                        <Badge v-if="data.sales_diff !== null" :severity="getSeverity(data.sales_diff)" size="small">
                            {{ data.sales_diff > 0 ? '+' : '' }}{{ formatYenInTenThousandsNoDecimal(data.sales_diff) }}
                        </Badge>
                    </div>
                </template>
            </Column>
            <!-- Forecast OCC -->
            <Column field="forecast_occ" header="計画稼働率" style="width: 20%">
                <template #body="{ data }">
                    <div class="text-right">
                        {{ data.forecast_occ ? data.forecast_occ.toFixed(1) + '%' : '-' }}
                    </div>
                </template>
            </Column>
            <!-- Actual OCC with DoD -->
            <Column field="occ" header="実績稼働率 / 前日比" style="width: 25%">
                <template #body="{ data }">
                    <div class="flex justify-end items-center">
                        <span class="mr-2">{{ data.occ.toFixed(1) }}%</span>
                        <Badge v-if="data.occ_diff !== null" :severity="getSeverity(data.occ_diff)" size="small">
                            {{ data.occ_diff > 0 ? '+' : '' }}{{ data.occ_diff.toFixed(1) }}%
                        </Badge>
                    </div>
                </template>
            </Column>
            <!-- Hidden Columns for Export -->
            <Column field="prev_sales" header="前日実績売上" hidden exportable></Column>
            <Column field="prev_occ" header="前日実績稼働率" hidden exportable></Column>
            <Column field="confirmed_nights" header="確定泊数" hidden exportable></Column>
            <Column field="total_bookable_room_nights" header="販売可能室数" hidden exportable></Column>
            <Column field="blocked_nights" header="ブロック数" hidden exportable></Column>
            <Column field="net_available_room_nights" header="正味販売可能室数" hidden exportable></Column>
        </DataTable>
    </Panel>
</template>

<script setup>
import { ref } from 'vue';
import { Panel, DataTable, Column, Badge, Button } from 'primevue';
import { formatCurrency, formatYenInTenThousandsNoDecimal } from '@/utils/formatUtils';

defineProps({
    data: {
        type: Array,
        required: true,
        default: () => []
    }
});

const dt = ref();

const exportCSV = () => {
    dt.value.exportCSV();
};

const getSeverity = (value) => {
    if (value > 0) return 'success';
    if (value < 0) return 'danger';
    return 'secondary';
};
</script>
