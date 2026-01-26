<template>
    <div class="mb-8">
        <div class="mb-6 flex items-center gap-3">
            <div class="h-8 w-1 bg-violet-600 rounded-full"></div>
            <h2 class="text-xl font-bold text-slate-800 dark:text-white">科目別相関分析 (売上 vs コスト)</h2>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div v-for="account in topAccounts" :key="account.code"
                class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-slate-700 dark:text-slate-200">{{ account.name }}</h3>
                    <span class="text-[10px] py-0.5 px-2 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">
                        {{ account.code }}
                    </span>
                </div>
                <div class="h-[300px]">
                    <v-chart class="h-full w-full" :option="getScatterOption(account)" autoresize />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import VChart from 'vue-echarts';

const props = defineProps({
    topAccounts: {
        type: Array,
        required: true
    },
    rawData: {
        type: Object,
        required: true
    },
    selectedHotelId: {
        type: Number,
        required: true
    }
});

/**
 * Scatter Chart configuration for dispersion
 */
const getScatterOption = (account) => {
    const accountData = props.rawData.timeSeries.filter(d => d.account_code === account.code);
    const selectedScopeData = props.selectedHotelId === 0
        ? aggregateByMonth(accountData)
        : accountData.filter(d => d.hotel_id === props.selectedHotelId);

    const scatterData = selectedScopeData.map(d => [Number(d.sales), Number(d.cost)]);

    return {
        grid: {
            top: 40,
            left: 50,
            right: 20,
            bottom: 40
        },
        tooltip: {
            formatter: (params) => {
                return `売上: ${formatCurrency(params.data[0])}<br/>コスト: ${formatCurrency(params.data[1])}`;
            }
        },
        xAxis: {
            name: '売上',
            nameLocation: 'middle',
            nameGap: 25,
            splitLine: { lineStyle: { type: 'dashed', color: 'rgba(148, 163, 184, 0.1)' } },
            axisLabel: { formatter: (v) => v / 10000 + '万' }
        },
        yAxis: {
            name: 'コスト',
            splitLine: { lineStyle: { type: 'dashed', color: 'rgba(148, 163, 184, 0.1)' } },
            axisLabel: { formatter: (v) => v / 1000 + 'k' }
        },
        series: [
            {
                symbolSize: 12,
                data: scatterData,
                type: 'scatter',
                itemStyle: {
                    color: '#6366f1',
                    opacity: 0.6
                }
            }
        ]
    };
};

/**
 * Aggregate costs and sales across multiple hotels for each month
 */
function aggregateByMonth(data) {
    const monthsMap = {};
    data.forEach(d => {
        if (!monthsMap[d.month]) {
            monthsMap[d.month] = { month: d.month, cost: 0, sales: 0 };
        }
        monthsMap[d.month].cost += Number(d.cost);
        monthsMap[d.month].sales += Number(d.sales);
    });
    return Object.values(monthsMap).sort((a, b) => new Date(a.month) - new Date(b.month));
}

const formatCurrency = (value) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);
</script>