<template>
    <div class="min-h-screen p-2">
        <div class="grid grid-cols-12 gap-4">
            <Card class="flex col-span-12">
                <template #content> 
                    <div class="grid grid-cols-12 gap-4 items-center">
                        <span class="col-span-4 font-bold">月分：</span>
                        <DatePicker v-model="selectedMonth" 
                            :showIcon="true" 
                            iconDisplay="input" 
                            dateFormat="yy年mm月"
                            view="month"
                            class="flex col-span-8"
                            fluid
                            required 
                        />
                    </div>
                    
                </template>
            </Card>
            <Card class="flex col-span-6">                
                <template #content>
                    <Fieldset legend="RevPAR" :toggleable="true" collapsed>                        
                        <p class="m-0">
                            1室あたりの収益額：
                            <span class="inline-block">
                                <span class="">売上の合計</span>
                                <span class="block"></span>
                                <span class="border-t border-black">販売用部屋数の合計</span>
                            </span>
                        </p>
                    </Fieldset>
                    <div class="flex items-center justify-center">
                        <span class="text-4xl font-bold mt-4">{{ revPAR }} 円</span>
                    </div>
                    
                </template>
            </Card>
            <Card class="flex col-span-6">
                <template #title>
                    <p>売上</p>
                </template>
                <template #subtitle>
                    <p>当月の日次売上</p>
                </template>
                <template #content>    
                    <div ref="lineChart" class="w-full h-40"></div>                
                </template>
            </Card>
            <Card class="flex col-span-12">
                <template #title>
                    <p>稼働マップ</p>
                </template>
                <template #subtitle>
                    <p>曜日毎の予約数ヒートマップ</p>
                </template>
                <template #content>    
                    <div ref="heatMap" class="w-full h-100"></div>                
                </template>
            </Card>            
        </div>
    </div>
</template>
  
