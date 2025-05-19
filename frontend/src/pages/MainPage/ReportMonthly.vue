<template>
    <div class="min-h-screen p-2">
        <div class="grid grid-cols-12 gap-4">
            <!-- Selection Card -->
            <Card class="col-span-12">
                <template #content> 
                    <div class="grid grid-cols-12 gap-x-4 gap-y-2 items-center">
                        <span class="col-span-12 sm:col-span-1 font-bold self-center">月分：</span>
                        <div class="col-span-12 sm:col-span-4 md:col-span-3">
                            <DatePicker v-model="selectedMonth" 
                                :showIcon="true"
                                iconDisplay="input"
                                dateFormat="yy年mm月"
                                view="month"                                
                                fluid
                            />     
                        </div>
                        <span class="col-span-12 sm:col-span-1 font-bold self-center sm:text-left md:text-right">表示：</span>
                        <div class="col-span-12 sm:col-span-6 md:col-span-4">
                            <SelectButton v-model="viewMode" :options="viewOptions" optionLabel="name" optionValue="value" class="w-full sm:w-auto" />
                        </div>
                    </div>
                </template>
            </Card>            
            <!-- Line Chart -->
            <Card class="col-span-12 md:col-span-6">
                <template #title>
                    <p>売上</p>
                </template>
                <template #subtitle>
                    <p>{{ lineChartTitle }}</p>
                </template>
                <template #content>    
                    <div ref="lineChart" class="w-full h-40"></div>                
                </template>
            </Card>
            <!-- Indexes -->
            <Card class="col-span-12 md:col-span-6">
                <template #content>
                    <div class="grid grid-cols-12 gap-2">
                        <div class="col-span-6">
                            <Fieldset legend="総売上" :toggleable="true" :collapsed="true" class="w-full text-sm">
                                <p class="m-0">仮予約、確定予約のプランとアドオンの合計。</p>
                                <p class="m-0">保留予約と社員を含まない金額。</p>                                
                            </Fieldset>
                        </div>    
                        <div class="flex justify-center items-center col-span-6 p-2">
                            <span class="text-3xl lg:text-4xl font-bold text-blue-600">
                                {{ displayedCumulativeSales.toLocaleString('ja-JP') }} 円
                            </span>
                        </div>
                        <div class="col-span-6 flex flex-col justify-center items-center p-2">
                            <Fieldset legend="ADR" :toggleable="true" :collapsed="true" class="w-full text-sm">
                                <p class="m-0">客室平均単価：</p>
                                <p class="m-0 text-center">
                                    <span class="inline-block">
                                        <span class="">売上の合計</span><br>
                                        <span class="inline-block border-t border-black px-2">販売部屋数の合計</span>
                                    </span>
                                </p>                                
                            </Fieldset>
                        </div>  
                        <div class="flex justify-center items-center col-span-6 p-2">
                            <span class="text-3xl lg:text-4xl font-bold text-green-600">{{ ADR.toLocaleString('ja-JP') }} 円</span>
                        </div>
                        <div class="col-span-6 flex flex-col justify-center items-center p-2">
                            <Fieldset legend="RevPAR" :toggleable="true" :collapsed="true" class="w-full text-sm">
                                <p class="m-0">1室あたりの収益額：</p>
                                 <p class="m-0 text-center">
                                    <span class="inline-block">
                                        <span class="">売上の合計</span><br>
                                        <span class="inline-block border-t border-black px-2">販売可能総部屋数 × 期間日数</span>
                                    </span>
                                </p>                                
                            </Fieldset>
                        </div>
                        <div class="flex justify-center items-center col-span-6 p-2">
                            <span class="text-3xl lg:text-4xl font-bold text-purple-600">{{ revPAR.toLocaleString('ja-JP') }} 円</span>
                        </div>                        
                    </div>
                    
                    
                    
                </template>
            </Card>
            <!-- Heat Map -->
            <Card class="flex col-span-12">
                <template #title>
                    <p>稼働マップ</p>
                </template>                
                <template #subtitle>
                    <p>曜日毎の予約数ヒートマップ ({{ selectedMonth.getFullYear() }}年 {{ selectedMonth.getMonth() + 1 }}月基点)</p>
                </template>
                <template #content>
                    <div ref="heatMap" class="w-full h-96"></div>             
                </template>
            </Card>            
        </div>
    </div>
</template>
  
