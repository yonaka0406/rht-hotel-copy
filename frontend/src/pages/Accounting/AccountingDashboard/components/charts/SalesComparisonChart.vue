<script setup>
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, BarChart } from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent
} from 'echarts/components';

use([
    CanvasRenderer,
    LineChart,
    BarChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent
]);

const props = defineProps({
    chartData: {
        type: Object,
        default: null
    },
    selectedYear: {
        type: Number,
        required: true
    },
    availableYears: {
        type: Array,
        default: () => []
    },
    canGoPreviousYear: {
        type: Boolean,
        default: false
    },
    canGoNextYear: {
        type: Boolean,
        default: false
    },
    isLoading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['changeYear', 'navigateToDetails']);

// Chart configuration
const chartOption = computed(() => {
    if (!props.chartData || !props.chartData.monthlyData) {
        return null;
    }

    const data = props.chartData.monthlyData;
    
    const months = data.map(d => d.month_label);
    const pmsData = data.map(d => {
        const amount = parseFloat(d.pms_amount) || 0;
        return Math.round(amount / 1000);
    });
    const yayoiData = data.map(d => {
        const amount = parseFloat(d.yayoi_amount) || 0;
        return Math.round(amount / 1000);
    });

    return {
        title: {
            text: `${props.selectedYear}年 売上比較`,
            textStyle: {
                fontSize: 14,
                fontWeight: 'bold'
            },
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                let result = `${params[0].axisValue}<br/>`;
                params.forEach(param => {
                    const rawValue = param.value;
                    let value = 0;
                    if (rawValue !== null && rawValue !== undefined) {
                        const numValue = parseFloat(rawValue);
                        if (!isNaN(numValue)) {
                            value = numValue * 1000;
                        }
                    }
                    const formattedValue = new Intl.NumberFormat('ja-JP').format(value);
                    result += `${param.seriesName}: ¥${formattedValue}<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: ['PMS売上', '弥生データ'],
            bottom: 0,
            textStyle: {
                fontSize: 11
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: months,
            axisLabel: {
                fontSize: 10
            }
        },
        yAxis: {
            type: 'value',
            name: '売上 (千円)',
            nameTextStyle: {
                fontSize: 10
            },
            axisLabel: {
                fontSize: 10,
                formatter: '{value}K'
            }
        },
        series: [
            {
                name: 'PMS売上',
                type: 'bar',
                data: pmsData,
                itemStyle: {
                    color: '#8b5cf6'
                }
            },
            {
                name: '弥生データ',
                type: 'line',
                data: yayoiData,
                itemStyle: {
                    color: '#f59e0b'
                },
                lineStyle: {
                    width: 2
                },
                symbol: 'circle',
                symbolSize: 4
            }
        ]
    };
});
</script>

<template>
    <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
            <div class="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <i class="pi pi-chart-line text-violet-600 dark:text-violet-400 text-lg"></i>
            </div>
            <div class="flex items-center justify-center gap-2">
                <button @click="emit('changeYear', -1)" 
                    :disabled="!canGoPreviousYear"
                    class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <i class="pi pi-chevron-left text-slate-600 dark:text-slate-400 text-sm"></i>
                </button>
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[4rem] text-center">
                    {{ selectedYear }}年
                </span>
                <button @click="emit('changeYear', 1)" 
                    :disabled="!canGoNextYear"
                    class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <i class="pi pi-chevron-right text-slate-600 dark:text-slate-400 text-sm"></i>
                </button>
            </div>
        </div>
    </div>
    <div class="h-64">
        <div v-if="isLoading" class="flex flex-col gap-4 h-full p-2">
            <div class="flex items-end gap-2 h-48 px-2">
                <div v-for="i in 12" :key="i" class="flex-1 bg-slate-100 dark:bg-slate-700 rounded-t animate-pulse" :style="{ height: `${Math.random() * 60 + 20}%` }"></div>
            </div>
            <div class="flex justify-between px-2">
                <div v-for="i in 6" :key="i" class="h-2 bg-slate-100 dark:bg-slate-700 rounded w-8 animate-pulse"></div>
            </div>
        </div>
        <VChart v-else-if="chartOption" :option="chartOption" class="w-full h-full" />
        <div v-else class="flex flex-col items-center justify-center h-full text-slate-400">
            <i class="pi pi-chart-bar text-4xl mb-2 opacity-20"></i>
            <p class="text-xs">データがありません</p>
        </div>
    </div>
    <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        <p class="text-xs text-slate-500 dark:text-slate-400 text-center mb-2">
            PMS売上計算と弥生会計データの月次比較
        </p>
        <button @click="emit('navigateToDetails')"
            class="w-full sm:w-auto text-xs font-semibold text-slate-500 hover:text-violet-600 flex items-center justify-center sm:justify-start gap-1 transition-colors cursor-pointer bg-transparent border-none p-0">
            差異分析・詳細を表示 <i class="pi pi-arrow-right text-[10px]"></i>
        </button>
    </div>
</template>
