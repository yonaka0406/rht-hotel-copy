<template>
    <Panel toggleable class="col-span-12">
        <template #header>
            <div class="flex items-center justify-between w-full mr-4">
                <span class="font-bold">{{ panelTitle }}</span>
                <div class="flex items-center gap-2">
                    <ToggleButton
                        :modelValue="comparePreviousYear"
                        @update:modelValue="$emit('update:comparePreviousYear', $event)"
                        onLabel="前年比較 ON"
                        offLabel="前年比較 OFF"
                        onIcon="pi pi-check"
                        offIcon="pi pi-times"
                        class="p-button-sm"
                    />
                </div>
            </div>
        </template>
        <Card>
            <template #content>
                <div v-if="!hasData" class="flex items-center justify-center h-80 text-gray-400">
                    表示するデータがありません
                </div>
                <div v-else class="space-y-8">
                    <div v-if="viewMode === 'yearCumulative'" class="text-center font-semibold text-gray-600 dark:text-gray-400 mb-2">月次推移</div>
                    <div ref="chartRef" class="w-full h-80"></div>

                    <template v-if="viewMode === 'yearCumulative'">
                        <Divider />
                        <div class="text-center font-semibold text-gray-600 dark:text-gray-400 mb-2">累計推移</div>
                        <div ref="cumulativeChartRef" class="w-full h-80"></div>
                    </template>
                </div>
            </template>
        </Card>
    </Panel>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { Card, Panel, ToggleButton, Divider } from 'primevue';
import * as echarts from 'echarts/core';
import { TooltipComponent, GridComponent, LegendComponent } from 'echarts/components';
import { LineChart, BarChart } from 'echarts/charts';
import { UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([TooltipComponent, GridComponent, LegendComponent, LineChart, BarChart, UniversalTransition, CanvasRenderer]);

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
    },
    viewMode: {
        type: String,
        default: 'yearCumulative'
    }
});

defineEmits(['update:comparePreviousYear']);

const chartRef = ref(null);
const cumulativeChartRef = ref(null);
let myChart = null;
let myCumulativeChart = null;

const panelTitle = computed(() => {
    return props.viewMode === 'month' ? '損益比較' : '損益・累計推移';
});

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

    if (props.viewMode === 'yearCumulative' && cumulativeChartRef.value && !myCumulativeChart) {
        myCumulativeChart = echarts.init(cumulativeChartRef.value);
    }

    const isMonthView = props.viewMode === 'month';
    const months = props.data.map(d => d.monthLabel);
    const revenueData = props.data.map(d => d.revenue);
    const costsData = props.data.map(d => Math.abs(d.costs));
    const profitData = props.data.map(d => d.operatingProfit);

    const series = [];

    if (isMonthView) {
        // Bar Chart for Month view
        series.push({
            name: '売上高',
            type: 'bar',
            data: revenueData,
            itemStyle: { color: '#10b981' },
            label: { show: true, position: 'top', formatter: (p) => formatCurrency(p.value) }
        });
        series.push({
            name: '費用',
            type: 'bar',
            data: costsData,
            itemStyle: { color: '#f97316' },
            label: { show: true, position: 'top', formatter: (p) => formatCurrency(p.value) }
        });
        series.push({
            name: '営業利益',
            type: 'bar',
            data: profitData,
            itemStyle: { color: '#3b82f6' },
            label: { show: true, position: 'top', formatter: (p) => formatCurrency(p.value) }
        });

        if (props.comparePreviousYear) {
            const prevRevenueData = props.data.map(d => d.prevRevenue);
            const prevProfitData = props.data.map(d => d.prevOperatingProfit);

            series.push({
                name: '売上高 (前年)',
                type: 'bar',
                data: prevRevenueData,
                itemStyle: { color: '#10b981', opacity: 0.5 },
                label: { show: true, position: 'top', formatter: (p) => formatCurrency(p.value) }
            });
            series.push({
                name: '営業利益 (前年)',
                type: 'bar',
                data: prevProfitData,
                itemStyle: { color: '#3b82f6', opacity: 0.5 },
                label: { show: true, position: 'top', formatter: (p) => formatCurrency(p.value) }
            });
        }
    } else {
        // Line Chart for Trend view
        series.push({
            name: '売上高',
            type: 'line',
            data: revenueData,
            itemStyle: { color: '#10b981' },
            smooth: true
        });
        series.push({
            name: '費用',
            type: 'line',
            data: costsData,
            itemStyle: { color: '#f97316' },
            smooth: true
        });
        series.push({
            name: '営業利益',
            type: 'line',
            data: profitData,
            itemStyle: { color: '#3b82f6' },
            smooth: true,
            areaStyle: { opacity: 0.1 }
        });

        if (props.comparePreviousYear) {
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

    if (props.viewMode === 'yearCumulative' && myCumulativeChart) {
        const cumulativeOption = {
            ...option,
            series: [
                {
                    name: '売上高',
                    type: 'line',
                    symbol: 'diamond',
                    symbolSize: 8,
                    data: props.data.map(d => d.cumulativeRevenue),
                    itemStyle: { color: '#10b981' },
                    smooth: true,
                    areaStyle: { opacity: 0.1 }
                },
                {
                    name: '費用',
                    type: 'line',
                    symbol: 'diamond',
                    symbolSize: 8,
                    data: props.data.map(d => Math.abs(d.cumulativeCosts)),
                    itemStyle: { color: '#f97316' },
                    smooth: true
                },
                {
                    name: '営業利益',
                    type: 'line',
                    symbol: 'diamond',
                    symbolSize: 8,
                    data: props.data.map(d => d.cumulativeOperatingProfit),
                    itemStyle: { color: '#3b82f6' },
                    smooth: true,
                    areaStyle: { opacity: 0.1 }
                }
            ]
        };

        if (props.comparePreviousYear) {
            cumulativeOption.series.push({
                name: '売上高 (前年)',
                type: 'line',
                symbol: 'diamond',
                symbolSize: 6,
                data: props.data.map(d => d.prevCumulativeRevenue),
                itemStyle: { color: '#10b981', opacity: 0.3 },
                lineStyle: { type: 'dashed' },
                smooth: true
            });
            cumulativeOption.series.push({
                name: '営業利益 (前年)',
                type: 'line',
                symbol: 'diamond',
                symbolSize: 6,
                data: props.data.map(d => d.prevCumulativeOperatingProfit),
                itemStyle: { color: '#3b82f6', opacity: 0.3 },
                lineStyle: { type: 'dashed' },
                smooth: true
            });
        }

        myCumulativeChart.setOption(cumulativeOption, true);
    }
};

const handleResize = () => {
    if (myChart) myChart.resize();
    if (myCumulativeChart) myCumulativeChart.resize();
};

onMounted(() => {
    initChart();
    window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (myChart) myChart.dispose();
    if (myCumulativeChart) myCumulativeChart.dispose();
});

watch([() => props.data, () => props.viewMode], () => {
    if (myCumulativeChart) {
        myCumulativeChart.dispose();
        myCumulativeChart = null;
    }
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
