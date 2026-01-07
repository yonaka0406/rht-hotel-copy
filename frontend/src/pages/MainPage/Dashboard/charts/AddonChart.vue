<template>
    <div ref="chartContainer" :key="chartKey" class="w-full h-100" role="img"
        :aria-label="chartLabel"></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as echarts from 'echarts/core';
import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent
} from 'echarts/components';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    BarChart,
    CanvasRenderer
]);

const props = defineProps({
    xAxisData: {
        type: Array,
        required: true
    },
    seriesData: {
        type: Array,
        required: true
    },
    chartKey: {
        type: Number,
        default: 0
    },
    chartLabel: {
        type: String,
        default: 'Addon usage chart'
    }
});

const chartContainer = ref(null);
let chartInstance = null;

const generateChartOptions = () => ({
    title: {
        text: 'アドオン',
    },
    tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        }
    },
    color: [
        "#27727b",
        "#fcce10",
        "#e87c25",
        "#b5c334",
        "#fe8463",
        "#9bca63",
        "#fad860",
        "#f3a43b",
        "#60c0dd",
        "#d7504b",
        "#c6e579",
        "#f4e001",
        "#f0805a",
        "#26c0c0",
        "#c1232b"
    ],
    legend: {
        bottom: '0%'
    },
    grid: {
        left: '3%',
        right: '4%',
        bottom: '20%',
        containLabel: true
    },
    xAxis: [
        {
            type: 'category',
            data: props.xAxisData,
            axisLabel: {
                rotate: 55
            }
        }
    ],
    yAxis: [
        {
            type: 'value'
        }
    ],
    series: props.seriesData
});

const initChart = () => {
    if (chartContainer.value) {
        chartInstance = echarts.getInstanceByDom(chartContainer.value) || echarts.init(chartContainer.value, null, { renderer: 'canvas' });
        chartInstance.setOption(generateChartOptions(), true);
        chartInstance.resize();
    }
};

const handleResize = () => {
    if (chartInstance) {
        chartInstance.resize();
    }
};

onMounted(() => {
    nextTick(() => {
        initChart();
        window.addEventListener('resize', handleResize);
    });
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (chartInstance) {
        chartInstance.dispose();
        chartInstance = null;
    }
});

watch(() => [props.xAxisData, props.seriesData], () => {
    nextTick(initChart);
}, { deep: true });
</script>
