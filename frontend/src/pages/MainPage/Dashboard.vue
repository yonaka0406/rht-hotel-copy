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
            const { fetchCountReservation } = useReportStore();
            const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();

            const barChartxAxis = ref([]);
            const barChartyAxisMax = ref([]);
            const barChartyAxisBar = ref([]);
            const barChartyAxisLine = ref([]);            

            const barChart = ref(null);
            const barChartOption = ref(null);            

            const gaugeChart = ref(null);
            const gaugeData = [
                {
                    value: 20,
                    name: 'Perfect',
                    title: {
                    offsetCenter: ['0%', '-30%']
                    },
                    detail: {
                    valueAnimation: true,
                    offsetCenter: ['0%', '-20%']
                    }
                },
                {
                    value: 40,
                    name: 'Good',
                    title: {
                    offsetCenter: ['0%', '0%']
                    },
                    detail: {
                    valueAnimation: true,
                    offsetCenter: ['0%', '10%']
                    }
                },
                {
                    value: 60,
                    name: 'Commonly',
                    title: {
                    offsetCenter: ['0%', '30%']
                    },
                    detail: {
                    valueAnimation: true,
                    offsetCenter: ['0%', '40%']
                    }
                }
            ];
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
                    data: gaugeData,
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

                // Fill xAxis with formatted dates
                barChartxAxis.value = countData.map(item => formatDateWithDay(new Date(item.date)));

                // Fill yAxis bar and line data
                barChartyAxisMax.value = countData[0].roomcount;
                barChartyAxisBar.value = countData.map(item => item.room_count);
                barChartyAxisLine.value = countData.map(item => 
                    item.roomcount ? item.room_count / item.roomcount * 100 : 0
                );
                
                nextTick(() => {
                    console.log('generateChartOptions');
                    barChartOption.value = generateChartOptions();
                    console.log('barChartOption:',barChartOption.value )
                });
                
            };

            const generateChartOptions = () => ({
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
                        interval: 5,
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
                    console.log('fetchBarChartData');
                    await fetchBarChartData();
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
                }
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
  