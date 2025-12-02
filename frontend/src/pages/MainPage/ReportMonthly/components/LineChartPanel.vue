<template>
    <Panel header="売上" toggleable :collapsed="false" class="col-span-12">             
        <Card class="col-span-12">
            <template #title>
                
            </template>
            <template #subtitle>
                <p>{{ computedLineChartTitle }}</p>
            </template>
            <template #content>    
                <div ref="lineChart" class="w-full h-60"></div>                
            </template>
        </Card>             
        
    </Panel>
</template>

<script setup>
import { defineProps, ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
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
    allReservationsData: {
        type: Array,
        required: true
    },
    selectedMonth: {
        type: Date,
        required: true
    },
    viewMode: {
        type: String,
        required: true
    },
    metricsEffectiveStartDate: {
        type: String,
        required: true
    },
    metricsEffectiveEndDate: {
        type: String,
        required: true
    },
    formatDate: {
        type: Function,
        required: true
    },
    normalizeDate: {
        type: Function,
        required: true
    },
    addDaysUTC: {
        type: Function,
        required: true
    },
    isWeekend: {
        type: Function,
        required: true
    }
});

const lineChart = ref(null);
let myLineChart = null;

const computedLineChartTitle = computed(() => {
    const year = props.selectedMonth.getFullYear();
    const month = props.selectedMonth.getMonth() + 1;
    if (props.viewMode === 'month') {
        return `${year}年${month}月の日次売上`;
    } else {
        return `${year}年度 月次売上 (1月～${month}月累計)`;
    }
});

const yearOfSelectedMonth = computed(() => props.selectedMonth.getFullYear());

const processLineChartData = () => {
    if (!props.allReservationsData || !lineChart.value) {
        initLineChart([], [], [], []);
        return;
    }

    const startDateForChart = props.formatDate(new Date(props.metricsEffectiveStartDate));
    const endDateForChart = props.formatDate(new Date(props.metricsEffectiveEndDate));

    const relevantChartReservations = props.allReservationsData.filter(res => {
        const resDate = res.date;
        return resDate >= startDateForChart && resDate <= endDateForChart;
    });
    
    const dailySalesMap = new Map(); 
    relevantChartReservations.forEach(res => {
        const dayKey = res.date;            
        const currentSales = dailySalesMap.get(dayKey) || { accommodation: 0, other: 0 };
        currentSales.accommodation += parseFloat(res.accommodation_price || 0);
        currentSales.other += parseFloat(res.other_price || 0);
        dailySalesMap.set(dayKey, currentSales);
    });
    
    const newXAxis = [];
    const accommodationData = [];
    const otherData = [];
    const cumulativeAccommodationData = [];
    let cumulativeAccommodationSum = 0;

    if (props.viewMode === 'month') {
        let currentDate = props.normalizeDate(new Date(startDateForChart));
        const endDate = props.normalizeDate(new Date(endDateForChart));
        while (currentDate <= endDate) {
            
            const dayKey = props.formatDate(currentDate);
            newXAxis.push(dayKey);

            const salesForDay = dailySalesMap.get(dayKey) || { accommodation: 0, other: 0 };
            
            // Accommodation
            const accItem = { value: Math.round(salesForDay.accommodation) };
            if (props.isWeekend(dayKey)) accItem.itemStyle = { color: '#FFC0CB' };
            accommodationData.push(accItem);

            // Other Sales
            const otherItem = { value: Math.round(salesForDay.other) };
            if (props.isWeekend(dayKey)) otherItem.itemStyle = { color: '#FFC0CB' };
            otherData.push(otherItem);

            cumulativeAccommodationSum += salesForDay.accommodation;
            cumulativeAccommodationData.push(Math.round(cumulativeAccommodationSum));

            currentDate = props.addDaysUTC(currentDate, 1);
        }                        
    } else { // yearCumulative
        const endMonthIndex = props.selectedMonth.getMonth();
        for (let monthIdx = 0; monthIdx <= endMonthIndex; monthIdx++) {
            const currentYear = yearOfSelectedMonth.value;
            const monthKey = `${currentYear}-${String(monthIdx + 1).padStart(2, '0')}`; // For filtering dailySalesMap

            let salesForMonthAccommodation = 0;
            let salesForMonthOther = 0;
            dailySalesMap.forEach((sales, fullDateKey) => { // sales is { accommodation, other }
                if (fullDateKey.startsWith(monthKey)) {
                    salesForMonthAccommodation += sales.accommodation;
                    salesForMonthOther += sales.other;
                }
            });
            newXAxis.push(`${currentYear}年${monthIdx + 1}月`);
            accommodationData.push(Math.round(salesForMonthAccommodation));
            otherData.push(Math.round(salesForMonthOther));

            cumulativeAccommodationSum += salesForMonthAccommodation;
            cumulativeAccommodationData.push(Math.round(cumulativeAccommodationSum));
        }
    }
    initLineChart(newXAxis, accommodationData, otherData, cumulativeAccommodationData); // Pass otherData
};

const initLineChart = (newXAxis, accommodationData, otherData, cumulativeAccommodationData) => { // Accept otherData
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
            data: props.viewMode === 'month' ? ['宿泊売上', 'その他売上', '当月累計'] : ['宿泊売上', 'その他売上', '年度累計'], // Updated legend
            bottom: 0
        },
        grid: { top: '20%', height: '70%', left: '3%', right: '10%', bottom: '10%', containLabel: true },
        xAxis: {
            type: 'category',
            boundaryGap: true,
            data: newXAxis,
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
        yAxis: [
            {
                type: 'value',
                name: props.viewMode === 'month' ? '日次総売上 (円)' : '月次総売上 (円)', // Updated yAxis name
                axisLabel: {
                    formatter: (value) => value >= 10000 ? `${(value / 10000).toLocaleString()}万円` : `${value.toLocaleString()}円`
                }
            },
            {
                type: 'value',
                name: props.viewMode === 'month' ? '当月累計 (円)' : '年度累計 (円)',
                axisLabel: {
                    formatter: (value) => value >= 10000 ? `${(value / 10000).toLocaleString()}万円` : `${value.toLocaleString()}円`
                },
                alignTicks: true
            }
        ],
        series: [
            {
                name: props.viewMode === 'month' ? '宿泊売上' : '宿泊売上', // Changed name for clarity
                type: 'bar',
                data: accommodationData,
                itemStyle: { color: '#4ea397' },
                yAxisIndex: 0,
                barCategoryGap: '20%',
                stack: 'total' // Added stacking
            },
            {
                name: 'その他売上', // New series for other sales
                type: 'bar',
                data: otherData, // Use otherData
                itemStyle: { color: '#ffcc00' }, // Yellow color for other sales
                yAxisIndex: 0,
                stack: 'total' // Added stacking
            },
            {
                name: props.viewMode === 'month' ? '当月累計' : '年度累計',
                type: 'line',
                smooth: true,
                data: cumulativeAccommodationData,
                itemStyle: { color: '#22c3aa' },
                yAxisIndex: 1
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
    processLineChartData(); // Call processLineChartData on mount
    window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (myLineChart) myLineChart.dispose();
});

watch([
    () => props.allReservationsData,
    () => props.selectedMonth,
    () => props.viewMode,
    () => props.metricsEffectiveStartDate,
    () => props.metricsEffectiveEndDate
], processLineChartData, { deep: true }); // Watch relevant props and call processLineChartData
</script>
