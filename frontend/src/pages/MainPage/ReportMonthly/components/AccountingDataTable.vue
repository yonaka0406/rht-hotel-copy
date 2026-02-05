<template>
    <Panel header="要約損益計算書" toggleable class="col-span-12">
        <Card>
            <template #content>
                <DataTable :value="tableData" class="p-datatable-sm tabular-nums" :rowClass="rowClass">
                    <Column field="monthLabel" header="月" header-class="text-center" />

                    <!-- Sales -->
                    <Column field="revenue" header="売上高" header-class="text-center" body-class="text-right">
                        <template #body="slotProps">
                            {{ slotProps.data.isAverage ? '-' : formatCurrency(slotProps.data.revenue) }}
                        </template>
                    </Column>
                    <Column v-if="showGrowth" field="revenueMoM" header="売上 MoM" header-class="text-center" body-class="text-right">
                        <template #body="slotProps">
                            <span v-if="!slotProps.data.isAverage" :class="getGrowthClass(slotProps.data.revenueMoM)">
                                {{ formatPercentage(slotProps.data.revenueMoM) }}
                            </span>
                        </template>
                    </Column>
                    <Column v-if="showGrowth" field="revenueYoY" header="売上 YoY" header-class="text-center" body-class="text-right">
                        <template #body="slotProps">
                            <span v-if="!slotProps.data.isAverage" :class="getGrowthClass(slotProps.data.revenueYoY)">
                                {{ formatPercentage(slotProps.data.revenueYoY) }}
                            </span>
                        </template>
                    </Column>

                    <!-- Costs -->
                    <Column field="costs" header="売上原価・経費" header-class="text-center" body-class="text-right">
                        <template #body="slotProps">
                            <span :class="slotProps.data.isAverage ? '' : 'text-orange-600'">
                                {{ slotProps.data.isAverage ? '-' : formatCurrency(slotProps.data.costs) }}
                            </span>
                        </template>
                    </Column>
                    <Column field="costRatio" header="経費率" header-class="text-center" body-class="text-right">
                        <template #body="slotProps">
                            <span class="text-xs text-gray-500">
                                {{ slotProps.data.costRatio.toFixed(1) }}%
                            </span>
                        </template>
                    </Column>

                    <!-- Operating Profit -->
                    <Column field="operatingProfit" header="営業利益" header-class="text-center" body-class="text-right">
                        <template #body="slotProps">
                            <span :class="getProfitClass(slotProps.data.operatingProfit)">
                                {{ formatCurrency(slotProps.data.operatingProfit) }}
                            </span>
                        </template>
                    </Column>
                    <Column v-if="showGrowth" field="profitMoM" header="利益 MoM" header-class="text-center" body-class="text-right">
                        <template #body="slotProps">
                            <span v-if="!slotProps.data.isAverage" :class="getGrowthClass(slotProps.data.profitMoM)">
                                {{ formatPercentage(slotProps.data.profitMoM) }}
                            </span>
                        </template>
                    </Column>
                    <Column v-if="showGrowth" field="profitYoY" header="利益 YoY" header-class="text-center" body-class="text-right">
                        <template #body="slotProps">
                            <span v-if="!slotProps.data.isAverage" :class="getGrowthClass(slotProps.data.profitYoY)">
                                {{ formatPercentage(slotProps.data.profitYoY) }}
                            </span>
                        </template>
                    </Column>
                    <Column field="margin" header="営業利益率" header-class="text-center" body-class="text-right">
                        <template #body="slotProps">
                            <span :class="['font-semibold', slotProps.data.margin < 0 ? 'text-red-400' : 'text-emerald-500']">
                                {{ slotProps.data.margin.toFixed(1) }}%
                            </span>
                        </template>
                    </Column>
                </DataTable>
            </template>
        </Card>
    </Panel>
</template>

<script setup>
import { computed } from 'vue';
import { Card, Panel, DataTable, Column } from 'primevue';

const props = defineProps({
    data: {
        type: Array,
        required: true
    },
    viewMode: {
        type: String,
        required: true
    },
    showGrowth: {
        type: Boolean,
        default: true
    }
});

const tableData = computed(() => {
    if (props.viewMode !== 'yearCumulative' || props.data.length === 0) {
        return props.data;
    }

    // Calculate averages
    const validMonths = props.data.filter(d => !d.isAverage);
    if (validMonths.length === 0) return props.data;

    const count = validMonths.length;
    const avgRevenue = validMonths.reduce((sum, d) => sum + d.revenue, 0) / count;
    const avgCosts = validMonths.reduce((sum, d) => sum + d.costs, 0) / count;
    const avgProfit = validMonths.reduce((sum, d) => sum + d.operatingProfit, 0) / count;
    const avgCostRatio = validMonths.reduce((sum, d) => sum + d.costRatio, 0) / count;
    const avgMargin = validMonths.reduce((sum, d) => sum + d.margin, 0) / count;

    const averageRow = {
        monthLabel: '年度平均',
        revenue: avgRevenue,
        costs: avgCosts,
        operatingProfit: avgProfit,
        costRatio: avgCostRatio,
        margin: avgMargin,
        isAverage: true
    };

    return [...props.data, averageRow];
});

const rowClass = (data) => {
    return data.isAverage ? 'bg-gray-50 dark:bg-gray-700/50 font-bold' : '';
};

const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0
    }).format(value);
};

const formatPercentage = (value) => {
    if (value === null || value === undefined) return '-';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
};

const getGrowthClass = (value) => {
    if (value === null || value === undefined) return '';
    return value > 0 ? 'text-emerald-500' : (value < 0 ? 'text-red-500' : 'text-gray-500');
};

const getProfitClass = (value) => {
    if (value === null || value === undefined) return '';
    return value < 0 ? 'text-red-500 font-bold' : 'text-emerald-600 font-bold';
};
</script>

<style scoped>
.tabular-nums {
    font-variant-numeric: tabular-nums;
}
</style>