<script setup>
    import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";    
    import { Card, DatePicker, Fieldset } from 'primevue';

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
    const startOfMonth = computed(() => {
        const date = new Date(selectedMonth.value);
        date.setDate(1);
        return formatDate(date);
    });
    const endOfMonth = computed(() => {
        const date = new Date(selectedMonth.value);
        date.setDate(1);
        date.setMonth(date.getMonth() + 1);
        date.setDate(0);
        return formatDate(date);      
    });
    function formatDate(date) {        
        date.setHours(date.getHours() + 9); // JST adjustment        
        return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    };

    const reservations = ref({});

    // RevPAR
    const revPAR = ref(null);
    const fetchRevPAR = () => {
        if(!reservations.value){
            return;
        }
        
        const firstDayOfMonth = new Date(startOfMonth.value);
        const lastDayOfMonth = new Date(endOfMonth.value);

        const filteredReservations = reservations.value.filter(reservation => {
            
            const reservationDate = new Date(reservation.date);
            return reservationDate >= firstDayOfMonth && reservationDate <= lastDayOfMonth;
        });

        let totalRooms = 0;
        let totalPrice = 0;

        filteredReservations.forEach(reservation => {
            totalRooms += parseInt(reservation.total_rooms);
            totalPrice += parseFloat(reservation.price); // Assuming there's a `price` property in your reservation data
        });

        if (totalRooms === 0) {
            return 0; // Prevent division by zero
        }

        revPAR.value = Math.round(totalPrice / totalRooms);
    };

    // eCharts
    import * as echarts from 'echarts/core';
    import {
        TooltipComponent,
        GridComponent,
        VisualMapComponent
    } from 'echarts/components';
    import { HeatmapChart } from 'echarts/charts';
    import { LineChart } from 'echarts/charts';
    import { UniversalTransition } from 'echarts/features';
    import { CanvasRenderer } from 'echarts/renderers';

    echarts.use([
        TooltipComponent,
        GridComponent,
        VisualMapComponent,
        HeatmapChart,
        LineChart,
        UniversalTransition,
        CanvasRenderer
    ]);

    let myHeatMap;
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
        reservations.value = await fetchCountReservation(selectedHotelId.value, startDate.value, endDate.value);
        // console.log('reservations',reservations.value);
        if (!reservations){
            return;
        }

        heatMapData.value = [];

        // Create datePositionMap 
        const start = new Date(startDate.value);
        const end = new Date(endDate.value);
        let current = new Date(start);
        let weekIndex = 0;
        let dayIndex = 6;

        const datePositionMap = {};

        while (current <= end) {
            const currentDateISO = current.toISOString().split("T")[0];
            datePositionMap[currentDateISO] = { week: weekIndex, day: dayIndex };
            dayIndex--;
            if (dayIndex < 0) {
                dayIndex = 6;
                weekIndex++;
            }
            current.setDate(current.getDate() + 1);
        }

        // console.log('datePositionMap:', datePositionMap);

        reservations.value.forEach(reservation => {
            const reservationDateISO = formatDate(new Date(reservation.date));
            const position = datePositionMap[reservationDateISO];
            if (position) {
                heatMapData.value.push([position.week, position.day, parseInt(reservation.room_count)]);
            }
        });

        const dateMap = {}; // Create a map for quick date lookup
        reservations.value.forEach(reservation => {
            const dateISO = formatDate(new Date(reservation.date));
            dateMap[dateISO] = reservation.room_count;
        });
        // console.log('dateMap:',dateMap);
        
        while (current <= end) {
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const currentDateISO = current.toISOString().split('T')[0];
            const roomCount = dateMap[currentDateISO] ? parseInt(dateMap[currentDateISO]) : 0; // Get room_count or 0
            heatMapData.value.push([weekIndex, dayIndex, roomCount]);
            current.setDate(current.getDate() + 1); // Move to the next day
            }
            weekIndex++;
        }

        heatMapMax.value = reservations.value[0].total_rooms;
        // console.log('heatMapMax:',heatMapMax);
                
        // console.log('heatMapData', heatMapData.value);

        heatMapOption.value = generateHeatMapOption();

        myHeatMap = echarts.getInstanceByDom(heatMap.value);
        if (myHeatMap) {
            myHeatMap.setOption(heatMapOption.value);
        } else {
            myHeatMap = echarts.init(heatMap.value);
            myHeatMap.setOption(heatMapOption.value);
        }

    };
    const generateHeatMapOption = () => ({
        /*tooltip: {
            position: 'top'
        },*/
        grid: {
            height: '50%',
            top: '10%'
        },
        xAxis: {
            type: 'category',
            data: heatMapAxisX.value,
            splitArea: {
                show: true
            },
            axisLabel: {
                formatter: function (value) {
                    return value.split('').join('\n'); // Split each character and add a newline
                },
            },
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
            bottom: '0%'
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

    let myLineChart;
    const lineChart = ref(null);
    const lineChartOption = ref(null);
    const lineChartAxisX = computed(() => {
        const start = new Date(startOfMonth.value);
        const end = new Date(endOfMonth.value);
        const days = [];
        let current = new Date(start);
        while (current <= end) {
            
            const day = current.getDate();
            days.push(current.toISOString().split("T")[0]);

            // Move to the next week
            current.setDate(current.getDate() + 1);
        }        
        return days;
    });
    const lineChartData = ref([]);

    const fetchLineChartData = async => {
        if (!reservations){
            return;
        }

        lineChartData.value = [];
        const chartData = [];

        const dateMap = {}; // Create a map for quick date lookup
        reservations.value.forEach(reservation => {
            const dateISO = formatDate(new Date(reservation.date));
            dateMap[dateISO] = Math.round(reservation.price);
        });
        // console.log('dateMap:',dateMap);

        const datePositionMap = {};
        let index = 0;
        lineChartAxisX.value.forEach(date => {
            datePositionMap[date] = index;
            const price = dateMap[date] ? parseInt(dateMap[date]) : 0;
            chartData.push(price);
            index++;
        });
        lineChartData.value = chartData;
        
        // console.log('datePositionMap:',datePositionMap);

        // console.log('lineChartData:',lineChartData.value);

        lineChartOption.value = generateLineChartOption();

        myLineChart = echarts.getInstanceByDom(lineChart.value);
        if (myLineChart) {            
            myLineChart.setOption(lineChartOption.value);
        } else {
            myLineChart = echarts.init(lineChart.value);
            myLineChart.setOption(lineChartOption.value);
        }
        
    };
    const generateLineChartOption = () => ({
        tooltip: {
            position: 'top'
        },
        grid: {
            height: '50%',
            top: '5%',
            left: '15%',
            right: '5%',
        },
        xAxis: {
            type: 'category',
            data: lineChartAxisX.value,            
            axisLabel: {
                rotate: 55                
            },
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: (value) => {
                    return (value / 10000).toLocaleString() + '万円'; // Divide by 10,000 and add '万円'
                }
            }
        },        
        series: [
            {
                name: '売上',
                data: lineChartData,
                type: 'line',
                smooth: true            
            }
        ]
    });

    const handleResize = () => {
        if (myHeatMap) {
            myHeatMap.resize();
        }
        if (myLineChart) {
            myLineChart.resize();
        }
    };

    onMounted(async () => {
        await fetchHotels();
        await fetchHotel();

        //console.log(lineChartAxisX.value);

        window.addEventListener('resize', handleResize);
    });

    onBeforeUnmount(() => {
        window.removeEventListener('resize', handleResize);
    });

    watch(selectedMonth, async (newValue, oldValue) => {
        // console.log('selectedMonth changed', newValue);
        // console.log('startDate', startDate.value,'endDate', endDate.value);
        await fetchHeatMapData();
        fetchLineChartData();
        fetchRevPAR();
    });
    watch(selectedHotelId, async (newValue, oldValue) => {    
        await fetchHeatMapData();
        fetchLineChartData();
        fetchRevPAR();
    });
  
</script>
<style scoped>
</style>