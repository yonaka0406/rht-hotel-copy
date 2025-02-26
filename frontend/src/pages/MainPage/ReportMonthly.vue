<template>
    <div class="min-h-screen p-2">
        <div class="grid grid-cols-12 gap-4">
            <Card class="flex col-span-6">
                <template #title>
                    <p>法人・個人（性別）：パイグラフ</p>
                </template>
                <template #subtitle>
                    <p>All time statistics</p>
                </template>
                <template #content>                    
                </template>
            </Card>
            <Card class="flex col-span-6">
                <template #title>
                    <p>売上：縦バーグラフ</p>
                </template>
                <template #subtitle>
                    <p>1 year total</p>
                </template>
                <template #content>                    
                </template>
            </Card>
            <Card class="flex col-span-12">
                <template #title>
                    <p>稼働マップ</p>
                </template>
                <template #subtitle>
                    <p></p>
                </template>
                <template #content>    
                    <div ref="heatMap" class="w-full h-100"></div>                
                </template>
            </Card>            
        </div>
    </div>
</template>
  
<script setup>
    import { ref, computed, onMounted } from "vue";    
    import { Card } from 'primevue';

    // Stores
    import { useReportStore } from '@/composables/useReportStore';    
    import { useHotelStore } from '@/composables/useHotelStore';
    const { reservationList, fetchCountReservation, fetchCountReservationDetails, fetchOccupationByPeriod, fetchReservationListView } = useReportStore();
    const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();

    // Page Setting
    const selectedMonth = ref(new Date());
    const startDate = computed(() => {
        const date = new Date(selectedMonth.value);
        date.setDate(1); // Set to first day of the month

        // Find the first Monday on or before the first day of the month
        const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)
        const diff = date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // Calculate the difference to Monday
        date.setDate(diff);

        return formatDate(date);        
    });
    const endDate = computed(() => {
        const date = new Date(selectedMonth.value);
        date.setDate(1); // Set to first day of the month
        date.setMonth(date.getMonth() + 3); // Move to the last day of the current month + 2 months
        date.setDate(0); 
        return formatDate(date);
    });
    function formatDate(date) {
        return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    };

    // eCharts
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

    const heatMap = ref(null);
    const heatMapOption = ref(null);
    const heatMapAxisX = computed(() => {
        const start = new Date(startDate.value);
        const end = new Date(endDate.value);
        const weekIntervals = [];
        let current = new Date(start);

        while (current <= end) {
            const month = current.getMonth() + 1;
            const day = current.getDate();
            weekIntervals.push(`${month}月${day}日の週`);

            // Move to the next week
            current.setDate(current.getDate() + 7);
        }        
        return weekIntervals;
    });
    const heatMapAxisY = ref([
        '日', '土', '金', '木', '水', '火', '月'
    ]);
    const heatMapMax = ref(0);
    const heatMapData = ref([]);

    const fetchHeatMapData = async () => {
        const reservations = await fetchCountReservation(selectedHotelId.value, startDate.value, endDate.value);
        console.log('reservations',reservations);
        if (!reservations){
            return;
        }

        // Initialize heatMapData with 0s for all dates
        const start = new Date(startDate.value);
        const end = new Date(endDate.value);
        let current = new Date(start);
        let weekIndex = 0;
        while (current <= end) {
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {                
                heatMapData.value.push([weekIndex, dayIndex, 0,]);
            }

            // Move to the next week
            current.setDate(current.getDate() + 7);
            weekIndex++;
        }
        //console.log('heatMapData blank:',heatMapData.value);

        // Populate heatMapData with reservation data
        reservations.forEach(reservation => {
            const date = new Date(reservation.date);
            const dayOfWeek = date.getDay();
            const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const weekStartDate = new Date(date.setDate(diff));
            const weekStartDateString = weekStartDate.toISOString().split('T');
            const originalDateString = reservation.date.split('T');

            // Find the corresponding weekIndex and dayIndex
            const weekIndex = heatMapAxisX.value.findIndex(weekLabel => weekLabel.includes(weekStartDateString));
            const dayIndex = dayOfWeek;

            // Update the count and dates array
            if (weekIndex !== -1) {
                const dataPointIndex = weekIndex * 7 + dayIndex; // Calculate the index in heatMapData
                heatMapData.value[dataPointIndex] += reservation.room_count;
                heatMapData.value[dataPointIndex].push(originalDateString);
            }

            heatMapMax.value = reservation.total_rooms;
        });

        /*

        const weeklyData = {};
        const weekStartDates = [];

        reservations.forEach(reservation => {
            const date = new Date(reservation.date);
            const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)
            const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is sunday
            const weekStartDate = new Date(date.setDate(diff));
            const weekStartDateString = weekStartDate.toISOString().split('T')[0];

            if (!weeklyData[weekStartDateString]) {
                weeklyData[weekStartDateString] = {
                    weekStartDate: weekStartDate,
                    days: Array(7).fill(0), // Initialize days of the week
                };
                weekStartDates.push(weekStartDate);
            }

            weeklyData[weekStartDateString].days[dayOfWeek] += reservation.room_count; // Assuming 'count' is the number of reservations
            heatMapMax.value = reservation.total_rooms;
        });

        weekStartDates.sort((a, b) => a - b); // Sort week start dates

        weekStartDates.forEach((weekStartDate, weekIndex) => {
            const weekStartDateString = weekStartDate.toISOString().split('T')[0];
            weeklyData[weekStartDateString].days.forEach((count, dayIndex) => {
                heatMapData.value.push([weekIndex, dayIndex, count]);
            });
        });
        */
        console.log('heatMapAxisX', heatMapAxisX.value);
        console.log('heatMapData', heatMapData.value);

    };
    const generateHeatMapOption = () => ({
        tooltip: {
            position: 'top'
        },
        grid: {
            height: '50%',
            top: '10%'
        },
        xAxis: {
            type: 'category',
            data: heatMapAxisX.value,
            splitArea: {
                show: true
            }
        },
        yAxis: {
            type: 'category',
            data: heatMapAxisY.value,
            splitArea: {
                show: true
            }
        },
        visualMap: {
            min: 0,
            max: heatMapMax.value,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '15%'
        },
        series: [
            {
            name: '予約数',
            type: 'heatmap',
            data: heatMapData,
            label: {
                show: true
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
            }
        ]
    });

    onMounted(async () => {
        await fetchHotels();
        await fetchHotel();     
        await fetchHeatMapData();   

        heatMapOption.value = generateHeatMapOption();

        const myHeatMap = echarts.getInstanceByDom(heatMap.value);
        if (myHeatMap) {
            myHeatMap.setOption(heatMapOption.value);
        } else {
            const myHeatMap = echarts.init(heatMap.value);
            myHeatMap.setOption(heatMapOption.value);
        }
    });
    
    
  
    
</script>
<style scoped>
</style>