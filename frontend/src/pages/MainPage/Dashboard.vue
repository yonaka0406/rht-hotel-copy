<template>
    <Panel class="bg-white dark:bg-gray-900 dark:text-gray-100 rounded-xl shadow-lg dark:shadow-xl">        
        <template #header>
            <div class="grid grid-cols-2">
            <p class="text-lg font-bold dark:text-gray-100">ダッシュボード：</p>
            <DatePicker v-model="selectedDate" 
                :showIcon="true" 
                iconDisplay="input" 
                dateFormat="yy-mm-dd"
                :selectOtherMonths="true"                 
                fluid
                required 
                class="dark:bg-gray-800 dark:text-gray-100 rounded"
            />
            </div>        
        </template>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-2">
            <div ref="barChart" class="w-full h-100"></div>
            <div ref="gaugeChart" class="w-full h-100"></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-2 mt-2">
            <div ref="barStackChart" :key="chartKey" class="w-full h-100"></div>
            <div ref="barAddonChart" :key="chartKey" class="w-full h-100"></div>
        </div>
        <div>
            <DataTable
                :value="reservationList"
                :loading="tableLoading"
                :paginator="true"
                :rows="10"
                dataKey="id"                
                stripedRows
                @rowDblclick="openEditReservation"
                class="bg-white dark:bg-gray-900 dark:text-gray-100 rounded-xl"
            >
                <template #header>
                    <div class="flex justify-between">
                        <p class="font-bold text-lg dark:text-gray-100">予約一覧</p>
                    </div>
                </template>
                <template #empty> <span class="dark:text-gray-400">指定されている期間中では予約ありません。</span> </template>
                <Column field="status" header="ステータス" style="width:10%">
                    <template #body="slotProps">
                        <div class="flex justify-center items-center">
                            <span v-if="slotProps.data.status === 'hold'" class="px-2 py-1 rounded-md bg-yellow-200 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200"><i class="pi pi-pause" v-tooltip="'保留中'"></i></span>
                            <span v-if="slotProps.data.status === 'provisory'" class="px-2 py-1 rounded-md bg-cyan-200 text-cyan-700 dark:bg-cyan-800 dark:text-cyan-200"><i class="pi pi-clock" v-tooltip="'仮予約'"></i></span>
                            <span v-if="slotProps.data.status === 'confirmed'" class="px-2 py-1 rounded-md bg-sky-200 text-sky-700 dark:bg-sky-800 dark:text-sky-200"><i class="pi pi-check-circle" v-tooltip="'確定'"></i></span>
                            <span v-if="slotProps.data.status === 'checked_in'" class="px-2 py-1 rounded-md bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-200"><i class="pi pi-user" v-tooltip="'滞在中'"></i></span>
                            <span v-if="slotProps.data.status === 'checked_out'" class="px-2 py-1 rounded-md bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200"><i class="pi pi-sign-out" v-tooltip="'アウト'"></i></span>
                            <span v-if="slotProps.data.status === 'cancelled'" class="px-2 py-1 rounded-md bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"><i class="pi pi-times" v-tooltip="'キャンセル'"></i></span>
                        </div>                        
                    </template>
                </Column>
                <Column field="booker_name" header="予約者" style="width:20%">
                    <template #body="slotProps">
                        <span class="dark:text-gray-100">{{ slotProps.data.booker_name }}</span>
                    </template>
                </Column>
                <Column field="clients_json" header="宿泊者" style="width:20%">
                    <template #body="{ data }">
                        <div v-if="data.clients_json" class="dark:text-gray-100" style="white-space: pre-line;" v-tooltip="formatClientNames(data.clients_json)">
                            <div v-for="client in (Array.isArray(data.clients_json) ? data.clients_json : JSON.parse(data.clients_json))" :key="client.id">
                                <span v-if="client.gender === 'male'" class="mr-1 text-blue-500">♂</span>
                                <span v-else-if="client.gender === 'female'" class="mr-1 text-pink-500">♀</span>
                                {{ client.name_kanji || client.name_kana || client.name }}
                            </div>
                        </div>
                    </template>
                </Column>
                <Column field="check_in" header="チェックイン" sortable style="width:15%">
                    <template #body="slotProps">                        
                        <span class="dark:text-gray-100">{{ formatDateWithDay(slotProps.data.check_in) }}</span>
                    </template>                    
                </Column>
                <Column field="number_of_people" header="宿泊者数" sortable style="width:10%">
                    <template #body="slotProps">
                        <div class="flex justify-end mr-4">
                            <span class="dark:text-gray-100">{{ slotProps.data.number_of_people }}</span>
                        </div>
                    </template> 
                </Column>
                <Column field="number_of_nights" header="宿泊数" sortable style="width:10%">
                    <template #body="slotProps">
                        <div class="flex justify-end mr-4">
                            <span class="dark:text-gray-100">{{ slotProps.data.number_of_nights }}</span>
                        </div>
                    </template> 
                </Column>                
                <Column field="price" header="料金" sortable style="width:10%">
                    <template #body="slotProps">
                        <div class="flex justify-end mr-2">
                            <span class="items-end dark:text-gray-100">{{ formatCurrency(slotProps.data.price) }}</span>
                        </div>                        
                    </template>
                </Column>                
            </DataTable>
        </div>
        
        <Drawer 
    v-model:visible="drawerVisible"
    :modal="true"
    :position="'bottom'"
    :style="{height: '75vh'}"    
    @hide="handleDrawerClose"
    :closable="true"
    class="dark:bg-gray-800"
  >
            <div class="flex justify-end" v-if="hasReservation">
                <Button @click="goToReservation" severity="info">
                    <i class="pi pi-arrow-right"></i><span>編集ページへ</span>
                </Button>
            </div>
            <ReservationEdit
                v-if="hasReservation"
                :reservation_id="selectedReservationID"
            />
        </Drawer>
        
    </Panel>    
