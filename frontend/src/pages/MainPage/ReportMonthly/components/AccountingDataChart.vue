<template>
    <Panel header="損益推移" toggleable class="col-span-12">
        <Card>
            <template #content>
                <div v-if="!hasData" class="flex items-center justify-center h-80 text-gray-400">
                    表示するデータがありません
                </div>
                <div v-else ref="chartRef" class="w-full h-80"></div>
            </template>
        </Card>
    </Panel>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { Card, Panel } from 'primevue';
import * as echarts from 'echarts/core';
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([TooltipComponent, GridComponent, LegendComponent, LineChart, UniversalTransition, CanvasRenderer]);

const props = defineProps({
    data: {
        type: Array,
        required: true
    },
    hasData: {
        type: Boolean,
        default: false
    },
    comparePreviousYear: {
        type: Boolean,
        default: false
    }
});

const chartRef = ref(null);
let myChart = null;

const formatCurrency = (value) => {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        minimumFractionDigits: 0
    }).format(value);
};

const initChart = () => {
    if (!chartRef.value || !props.hasData) return;

    if (!myChart) {
        myChart = echarts.init(chartRef.value);
    }

    const months = props.data.map(d => d.monthLabel);
    const revenueData = props.data.map(d => d.revenue);
    const costsData = props.data.map(d => Math.abs(d.costs));
    const profitData = props.data.map(d => d.operatingProfit);

    const series = [
        {
            name: '売上高',
            type: 'line',
            data: revenueData,
            itemStyle: { color: '#10b981' }, // Emerald-500
            smooth: true
        },
        {
            name: '費用',
            type: 'line',
            data: costsData,
            itemStyle: { color: '#f97316' }, // Orange-500
            smooth: true
        },
        {
            name: '営業利益',
            type: 'line',
            data: profitData,
            itemStyle: { color: '#3b82f6' }, // Blue-500
            smooth: true,
            areaStyle: {
                opacity: 0.1
            }
        }
    ];

    if (props.comparePreviousYear) {
        // Add previous year series if available in data
        const prevRevenueData = props.data.map(d => d.prevRevenue);
        const prevProfitData = props.data.map(d => d.prevOperatingProfit);

        series.push({
            name: '売上高 (前年)',
            type: 'line',
            data: prevRevenueData,
            itemStyle: { color: '#10b981', opacity: 0.3 },
            lineStyle: { type: 'dashed' },
            smooth: true
        });
        series.push({
            name: '営業利益 (前年)',
            type: 'line',
            data: prevProfitData,
            itemStyle: { color: '#3b82f6', opacity: 0.3 },
            lineStyle: { type: 'dashed' },
            smooth: true
        });
    }

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                let res = `${params[0].name}<br/>`;
                params.forEach(p => {
                    if (p.value !== undefined && p.value !== null) {
                        res += `${p.marker} ${p.seriesName}: ${formatCurrency(p.value)}<br/>`;
                    }
                });
                return res;
            }
        },
        legend: {
            data: series.map(s => s.name),
            bottom: 0
        },
        grid: {
            top: '10%',
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: months
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: (value) => {
                    if (Math.abs(value) >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                    if (Math.abs(value) >= 1000) return (value / 1000).toFixed(0) + 'K';
                    return value;
                }
            }
        },
        series: series
    };

    myChart.setOption(option, true);
};

const handleResize = () => {
    if (myChart) myChart.resize();
};

onMounted(() => {
    initChart();
    window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (myChart) myChart.dispose();
});

watch(() => props.data, () => {
    nextTick(() => {
        initChart();
    });
}, { deep: true });

watch(() => props.comparePreviousYear, () => {
    nextTick(() => {
        initChart();
    });
});
</script>
