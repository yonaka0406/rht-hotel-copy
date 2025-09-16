<template>
    <div class="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
        <header>
            <ReportingTopMenu
                :selectedDate="selectedDate"
                :period="period"
                :selectedHotels="selectedHotels"
                :initialReportType="selectedReportType"
                @date-change="handleDateChange"
                @period-change="handlePeriodChange"
                @hotel-change="handleHotelChange"
                @report-type-change="handleReportTypeChange"
            />
        </header>
        
        <main class="flex-1 overflow-auto p-6">
            <!-- New Report Components Rendering -->
            <ChangeInActiveReservationsReport
                v-if="selectedReportType === 'activeReservationsChange'"
                :hotel-id="selectedHotelIdForReport" 
                :trigger-fetch="reportTriggerKey" 
            />
            <MonthlyReservationEvolutionReport
                v-else-if="selectedReportType === 'monthlyReservationEvolution'"
                :hotel-id="selectedHotelIdForReport"
                :target-month="firstDayOfMonthForApi"
                :trigger-fetch="reportTriggerKey"
            />            
            
            <div v-else> 
                <div v-if="loading" class="flex justify-content-center align-items-center h-full">
                    <ProgressSpinner />
                </div>
                <ReportingSingleMonthAllHotels
                    v-else-if="selectedView === 'singleMonthAllHotels'"
                    :revenueData="revenueData"
                    :occupancyData="occupancyData"                
                />
                <ReportingSingleMonthHotel
                    v-else-if="selectedView === 'singleMonthHotel'"
                    :revenueData="revenueData"
                    :occupancyData="occupancyData"                
                />
                <ReportingYearCumulativeAllHotels
                    v-else-if="selectedView === 'yearCumulativeAllHotels'"
                    :revenueData="revenueData"
                    :occupancyData="occupancyData"                
                />
                <ReportingYearCumulativeHotel
                    v-else-if="selectedView === 'yearCumulativeHotel'"
                    :revenueData="revenueData"
                    :occupancyData="occupancyData"                
                />
                <div v-else class="text-gray-700 dark:text-gray-200 text-center">
                    <!-- This message shows if selectedReportType is a summary type but selectedView doesn't match any known summary view -->
                    レポートタイプに対応するサマリービューが見つかりません。
                </div>
            </div>
        </main>

        <footer class="bg-black dark:bg-gray-950 text-white dark:text-gray-300 p-4 text-center text-sm">
            レッドホーストラスト株式会社
        </footer>
    </div>
