<template>
    <Panel>        
        <template #header>
            <div class="grid grid-cols-2">
            <p class="text-lg font-bold">ダッシュボード：</p>
            <DatePicker v-model="selectedDate" 
                :showIcon="true" 
                iconDisplay="input" 
                dateFormat="yy-mm-dd"
                class="w-full"
                required 
            />
            </div>        
        </template>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2">
            <div ref="barChart" class="w-full h-100"></div>
            <div ref="gaugeChart" class="w-full h-100"></div>
        </div>
        
        
    </Panel>    
</template>
  
<script>
    import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue';
    import * as echarts from 'echarts';
       
    import { Panel, Skeleton } from 'primevue';
    import { DatePicker } from 'primevue';

    import { useReportStore } from '@/composables/useReportStore';    
    import { useHotelStore } from '@/composables/useHotelStore';
    
    export default {  
        name: "Dashboard",
        components: {  
            Panel,
            Skeleton,
            DatePicker
        },
        setup() {
            const { fetchCountReservation, fetchOccupationByPeriod } = useReportStore();
            const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();

            const barChartxAxis = ref([]);
            const barChartyAxisMax = ref([]);
            const barChartyAxisBar = ref([0, 0, 0, 0, 0, 0, 0]);
            const barChartyAxisLine = ref([0, 0, 0, 0, 0, 0, 0]);         

            const barChart = ref(null);
            const barChartOption = ref(null);            

            const gaugeChart = ref(null);
            const gaugeData = ref([
                {
                    value: 0,
                    name: '再来月',
                    title: {
                    offsetCenter: ['0%', '-45%']
                    },
                    detail: {
                    valueAnimation: true,
                    offsetCenter: ['0%', '-30%']
                    }
                },
                {
                    value: 0,
                    name: '来月',
                    title: {
                    offsetCenter: ['0%', '-5%']
                    },
                    detail: {
                    valueAnimation: true,
                    offsetCenter: ['0%', '10%']
                    }
                },
                {
                    value: 0,
                    name: '今月',
                    title: {
                    offsetCenter: ['0%', '35%']
                    },
                    detail: {
                    valueAnimation: true,
                    offsetCenter: ['0%', '50%']
                    }
                }
            ]);
            const gaugeChartOption = {
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
                    data: gaugeData.value,
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
            };

            // Helper function
            const formatDate = (date) => {
                if (!(date instanceof Date) || isNaN(date.getTime())) {
                    console.error("Invalid Date object:", date);
                    throw new Error("The provided input is not a valid Date object:");
                }
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
            };
            const formatDateWithDay = (date) => {
                const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
                const parsedDate = new Date(date);
                return `${parsedDate.toLocaleDateString(undefined, options)}`;
            };
            const selectedDate = ref(new Date());
            // Define start and end based on selectedDate
            const startDate = computed(() => formatDate(selectedDate.value)); 
            const endDate = computed(() => formatDate(new Date(new Date(selectedDate.value).setDate(new Date(selectedDate.value).getDate() + 6))));            

            const fetchBarChartData = async () => {              
                const countData = await fetchCountReservation(selectedHotelId.value, startDate.value, endDate.value);

                // Generate an array of dates from startDate to endDate
                const dateArray = [];
                let currentDate = new Date(startDate.value);
                const endDateObj = new Date(endDate.value);

                while (currentDate <= endDateObj) {
                    dateArray.push(formatDateWithDay(currentDate));
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                barChartxAxis.value = dateArray;
                barChartyAxisBar.value = new Array(dateArray.length).fill(0);
                barChartyAxisLine.value = new Array(dateArray.length).fill(0);
                
                if(!countData){                    
                    barChartyAxisMax.value = [];                    
                    return
                }

                barChartyAxisMax.value = countData.length > 0 ? countData[0].total_rooms : 0;
                // Fill data for returned dates only
                countData.forEach(item => {
                    const itemDate = formatDateWithDay(new Date(item.date));
                    const index = dateArray.indexOf(itemDate);

                    if (index !== -1) {
                        barChartyAxisBar.value[index] = item.room_count;
                        barChartyAxisLine.value[index] = item.total_rooms ? item.room_count / item.total_rooms * 100 : 0;
                    }
                });
                
                nextTick(() => {                    
                    barChartOption.value = generateBarChartOptions();                    
                });                
            };

            const generateBarChartOptions = () => ({
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'cross',
                        crossStyle: {
                            color: '#999'
                        }
                    }
                },                
                legend: {
                    data: ['予約', '稼働率']
                },
                xAxis: [
                    {
                        type: 'category',
                        data: barChartxAxis,
                        axisPointer: {
                            type: 'shadow'
                        }
                    }
                ],
                yAxis: [
                    {
                        type: 'value',
                        name: '予約',
                        min: 0,
                        max: barChartyAxisMax,
                        interval: 10,
                        axisLabel: {
                            formatter: '{value} 室'
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
                        name: '予約',
                        type: 'bar',
                        tooltip: {
                            valueFormatter: function (value) {
                                return value + ' 室';
                            }
                        },
                        data: barChartyAxisBar,
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
                    data: barChartyAxisLine,
                    }
                ]
            });

            const fetchGaugeChartData = async () => {
                const month_0 = await fetchOccupationByPeriod('month_0', selectedHotelId.value, startDate.value);
                const month_1 = await fetchOccupationByPeriod('month_1', selectedHotelId.value, startDate.value);
                const month_2 = await fetchOccupationByPeriod('month_2', selectedHotelId.value, startDate.value);

                if(month_0){
                    const gaugeValue_0 = Math.round(month_0[0].room_count / month_0[0].available_rooms * 10000) / 100;
                    gaugeData.value[2].value = gaugeValue_0;
                }else(gaugeData.value[2].value = 0)
                if(month_1){
                    const gaugeValue_1 = Math.round(month_1[0].room_count / month_1[0].available_rooms * 10000) / 100;
                    gaugeData.value[1].value = gaugeValue_1;
                }else(gaugeData.value[1].value = 0)
                if(month_2){
                    const gaugeValue_2 = Math.round(month_2[0].room_count / month_2[0].available_rooms * 10000) / 100;
                    gaugeData.value[0].value = gaugeValue_2;
                }else(gaugeData.value[0].value = 0)
                
                // Get the month from startDate.value
                const gaugeName_0 = new Date(startDate.value).getMonth() + 1;
                const gaugeName_1 = new Date(startDate.value).getMonth() + 2;
                const gaugeName_2 = new Date(startDate.value).getMonth() + 3;
                
                gaugeData.value[0].name = gaugeName_2 + '月';
                gaugeData.value[1].name = gaugeName_1 + '月';
                gaugeData.value[2].name = gaugeName_0 + '月';                
            }

            onMounted(async () => {
                await fetchHotels();
                await fetchHotel();

                window.addEventListener('resize', () => {
                    const myBarChart = echarts.getInstanceByDom(barChart.value);
                    if (myBarChart) {
                        myBarChart.resize();
                    }
                });
            });

            watch(() => [selectedDate.value, selectedHotelId.value], // Watch both values
                async () => {                    
                    await fetchHotels();
                    await fetchHotel();
                    await fetchBarChartData();
                    await fetchGaugeChartData();

                    nextTick(() => { // Update chart after data changes
                        const myBarChart = echarts.getInstanceByDom(barChart.value); // Get existing instance
                        if (myBarChart) {
                            myBarChart.setOption(barChartOption.value); // Update with new data
                        } else {
                            const myBarChart = echarts.init(barChart.value); // Create if it doesn't exist
                            myBarChart.setOption(barChartOption.value);
                        }

                        const myGaugeChart = echarts.getInstanceByDom(gaugeChart.value); // Get existing instance
                        if (myGaugeChart) {
                            myGaugeChart.setOption(gaugeChartOption); // Update with new data
                        } else {
                            const myGaugeChart = echarts.init(gaugeChart.value); // Create if it doesn't exist
                            myGaugeChart.setOption(gaugeChartOption);
                        }
                    });
                },
                { immediate: true }
            );            

            return {
                selectedDate,
                barChart,
                gaugeChart,
            };
        }
    }
</script>
  
<style scoped>
</style>
  