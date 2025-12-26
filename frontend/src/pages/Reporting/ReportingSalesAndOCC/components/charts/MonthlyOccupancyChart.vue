<template>
    <div ref="chartContainer" :style="{ height: height, width: '100%' }"></div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef, nextTick } from 'vue';
import * as echarts from 'echarts/core';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, VisualMapComponent } from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { formatPercentage } from '@/utils/formatUtils';
import { colorScheme } from '@/utils/reportingUtils';

echarts.use([TitleComponent, TooltipComponent, GridComponent, LegendComponent, VisualMapComponent, LineChart, CanvasRenderer]);

const props = defineProps({
    occupancyData: {
        type: Array,
        required: true
    },
    prevYearOccupancyData: {
        type: Array,
        default: () => []
    },
    comparisonType: {
        type: String,
        default: 'forecast'
    },
    height: {
        type: String,
        default: '450px'
    },
    title: {
        type: String,
        default: ''
    }
});

const chartContainer = ref(null);
const chartInstance = shallowRef(null);

const chartOptions = computed(() => {
    const data = props.occupancyData;
    if (!data || data.length === 0) return {};

    const isYoY = props.comparisonType === 'yoy';
    const months = [...new Set(data.map(item => item.month))].sort((a, b) => new Date(a) - new Date(b));

    // fc_occ and occ are already percentages (e.g., 85.0 for 85%), so divide by 100 for chart (0-1 scale)
    const actualOccupancy = months.map(month => (data.find(d => d.month === month)?.occ ?? 0) / 100);

    let comparisonOccupancy;
    let comparisonLabel;
    let comparisonColor;

    if (isYoY && props.prevYearOccupancyData && props.prevYearOccupancyData.length > 0) {
        // For YoY, match by month number (e.g., "2025-04" matches "2024-04")
        comparisonOccupancy = months.map(month => {
            const monthNum = month.slice(-2); // Extract "04" from "2025-04"
            const prevYearEntry = props.prevYearOccupancyData.find(d => d.month?.slice(-2) === monthNum);
            return (prevYearEntry?.occ ?? 0) / 100;
        });
        comparisonLabel = '前年稼働率';
        comparisonColor = '#909399';
    } else {
        comparisonOccupancy = months.map(month => (data.find(d => d.month === month)?.fc_occ ?? 0) / 100);
        comparisonLabel = '計画稼働率';
        comparisonColor = colorScheme.forecast;
    }

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
            formatter: (params) => {
                let tooltipText = `${props.title ? props.title + ' - ' : ''}${params[0].axisValueLabel}<br/>`;
                params.forEach(param => {
                    tooltipText += `${param.marker} ${param.seriesName}: ${formatPercentage(param.value)}<br/>`;
                });
                return tooltipText;
            }
        },
        legend: {
            data: [
                { name: comparisonLabel, itemStyle: { color: comparisonColor } },
                { name: '実績稼働率', itemStyle: { color: colorScheme.actual } }
            ],
            top: 'bottom'
        },
        grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
        xAxis: [{ type: 'category', data: months, axisPointer: { type: 'shadow' } }],
        yAxis: [{
            type: 'value',
            name: '稼働率',
            min: 0,
            max: 1, // Data is 0-1
            axisLabel: { formatter: (value) => formatPercentage(value) }
        }],
        visualMap: [
            {
                show: false,
                type: 'continuous',
                seriesIndex: 0,
                dimension: 1,
                min: 0,
                max: 1,
                inRange: {
                    color: isYoY
                        ? [colorScheme.neutral_gray, comparisonColor, comparisonColor, comparisonColor]
                        : [colorScheme.neutral_gray, colorScheme.forecast_gradient_bottom, colorScheme.forecast_gradient_middle, colorScheme.forecast_gradient_top]
                }
            },
            {
                show: false,
                type: 'continuous',
                seriesIndex: 1,
                dimension: 1,
                min: 0,
                max: 1,
                inRange: {
                    color: [colorScheme.neutral_gray, colorScheme.actual_gradient_bottom, colorScheme.actual_gradient_middle, colorScheme.actual_gradient_top]
                }
            }
        ],
        series: [
            {
                name: comparisonLabel,
                type: 'line',
                data: comparisonOccupancy,
                smooth: true,
                symbol: 'roundRect',
                symbolSize: 8,
                itemStyle: { color: comparisonColor },
                lineStyle: { width: 2.5 },
                emphasis: { focus: 'series' }
            },
            {
                name: '実績稼働率',
                type: 'line',
                data: actualOccupancy,
                smooth: true,
                symbol: 'triangle',
                symbolSize: 8,
                itemStyle: { color: colorScheme.actual },
                lineStyle: { width: 2.5 },
                emphasis: { focus: 'series' }
            }
        ]
    };
});

const initChart = () => {
    if (chartContainer.value && (!chartInstance.value || chartInstance.value.isDisposed?.())) {
        chartInstance.value = echarts.init(chartContainer.value);
    }
    if (chartInstance.value && chartOptions.value && Object.keys(chartOptions.value).length > 0) {
        chartInstance.value.setOption(chartOptions.value, true);
        chartInstance.value.resize();
    }
};

const resizeChart = () => {
    chartInstance.value?.resize();
};

const disposeChart = () => {
    if (chartInstance.value && !chartInstance.value.isDisposed?.()) {
        chartInstance.value.dispose();
        chartInstance.value = null;
    }
};

onMounted(() => {
    nextTick(initChart);
    window.addEventListener('resize', resizeChart);
});

onBeforeUnmount(() => {
    disposeChart();
    window.removeEventListener('resize', resizeChart);
});

watch([chartOptions, () => props.occupancyData], () => {
    nextTick(initChart);
}, { deep: true });

watch(() => props.comparisonType, () => {
    nextTick(initChart);
});

watch(() => props.prevYearOccupancyData, () => {
    nextTick(initChart);
}, { deep: true });
</script>