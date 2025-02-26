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
            <div ref="barStackChart" :key="chartKey" class="w-full h-100"></div>
            <div ref="gaugeChart" class="w-full h-100"></div>
        </div>
        <div>
            <DataTable
                :value="reservationList"
                :loading="tableLoading"
                :paginator="true"
                :rows="10"
                dataKey="id"                
                stripedRows
            >
                <template #header>
                    <div class="flex justify-between">
                        <p class="font-bold text-lg">予約一覧</p>
                    </div>
                </template>
                <template #empty> 指定されている期間中では予約ありません。 </template>
                <Column field="status" header="ステータス" style="width:10%">
                    <template #body="slotProps">
                        <div class="flex justify-center items-center">
                            <span v-if="slotProps.data.status === 'hold'" class="px-2 py-1 rounded-md bg-yellow-200 text-yellow-700"><i class="pi pi-pause" v-tooltip="'保留中'"></i></span>
                            <span v-if="slotProps.data.status === 'provisory'" class="px-2 py-1 rounded-md bg-cyan-200 text-cyan-700"><i class="pi pi-clock" v-tooltip="'仮予約'"></i></span>
                            <span v-if="slotProps.data.status === 'confirmed'" class="px-2 py-1 rounded-md bg-sky-200 text-sky-700"><i class="pi pi-check-circle" v-tooltip="'確定'"></i></span>
                            <span v-if="slotProps.data.status === 'checked_in'" class="px-2 py-1 rounded-md bg-green-200 text-green-700"><i class="pi pi-user" v-tooltip="'滞在中'"></i></span>
                            <span v-if="slotProps.data.status === 'checked_out'" class="px-2 py-1 rounded-md bg-purple-200 text-purple-700"><i class="pi pi-sign-out" v-tooltip="'アウト'"></i></span>
                            <span v-if="slotProps.data.status === 'cancelled'" class="px-2 py-1 rounded-md bg-gray-200 text-gray-700"><i class="pi pi-times" v-tooltip="'キャンセル'"></i></span>
                        </div>                        
                    </template>
                </Column>
                <Column field="booker_name" header="予約者" style="width:20%">
                </Column>
                <Column field="clients_json" header="宿泊者" style="width:20%">
                    <template #body="{ data }">
                        <span v-if="data.clients_json" v-tooltip="formatClientNames(data.clients_json)" style="white-space: pre-line;">
                            {{ getVisibleClientNames(data.clients_json) }}
                        </span>
                    </template>
                </Column>
                <Column field="check_in" header="チェックイン" sortable style="width:15%">
                    <template #body="slotProps">                        
                        <span>{{ formatDateWithDay(slotProps.data.check_in) }}</span>
                    </template>                    
                </Column>
                <Column field="number_of_people" header="宿泊者数" sortable style="width:10%">
                    <template #body="slotProps">
                        <div class="flex justify-end mr-4">
                            <span>{{ slotProps.data.number_of_people }}</span>
                        </div>
                    </template> 
                </Column>
                <Column field="number_of_nights" header="宿泊数" sortable style="width:10%">
                    <template #body="slotProps">
                        <div class="flex justify-end mr-4">
                            <span>{{ slotProps.data.number_of_nights }}</span>
                        </div>
                    </template> 
                </Column>                
                <Column field="price" header="料金" sortable style="width:10%">
                    <template #body="slotProps">
                        <div class="flex justify-end mr-2">
                            <span class="items-end">{{ formatCurrency(slotProps.data.price) }}</span>
                        </div>                        
                    </template>
                </Column>                
            </DataTable>
        </div>
        
        <Drawer v-model:visible="drawerVisible" :modal="true" :closable="true">
        </Drawer>
        
    </Panel>    
</template>
  
