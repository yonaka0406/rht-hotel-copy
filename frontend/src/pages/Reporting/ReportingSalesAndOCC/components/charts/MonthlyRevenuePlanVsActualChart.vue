<template>
    <div ref="chartContainer" :style="{ height: height, width: '100%' }"></div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef, nextTick } from 'vue';
import * as echarts from 'echarts/core';
import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DatasetComponent,
    TransformComponent,
} from 'echarts/components';
import { BarChart, LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import {
    formatYenInTenThousands,
} from '@/utils/formatUtils';
import { colorScheme, calculateVariancePercentage } from '@/utils/reportingUtils';

echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DatasetComponent,
    TransformComponent,
    BarChart,
    LineChart,
    CanvasRenderer,
]);

const props = defineProps({
    revenueData: {
        type: Array,
        required: true,
    },
    prevYearRevenueData: {
        type: Array,
        default: () => [],
    },
    height: {
        type: String,
        default: '450px',
    },
});

const chartContainer = ref(null);
const chartInstance = shallowRef(null);

const chartOptions = computed(() => {
    const data = props.revenueData;
    if (!data || !data.length) return {};

    const months = [...new Set(data.map(item => item.month))].sort();
    const getDataForMonth = (month, key) => data.find(d => d.month === month)?.[key] ?? 0;

    // Get previous year data - map by month number for comparison
    const getPrevYearDataForMonth = (month) => {
        if (!props.prevYearRevenueData || props.prevYearRevenueData.length === 0) return 0;
        // Extract month number from current month (e.g., "2025-04" -> "04")
        const monthNum = month.slice(-2);
        // Find previous year data with matching month number
        const prevData = props.prevYearRevenueData.find(d => d.month?.slice(-2) === monthNum);
        return prevData?.period_revenue || prevData?.accommodation_revenue || 0;
    };

    const forecastRevenues = months.map(month => getDataForMonth(month, 'forecast_revenue'));
    const periodRevenues = months.map(month => getDataForMonth(month, 'period_revenue'));
    const prevYearRevenues = months.map(month => getPrevYearDataForMonth(month));

    const variances = months.map(month => {
        const forecast = getDataForMonth(month, 'forecast_revenue');
        const period = getDataForMonth(month, 'period_revenue');
        return parseFloat(calculateVariancePercentage(period, forecast)) || 0;
    });

    const hasPrevYearData = prevYearRevenues.some(v => v > 0);
    const legendData = hasPrevYearData
        ? ['前年実績', '計画売上', '実績売上', '分散 (%)']
        : ['計画売上', '実績売上', '分散 (%)'];

    const series = [];

    // Add previous year series first (so it appears behind)
    if (hasPrevYearData) {
        series.push({
            name: '前年実績',
            type: 'bar',
            data: prevYearRevenues,
            emphasis: { focus: 'series' },
            itemStyle: { color: '#909399' }
        });
    }

    series.push(
        { name: '計画売上', type: 'bar', data: forecastRevenues, emphasis: { focus: 'series' }, itemStyle: { color: colorScheme.forecast } },
        { name: '実績売上', type: 'bar', data: periodRevenues, emphasis: { focus: 'series' }, itemStyle: { color: colorScheme.actual } },
        {
            name: '分散 (%)',
            type: 'line',
            yAxisIndex: 1,
            data: variances,
            smooth: true,
            itemStyle: { color: colorScheme.variance },
            label: { show: true, position: 'top', formatter: (params) => `${params.value}%` }
        }
    );

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
            formatter: (params) => {
                let tooltipText = `${params[0].axisValueLabel}<br/>`;
                params.forEach(param => {
                    if (param.seriesName === '分散 (%)') {
                        tooltipText += `${param.marker} ${param.seriesName}: ${param.value}%<br/>`;
                    } else {
                        tooltipText += `${param.marker} ${param.seriesName}: ${formatYenInTenThousands(param.value)}<br/>`;
                    }
                });
                return tooltipText;
            }
        },
        legend: { data: legendData, top: 'bottom' },
        grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
        xAxis: [{ type: 'category', data: months, axisPointer: { type: 'shadow' } }],
        yAxis: [
            { type: 'value', name: '売上 (万円)', axisLabel: { formatter: (value) => `${(value / 10000).toLocaleString('ja-JP')}` }, min: 0 },
            { type: 'value', axisLabel: { show: false }, splitLine: { show: false } }
        ],
        series
    };
});

const initOrUpdateChart = () => {
    if (chartContainer.value) {
        if (!chartInstance.value || chartInstance.value.isDisposed?.()) {
            chartInstance.value = echarts.init(chartContainer.value);
        }
        chartInstance.value.setOption(chartOptions.value, true);
        chartInstance.value.resize();
    }
};

const resizeChartHandler = () => {
    chartInstance.value?.resize();
};

onMounted(() => {
    nextTick(initOrUpdateChart);
    window.addEventListener('resize', resizeChartHandler);
});

onBeforeUnmount(() => {
    chartInstance.value?.dispose();
    window.removeEventListener('resize', resizeChartHandler);
});

watch([() => props.revenueData, () => props.prevYearRevenueData], () => {
    nextTick(initOrUpdateChart);
}, { deep: true });
</script>
