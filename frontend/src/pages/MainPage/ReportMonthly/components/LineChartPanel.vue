<template>
    <Panel header="売上" toggleable :collapsed="false" class="col-span-12">             
        <Card class="col-span-12">
            <template #title>
                
            </template>
            <template #subtitle>
                <p>{{ lineChartTitle }}</p>
            </template>
            <template #content>    
                <div ref="lineChart" class="w-full h-60"></div>                
            </template>
        </Card>             
        
    </Panel>
</template>

<script setup>
import { defineProps, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { Card, Panel } from 'primevue';
import * as echarts from 'echarts/core';
import {
    TooltipComponent,
    GridComponent,
    LegendComponent
} from 'echarts/components';
import { BarChart, LineChart } from 'echarts/charts';
import { UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    TooltipComponent,
    GridComponent,
    LegendComponent,
    BarChart,
    LineChart,
    UniversalTransition,
    CanvasRenderer
]);

const props = defineProps({
    lineChartTitle: {
        type: String,
        required: true
    },
    lineChartAxisX: {
        type: Array,
        required: true
    },
    lineChartSeriesData: {
        type: Array,
        required: true
    },
    lineChartSeriesSumData: {
        type: Array,
        required: true
    },
    viewMode: {
        type: String,
        required: true
    }
});

const lineChart = ref(null);
let myLineChart = null;

const initLineChart = () => {
    if (!lineChart.value) return;
    const option = {
        tooltip: {
            trigger: 'axis',
            position: 'top',
            formatter: (params) => {
                let dateStr = params[0].name;
                let tooltipContent = '';
                if (props.viewMode === 'month') {
                    const date = new Date(dateStr);
                    const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
                    const dayOfWeek = daysOfWeek[date.getDay()];
                    tooltipContent += `${dateStr} (${dayOfWeek})<br/>`;
                } else {
                    tooltipContent += `${dateStr}<br/>`;
                }
                params.forEach(item => {
                    tooltipContent += `${item.marker} ${item.seriesName}: ${item.value.toLocaleString('ja-JP')} 円<br/>`;
                });
                return tooltipContent;
            }
        },
        legend: {
            data: props.viewMode === 'month' ? ['日次売上', '当月累計'] : ['月次売上', '年度累計'],
            bottom: 0
        },
        grid: { top: '20%', height: '70%', left: '3%', right: '10%', bottom: '10%', containLabel: true }, // Increased right padding
        xAxis: {
            type: 'category',
            boundaryGap: true, // Always true for bar charts
            data: props.lineChartAxisX,
            axisLabel: {
                rotate: props.viewMode === 'month' ? 45 : 0,
                formatter: (value) => {
                    if (props.viewMode === 'month' && typeof value === 'string' && value.includes('-')) {
                        return value.substring(5);
                    }
                    return value;
                }
            }
        },
        yAxis: [ // Changed to an array for two Y-axes
            {
                type: 'value',
                name: props.viewMode === 'month' ? '日次売上 (円)' : '月次売上 (円)',
                axisLabel: {
                    formatter: (value) => value >= 10000 ? `${(value / 10000).toLocaleString()}万円` : `${value.toLocaleString()}円`
                }
            },
            {
                type: 'value',
                name: props.viewMode === 'month' ? '当月累計 (円)' : '年度累計 (円)', // Name for the second Y-axis
                axisLabel: {
                    formatter: (value) => value >= 10000 ? `${(value / 10000).toLocaleString()}万円` : `${value.toLocaleString()}円`
                },
                alignTicks: true // Align ticks with the first y-axis
            }
        ],
        series: [
            {
                name: props.viewMode === 'month' ? '日次売上' : '月次売上',
                type: 'bar',
                data: props.lineChartSeriesData,
                itemStyle: { color: '#4ea397' }, // Updated color
                yAxisIndex: 0, // Explicitly assign to the first Y-axis
                barCategoryGap: '20%' // Add gap between bars
            },
            {
                name: props.viewMode === 'month' ? '当月累計' : '年度累計',
                type: 'line',
                smooth: true,
                data: props.lineChartSeriesSumData,
                itemStyle: { color: '#22c3aa' }, // Updated color
                yAxisIndex: 1 // Assign to the second Y-axis
            }
        ]
    };
    if (!myLineChart) {
        myLineChart = echarts.init(lineChart.value);
    }
    myLineChart.setOption(option, true);
};

const handleResize = () => {
    if (myLineChart) myLineChart.resize();
};

onMounted(() => {
    initLineChart();
    window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (myLineChart) myLineChart.dispose();
});

watch([() => props.lineChartAxisX, () => props.lineChartSeriesData, () => props.lineChartSeriesSumData, () => props.viewMode], () => {
    initLineChart();
}, { deep: true });
</script>
