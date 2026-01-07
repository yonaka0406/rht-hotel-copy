<template>
    <div ref="chartContainer" class="w-full h-100"></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as echarts from 'echarts/core';
import { GaugeChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import { TitleComponent } from 'echarts/components';

echarts.use([GaugeChart, CanvasRenderer, TitleComponent]);

const props = defineProps({
    gaugeData: {
        type: Array,
        required: true
    }
});

const chartContainer = ref(null);
let chartInstance = null;

const generateChartOptions = () => ({
    title: {
        text: '稼働率',
    },
    color: [
        "#3498db",
        "#6be6c1",
        "#626c91",
        "#a0a7e6",
        "#c4ebad",
        "#7fb3d5"
    ],
    series: [
        {
            type: 'gauge',
            startAngle: 90,
            endAngle: -270,
            pointer: {
                show: false
            },
            progress: {
                show: true,
                overlap: false,
                roundCap: true,
                clip: false,
                itemStyle: {
                    borderWidth: 1,
                    borderColor: '#464646'
                }
            },
            axisLine: {
                lineStyle: {
                    width: 40
                }
            },
            splitLine: {
                show: false,
                distance: 0,
                length: 10
            },
            axisTick: {
                show: false
            },
            axisLabel: {
                show: false,
                distance: 50
            },
            data: props.gaugeData,
            title: {
                fontSize: 14
            },
            detail: {
                width: 50,
                height: 14,
                fontSize: 14,
                color: 'inherit',
                borderColor: 'inherit',
                borderRadius: 20,
                borderWidth: 1,
                formatter: '{value}%'
            }
        }
    ]
});

const initChart = () => {
    if (chartContainer.value) {
        if (!chartInstance) {
            chartInstance = echarts.init(chartContainer.value);
        }
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

watch(() => props.gaugeData, () => {
    nextTick(initChart);
}, { deep: true });
</script>