<script setup>
    // Vue
    import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick} from "vue";    

    // Primevue
    import { Card, DatePicker, SelectButton, Fieldset } from 'primevue';

    // Stores
    import { useReportStore } from '@/composables/useReportStore';
    const { reservationList, fetchCountReservation, fetchCountReservationDetails, fetchOccupationByPeriod, fetchReservationListView } = useReportStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();

    // Page Setting
    const selectedMonth = ref(new Date());
    const viewMode = ref('month'); // 'month' or 'yearCumulative'
    const viewOptions = ref([
        { name: '単月表示', value: 'month' }, // Current Month View
        { name: '年度累計表示', value: 'yearCumulative' } // Cumulative View (Current Year)
    ]);

    // --- Date Computations ---
    function formatDate(date) {        
        date.setHours(date.getHours() + 9); // JST adjustment        
        return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    };
    const normalizeDate = (date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    function addDaysUTC(date, days) {
        const newDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        newDate.setUTCDate(newDate.getUTCDate() + days);
        return newDate;
    };
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
    
    const yearOfSelectedMonth = computed(() => selectedMonth.value.getFullYear());

    // Start date for "year cumulative" view: Jan 1st of the selected month's year
    const startOfYear = computed(() => {
        return formatDate(new Date(yearOfSelectedMonth.value, 0, 1)); // Month is 0-indexed
    });
  
    // --- Data Sources ---    
    const allReservationsData = ref([]);
    const dataFetchStartDate = computed(() => startOfYear.value);
    const dataFetchEndDate = computed(() => { // For heatmap range, ending last day of selectedMonth + 2 months
        const date = new Date(selectedMonth.value);
        date.setDate(1);
        date.setMonth(date.getMonth() + 3); // End of current month + 2 months
        date.setDate(0);
        return formatDate(date);
    });
    // Specific date range for heatmap display (original logic: first Monday of month to end of month + 2)    
    const heatMapDisplayStartDate = computed(() => {
        if (viewMode.value === 'yearCumulative') {
            return startOfYear.value; // For cumulative view, heatmap starts from Jan 1st
        } else { // 'month' view: Original logic to find the Monday of the week the 1st of selectedMonth falls into
            const date = new Date(selectedMonth.value);
            date.setDate(1);
            const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)
            const diff = date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // Calculate the difference to Monday
            date.setDate(diff);
            return formatDate(date);
        }
    });
    const heatMapDisplayEndDate = dataFetchEndDate;

    // Effective start/end dates for metrics (ADR, RevPAR, Line Chart data points) based on viewMode
    const metricsEffectiveStartDate = computed(() => {
        return viewMode.value === 'month' ? startOfMonth.value : startOfYear.value;
    });
    const metricsEffectiveEndDate = computed(() => endOfMonth.value); // Always ends at the selected month's end

    // --- Metrics Calculation ---
    const ADR = ref(0);
    const revPAR = ref(0);
    const displayedCumulativeSales = ref(0);
    const calculateMetrics = () => {
        if (!allReservationsData.value || allReservationsData.value.length === 0) {
            ADR.value = 0;
            revPAR.value = 0;            
            return;
        }

        const startDateForCalc = formatDate(new Date(metricsEffectiveStartDate.value));
        const endDateForCalc = formatDate(new Date(metricsEffectiveEndDate.value));

        const filteredMetricsReservations = allReservationsData.value.filter(res => {
            const resDate = res.date;            
            return resDate >= startDateForCalc && resDate <= endDateForCalc;
        });
        
        let totalRevenue = 0;
        let totalRoomsSold = 0;

        filteredMetricsReservations.forEach(res => {
            totalRevenue += parseFloat(res.price || 0);
            totalRoomsSold += parseInt(res.room_count || 0); // Assuming 'room_count' is rooms sold for this reservation
        });        

        // ADR
        // console.log('ADR', 'totalRevenue', totalRevenue, 'totalRoomsSold', totalRoomsSold);
        ADR.value = totalRoomsSold > 0 ? Math.round(totalRevenue / totalRoomsSold) : 0;

        // RevPAR
        const hotelCapacity = allReservationsData.value[0].total_rooms || 0;
        
        let daysInPeriod = 0;
        if (startDateForCalc <= endDateForCalc) {
             daysInPeriod = (new Date(endDateForCalc).getTime() - new Date(startDateForCalc).getTime()) / (1000 * 60 * 60 * 24) + 1;
        }
        // console.log('RevPAR', 'hotelCapacity', hotelCapacity, 'daysInPeriod', daysInPeriod, 'totalRevenue', totalRevenue)
        const totalAvailableRoomNights = hotelCapacity * daysInPeriod;
        revPAR.value = totalAvailableRoomNights > 0 ? Math.round(totalRevenue / totalAvailableRoomNights) : 0;
    };

    // eCharts Instances & Refs
    import * as echarts from 'echarts/core';
    import {        
        TooltipComponent,
        GridComponent,
        VisualMapComponent,
        LegendComponent,
    } from 'echarts/components';
    import { HeatmapChart } from 'echarts/charts';
    import { BarChart, LineChart } from 'echarts/charts';
    import { UniversalTransition } from 'echarts/features';
    import { CanvasRenderer } from 'echarts/renderers';

    echarts.use([        
        TooltipComponent,
        GridComponent,
        LegendComponent,
        VisualMapComponent,
        HeatmapChart,
        BarChart,
        LineChart,
        UniversalTransition,
        CanvasRenderer
    ]);

    // HeatMap
    const heatMap = ref(null);
    let myHeatMap; 
    const heatMapAxisX = computed(() => { 
        const start = new Date(heatMapDisplayStartDate.value);
        const end = new Date(heatMapDisplayEndDate.value);
        const weekIntervals = [];
        let current = new Date(start);
        while (current <= end) {
            const month = current.getMonth() + 1;
            const day = current.getDate();
            weekIntervals.push(`${month}月${day}日の週`);
            current.setDate(current.getDate() + 7);
        }
        return weekIntervals;
    });
    const heatMapAxisY = ref([
        '日', '土', '金', '木', '水', '火', '月'
    ]);
    const heatMapMax = ref(0);
    const heatMapData = ref([]);
        
    const processHeatMapData = () => {
        if (!allReservationsData.value || !heatMap.value) {
            heatMapData.value = [];
            initHeatMap(); // Initialize with empty data if needed
            return;
        }
                
        const start = new Date(heatMapDisplayStartDate.value);
        const end = new Date(heatMapDisplayEndDate.value);
               
        // Filter reservations for the heatmap's specific display window
        const relevantReservations = allReservationsData.value.filter(r => {
            const rDate = new Date(r.date);
            return rDate >= start && rDate <= end;
        });
        
        if(relevantReservations && relevantReservations.length > 0){            
            heatMapMax.value = relevantReservations[0].total_rooms; 
        } else {
            heatMapMax.value = 0;
        }
                
        const datePositionMap = {};
        let currentMapDate = new Date(start);
        let weekIdx = 0;
        let dayIdx = 6; // Monday is 6, Sunday is 0 (matching Y-axis)

        while (currentMapDate <= end) {
            const isoDate = formatDate(currentMapDate); // Use consistent formatDate            
            datePositionMap[isoDate] = { week: weekIdx, day: dayIdx };
            
            dayIdx--;
            if (dayIdx < 0) {
                dayIdx = 6;
                weekIdx++;
            }
            currentMapDate.setDate(currentMapDate.getDate() + 1);
        }
        
        const processedData = [];
        relevantReservations.forEach(reservation => {
            const reservationDateISO = formatDate(new Date(reservation.date)); // Ensure date is formatted consistently
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
                bottom: '5%'
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
    
    // Line Chart
    const lineChart = ref(null);
    let myLineChart = null;
    const lineChartAxisX = ref([]);
    const lineChartSeriesData = ref([]);
    const lineChartSeriesSumData = ref([]);

    const lineChartTitle = computed(() => {
        const year = selectedMonth.value.getFullYear();
        const month = selectedMonth.value.getMonth() + 1;
        if (viewMode.value === 'month') {
            return `${year}年${month}月の日次売上`;
        } else {
            return `${year}年度 月次売上 (1月～${month}月累計)`;
        }
    });

    const processLineChartData = () => {
        if (!allReservationsData.value || !lineChart.value) {
            lineChartAxisX.value = [];
            lineChartSeriesData.value = [];
            lineChartSeriesSumData.value = [];
            displayedCumulativeSales.value = 0;
            initLineChart();
            return;
        }

        const startDateForChart = formatDate(new Date(metricsEffectiveStartDate.value));
        const endDateForChart = formatDate(new Date(metricsEffectiveEndDate.value));

        const relevantChartReservations = allReservationsData.value.filter(res => {
            const resDate = res.date;
            return resDate >= startDateForChart && resDate <= endDateForChart;
        });
        
        const dailySalesMap = new Map(); 
        relevantChartReservations.forEach(res => {
            const dayKey = res.date;            
            const currentSales = dailySalesMap.get(dayKey) || 0;
            dailySalesMap.set(dayKey, currentSales + parseFloat(res.price || 0));
        });
        
        const newXAxis = [];
        const newSeriesData = [];
        const newSeriesSumData = [];
        let cumulativeSum = 0;

        if (viewMode.value === 'month') {
            // Daily view for the selected month                        
            let currentDate = normalizeDate(new Date(startDateForChart));
            const endDate = normalizeDate(new Date(endDateForChart));
            while (currentDate <= endDate) {
                //console.log(currentDate, 'is < than ', endDate)
                const dayKey = formatDate(currentDate);
                newXAxis.push(dayKey);

                const salesForDay = dailySalesMap.get(dayKey) || 0;
                newSeriesData.push(Math.round(salesForDay));
                cumulativeSum += salesForDay;
                newSeriesSumData.push(Math.round(cumulativeSum));

                currentDate = addDaysUTC(currentDate, 1);
            }                        
        } else { // yearCumulative
            // Monthly view from Jan to selected month
            const endMonthIndex = selectedMonth.value.getMonth(); // 0-11
            for (let monthIdx = 0; monthIdx <= endMonthIndex; monthIdx++) {
                const currentYear = yearOfSelectedMonth.value;
                newXAxis.push(`${currentYear}年${monthIdx + 1}月`);

                let salesForMonth = 0;
                dailySalesMap.forEach((sales, dayKey) => {
                    const [year, month] = dayKey.split('-').map(Number);
                    if (year === currentYear && month === monthIdx + 1) {
                        salesForMonth += sales;
                    }
                });
                newSeriesData.push(Math.round(salesForMonth));
                cumulativeSum += salesForMonth; // This sum is YTD
                newSeriesSumData.push(Math.round(cumulativeSum));
            }
        }
        lineChartAxisX.value = newXAxis;
        lineChartSeriesData.value = newSeriesData;
        lineChartSeriesSumData.value = newSeriesSumData;
        displayedCumulativeSales.value = newSeriesSumData.length > 0 ? newSeriesSumData[newSeriesSumData.length - 1] : 0;
        initLineChart();
    };
    
     const initLineChart = () => {
        if (!lineChart.value) return;
        const option = {
            tooltip: { trigger: 'axis', position: 'top' },
            legend: {
                data: viewMode.value === 'month' ? ['日次売上', '当月累計'] : ['月次売上', '年度累計'],
                bottom: 0
            },
            grid: { top: '20%', height: '70%', left: '3%', right: '4%', bottom: '15%', containLabel: true }, // Adjusted grid
            xAxis: {
                type: 'category',
                boundaryGap: viewMode.value === 'month', // true for bar-like, false for line to touch edges
                data: lineChartAxisX.value,
                axisLabel: { 
                    rotate: viewMode.value === 'month' ? 45 : 0, // Rotate daily labels
                    formatter: (value) => { // Custom formatter for dates if needed
                        if (viewMode.value === 'month' && typeof value === 'string' && value.includes('-')) {
                            return value.substring(5); // Show MM-DD
                        }
                        return value;
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: viewMode.value === 'month' ? '日次売上 (円)' : '月次売上 (円)',
                axisLabel: {
                    formatter: (value) => value >= 10000 ? `${(value / 10000).toLocaleString()}万円` : `${value.toLocaleString()}円`
                }
            },
            series: [
                {
                    name: viewMode.value === 'month' ? '日次売上' : '月次売上',
                    type: 'bar',
                    data: lineChartSeriesData.value,
                    itemStyle: { color: '#5470C6' }
                },
                {
                    name: viewMode.value === 'month' ? '当月累計' : '年度累計',
                    type: 'line',
                    smooth: true,
                    data: lineChartSeriesSumData.value,
                    itemStyle: { color: '#91CC75' }
                }
            ]
        };
        if (!myLineChart) {
            myLineChart = echarts.init(lineChart.value);
        }
        myLineChart.setOption(option, true);
    };
        
    const handleResize = () => {
        if (myHeatMap) myHeatMap.resize();
        if (myLineChart) myLineChart.resize();
    };

    // --- Data Fetching and Processing ---
    const fetchDataAndProcess = async () => {
        // console.log('fetchDataAndProcess triggered')
        if (!selectedHotelId.value) {
            // console.warn("Hotel ID not selected. Skipping data fetch.");
            allReservationsData.value = []; // Clear data
            // Call processors to clear charts/metrics
            processHeatMapData(); 
            processLineChartData();
            calculateMetrics();
            return;
        }
        try {
            // Fetch data for the widest necessary range            
            const rawData = await fetchCountReservation(selectedHotelId.value, dataFetchStartDate.value, dataFetchEndDate.value);
            
            if (rawData && Array.isArray(rawData)) {
                
                allReservationsData.value = rawData.map(item => ({
                    ...item,
                    date: formatDate(new Date(item.date))
                }));
            } else {
                allReservationsData.value = [];
            }
            
        } catch (error) {
            console.error("Error fetching reservation data:", error);
            allReservationsData.value = []; // Clear data on error
        }
        
        // Process data for all components        
        await nextTick();
        processHeatMapData(); 
        processLineChartData();
        calculateMetrics();
    };

    // --- Lifecycle and Watchers ---

    onMounted(async () => {
        await fetchHotels();
        await fetchHotel();

        await fetchDataAndProcess();

        window.addEventListener('resize', handleResize);
    });

    onBeforeUnmount(() => {
        window.removeEventListener('resize', handleResize);
        if (myHeatMap) myHeatMap.dispose();
        if (myLineChart) myLineChart.dispose();
    });

    watch([selectedMonth, selectedHotelId, viewMode], fetchDataAndProcess, { deep: true });    
  
</script>
<style scoped>
</style>