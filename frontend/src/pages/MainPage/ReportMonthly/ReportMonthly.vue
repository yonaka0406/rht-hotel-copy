<template>
    <div class="min-h-screen p-2">
        <div class="grid grid-cols-12 gap-4">
            <ReportSelectionCard v-model:selectedMonth="selectedMonth" v-model:viewMode="viewMode" :viewOptions="viewOptions" />
            

            <KPIMetricsPanel 
                :viewMode="viewMode"
                :displayedCumulativeSales="displayedCumulativeSales"
                :forecastSales="forecastSales"
                :salesDifference="salesDifference"
                :ADR="ADR"
                :forecastADR="forecastADR"
                :ADRDifference="ADRDifference"
                :revPAR="revPAR"
                :forecastRevPAR="forecastRevPAR"
                :revPARDifference="revPARDifference"
                :OCC="OCC"
                :forecastOCC="forecastOCC"
                :OCCDifference="OCCDifference"
            />

            <LineChartPanel 
                :allReservationsData="allReservationsData"
                :selectedMonth="selectedMonth"
                :viewMode="viewMode"
                :metricsEffectiveStartDate="metricsEffectiveStartDate"
                :metricsEffectiveEndDate="metricsEffectiveEndDate"
                :formatDate="formatDate"
                :normalizeDate="normalizeDate"
                :addDaysUTC="addDaysUTC"
                :isWeekend="isWeekend"
            />

            <HeatMapPanel 
                :selectedMonth="selectedMonth"
                :allReservationsData="allReservationsData"
                :heatMapDisplayStartDate="heatMapDisplayStartDate"
                :heatMapDisplayEndDate="heatMapDisplayEndDate"
                :formatDate="formatDate"
                :normalizeDate="normalizeDate"
                :addDaysUTC="addDaysUTC"
            />

            <BookerTypeAndStayDurationPanel
                :bookerTypeBreakdownData="bookerTypeBreakdownData"
                :reservationListData="reservationListData"
            />

            <BookingChannelAndPaymentTimingPanel
                :bookingSourceData="bookingSourceData"
                :paymentTimingData="paymentTimingData"
                :translatePaymentTiming="translatePaymentTiming"
            />

            <SalesByPlanBreakdown
                :salesByPlan="salesByPlan"
                :forecastDataByPlan="forecastDataByPlan"
            />
            <OccupationBreakdownPanel
                :occupationBreakdownData="occupationBreakdownData"
            />        </div>
    </div>
</template>
  