</template>
  
<script setup>
    import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue';    
    import { useRouter } from 'vue-router';
    const router = useRouter();

    import ReservationEdit from './ReservationEdit.vue';
       
    import { Panel, Drawer, Skeleton } from 'primevue';
    import { DataTable, Column } from 'primevue';
    import { Select, AutoComplete, DatePicker, Button } from 'primevue';

    import { useReportStore } from '@/composables/useReportStore';
    const { reservationList, fetchCountReservation, fetchCountReservationDetails, fetchOccupationByPeriod, fetchReservationListView } = useReportStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();
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

    
    

    // Charts
        const chartKey = ref(0);

        const barChartxAxis = ref([]);
        const barChartyAxisMax = ref([]);
        const barChartyAxisBar = ref([0, 0, 0, 0, 0, 0, 0]);
        const barChartyAxisLine = ref([0, 0, 0, 0, 0, 0, 0]);         

        const barChart = ref(null);
        const barChartOption = ref(null);

        const barStackChart = ref(null);
        const barStackChartData = ref({
            series: [],
            xAxis: []
        });
        const barStackChartOption = ref(null);

        const barAddonChart = ref(null);
        const barAddonChartData = ref({
            series: [],
            xAxis: []
        });
        const barAddonChartOption = ref(null);

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
        const selectedReservationID = ref(null);
        const hasReservation = ref(false);                

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
        return `${parsedDate.toLocaleDateString('ja-JP', options)}`;
    };
    const formatCurrency = (value) => {
        if (value == null) return '';
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
    };
    const selectedDate = ref(new Date());
    // Define start and end based on selectedDate
    const startDate = computed(() => {
        const date = new Date(selectedDate.value);
        date.setDate(date.getDate() - 1);
        return formatDate(date);
    }); 
    const endDate = computed(() => {
        const date = new Date(selectedDate.value);
        date.setDate(date.getDate() + 6); // selectedDate + 6 days
        return formatDate(date);
    });

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
                // console.log('barChartOption:',barChartOption.value);
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
                    barStackChartData.value = {
                        series: [],
                        xAxis: []
                    };
                    barAddonChartData.value = {
                        series: [],
                        xAxis: []
                    };
                    const countData = await fetchCountReservationDetails(selectedHotelId.value, startDate.value, endDate.value);
        
                    console.log('[Dashboard] fetchCountReservationDetails', countData);
        
                    // Generate an array of dates from startDate to endDate (full fetched range)
                    const dateArray = [];
                    let currentFetchedDate = new Date(startDate.value);
                    const endFetchedDateObj = new Date(endDate.value);
        
                    while (currentFetchedDate <= endFetchedDateObj) {
                        dateArray.push(formatDate(currentFetchedDate));
                        currentFetchedDate = new Date(currentFetchedDate); // Create a new date object to avoid reference issues
                        currentFetchedDate.setDate(currentFetchedDate.getDate() + 1);
                    }
        
                    // Generate an array of dates for chart display (starting from selectedDate)
                    const chartDisplayDateArray = [];
                    let currentDisplayDate = new Date(selectedDate.value);
                    const endDisplayDateObj = new Date(new Date(selectedDate.value).setDate(new Date(selectedDate.value).getDate() + 6));

                    while (currentDisplayDate <= endDisplayDateObj) {
                        chartDisplayDateArray.push(formatDateWithDay(currentDisplayDate));
                        currentDisplayDate.setDate(currentDisplayDate.getDate() + 1);
                    }

                    barStackChartData.value.xAxis = chartDisplayDateArray;
                    barAddonChartData.value.xAxis = chartDisplayDateArray;
        
                    const planSeries = [];
                    const otherAddonSeries = [];
                    const mealAddonSeries = [];
                    const uniquePlanKeys = new Set();
                    const uniqueOtherAddonKeys = new Set();
                    const uniqueMealAddonKeys = new Set();
        
                    const mealAddonTypes = ['breakfast', 'lunch', 'dinner'];

                    const createSeriesItem = (keyField, stack, countData, dateArray, isMeal = false) => {
                        const data = [];                    
                        let name = '';
        
                        const dailyValues = new Array(chartDisplayDateArray.length).fill(0);

                        dateArray.forEach((dateStr, index) => {                    
                            let value = 0;                         
        
                            if (countData[dateStr]) {                            
                                const items = stack === 'Plan' ? countData[dateStr].plans || [] : countData[dateStr].addons || [];
                                const foundItem = items.find(item => item.key === keyField);
                                if (foundItem) {
                                    name = foundItem.name || foundItem.addon_name || name; // Use addon_name for addons
                                    value = parseInt(foundItem.quantity) || 0;

                                    // If it's a meal addon (lunch or breakfast), bump it to the following day
                                    if (foundItem.addon_type === 'lunch' || foundItem.addon_type === 'breakfast') {
                                        // Add to the next day relative to the *fetched* date array
                                        // And then adjust for the chart display array offset
                                        if (index + 1 - 1 >= 0 && index + 1 - 1 < chartDisplayDateArray.length) { // index + 1 is the bumped day, -1 for chartDisplayDateArray offset
                                            dailyValues[index + 1 - 1] = (dailyValues[index + 1 - 1] || 0) + value;
                                        }
                                    } else { // For dinner and other non-meal addons, keep on the current day
                                        // Add to the current day relative to the *fetched* date array
                                        // And then adjust for the chart display array offset
                                        if (index - 1 >= 0 && index - 1 < chartDisplayDateArray.length) { // index is current day, -1 for chartDisplayDateArray offset
                                            dailyValues[index - 1] = (dailyValues[index - 1] || 0) + value;
                                        }
                                    }
                                }
                            }
                        });

                        return {
                            name: name,
                            type: 'bar',
                            stack: isMeal ? 'Meal Count' : stack,
                            emphasis: { focus: 'series' },
                            data: dailyValues,
                        };
                    };
        
                    if (!countData || Object.keys(countData).length === 0) {
                        console.log('No data was found for fetchBarStackChartData');
                        chartKey.value++;
                        // Initialize with empty chart
                        nextTick(() => {
                            const myBarStackChart = echarts.getInstanceByDom(barStackChart.value) || echarts.init(barStackChart.value);
                            barStackChartOption.value.series = [];
                            barStackChartOption.value.xAxis[0].data = displayDateArray;
                            myBarStackChart.setOption(barStackChartOption.value, true);
                            myBarStackChart.resize();
        
                            const myBarAddonChart = echarts.getInstanceByDom(barAddonChart.value) || echarts.init(barAddonChart.value);
                            barAddonChartOption.value.series = [];
                            barAddonChartOption.value.xAxis[0].data = displayDateArray;
                            myBarAddonChart.setOption(barAddonChartOption.value, true);
                            myBarAddonChart.resize();
                        });
                        return;
                    }
        
                    // First pass: collect all unique keys and categorize addons
                    for (const date in countData) {
                        if (countData.hasOwnProperty(date)) {
                            const item = countData[date];
                            if (item.plans) {
                                item.plans.forEach(plan => uniquePlanKeys.add(plan.key));
                            }
                            if (item.addons) {
                                item.addons.forEach(addon => {
                                    if (mealAddonTypes.includes(addon.addon_type)) {
                                        uniqueMealAddonKeys.add(addon.key);
                                    } else {
                                        uniqueOtherAddonKeys.add(addon.key);
                                    }
                                });
                            }
                        }
                    }
        
                    // Create series for plans
                    Array.from(uniquePlanKeys).sort().forEach(key => {                    
                        planSeries.push(createSeriesItem(key, 'Plan', countData, dateArray));
                    });        
                    
                    // Create series for other addons
                    Array.from(uniqueOtherAddonKeys).sort().forEach(key => {
                        otherAddonSeries.push(createSeriesItem(key, 'Addon', countData, dateArray));
                    });

                    // Create series for meal addons
                    Array.from(uniqueMealAddonKeys).sort().forEach(key => {
                        mealAddonSeries.push(createSeriesItem(key, 'Addon', countData, dateArray, true));
                    });
        
                    barStackChartData.value.series = planSeries;
                    barAddonChartData.value.series = [...otherAddonSeries, ...mealAddonSeries];
                    
                    nextTick(() => {                    
                        barStackChartOption.value = generateBarStackChartOptions();
                        barStackChartOption.value.series = barStackChartData.value.series;
                        barStackChartOption.value.xAxis[0].data = barStackChartData.value.xAxis;
                        
                        const myBarStackChart = echarts.getInstanceByDom(barStackChart.value) || echarts.init(barStackChart.value);
                        myBarStackChart.setOption(barStackChartOption.value, true);
                        myBarStackChart.resize();
        
                        barAddonChartOption.value = generateBarAddonChartOptions();
                        barAddonChartOption.value.series = barAddonChartData.value.series;
                        barAddonChartOption.value.xAxis[0].data = barAddonChartData.value.xAxis;
        
                        const myBarAddonChart = echarts.getInstanceByDom(barAddonChart.value) || echarts.init(barAddonChart.value);
                        myBarAddonChart.setOption(barAddonChartOption.value, true);
                        myBarAddonChart.resize();
                    });                
                };
                                const generateBarStackChartOptions = () => ({
                                    title: {
                                        text: 'プラン',                
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
                                    series: barStackChartData.value.series
                                });                const generateBarAddonChartOptions = () => ({
                    title: {
                        text: 'アドオン',                
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
                    series: barAddonChartData.value.series
                });        const fetchGaugeChartData = async () => {
            const month_0 = await fetchOccupationByPeriod('month_0', selectedHotelId.value, startDate.value);
            const month_1 = await fetchOccupationByPeriod('month_1', selectedHotelId.value, startDate.value);
            const month_2 = await fetchOccupationByPeriod('month_2', selectedHotelId.value, startDate.value);

            if(month_0){
                const gaugeValue_0 = month_0[0].available_rooms === 0 ? 0 : Math.round(month_0[0].room_count / month_0[0].available_rooms * 10000) / 100;
                gaugeData.value[2].value = gaugeValue_0;
            }else(gaugeData.value[2].value = 0)
            if(month_1){
                const gaugeValue_1 = month_1[0].available_rooms === 0 ? 0 : Math.round(month_1[0].room_count / month_1[0].available_rooms * 10000) / 100;
                gaugeData.value[1].value = gaugeValue_1;
            }else(gaugeData.value[1].value = 0)
            if(month_2){
                const gaugeValue_2 = month_2[0].available_rooms === 0 ? 0 : Math.round(month_2[0].room_count / month_2[0].available_rooms * 10000) / 100;
                gaugeData.value[0].value = gaugeValue_2;
            }else(gaugeData.value[0].value = 0)
            
            // Get the month from startDate.value
            const currentMonth = new Date(startDate.value).getMonth() + 1; 
            const gaugeName_0 = currentMonth;
            const gaugeName_1 = currentMonth % 12 + 1;
            const gaugeName_2 = (currentMonth + 1) % 12 + 1;
            
            gaugeData.value[0].name = gaugeName_2 + '月';
            gaugeData.value[1].name = gaugeName_1 + '月';
            gaugeData.value[2].name = gaugeName_0 + '月';                
        };

    // Data Table
        const getVisibleClientNames = (clients) => {
            const parsedClients = Array.isArray(clients) ? clients : JSON.parse(clients);
            return parsedClients
                .map(client => client.name_kanji || client.name_kana || client.name)
                .join("\n")
        };
        const formatClientNames = (clients) => {
            const parsedClients = Array.isArray(clients) ? clients : JSON.parse(clients);
            if (parsedClients.length <= 2) return "";
            return parsedClients
                .map(client => client.name_kanji || client.name_kana || client.name)
                .join("\n")
        };

    const openEditReservation = (event) => {
        selectedReservationID.value = event.data.id;
        hasReservation.value = true;
        drawerVisible.value = true;
    };

    const handleDrawerClose = async () => {
        await fetchReservationListView(selectedHotelId.value, startDate.value, endDate.value);
    };

    const goToReservation = () => {
        router.push({ name: 'ReservationEdit', params: { reservation_id: selectedReservationID.value } });
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
                // console.log('from watch reservationList', reservationList.value);
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

                const myBarAddonChart = echarts.getInstanceByDom(barAddonChart.value);
                if (myBarAddonChart) {
                    barAddonChartOption.value.series = barAddonChartData.value.series;
                    myBarAddonChart.setOption(barAddonChartOption.value);
                    myBarAddonChart.resize();
                } else {
                    const myBarAddonChart = echarts.init(barAddonChart.value);
                    barAddonChartOption.value.series = barAddonChartData.value.series;
                    myBarAddonChart.setOption(barAddonChartOption.value); 
                    myBarAddonChart.resize();                           
                }
            });
        },
        { immediate: true }
    );      
            
</script>
  
<style scoped>
</style>
  