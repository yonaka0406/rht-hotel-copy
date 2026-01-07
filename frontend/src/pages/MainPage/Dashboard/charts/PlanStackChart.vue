<template>
    <div ref="chartContainer" :key="chartKey" class="w-full h-100"></div>
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
    }
});

const chartContainer = ref(null);
let chartInstance = null;

const generateChartOptions = () => ({
    title: {
        text: 'プラン',
    },
    tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        }
    },
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
