<template>
    <Panel header="稼働率" toggleable :collapsed="false" class="col-span-12">
        <Card class="flex col-span-12">
            <template #title>

            </template>                
            <template #subtitle>
                <p>曜日毎の予約数ヒートマップ ({{ selectedMonth.getFullYear() }}年 {{ selectedMonth.getMonth() + 1 }}月基点)</p>
            </template>
            <template #content>
                <div ref="heatMap" class="w-full h-96"></div>             
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
    VisualMapComponent
} from 'echarts/components';
import { HeatmapChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    TooltipComponent,
    GridComponent,
    VisualMapComponent,
    HeatmapChart,
    CanvasRenderer
]);

const props = defineProps({
    selectedMonth: {
        type: Date,
        required: true
    },
    allReservationsData: {
        type: Array,
        required: true
    },
    heatMapDisplayStartDate: {
        type: String,
        required: true
    },
    heatMapDisplayEndDate: {
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
    }
});

const heatMap = ref(null);
let myHeatMap; 
const heatMapAxisX = ref([]);
const heatMapAxisY = ref([
    '日', '土', '金', '木', '水', '火', '月'
]);
const heatMapMax = ref(0);
const heatMapData = ref([]);

const processHeatMapData = () => {
    if (!props.allReservationsData || !heatMap.value) {
        heatMapData.value = [];
        initHeatMap(); // Initialize with empty data if needed
        return;
    }
    
    const start = props.normalizeDate(new Date(props.heatMapDisplayStartDate));
    const end = props.normalizeDate(new Date(props.heatMapDisplayEndDate));
           
    // Filter reservations for the heatmap's specific display window
    const relevantReservations = props.allReservationsData.filter(r => {
        const rDate = props.normalizeDate(new Date(r.date));
        return rDate >= start && rDate <= end;
    });
            
    if(relevantReservations && relevantReservations.length > 0){
        heatMapMax.value = relevantReservations[0].total_rooms; 
    } else {
        heatMapMax.value = 0;
    }
            
    const datePositionMap = {};
    let currentMapDate = start;
    let weekIdx = 0;
    let dayIdx = 0; // Monday is 6, Sunday is 0 (matching Y-axis)

    while (currentMapDate <= end) {
        
        const formattedDate = props.formatDate(new Date(currentMapDate));
        dayIdx = (7 - currentMapDate.getUTCDay()) % 7;

        datePositionMap[formattedDate] = { week: weekIdx, day: dayIdx };
        
        if (currentMapDate.getUTCDay() === 0) {
            weekIdx++;
        }
        
        currentMapDate = props.addDaysUTC(currentMapDate, 1);
    }        
    
    const processedData = [];
    relevantReservations.forEach(reservation => {
        const reservationDateISO = props.formatDate(new Date(reservation.date));
        const position = datePositionMap[reservationDateISO];
        if (position) {
            // Data format for heatmap: [weekIndex, dayIndex, value]
            processedData.push([position.week, position.day, parseInt(reservation.room_count || 0)]);
        }
    });
    heatMapData.value = processedData;
    initHeatMap();
};
const initHeatMap = () => {
    if (!heatMap.value) return;
    const option = {
        tooltip: { position: 'top' },
        grid: { height: '50%', top: '5%', bottom: '5%' },
        xAxis: {
            type: 'category',
            data: heatMapAxisX.value,
            splitArea: { show: true },
            axisLabel: { 
                formatter: function (value) {
                    return value.split('').join('\n'); // Split each character and add a newline
                },
                
            }
        },
        yAxis: { type: 'category', data: heatMapAxisY.value, splitArea: { show: true } },
        visualMap: {
            min: 0,
            max: heatMapMax.value, // Use dynamic max based on hotel capacity or data
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '5%',
            inRange: {
                color: ['#FFFFF0', '#FFFACD', '#FFEFD5', '#FFE4B5', '#FFDAB9', '#F08080', '#CD5C5C', '#B22222'] // 8 pale yellow to red gradient colors
            }
        },
        series: [{ 
            name: '予約数',
            type: 'heatmap',
            data: heatMapData.value,
            label: { show: true, formatter: (params) => params.value[2] > 0 ? params.value[2] : '' }, // Show value if > 0
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
        }]
    };
    if (!myHeatMap) {
        myHeatMap = echarts.init(heatMap.value);
    }
    myHeatMap.setOption(option, true); // true to not merge with previous options
};

const handleResize = () => {
    if (myHeatMap) myHeatMap.resize();
};

onMounted(() => {
    processHeatMapData();
    window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (myHeatMap) myHeatMap.dispose();
});

watch([() => props.allReservationsData, () => props.selectedMonth, () => props.heatMapDisplayStartDate, () => props.heatMapDisplayEndDate], () => {
    processHeatMapData();
}, { deep: true });
</script>