<script setup>
    import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue';    
       
    import { Panel, Drawer, Skeleton } from 'primevue';
    import { DataTable, Column } from 'primevue';
    import { Select, AutoComplete, DatePicker, Button } from 'primevue';

    import { useReportStore } from '@/composables/useReportStore';    
    import { useHotelStore } from '@/composables/useHotelStore';
    import { useClientStore } from '@/composables/useClientStore';

    import * as echarts from 'echarts/core';
    import {
        TitleComponent,
        ToolboxComponent,
        TooltipComponent,
        GridComponent,
        LegendComponent
    } from 'echarts/components';
    import { BarChart, LineChart } from 'echarts/charts'; 
    import { GaugeChart } from 'echarts/charts';   
    import { UniversalTransition } from 'echarts/features';
    import { CanvasRenderer } from 'echarts/renderers';

    echarts.use([
        TitleComponent,
        ToolboxComponent,
        TooltipComponent,
        GridComponent,
        LegendComponent,
        BarChart,
        LineChart,
        GaugeChart,
        CanvasRenderer,
        UniversalTransition
    ]);

    const { reservationList, fetchCountReservation, fetchCountReservationDetails, fetchOccupationByPeriod, fetchReservationListView } = useReportStore();
    const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();

    // Charts
        const chartKey = ref(0);

        const barChartxAxis = ref([]);
        const barChartyAxisMax = ref([]);
        const barChartyAxisBar = ref([0, 0, 0, 0, 0, 0, 0]);
        const barChartyAxisLine = ref([0, 0, 0, 0, 0, 0, 0]);         

        const barChart = ref(null);
        const barChartOption = ref(null);

        const barStackChart = ref(null);
        const barStackChartData = ref(null);
        const barStackChartOption = ref(null);

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
            title: {
                text: '稼働率',                
            },
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
    // Data Table                
        const tableLoading = ref(true);
        const drawerVisible = ref(false);                

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
    const formatCurrency = (value) => {
        if (value == null) return '';
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
    }
    const selectedDate = ref(new Date());
    // Define start and end based on selectedDate
    const startDate = computed(() => formatDate(selectedDate.value)); 
    const endDate = computed(() => formatDate(new Date(new Date(selectedDate.value).setDate(new Date(selectedDate.value).getDate() + 6))));

    // Charts
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
                barChartOption.value = generateBarChartOptions();                
                return
            }

            barChartyAxisMax.value = countData.length > 0 ? countData[0].total_rooms : 0;
            // Fill data for returned dates only
            countData.forEach(item => {
                const itemDate = formatDateWithDay(new Date(item.date));
                const index = dateArray.indexOf(itemDate);

                if (index !== -1) {
                    barChartyAxisBar.value[index] = item.room_count;
                    barChartyAxisLine.value[index] = item.total_rooms ? Math.round(item.room_count / item.total_rooms * 10000) / 100 : 0;
                }
            });
            
            nextTick(() => {                    
                barChartOption.value = generateBarChartOptions();
                console.log('barChartOption:',barChartOption.value);
            });                
        };
        const generateBarChartOptions = () => ({
            title: {
                text: '予約数ｘ稼働率',                
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            legend: {
                data: ['予約', '稼働率'],
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
                    data: barChartxAxis,
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
                    data: barChartyAxisBar.value,
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
                    data: barChartyAxisLine.value,
                }
            ]
        });
        const fetchBarStackChartData = async () => {  
            barStackChartData.value = null;            
            const countData = await fetchCountReservationDetails(selectedHotelId.value, startDate.value, endDate.value);

            // Generate an array of dates from startDate to endDate
            const dateArray = [];
            let currentDate = new Date(startDate.value);
            const endDateObj = new Date(endDate.value);

            while (currentDate <= endDateObj) {
                dateArray.push(formatDate(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            barStackChartData.value = {
                series: [],
            };

            // console.log('fetchBarStackChartData countData:',countData);

            const createSeriesItem = (keyField, stack, countData, dateArray) => {
                const data = [];                    
                let name = '';

                dateArray.forEach(dateStr => {                    
                    let value = 0;                         

                    if (countData[dateStr]) {                            
                        const items = stack === 'Plan' ? countData[dateStr].plans || [] : countData[dateStr].addons || [];
                        const foundItem = items.find(item => item.key === keyField);
                        if (foundItem) {
                            name = foundItem.name || name; // Assign name if found
                            value = foundItem.quantity || 0;
                        }
                    }
                    data.push(value);
                });

                return {
                    name: name,
                    type: 'bar',
                    stack: stack,
                    emphasis: { focus: 'series' },
                    data: data,
                };
            };

            if(!countData){
                console.log('No data was found for fetchBarStackChartData');
                chartKey.value++;
                barStackChartOption.value = generateBarStackChartOptions();                
                return;
            }

            if(countData){
                const series = [];

                // Extract unique plan_keys and addon_keys:
                const uniquePlanKeys = new Set();
                const uniqueAddonKeys = new Set();

                for (const date in countData) {
                    if (countData.hasOwnProperty(date)) {
                        const item = countData[date];
                        if (item.plans) {
                            item.plans.forEach(plan => uniquePlanKeys.add(plan.key));
                        }
                        if (item.addons) {
                            item.addons.forEach(addon => uniqueAddonKeys.add(addon.key));
                        }
                    }
                }
                uniquePlanKeys.forEach(key => {                    
                    series.push(createSeriesItem(key, 'Plan', countData, dateArray));
                });

                uniqueAddonKeys.forEach(key => {
                    series.push(createSeriesItem(key, 'Addon', countData, dateArray));
                });

                console.log('series:',series);
                                
                barStackChartData.value.series = series;
            }
            
            nextTick(() => {                    
                barStackChartOption.value = generateBarStackChartOptions();                    
            });                
        };
        const generateBarStackChartOptions = () => ({
            title: {
                text: 'プラン＆アドオン',                
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            legend: {
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
                    data: barChartxAxis,  
                    axisLabel: {
                       rotate: 55
                    }                  
                }
            ],
            yAxis: [
                {
                    type: 'value'
                }
            ],
            series: [
                                
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
        };

    // Data Table
        const getVisibleClientNames = (clients) => {
            const parsedClients = Array.isArray(clients) ? clients : JSON.parse(clients);
            return parsedClients
                .slice(0, 1)
                .map(client => client.name_kanji || client.name)
                .join("\n")
        };
        const formatClientNames = (clients) => {
            const parsedClients = Array.isArray(clients) ? clients : JSON.parse(clients);
            if (parsedClients.length <= 2) return "";
            return parsedClients
                .map(client => client.name_kanji || client.name)
                .join("\n")
        };

    const openDrawer = () => {                
        drawerVisible.value = true;
    };


    onMounted(async () => {
        await fetchHotels();
        await fetchHotel();
    });

    watch(() => [selectedDate.value, selectedHotelId.value], // Watch both values
        async () => {                    
            tableLoading.value = true;

            await fetchHotels();
            await fetchHotel();
            await fetchReservationListView(selectedHotelId.value, startDate.value, endDate.value);
            tableLoading.value = false;
                console.log('from watch reservationList', reservationList.value);
            await fetchBarChartData();
            await fetchBarStackChartData();
            await fetchGaugeChartData();

            nextTick(() => { // Update chart after data changes
                const myBarChart = echarts.getInstanceByDom(barChart.value); // Get existing instance
                if (myBarChart) {
                    myBarChart.setOption(barChartOption.value); // Update with new data
                } else {
                    const myBarChart = echarts.init(barChart.value); // Create if it doesn't exist
                    myBarChart.setOption(barChartOption.value);
                }

                const myGaugeChart = echarts.getInstanceByDom(gaugeChart.value);
                if (myGaugeChart) {
                    myGaugeChart.setOption(gaugeChartOption);
                } else {
                    const myGaugeChart = echarts.init(gaugeChart.value);
                    myGaugeChart.setOption(gaugeChartOption);
                }

                const myBarStackChart = echarts.getInstanceByDom(barStackChart.value);
                if (myBarStackChart) {
                    barStackChartOption.value.series = barStackChartData.value.series;
                    myBarStackChart.setOption(barStackChartOption.value);
                    myBarStackChart.resize();
                } else {
                    const myBarStackChart = echarts.init(barStackChart.value);
                    barStackChartOption.value.series = barStackChartData.value.series;
                    myBarStackChart.setOption(barStackChartOption.value); 
                    myBarStackChart.resize();                           
                }
            });
        },
        { immediate: true }
    );      
            
</script>
  
<style scoped>
</style>
  