<script setup>
    // Vue
    import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick} from "vue";    

    // Primevue
    import { Card, DataTable, Column, ColumnGroup, Row, Panel } from 'primevue';

    // Components
    import ReportSelectionCard from './components/ReportSelectionCard.vue';
    import KPIMetricsPanel from './components/KPIMetricsPanel.vue';
    import LineChartPanel from './components/LineChartPanel.vue';
    import HeatMapPanel from './components/HeatMapPanel.vue';
    import BookerTypeAndStayDurationPanel from './components/BookerTypeAndStayDurationPanel.vue';
    import BookingChannelAndPaymentTimingPanel from './components/BookingChannelAndPaymentTimingPanel.vue';
    import SalesByPlanBreakdown from './components/SalesByPlanBreakdown.vue';
    import OccupationBreakdownPanel from './components/OccupationBreakdownPanel.vue';

    // Stores
    import { useReportStore } from '@/composables/useReportStore';
    const { fetchCountReservation, fetchReservationListView, fetchForecastData, fetchAccountingData, fetchSalesByPlan, fetchOccupationBreakdown, fetchBookingSourceBreakdown, fetchPaymentTimingBreakdown, fetchBookerTypeBreakdown, fetchForecastDataByPlan } = useReportStore();
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

    const isWeekend = (dateString) => {
        const date = new Date(dateString);
        const dayOfWeek = date.getDay(); // 0 for Sunday, 6 for Saturday
        return dayOfWeek === 0 || dayOfWeek === 6;
    };

    const translatePaymentTiming = (timing) => {
      const map = {
          'not_set': '未設定',
          'prepaid': '事前決済',
          'on-site': '現地決済',
          'postpaid': '後払い'
      };
      return map[timing] || timing;
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
    const reservationListData = ref([]); // New ref for reservation-level data
    const bookerTypeBreakdownData = ref([]); // New ref for booker type breakdown data
    const forecastData = ref([]);
    const accountingData = ref([]);
    const salesByPlan = ref([]);
    const occupationBreakdownData = ref([]);
    const bookingSourceData = ref([]);
    const paymentTimingData = ref([]);
    const forecastDataByPlan = ref([]);

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
    const OCC = ref(0);
    const displayedCumulativeSales = ref(0);
    
    // Forecast Data
    const forecastSales = ref(0);
    const forecastADR = ref(0);
    const forecastRevPAR = ref(0);
    const forecastOCC = ref(0);
    // Difference between actual and forecast
    const salesDifference = ref(0);
    const ADRDifference = ref(0);
    const revPARDifference = ref(0);
    const OCCDifference = ref(0);

    const calculateMetrics = () => {
        if (!allReservationsData.value || allReservationsData.value.length === 0) {
            ADR.value = 0;
            revPAR.value = 0;
            OCC.value = 0;

            forecastSales.value = 0;
            forecastADR.value = 0;
            forecastRevPAR.value = 0;
            forecastOCC.value = 0;

            salesDifference.value = 0;
            ADRDifference.value = 0;
            revPARDifference.value = 0;
            OCCDifference.value = 0;
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
            totalRevenue += parseFloat(res.accommodation_price || 0);
            if (parseFloat(res.accommodation_price || 0) > 0) {
                totalRoomsSold += parseInt(res.room_count || 0);
            }
        });        

        // Assign Total Revenue to displayedCumulativeSales
        displayedCumulativeSales.value = Math.round(totalRevenue);

        // ADR
        // ADR
        ADR.value = totalRoomsSold > 0 ? Math.round(totalRevenue / totalRoomsSold) : 0;

        // RevPAR
        const hotelCapacity = parseInt(allReservationsData.value[0].total_rooms || 0);
        let totalAvailableRoomNightsInPeriod = 0;
        const startDateObj = normalizeDate(new Date(metricsEffectiveStartDate.value));
        const endDateObj = normalizeDate(new Date(metricsEffectiveEndDate.value));
        const dailyActualAvailableRoomsMap = new Map();
        allReservationsData.value.forEach(res => {
            if (res.date && res.total_rooms_real != null) {
                const realRooms = parseInt(res.total_rooms_real);
                // Store it only if it's a valid number (including 0).
                if (!isNaN(realRooms)) {
                    dailyActualAvailableRoomsMap.set(res.date, realRooms);
                }
            }
        });

        let currentDateIter = startDateObj;        
        const finalIterationEndDate = endDateObj;                
        while (currentDateIter <= finalIterationEndDate) {
            const currentDateStr = formatDate(currentDateIter); // Format current iteration date to 'YYYY-MM-DD'

            if (dailyActualAvailableRoomsMap.has(currentDateStr)) {                
                totalAvailableRoomNightsInPeriod += dailyActualAvailableRoomsMap.get(currentDateStr);
            } else {                
                totalAvailableRoomNightsInPeriod += hotelCapacity;
            }            
            // Move to the next day            
            currentDateIter = addDaysUTC(currentDateIter, 1);
        }
        
        console.log('[ReportMonthly] RevPAR calculation:', {
            totalRevenue,
            totalAvailableRoomNightsInPeriod,
            revPAR: totalAvailableRoomNightsInPeriod > 0 ? Math.round(totalRevenue / totalAvailableRoomNightsInPeriod) : 0
        });
        
        revPAR.value = totalAvailableRoomNightsInPeriod > 0 ? Math.round(totalRevenue / totalAvailableRoomNightsInPeriod) : 0;
        
        
        OCC.value = totalAvailableRoomNightsInPeriod > 0 ? Math.round((totalRoomsSold / totalAvailableRoomNightsInPeriod) * 10000) / 100 : 0;

        // Calculate Forecast
        const forecastDataForPeriod = forecastData.value.filter(forecast => {
            const forecastDate = forecast.date;
            return forecastDate >= startDateForCalc && forecastDate <= endDateForCalc;
        });
        
        let totalForecastRevenue = 0;
        let totalForecastRooms = 0;
        let totalForecastAvailableRooms = 0;
        forecastDataForPeriod.forEach(forecast => {
            totalForecastRevenue += parseFloat(forecast.accommodation_revenue || 0);
            totalForecastRooms += parseInt(forecast.rooms_sold_nights || 0);
            totalForecastAvailableRooms += parseInt(forecast.available_room_nights || 0);
        });
        
        forecastSales.value = Math.round(totalForecastRevenue);
        forecastADR.value = totalForecastRooms > 0 ? Math.round(totalForecastRevenue / totalForecastRooms) : 0;
        forecastRevPAR.value = totalForecastAvailableRooms > 0 ? Math.round(totalForecastRevenue / totalForecastAvailableRooms) : 0;
        forecastOCC.value = totalForecastAvailableRooms > 0 ? Math.round((totalForecastRooms / totalForecastAvailableRooms) * 10000) / 100 : 0;

        // Calculate Differences
        salesDifference.value = Math.round(totalRevenue) - forecastSales.value;
        ADRDifference.value = Math.round(ADR.value) - forecastADR.value;
        revPARDifference.value = Math.round(revPAR.value) - forecastRevPAR.value;
        OCCDifference.value = OCC.value - forecastOCC.value;
    };


    const handleResize = () => {
    };

    // --- Data Fetching and Processing ---
    const fetchDataAndProcess = async () => {        
        if (!selectedHotelId.value) {
            
            allReservationsData.value = []; // Clear data
            // Call processors to clear charts/metrics
            calculateMetrics();
            return;
        }
        try {
            // Fetch data for the widest necessary range            
            const rawData = await fetchCountReservation(selectedHotelId.value, dataFetchStartDate.value, dataFetchEndDate.value);
            const forecastDataResult = await fetchForecastData(selectedHotelId.value, dataFetchStartDate.value, dataFetchEndDate.value);
            const accountingDataResult = await fetchAccountingData(selectedHotelId.value, dataFetchStartDate.value, dataFetchEndDate.value);
            const salesByPlanResult = await fetchSalesByPlan(selectedHotelId.value, metricsEffectiveStartDate.value, metricsEffectiveEndDate.value);
            const occupationBreakdownResult = await fetchOccupationBreakdown(selectedHotelId.value, metricsEffectiveStartDate.value, metricsEffectiveEndDate.value);
            const bookingSourceResult = await fetchBookingSourceBreakdown(selectedHotelId.value, metricsEffectiveStartDate.value, metricsEffectiveEndDate.value);
            const paymentResult = await fetchPaymentTimingBreakdown(selectedHotelId.value, metricsEffectiveStartDate.value, metricsEffectiveEndDate.value);
            const bookerTypeBreakdownResult = await fetchBookerTypeBreakdown(selectedHotelId.value, metricsEffectiveStartDate.value, metricsEffectiveEndDate.value); // New fetch
            const forecastDataByPlanResult = await fetchForecastDataByPlan(selectedHotelId.value, metricsEffectiveStartDate.value, metricsEffectiveEndDate.value);
            // Fetch reservation list for booker type and length of stay
            const reservationListViewResult = await fetchReservationListView(selectedHotelId.value, metricsEffectiveStartDate.value, metricsEffectiveEndDate.value);


            if (rawData && Array.isArray(rawData)) {                
                allReservationsData.value = rawData.map(item => ({
                    ...item,
                    date: formatDate(new Date(item.date))
                }));
            } else {
                allReservationsData.value = [];
            }

            if (forecastDataResult && Array.isArray(forecastDataResult)) {
                forecastData.value = forecastDataResult.map(item => ({
                    ...item,
                    date: formatDate(new Date(item.forecast_month))
                }));
            } else {
                forecastData.value = [];
            }
            // console.log('forecastData', forecastData.value);

            if (accountingDataResult && Array.isArray(accountingDataResult)) {
                accountingData.value = accountingDataResult.map(item => ({
                    ...item,
                    date: formatDate(new Date(item.accounting_month))
                }));
            } else {
                accountingData.value = [];
            }
            salesByPlan.value = salesByPlanResult;
            occupationBreakdownData.value = occupationBreakdownResult;
            bookingSourceData.value = bookingSourceResult;
            paymentTimingData.value = paymentResult;
            bookerTypeBreakdownData.value = bookerTypeBreakdownResult; // Assign new data

            if (forecastDataByPlanResult && Array.isArray(forecastDataByPlanResult)) {
                forecastDataByPlan.value = forecastDataByPlanResult.map(item => ({
                    ...item,
                    forecast_month: formatDate(new Date(item.forecast_month))
                }));
            } else {
                forecastDataByPlan.value = [];
            }

            // Assign reservation list data
            if (reservationListViewResult && Array.isArray(reservationListViewResult)) {
                // Ensure clients_json and payers_json are parsed if they are strings
                reservationListData.value = reservationListViewResult.map(res => ({
                    ...res,
                    clients_json: typeof res.clients_json === 'string' ? JSON.parse(res.clients_json) : res.clients_json,
                    payers_json: typeof res.payers_json === 'string' ? JSON.parse(res.payers_json) : res.payers_json
                }));
            } else {
                reservationListData.value = [];
            }

            
            
            
            
        } catch (error) {
            console.error("Error fetching reservation data:", error);
            allReservationsData.value = []; // Clear data on error
        }
        
        // Process data for all components        
        await nextTick();
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
    });

    watch([selectedMonth, selectedHotelId, viewMode], fetchDataAndProcess, { deep: true });


  
</script>
<style scoped>
</style>