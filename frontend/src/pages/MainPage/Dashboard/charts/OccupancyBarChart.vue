<template>
    <div ref="chartContainer" class="w-full h-100"></div>
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
import { BarChart, LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    BarChart,
    LineChart,
    CanvasRenderer
]);

const props = defineProps({
    xAxisData: {
        type: Array,
        required: true
    },
    maxValue: {
        type: Number,
        required: true
    },
    roomCountData: {
        type: Array,
        required: true
    },
    occRateData: {
        type: Array,
        required: true
    },
    maleCountData: {
        type: Array,
        required: true
    },
    femaleCountData: {
        type: Array,
        required: true
    },
    unspecifiedCountData: {
        type: Array,
        required: true
    }
});

const chartContainer = ref(null);
let chartInstance = null;

const generateChartOptions = () => ({
    tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        }
    },
    color: [
        "#516b91",
        "#59c4e6",
        "#edafda",
        "#93b7e3",
        "#a5e7f0",
        "#cbb0e3"
    ],
    legend: {
        data: ['予約部屋数', '稼働率', '男性', '女性', '未定'],
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
            axisPointer: {
                type: 'shadow'
            },
            axisLabel: {
                rotate: 55
            }
        }
    ],
    yAxis: [
        {
            type: 'value',
            name: '数',
            min: 0,
            max: props.maxValue,
            interval: 10,
            axisLabel: {
                formatter: '{value}'
            }
        },
        {
            type: 'value',
            name: '稼働率',
            min: 0,
            max: 100,
            interval: 25,
            axisLabel: {
                formatter: '{value} %'
            }
        }
    ],
    series: [
        {
            name: '予約部屋数',
            type: 'bar',
            tooltip: {
                valueFormatter: function (value) {
                    return value + ' 室';
                }
            },
            data: props.roomCountData,
        },
        {
            name: '稼働率',
            type: 'line',
            yAxisIndex: 1,
            tooltip: {
                valueFormatter: function (value) {
                    return value + ' %';
                }
            },
            data: props.occRateData,
        },
        {
            name: '男性',
            type: 'bar',
            yAxisIndex: 0,
            stack: '宿泊者数',
            itemStyle: {
                color: '#93b7e3'
            },
            tooltip: {
                valueFormatter: function (value) {
                    return value + ' 人';
                }
            },
            data: props.maleCountData,
        },
        {
            name: '女性',
            type: 'bar',
            yAxisIndex: 0,
            stack: '宿泊者数',
            itemStyle: {
                color: '#edafda'
            },
            tooltip: {
                valueFormatter: function (value) {
                    return value + ' 人';
                }
            },
            data: props.femaleCountData,
        },
        {
            name: '未定',
            type: 'bar',
            yAxisIndex: 0,
            stack: '宿泊者数',
            itemStyle: {
                color: '#cccccc'
            },
            tooltip: {
                valueFormatter: function (value) {
                    return value + ' 人';
                }
            },
            data: props.unspecifiedCountData,
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

watch(() => [props.xAxisData, props.roomCountData, props.occRateData, props.maleCountData, props.femaleCountData, props.unspecifiedCountData], () => {
    nextTick(initChart);
}, { deep: true });
</script>
