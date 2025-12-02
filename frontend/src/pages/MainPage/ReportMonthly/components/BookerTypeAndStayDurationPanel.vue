<template>
    <Panel header="予約者属性と滞在日数" toggleable :collapsed="false" class="col-span-12">
        <div class="grid grid-cols-12 gap-4">
            <div class="col-span-12 md:col-span-6">
                <Card>
                    <template #title>予約者区分 (泊数ベース)</template>
                    <template #content>
                        <div ref="bookerTypeChart" class="w-full h-60"></div>
                    </template>
                </Card>
            </div>
            <div class="col-span-12 md:col-span-6">
                <Card>
                    <template #title>滞在日数</template>
                    <template #content>
                        <div ref="averageLengthOfStayChart" class="w-full h-60"></div>
                    </template>
                </Card>
            </div>
        </div>
    </Panel>
</template>

<script setup>
import { defineProps, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { Card, Panel } from 'primevue';
import * as echarts from 'echarts/core';
import {
    TooltipComponent,
    LegendComponent,
    GridComponent,
    TitleComponent
} from 'echarts/components';
import { PieChart, ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    TooltipComponent,
    LegendComponent,
    GridComponent,
    TitleComponent,
    PieChart,
    ScatterChart,
    CanvasRenderer
]);

const props = defineProps({
    bookerTypeBreakdownData: {
        type: Array,
        required: true
    },
    reservationListData: {
        type: Array,
        required: true
    }
});

// Booker Type Distribution
const bookerTypeChart = ref(null);
let myBookerTypeChart = null;
const bookerTypeData = ref([]);

const processBookerTypeData = () => {
    if (!props.bookerTypeBreakdownData || props.bookerTypeBreakdownData.length === 0) {
        bookerTypeData.value = [];
        initBookerTypeChart();
        return;
    }

    const mappedData = props.bookerTypeBreakdownData.map(item => {
        let name;
        if (item.legal_or_natural_person === 'individual' || item.legal_or_natural_person === 'natural') {
            name = '個人';
        } else if (item.legal_or_natural_person === 'corporate' || item.legal_or_natural_person === 'legal') {
            name = '法人';
        } else {
            name = '未設定'; 
        }
        return { name, value: item.room_nights };
    });

    const aggregatedData = mappedData.reduce((acc, current) => {
        const existing = acc.find(item => item.name === current.name);
        if (existing) {
            existing.value += current.value;
        } else {
            acc.push({ ...current });
        }
        return acc;
    }, []);

    bookerTypeData.value = aggregatedData.filter(item => item.value > 0);
    initBookerTypeChart();
};

const initBookerTypeChart = () => {
    if (!bookerTypeChart.value) return;

    const option = {
        color: ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc"],
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} 泊 ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            bottom: 'bottom'
        },
        series: [
            {
                name: '予約者区分',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '50%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: true,
                    position: 'outside',
                    formatter: (params) => {
                        const total = bookerTypeData.value.reduce((sum, item) => sum + item.value, 0);
                        const percentage = (params.value / total * 100);
                        return percentage > 5 ? `${params.name}: ${percentage.toFixed(1)}%` : '';
                    }
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 20,
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: true
                },
                data: bookerTypeData.value
            }
        ]
    };

    if (!myBookerTypeChart) {
        myBookerTypeChart = echarts.init(bookerTypeChart.value);
    }
    myBookerTypeChart.setOption(option, true);
};

// Average Length of Stay (Scatter Plot)
const averageLengthOfStayChart = ref(null);
let myAverageLengthOfStayChart = null;
const averageLengthOfStayData = ref([]);
const averageNights = ref(0);
const averagePeople = ref(0);

const processAverageLengthOfStayData = () => {
    if (!props.reservationListData) {
        averageLengthOfStayData.value = [];
        averageNights.value = 0;
        averagePeople.value = 0;
        initAverageLengthOfStayChart();
        return;
    }

    const rawDataForScatter = [];
    let totalNightsSum = 0;
    let totalPeopleSum = 0;
    let reservationCount = 0;

    props.reservationListData
        .filter(res => res.number_of_nights > 0 && res.number_of_people > 0)
        .forEach(res => {
            const nights = Number(res.number_of_nights);
            const people = Number(res.number_of_people);
            rawDataForScatter.push([nights, people]);
            totalNightsSum += nights;
            totalPeopleSum += people;
            reservationCount++;
        });

    averageLengthOfStayData.value = rawDataForScatter;
    averageNights.value = reservationCount > 0 ? (totalNightsSum / reservationCount) : 0;
    averagePeople.value = reservationCount > 0 ? (totalPeopleSum / reservationCount) : 0;

    initAverageLengthOfStayChart();
};

const initAverageLengthOfStayChart = () => {
    if (!averageLengthOfStayChart.value) return;

    const option = {
        title: {
            text: '平均滞在日数と人数分布',
            left: 'center',
            show: false
        },
        grid: {
            left: '3%',
            right: '7%',
            bottom: '7%',
            containLabel: true
        },
        tooltip: {
            showDelay: 0,
            formatter: function (params) {
                if (params.value.length > 1) {
                    return (
                        `泊数: ${params.value[0]}泊<br/>人数: ${params.value[1]}人`
                    );
                } else {
                    return (
                        `${params.seriesName} :<br/>` +
                        `${params.name} : ${params.value} `
                    );
                }
            },
            axisPointer: {
                show: true,
                type: 'cross',
                lineStyle: {
                    type: 'dashed',
                    width: 1
                }
            }
        },
        xAxis: [
            {
                type: 'value',
                scale: true,
                axisLabel: {
                    formatter: '{value} 泊'
                },
                splitLine: {
                    show: false
                }
            }
        ],
        yAxis: [
            {
                type: 'value',
                scale: true,
                axisLabel: {
                    formatter: '{value} 人'
                },
                splitLine: {
                    show: false
                }
            }
        ],
        series: [
            {
                name: '予約データ',
                type: 'scatter',
                data: averageLengthOfStayData.value,
                markPoint: {
                    data: [
                        { type: 'max', name: '最大値' },
                        { type: 'min', name: '最小値' }
                    ]
                },
                markLine: {
                    lineStyle: {
                        type: 'solid'
                    },
                    data: [
                        { xAxis: averageNights.value, name: '平均泊数' },
                        { yAxis: averagePeople.value, name: '平均人数' }
                    ]
                }
            }
        ]
    };

    if (!myAverageLengthOfStayChart) {
        myAverageLengthOfStayChart = echarts.init(averageLengthOfStayChart.value);
    }
    myAverageLengthOfStayChart.setOption(option, true);
};

const handleResize = () => {
    if (myBookerTypeChart) myBookerTypeChart.resize();
    if (myAverageLengthOfStayChart) myAverageLengthOfStayChart.resize();
};

onMounted(() => {
    processBookerTypeData();
    processAverageLengthOfStayData();
    window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (myBookerTypeChart) myBookerTypeChart.dispose();
    if (myAverageLengthOfStayChart) myAverageLengthOfStayChart.dispose();
});

watch([() => props.bookerTypeBreakdownData], () => {
    processBookerTypeData();
}, { deep: true });

watch([() => props.reservationListData], () => {
    processAverageLengthOfStayData();
}, { deep: true });
</script>