</template>
<script setup>
    // Vue
    import { ref, computed, onMounted } from 'vue';   

    import ReportingTopMenu from './components/ReportingTopMenu.vue';
    import ReportingSingleMonthAllHotels from './components/ReportingSingleMonthAllHotels.vue';
    import ReportingYearCumulativeAllHotels from './components/ReportingYearCumulativeAllHotels.vue';
    import ReportingSingleMonthHotel from './components/ReportingSingleMonthHotel.vue';
    import ReportingYearCumulativeHotel from './components/ReportingYearCumulativeHotel.vue';
    // Import New Report Components
    import ChangeInActiveReservationsReport from './components/ChangeInActiveReservationsReport.vue';
    import MonthlyReservationEvolutionReport from './components/MonthlyReservationEvolutionReport.vue';

    // Stores
    import { useReportStore } from '@/composables/useReportStore';
    const { fetchCountReservation, fetchForecastData, fetchAccountingData } = useReportStore();

    // Primevue
    import { ProgressSpinner } from 'primevue';

    const pmsFallbackCapacities = ref({}); // To store fallback capacities per hotel

    // -- Helper Functions --
    function formatDate(date) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }
    function formatDateMonth(date) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')        
        return `${year}-${month}`
    }
    const normalizeDate = (date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    function getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    // --- Reactive State for the Parent Component ---
    const loading = ref(false); // For existing summary reports
    const selectedDate = ref(new Date());
    const period = ref('month');
    const selectedHotels = ref([]); 
    const allHotels = ref([]); 

    // State for new report types and triggering updates
    const selectedReportType = ref('monthlySummary'); 
    const reportTriggerKey = ref(Date.now());

    // Computed property for single hotel ID or 'all' for new reports
    const selectedHotelIdForReport = computed(() => {
        if (selectedHotels.value && selectedHotels.value.length === 1) {
            return selectedHotels.value[0];
        }
        return 'all'; 
    });

    // Computed property for the first day of the selected month for API calls
    const firstDayOfMonthForApi = computed(() => {
        if (!selectedDate.value) return null;
        const date = new Date(selectedDate.value);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}-01`;
    });

    const firstDayofFetch = computed(() => {
        if (!selectedDate.value) {
            return null;
        }
        if (period.value === 'year') {
            const date = new Date(selectedDate.value);
            date.setMonth(0);
            date.setDate(1);
            return date;
        } else {
            const date = new Date(selectedDate.value);
            date.setDate(1);
            return date;
        }
    });
    const lastDayofFetch = computed(() => {
        if (!selectedDate.value) {
            return null;
        }
        const date = new Date(selectedDate.value);
        date.setMonth(date.getMonth() + 1);
        date.setDate(0);
        return date;
    });
    
    const selectedView = computed(() => {
        // This computed property is now only relevant for 'monthlySummary' type reports
        if (selectedReportType.value !== 'monthlySummary') { 
            // Could also check against a list of summary types if more are added
            return null; // Or some other value indicating no summary view is active
        }

        let viewName = '';
        if (selectedDate.value && typeof selectedDate.value.getMonth === 'function' && selectedDate.value.getMonth() === 0) {
             // This condition for January seems specific, might need review if it's general logic
            viewName = 'singleMonth';
        } else {
            if (period.value === 'month') {
                viewName += 'singleMonth';
            } else if (period.value === 'year') {
                viewName += 'yearCumulative';
            } else {
                viewName += 'singleMonth'; 
            }
        }        

        if (selectedHotels.value.length === 1) {
            viewName += 'Hotel';
        } else if (selectedHotels.value.length > 1) {
            viewName += 'AllHotels';
        } else {
            // No hotels selected, or invalid state for summary views
            // Potentially return a specific state like 'noSelection' if needed
            // For now, if viewName is still empty, it means no specific view matched.
            if (viewName === '') return null; // Or a default like 'pleaseSelect'
        }
        return viewName;
    });

    // --- Data Storage for existing summary reports ---
    const pmsTotalData = ref({});
    const forecastTotalData = ref({});
    const accountingTotalData = ref({});
    // pmsFallbackCapacities was added near the top

    const revenueData = computed(() => {
        // Guard: Only compute if a summary view is potentially active
        if (selectedReportType.value !== 'monthlySummary' || !selectedView.value) return [];

        const result = [];
        if (!firstDayofFetch.value || !lastDayofFetch.value || selectedHotels.value.length === 0) {
            return result;
        }
        const hotelIdLookup = new Map();        
        selectedHotels.value.forEach(hotelId => {
            hotelIdLookup.set(String(hotelId), hotelId);
        });        
        const monthlyAggregates = {};
        let currentIterMonth = new Date(firstDayofFetch.value);
        const lastIterMonthDate = new Date(lastDayofFetch.value);
        while (currentIterMonth <= lastIterMonthDate) {
            const monthKey = formatDateMonth(currentIterMonth);
            monthlyAggregates[monthKey] = {};
            monthlyAggregates[monthKey]['0'] = { pms_revenue: null, forecast_revenue: null, acc_revenue: null };
            selectedHotels.value.forEach(hotelId => {
                monthlyAggregates[monthKey][String(hotelId)] = { pms_revenue: null, forecast_revenue: null, acc_revenue: null };
            });
            currentIterMonth.setUTCMonth(currentIterMonth.getUTCMonth() + 1);
        }
        const aggregateDataSource = (sourceDataByHotel, revenueKey) => {
            for (const stringHotelIdKey in sourceDataByHotel) { 
                const hotelDataArray = sourceDataByHotel[stringHotelIdKey];
                if (Array.isArray(hotelDataArray)) {
                    hotelDataArray.forEach(record => {
                        if (record && record.date && typeof record.revenue === 'number') {
                            const monthKey = formatDateMonth(new Date(record.date));
                            if (monthlyAggregates[monthKey]) {
                                if (monthlyAggregates[monthKey][stringHotelIdKey]) {
                                    monthlyAggregates[monthKey][stringHotelIdKey][revenueKey] += record.revenue;
                                }
                                if (monthlyAggregates[monthKey]['0']) {
                                    monthlyAggregates[monthKey]['0'][revenueKey] += record.revenue;
                                }
                            }
                        }
                    });
                } else if (hotelDataArray && hotelDataArray.error) {
                    // console.warn(`RMP: Skipping ${revenueKey} aggregation for hotel ${stringHotelIdKey} due to previous fetch error.`);
                }
            }
        };
        aggregateDataSource(pmsTotalData.value, 'pms_revenue');
        aggregateDataSource(forecastTotalData.value, 'forecast_revenue');
        aggregateDataSource(accountingTotalData.value, 'acc_revenue');
        Object.keys(monthlyAggregates).sort().forEach(monthKey => { 
            for (const hotelIdStringKeyInMonth in monthlyAggregates[monthKey]) {
                let outputHotelId = hotelIdStringKeyInMonth === '0' ? 0 : hotelIdLookup.get(hotelIdStringKeyInMonth);
                if (outputHotelId === undefined && hotelIdStringKeyInMonth !== '0') {
                    const parsed = parseInt(hotelIdStringKeyInMonth, 10);
                    outputHotelId = String(parsed) === hotelIdStringKeyInMonth ? parsed : hotelIdStringKeyInMonth;
                }
                const aggregatedMonthData = monthlyAggregates[monthKey][hotelIdStringKeyInMonth];
                const pmsRev = aggregatedMonthData.pms_revenue;
                const forecastRev = aggregatedMonthData.forecast_revenue;
                const accRev = aggregatedMonthData.acc_revenue;
                const hotelName = searchAllHotels(outputHotelId)[0]?.name || 'Unknown Hotel';
                // Reverted: Prioritize accounting revenue if available
                let periodRev = (accRev !== null) ? accRev : (pmsRev || 0);
                result.push({
                    month: monthKey, hotel_id: outputHotelId, hotel_name: hotelName,
                    pms_revenue: pmsRev, forecast_revenue: forecastRev, acc_revenue: accRev, period_revenue: periodRev,
                });
            }
        });
        result.sort((a, b) => {
            if (a.month < b.month) return -1; if (a.month > b.month) return 1;
            const idA = a.hotel_id; const idB = b.hotel_id;
            if (idA === 0 && idB !== 0) return -1; if (idA !== 0 && idB === 0) return 1;
            if (typeof idA === 'number' && typeof idB === 'number') return idA - idB;
            return String(idA).localeCompare(String(idB));
        });
        if (selectedView.value?.endsWith('Hotel')) {
            return result.filter(item => item.hotel_id !== 0);
        }
        return result;
    });

    const occupancyData = computed(() => {
        // Guard: Only compute if a summary view is potentially active
        if (selectedReportType.value !== 'monthlySummary' || !selectedView.value) return [];

        const result = [];
        if (!firstDayofFetch.value || !lastDayofFetch.value || selectedHotels.value.length === 0 || allHotels.value.length === 0) {            
            return result;
        }
        const monthlyOccupancyAggregates = {};
        let currentIterMonth = new Date(firstDayofFetch.value);
        const lastIterMonthDate = new Date(lastDayofFetch.value);
        while (currentIterMonth <= lastIterMonthDate) {
            const iterDateForMonthKey = normalizeDate(currentIterMonth);
            const monthKey = formatDateMonth(currentIterMonth);
            monthlyOccupancyAggregates[monthKey] = {};
            monthlyOccupancyAggregates[monthKey]['0'] = { total_rooms: 0, sold_rooms: 0, roomDifferenceSum: 0, fc_total_rooms: 0, fc_sold_rooms: 0 };
            const year = iterDateForMonthKey.getUTCFullYear();
            const monthIndex = iterDateForMonthKey.getUTCMonth();
            const daysInCalendarMonth = getDaysInMonth(year, monthIndex + 1);
            const firstDayOfCurrentProcessingMonth = normalizeDate(new Date(year, monthIndex, 1));
            const lastDayOfCurrentProcessingMonth = normalizeDate(new Date(year, monthIndex, daysInCalendarMonth));

            if (!firstDayOfCurrentProcessingMonth || !lastDayOfCurrentProcessingMonth) {
                const currentMonthLoop = currentIterMonth.getUTCMonth();
                currentIterMonth.setUTCMonth(currentMonthLoop + 1);
                if (currentIterMonth.getUTCMonth() === (currentMonthLoop + 2) % 12) {
                    currentIterMonth.setUTCDate(0); 
                    currentIterMonth.setUTCMonth(currentIterMonth.getUTCMonth() + 2);
                }
                currentIterMonth.setUTCDate(1);
                continue;
            }
            selectedHotels.value.forEach(hotelId => {
                const hotelInfo = allHotels.value.find(h => String(h.id) === String(hotelId));
                let physicalRooms = (hotelInfo && typeof hotelInfo.total_rooms === 'number') ? hotelInfo.total_rooms : 0;
                let effectiveDaysForHotelInMonth = daysInCalendarMonth;
                if (hotelInfo && hotelInfo.open_date) {                    
                    const openDate = normalizeDate(new Date(hotelInfo.open_date));
                    if (openDate && !isNaN(openDate.getTime())) {
                        if (openDate > lastDayOfCurrentProcessingMonth) effectiveDaysForHotelInMonth = 0;
                        else if (openDate > firstDayOfCurrentProcessingMonth) effectiveDaysForHotelInMonth = lastDayOfCurrentProcessingMonth.getUTCDate() - openDate.getUTCDate() + 1;
                    }
                }
                effectiveDaysForHotelInMonth = Math.max(0, effectiveDaysForHotelInMonth);
                const monthlyAvailableRoomDays = physicalRooms * effectiveDaysForHotelInMonth;
                if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey]['0']) {
                    monthlyOccupancyAggregates[monthKey]['0'].total_rooms += monthlyAvailableRoomDays;
                }
                monthlyOccupancyAggregates[monthKey][String(hotelId)] = { total_rooms: monthlyAvailableRoomDays, sold_rooms: 0, roomDifferenceSum: 0, fc_total_rooms: 0, fc_sold_rooms: 0 };
            });
            currentIterMonth.setUTCMonth(currentIterMonth.getUTCMonth() + 1);
        }

        if (pmsTotalData.value) {
            for (const stringHotelIdKey in pmsTotalData.value) {
                const pmsRecords = pmsTotalData.value[stringHotelIdKey];
                if (Array.isArray(pmsRecords)) {
                    pmsRecords.forEach(record => {
                        if (record && record.date && typeof record.room_count === 'number') {
                            const recordDateObj = normalizeDate(new Date(record.date));
                            if (!recordDateObj) return; const monthKey = formatDateMonth(recordDateObj); if (!monthKey) return;
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey][stringHotelIdKey]) {
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].sold_rooms += record.room_count;
                            }
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey]['0']) {
                                monthlyOccupancyAggregates[monthKey]['0'].sold_rooms += record.room_count;
                            }
                        }
                        if (record && record.date && typeof record.total_rooms === 'number' && typeof record.total_rooms_real === 'number') {
                             const recordDateObj = normalizeDate(new Date(record.date));
                            if (!recordDateObj) return; const monthKey = formatDateMonth(recordDateObj); if (!monthKey) return;
                            const difference = record.total_rooms_real - record.total_rooms;
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey][stringHotelIdKey]) {
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].roomDifferenceSum += difference;
                            }
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey]['0']) {
                                monthlyOccupancyAggregates[monthKey]['0'].roomDifferenceSum += difference;
                            }
                        }
                    });
                }
            }
        }
        if (forecastTotalData.value) {
            for (const stringHotelIdKey in forecastTotalData.value) {
                const isSelectedHotel = selectedHotels.value.some(selHotelId => String(selHotelId) === stringHotelIdKey);
                if (stringHotelIdKey !== '0' && !isSelectedHotel) continue;
                const forecastRecords = forecastTotalData.value[stringHotelIdKey];
                if (Array.isArray(forecastRecords)) {
                    forecastRecords.forEach(record => {
                        if (record && record.date && typeof record.room_count === 'number') {
                            const recordDateObj = normalizeDate(new Date(record.date));
                            if (!recordDateObj) return; const monthKey = formatDateMonth(recordDateObj); if (!monthKey || !monthlyOccupancyAggregates[monthKey]) return;
                            if (monthlyOccupancyAggregates[monthKey][stringHotelIdKey]) {
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].fc_sold_rooms += record.room_count;
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].fc_total_rooms += record.total_rooms;
                            }
                            if (isSelectedHotel && monthlyOccupancyAggregates[monthKey]['0']) {
                                monthlyOccupancyAggregates[monthKey]['0'].fc_total_rooms += record.total_rooms;
                                monthlyOccupancyAggregates[monthKey]['0'].fc_sold_rooms += record.room_count;
                            }
                        }
                    });
                }
            }
        }
        Object.keys(monthlyOccupancyAggregates).sort().forEach(monthKey => {
            const monthData = monthlyOccupancyAggregates[monthKey];
            let totalRoomsSum = 0;

            // First, calculate total_available_rooms for each individual hotel
            for (const hotelId in monthData) {
                if (hotelId === '0') continue;

                const hotelData = monthData[hotelId];
                let total_available_rooms_for_month_calc = 0;
                const fallbackCapacityForHotel = pmsFallbackCapacities.value[hotelId] || 0;
                const dailyRealRoomsMap = new Map();
                const hotelPmsDataForMonth = (pmsTotalData.value[hotelId] || []).filter(
                    pmsRecord => pmsRecord.date.startsWith(monthKey)
                );

                hotelPmsDataForMonth.forEach(pmsRecord => {
                    if (pmsRecord.hasOwnProperty('total_rooms_real') && pmsRecord.total_rooms_real !== null) {
                        const realRooms = parseInt(pmsRecord.total_rooms_real, 10);
                        if (!isNaN(realRooms)) {
                            dailyRealRoomsMap.set(pmsRecord.date, realRooms);
                        }
                    }
                });

                const [yearStr, monthStr] = monthKey.split('-');
                const year = parseInt(yearStr, 10);
                const monthJS = parseInt(monthStr, 10) - 1;
                const daysInCurrentMonth = getDaysInMonth(year, monthJS + 1);

                for (let day = 1; day <= daysInCurrentMonth; day++) {
                    const utcDateForDay = new Date(Date.UTC(year, monthJS, day));
                    const currentDateStr = formatDate(utcDateForDay);
                    total_available_rooms_for_month_calc += dailyRealRoomsMap.get(currentDateStr) || fallbackCapacityForHotel;
                }
                
                hotelData.total_available_rooms_for_month_calc = total_available_rooms_for_month_calc;
                totalRoomsSum += total_available_rooms_for_month_calc;
            }

            // Assign the sum to the '0' hotel entry
            if (monthData['0']) {
                monthData['0'].total_available_rooms_for_month_calc = totalRoomsSum;
            }

            // Now, create the result array for the month
            for (const hotelId in monthData) {
                const data = monthData[hotelId];
                const total_rooms = data.total_available_rooms_for_month_calc || 0;
                const occupancyRate = total_rooms > 0 ? (data.sold_rooms / total_rooms) * 100 : 0;
                
                let outputHotelId = hotelId === '0' ? 0 : parseInt(hotelId, 10);
                const hotelName = searchAllHotels(outputHotelId)[0]?.name || 'Unknown Hotel';

                const oldAdjustedTotalRoomsEquivalentForCondition = data.total_rooms + data.roomDifferenceSum;
                if (hotelId !== '0' || (hotelId === '0' && selectedHotels.value.length > 0)) {
                    if (!(hotelId === '0' && oldAdjustedTotalRoomsEquivalentForCondition === 0 && data.sold_rooms === 0 && data.roomDifferenceSum === 0 && data.total_rooms === 0)) {
                        result.push({
                            month: monthKey,
                            hotel_id: outputHotelId,
                            hotel_name: hotelName,
                            total_rooms: total_rooms,
                            sold_rooms: data.sold_rooms,
                            occ: parseFloat(occupancyRate.toFixed(2)),
                            not_available_rooms: 0,
                            fc_total_rooms: data.fc_total_rooms,
                            fc_sold_rooms: data.fc_sold_rooms,
                            fc_occ: data.fc_total_rooms > 0 ? parseFloat(((data.fc_sold_rooms / data.fc_total_rooms) * 100).toFixed(2)) : 0
                        });
                    }
                }
            }
        });
        result.sort((a, b) => {
            if (a.month < b.month) return -1; if (a.month > b.month) return 1;
            const idA = a.hotel_id; const idB = b.hotel_id;
            if (idA === 0 && idB !== 0) return -1; if (idA !== 0 && idB === 0) return 1;
            if (typeof idA === 'number' && typeof idB === 'number') return idA - idB;
            return String(idA).localeCompare(String(idB));
        });
        if (selectedView.value?.endsWith('Hotel')) {
            return result.filter(item => item.hotel_id !== 0);
        }
        return result;
    });

    const fetchData = async () => {
        // Prevent fetching summary data if a new specialized report type is selected
        if (selectedReportType.value === 'activeReservationsChange' || 
            selectedReportType.value === 'monthlyReservationEvolution') {
            loading.value = false; 
            pmsTotalData.value = {}; forecastTotalData.value = {}; accountingTotalData.value = {};
            return; 
        }

        pmsTotalData.value = {}; forecastTotalData.value = {}; accountingTotalData.value = {};
        if (selectedHotels.value.length === 0) {
            // console.log('RMP: No hotels selected for summary. Skipping data fetch.');
            loading.value = false; 
            return;
        }
        if (!firstDayofFetch.value || !lastDayofFetch.value) {
            // console.log('RMP: Date range is not properly set for summary. Skipping data fetch.');
            loading.value = false; 
            return;
        }
        loading.value = true; 

        // const startDate = formatDate(firstDayofFetch.value); // Old way
        // Ensure PMS data fetch always starts from Jan 1st of the selectedDate's year
        const yearOfSelectedDate = selectedDate.value.getFullYear();
        const pmsFetchStartDate = formatDate(new Date(yearOfSelectedDate, 0, 1)); // Jan 1st
        const pmsFetchEndDate = formatDate(lastDayofFetch.value); // Original end date is fine

        let currentProcessingHotelId = null;
        pmsFallbackCapacities.value = {}; // Reset for current fetch

        try {
            for (const hotelId of selectedHotels.value) {
                currentProcessingHotelId = hotelId;
                // Fetch PMS data from Jan 1st
                const rawPmsData = await fetchCountReservation(hotelId, pmsFetchStartDate, pmsFetchEndDate);

                // Fetch Forecast and Accounting data using original date range (firstDayofFetch to lastDayofFetch)
                // as these might not need the full year data for their specific calculations.
                // However, if their logic also needs to align with ReportMonthly's wider view, this might need adjustment too.
                // For now, focusing on fixing OCC and RevPAR based on PMS data alignment.
                const forecastAndAccountingStartDate = formatDate(firstDayofFetch.value);
                const forecastAndAccountingEndDate = formatDate(lastDayofFetch.value);

                const [rawForecastData, rawAccountingData] = await Promise.all([
                    fetchForecastData(hotelId, forecastAndAccountingStartDate, forecastAndAccountingEndDate),
                    fetchAccountingData(hotelId, forecastAndAccountingStartDate, forecastAndAccountingEndDate)
                ]);

                if (rawPmsData && Array.isArray(rawPmsData)) {
                    if (rawPmsData.length > 0 && rawPmsData[0].total_rooms !== undefined) {
                        pmsFallbackCapacities.value[String(hotelId)] = Number(rawPmsData[0].total_rooms || 0);
                    } else {
                        pmsFallbackCapacities.value[String(hotelId)] = 0; // Default if no data or no total_rooms
                    }

                    pmsTotalData.value[String(hotelId)] = rawPmsData.map(item => ({
                        date: formatDate(normalizeDate(new Date(item.date))),
                        revenue: item.price !== undefined ? Number(item.price) : 0,
                        room_count: item.room_count !== undefined ? Number(item.room_count) : 0,
                        total_rooms: item.total_rooms !== undefined ? Number(item.total_rooms) : 0,
                        total_rooms_real: item.total_rooms_real !== undefined ? Number(item.total_rooms_real) : 0,
                    })).filter(item => item.date !== null);
                } else {
                     pmsTotalData.value[String(hotelId)] = [];
                     pmsFallbackCapacities.value[String(hotelId)] = 0;
                }

                if (rawForecastData && Array.isArray(rawForecastData)) {
                    forecastTotalData.value[String(hotelId)] = rawForecastData.map(item => ({
                        date: formatDate(normalizeDate(new Date(item.forecast_month))),
                        revenue: item.accommodation_revenue !== undefined ? Number(item.accommodation_revenue) : 0,
                        total_rooms: item.available_room_nights !== undefined ? Number(item.available_room_nights) : 0,  
                        room_count: item.rooms_sold_nights !== undefined ? Number(item.rooms_sold_nights) : 0,                      
                    })).filter(item => item.date !== null);
                } else if (rawForecastData) { forecastTotalData.value[String(hotelId)] = []; }
                if (rawAccountingData && Array.isArray(rawAccountingData)) {
                    accountingTotalData.value[String(hotelId)] = rawAccountingData.map(item => ({
                        date: formatDate(normalizeDate(new Date(item.accounting_month))),
                        revenue: item.accommodation_revenue !== undefined ? Number(item.accommodation_revenue) : 0,                        
                    })).filter(item => item.date !== null);
                } else if (rawAccountingData) { accountingTotalData.value[String(hotelId)] = []; }
            }  
            currentProcessingHotelId = null;           
        } catch (error) {
            console.error(`RMP: Error during summary data fetching (hotel ID ${currentProcessingHotelId || 'N/A'} may have failed):`, error);
            if (currentProcessingHotelId) {
                const hotelKey = String(currentProcessingHotelId);
                if (!pmsTotalData.value[hotelKey]) pmsTotalData.value[hotelKey] = { error: true, message: 'Failed to load/transform PMS', details: error };
                if (!forecastTotalData.value[hotelKey]) forecastTotalData.value[hotelKey] = { error: true, message: 'Failed to load/transform Forecast', details: error };
                if (!accountingTotalData.value[hotelKey]) accountingTotalData.value[hotelKey] = { error: true, message: 'Failed to load/transform Accounting', details: error };
            }
        } finally {
            loading.value = false;
        }
        // console.log('RMP: Fetched Summary pmsTotalData', pmsTotalData.value);
        // console.log('RMP: Fetched Summary forecastTotalData', forecastTotalData.value);
        // console.log('RMP: Fetched Summary accountingTotalData', accountingTotalData.value);
    };

    const handleDateChange = async (newDate) => {
        selectedDate.value = newDate;
        reportTriggerKey.value = Date.now();
        await fetchData(); 
    };
    const handlePeriodChange = async (newPeriod) => {
        period.value = newPeriod;
        reportTriggerKey.value = Date.now(); 
        await fetchData(); 
    };
    const handleHotelChange = async (newSelectedHotelIds, hotelsFromMenu) => {
        selectedHotels.value = newSelectedHotelIds;
        allHotels.value = hotelsFromMenu; 
        reportTriggerKey.value = Date.now(); 
        // console.log('RMP: allHotels updated by handleHotelChange:', allHotels.value);
        await fetchData(); 
    };

    const handleReportTypeChange = (newReportType) => {
        // console.log('RMP: Report type changed to', newReportType);
        selectedReportType.value = newReportType;
        reportTriggerKey.value = Date.now(); 

        // The check inside fetchData() will determine if it should run for summary data.
        // For new report types, their own watchers (triggered by reportTriggerKey) will fetch data.
        fetchData(); 
    };

    const searchAllHotels = (hotelId) => {
        if(!allHotels.value || allHotels.value.length === 0) {
            return [];
        }
        if (hotelId === 0) {
            return [{ id: 0, name: '施設合計' }];
        }
        const foundHotel = allHotels.value.find(hotel => String(hotel.id) === String(hotelId));
        if (foundHotel) {
            return [foundHotel];
        }
        return [];
    }

    onMounted(async () => {
        // console.log('RMP: onMounted. Initial selectedReportType:', selectedReportType.value);
        // Initial data fetch is triggered by ReportingTopMenu emitting changes on its mount,
        // which then calls the handlers (like handleHotelChange) in this component.
        // If ReportingTopMenu does not emit all necessary initial values,
        // an explicit call to fetchData() might be needed here, guarded by selectedReportType.
        // However, ReportingTopMenu was modified to emit all values on its mount.
    });
</script>
<style scoped>
 
</style>