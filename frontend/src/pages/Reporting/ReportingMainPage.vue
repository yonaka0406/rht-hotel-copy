<template>
    <div class="flex flex-col h-screen bg-gray-100">
        <header>
            <ReportingTopMenu
                :selectedDate="selectedDate"
                :period="period"
                :selectedHotels="selectedHotels"                
                @date-change="handleDateChange"
                @period-change="handlePeriodChange"
                @hotel-change="handleHotelChange"
            />
        </header>
        
        <main class="flex-1 overflow-auto p-6">
            <div v-if="loading" class="flex justify-content-center align-items-center h-full">
                <ProgressSpinner />
            </div>
            <ReportingYearCumulativeAllHotels
                v-else-if="selectedView === 'yearCumulativeAllHotels'"
                :revenueData="revenueData"
                :occupancyData="occupancyData"                
            />
            <div v-else class="text-gray-700 text-center">
                レポートを選択してください。
            </div>
        </main>

        <footer class="bg-black text-white p-4 text-center text-sm">
            レッドホーストラスト株式会社
        </footer>
    </div>
</template>
<script setup>
    // Vue
    import { ref, computed, onMounted } from 'vue';   

    import ReportingTopMenu from './components/ReportingTopMenu.vue';
    import ReportingYearCumulativeAllHotels from './components/ReportingYearCumulativeAllHotels.vue';

    // Stores
    import { useReportStore } from '@/composables/useReportStore';
    const { fetchCountReservation, fetchForecastData, fetchAccountingData } = useReportStore();

    // Primevue
    import { ProgressSpinner } from 'primevue';

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
        // Month in JavaScript's Date is 0-indexed (0 for January, 11 for December)
        // So, month 1 (January) is monthIndex 0.
        // To get days in month `m` (1-indexed), we ask for day 0 of month `m+1` (1-indexed).
        // Example: For January (month=1), we use monthIndex=1 (February) and day 0, which gives last day of Jan.
        return new Date(year, month, 0).getDate();
    }

    // --- Reactive State for the Parent Component ---
    const loading = ref(false);
    const selectedDate = ref(new Date());
    const period = ref('month');
    const selectedHotels = ref([]);
    const allHotels = ref([]);

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
        let viewName = '';

        

        if (selectedDate.value && typeof selectedDate.value.getMonth === 'function' && selectedDate.value.getMonth() === 0) {
            viewName = 'singleMonth';
        } else {
            if (period.value === 'month') {
                viewName += 'singleMonth';
            } else if (period.value === 'year') {
                viewName += 'yearCumulative';
            } else {
                // Default or handle unknown period
                viewName += 'singleMonth'; // Fallback to singleMonth
            }
        }        

        // Determine hotel scope part
        if (selectedHotels.value.length === 1) {
            viewName += 'Hotel';
        } else if (selectedHotels.value.length > 1) {
            viewName += 'AllHotels';
        } else {
            
        }
        // console.log('RMP: Computed selectedView:', viewName);
        return viewName;
    });

    // --- Data Storage ---
    const pmsTotalData = ref({});
    const forecastTotalData = ref({});
    const accountingTotalData = ref({});

    const revenueData = computed(() => {
        const result = [];
        if (!firstDayofFetch.value || !lastDayofFetch.value || selectedHotels.value.length === 0) {
            return result;
        }

        const hotelIdLookup = new Map();        
        selectedHotels.value.forEach(hotelId => {
            hotelIdLookup.set(String(hotelId), hotelId);
        });        
        const monthlyAggregates = {};

        // Initialize all months and hotel_ids (including '0' for sum)
        let currentIterMonth = new Date(firstDayofFetch.value);
        const lastIterMonthDate = new Date(lastDayofFetch.value);
        
        while (currentIterMonth <= lastIterMonthDate) {
            const monthKey = formatDateMonth(currentIterMonth);
            monthlyAggregates[monthKey] = {};
            
            monthlyAggregates[monthKey]['0'] = { 
                pms_revenue: null, 
                forecast_revenue: null, 
                acc_revenue: null 
            };
            
            selectedHotels.value.forEach(hotelId => {
                monthlyAggregates[monthKey][String(hotelId)] = { 
                    pms_revenue: null,
                    forecast_revenue: null,
                    acc_revenue: null                
                };
            });
            currentIterMonth.setUTCMonth(currentIterMonth.getUTCMonth() + 1);
        }
        
        // Function to process a specific data source (PMS, Forecast, Accounting)
        const aggregateDataSource = (sourceDataByHotel, revenueKey) => {
            // sourceDataByHotel keys are stringified hotel IDs (e.g., pmsTotalData.value)
            for (const stringHotelIdKey in sourceDataByHotel) { 
                const hotelDataArray = sourceDataByHotel[stringHotelIdKey];
                if (Array.isArray(hotelDataArray)) {
                    hotelDataArray.forEach(record => {
                        if (record && record.date && typeof record.revenue === 'number') {
                            const monthKey = formatDateMonth(new Date(record.date));
                            if (monthlyAggregates[monthKey]) {
                                // Aggregate for the specific hotel (using stringHotelIdKey)
                                if (monthlyAggregates[monthKey][stringHotelIdKey]) {
                                    monthlyAggregates[monthKey][stringHotelIdKey][revenueKey] += record.revenue;
                                } else {
                                     console.warn(`RMP: Aggregate structure for hotel key ${stringHotelIdKey} in month ${monthKey} was not pre-initialized. This might indicate an issue if this hotel was expected to be in selectedHotels.`);
                                }
                                // Aggregate for the sum (key '0')
                                if (monthlyAggregates[monthKey]['0']) {
                                    monthlyAggregates[monthKey]['0'][revenueKey] += record.revenue;
                                }
                            }
                        }
                    });
                } else if (hotelDataArray && hotelDataArray.error) {
                    console.warn(`RMP: Skipping ${revenueKey} aggregation for hotel ${stringHotelIdKey} due to previous fetch error.`);
                }
            }
        };

        // Aggregate revenues from all sources
        aggregateDataSource(pmsTotalData.value, 'pms_revenue');
        aggregateDataSource(forecastTotalData.value, 'forecast_revenue');
        aggregateDataSource(accountingTotalData.value, 'acc_revenue');
        
        // Convert the aggregated data object to the final result array
        Object.keys(monthlyAggregates).sort().forEach(monthKey => { 
            for (const hotelIdStringKeyInMonth in monthlyAggregates[monthKey]) {
                let outputHotelId;
                if (hotelIdStringKeyInMonth === '0') {
                    outputHotelId = 0; // Numeric 0 for sum
                } else {                    
                    // Find the original hotel ID from selectedHotels to preserve its type (number/string)
                    // This relies on selectedHotels.value containing the original IDs.
                    outputHotelId = hotelIdLookup.get(hotelIdStringKeyInMonth);
                    if (outputHotelId === undefined) {
                        // Fallback if not found in selectedHotels (e.g. if selectedHotels changed, or ID is purely from data)
                        // Try to parse as int if it looks like one, otherwise use the string key.
                        const parsed = parseInt(hotelIdStringKeyInMonth, 10);
                        outputHotelId = String(parsed) === hotelIdStringKeyInMonth ? parsed : hotelIdStringKeyInMonth;
                        console.warn(`RMP: Hotel ID key ${hotelIdStringKeyInMonth} from aggregation was not found in current selectedHotels (via lookup map). Using key as is or parsed.`);
                    }
                }

                const aggregatedMonthData = monthlyAggregates[monthKey][hotelIdStringKeyInMonth];
                const pmsRev = aggregatedMonthData.pms_revenue;
                const forecastRev = aggregatedMonthData.forecast_revenue;
                const accRev = aggregatedMonthData.acc_revenue;
                const hotelName = searchAllHotels(outputHotelId)[0]?.name || 'Unknown Hotel';

                let periodRev;
                if (accRev !== null) { 
                    periodRev = accRev;
                } else {
                    periodRev = pmsRev || 0;
                }

                result.push({
                    month: monthKey,
                    hotel_id: outputHotelId,
                    hotel_name: hotelName,
                    pms_revenue: pmsRev,
                    forecast_revenue: forecastRev,
                    acc_revenue: accRev, 
                    period_revenue: periodRev,
                });
            }
        });

        // Sort the final result: by month, then by hotel_id.
        // hotel_id: 0 (sum) should ideally come first or last consistently for each month.
        result.sort((a, b) => {
            if (a.month < b.month) return -1;
            if (a.month > b.month) return 1;

            // For hotel_id sorting within the same month:
            const idA = a.hotel_id;
            const idB = b.hotel_id;

            // Treat hotel_id 0 specially to ensure it's first
            if (idA === 0 && idB !== 0) return -1;
            if (idA !== 0 && idB === 0) return 1;
            
            // If both are non-zero, sort numerically if both are numbers, otherwise by string.
            if (typeof idA === 'number' && typeof idB === 'number') {
                return idA - idB;
            }
            return String(idA).localeCompare(String(idB));
        });

        return result;
    });
    const occupancyData = computed(() => {
        const result = [];
        if (!firstDayofFetch.value || !lastDayofFetch.value || selectedHotels.value.length === 0 || allHotels.value.length === 0) {            
            return result;
        }

        const monthlyOccupancyAggregates = {};

        // Initialize months and hotels for aggregation        
        let currentIterMonth = new Date(firstDayofFetch.value);
        const lastIterMonthDate = new Date(lastDayofFetch.value);

        while (currentIterMonth <= lastIterMonthDate) {
            const iterDateForMonthKey = normalizeDate(currentIterMonth);
            const monthKey = formatDateMonth(currentIterMonth);
            monthlyOccupancyAggregates[monthKey] = {};
            monthlyOccupancyAggregates[monthKey]['0'] = {
                total_rooms: 0,
                sold_rooms: 0,
                roomDifferenceSum: 0,
                fc_total_rooms: 0,
                fc_sold_rooms: 0
            };

            const year = iterDateForMonthKey.getUTCFullYear();
            const monthIndex = iterDateForMonthKey.getUTCMonth(); // 0-indexed for getDaysInMonth
            const daysInCalendarMonth = getDaysInMonth(year, monthIndex + 1);

            // Define first and last day of the current iteration month for precise comparison
            const firstDayOfCurrentProcessingMonth = normalizeDate(new Date(year, monthIndex, 1));
            const lastDayOfCurrentProcessingMonth = normalizeDate(new Date(year, monthIndex, daysInCalendarMonth));

            if (!firstDayOfCurrentProcessingMonth || !lastDayOfCurrentProcessingMonth) {
                console.error(`RMP occupancyData: Could not determine month boundaries for ${monthKey}`);
                const currentMonthLoop = currentIterMonth.getUTCMonth(); // Renamed to avoid conflict
                currentIterMonth.setUTCMonth(currentMonthLoop + 1);
                if (currentIterMonth.getUTCMonth() === (currentMonthLoop + 2) % 12) {
                    currentIterMonth.setUTCDate(0); 
                    currentIterMonth.setUTCMonth(currentIterMonth.getUTCMonth() + 2);
                }
                currentIterMonth.setUTCDate(1);
                continue;
            }

            // Initialize for each selected hotel (using stringified hotelId as key)
            selectedHotels.value.forEach(hotelId => {
                const hotelInfo = allHotels.value.find(h => String(h.id) === String(hotelId));
                let physicalRooms = 0;
                if (hotelInfo && typeof hotelInfo.total_rooms === 'number') {
                    physicalRooms = hotelInfo.total_rooms;
                } else {
                    console.warn(`RMP occupancyData: Hotel info or total_rooms not found for hotelId ${hotelId}. Using 0 rooms.`);
                }

                let effectiveDaysForHotelInMonth = daysInCalendarMonth;

                if (hotelInfo && hotelInfo.open_date) {                    
                    const openDate = normalizeDate(new Date(hotelInfo.open_date));

                    if (openDate && !isNaN(openDate.getTime())) { // Check if openDate is valid
                        if (openDate > lastDayOfCurrentProcessingMonth) {
                            // Hotel opens after the current processing month ends
                            effectiveDaysForHotelInMonth = 0;
                        } else if (openDate > firstDayOfCurrentProcessingMonth) {
                            // Hotel opens during the current processing month
                            // Calculate days from openDate (inclusive) to last day of month (inclusive)
                            effectiveDaysForHotelInMonth = lastDayOfCurrentProcessingMonth.getUTCDate() - openDate.getUTCDate() + 1;
                        }
                        // If openDate is on or before firstDayOfCurrentProcessingMonth, it's open for the full duration
                        // (effectiveDaysForHotelInMonth remains daysInCalendarMonth or the relevant part if month is partial)
                    } else {
                        console.warn(`RMP occupancyData: Invalid or missing open_date for hotelId ${hotelId}: ${hotelInfo.open_date}. Assuming open for the full considered period.`);
                    }
                }
                
                effectiveDaysForHotelInMonth = Math.max(0, effectiveDaysForHotelInMonth); // Ensure non-negative

                const monthlyAvailableRoomDays = physicalRooms * effectiveDaysForHotelInMonth;

                if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey]['0']) {
                    monthlyOccupancyAggregates[monthKey]['0'].total_rooms += monthlyAvailableRoomDays;
                }

                // console.log(`RMP occupancyData: Hotel ID ${hotelId} has ${physicalRooms} rooms and month ${monthKey} has ${effectiveDaysForHotelInMonth} days, resulting in ${monthlyAvailableRoomDays} available room days.`);

                monthlyOccupancyAggregates[monthKey][String(hotelId)] = {
                    total_rooms: monthlyAvailableRoomDays,
                    sold_rooms: 0,
                    roomDifferenceSum: 0,
                    fc_total_rooms: 0,
                    fc_sold_rooms: 0
                };
            });
            currentIterMonth.setUTCMonth(currentIterMonth.getUTCMonth() + 1);
        }

        // Aggregate sold_rooms from pmsTotalData
        if (pmsTotalData.value) {
            for (const stringHotelIdKey in pmsTotalData.value) {
                const pmsRecords = pmsTotalData.value[stringHotelIdKey];
                if (Array.isArray(pmsRecords)) {
                    pmsRecords.forEach(record => {
                        if (record && record.date && typeof record.room_count === 'number') {
                            const recordDateObj = normalizeDate(new Date(record.date));
                            if (!recordDateObj) return;
                            const monthKey = formatDateMonth(recordDateObj);
                            if (!monthKey) return;

                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey][stringHotelIdKey]) {
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].sold_rooms += record.room_count;
                            }
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey]['0']) {
                                monthlyOccupancyAggregates[monthKey]['0'].sold_rooms += record.room_count;
                            }
                        }
                    });
                }
            }
        }

        // Aggregate sold_rooms from forecastTotalData        
        if (forecastTotalData.value) {
            for (const stringHotelIdKey in forecastTotalData.value) {
                const isSelectedHotel = selectedHotels.value.some(selHotelId => String(selHotelId) === stringHotelIdKey);
                if (stringHotelIdKey !== '0' && !isSelectedHotel) {
                    continue;
                }

                const forecastRecords = forecastTotalData.value[stringHotelIdKey];
                if (Array.isArray(forecastRecords)) {
                    forecastRecords.forEach(record => {
                        if (record && record.date && typeof record.room_count === 'number') {
                            const recordDateObj = normalizeDate(new Date(record.date));
                            if (!recordDateObj) return;
                            const monthKey = formatDateMonth(recordDateObj);
                            // console.log(`RMP occupancyData: Forecast record for hotel ${stringHotelIdKey} on date ${record.date} with room_count ${record.room_count} and monthKey ${monthKey}`);
                            if (!monthKey || !monthlyOccupancyAggregates[monthKey]) return;

                            // Add to specific hotel's sold_rooms
                            if (monthlyOccupancyAggregates[monthKey][stringHotelIdKey]) {
                                // console.log(`RMP occupancyData: Adding sold_rooms for hotel ${stringHotelIdKey} in month ${monthKey}`, record.room_count, record.total_rooms);
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].fc_sold_rooms += record.room_count;
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].fc_total_rooms += record.total_rooms;
                            }
                            // Add to the aggregate '0' if the hotel is among the selected ones
                            if (isSelectedHotel) {
                                if (monthlyOccupancyAggregates[monthKey]['0']) {
                                    monthlyOccupancyAggregates[monthKey]['0'].fc_total_rooms += record.total_rooms;
                                    monthlyOccupancyAggregates[monthKey]['0'].fc_sold_rooms += record.room_count;
                                }
                            }
                        }
                    });
                }
            }
        }

        // Aggregate room differences from pmsDataForHotel
        if (pmsTotalData.value) {
            for (const stringHotelIdKey in pmsTotalData.value) {
                const hotelRecords = pmsTotalData.value[stringHotelIdKey];
                if (Array.isArray(hotelRecords)) {
                    hotelRecords.forEach(record => {
                        if (record && record.date && typeof record.total_rooms === 'number' && typeof record.total_rooms_real === 'number') {
                            const recordDateObj = normalizeDate(new Date(record.date));
                            if (!recordDateObj) return; // Skip if date is invalid
                            const monthKey = formatDateMonth(recordDateObj);
                            if (!monthKey) return; // Skip if monthKey can't be determined

                            const difference = record.total_rooms_real - record.total_rooms;

                            // Add difference to the specific hotel's sum for the month
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey][stringHotelIdKey]) {
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].roomDifferenceSum += difference;
                            }
                            // Add difference to the aggregate sum ('0') for all selected hotels for the month
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey]['0']) {
                                monthlyOccupancyAggregates[monthKey]['0'].roomDifferenceSum += difference;
                            }
                        } else {
                            console.warn(`RMP occupancyData: Malformed record in pmsTotalData for hotel ${stringHotelIdKey} and date ${record ? record.date : 'unknown'}. Required fields: date, total_rooms, total_rooms_real.`);
                        }
                    });
                }
            }
        }

        // Format output and calculate occupancy
        Object.keys(monthlyOccupancyAggregates).sort().forEach(monthKey => {
            for (const hotelIdStringKeyInMonth in monthlyOccupancyAggregates[monthKey]) {
                const data = monthlyOccupancyAggregates[monthKey][hotelIdStringKeyInMonth];

                const adjustedTotalRooms = data.total_rooms + data.roomDifferenceSum;
                const occupancyRate = adjustedTotalRooms > 0 ? (data.sold_rooms / adjustedTotalRooms) * 100 : 0;                

                let outputHotelId = hotelIdStringKeyInMonth === '0' ? 0 : selectedHotels.value.find(h => String(h) === hotelIdStringKeyInMonth);
                if (outputHotelId === undefined && hotelIdStringKeyInMonth !== '0') { // Fallback
                    const parsed = parseInt(hotelIdStringKeyInMonth, 10);
                    outputHotelId = String(parsed) === hotelIdStringKeyInMonth ? parsed : hotelIdStringKeyInMonth;
                }

                const hotelName = searchAllHotels(outputHotelId)[0]?.name || 'Unknown Hotel';

                if (hotelIdStringKeyInMonth !== '0' || (hotelIdStringKeyInMonth === '0' && selectedHotels.value.length > 0)) {                    
                    if (hotelIdStringKeyInMonth === '0' && adjustedTotalRooms === 0 && data.sold_rooms === 0 && data.roomDifferenceSum === 0 && monthlyOccupancyAggregates[monthKey]['0'].total_rooms === 0) {                        
                    } else {
                        result.push({
                            month: monthKey,
                            hotel_id: outputHotelId,
                            hotel_name: hotelName,
                            total_rooms: adjustedTotalRooms,
                            sold_rooms: data.sold_rooms,
                            occ: parseFloat(occupancyRate.toFixed(2)),
                            not_available_rooms: data.roomDifferenceSum === 0 ? 0 : data.roomDifferenceSum * -1,
                            fc_total_rooms: data.fc_total_rooms,
                            fc_sold_rooms: data.fc_sold_rooms,
                            fc_occ: data.fc_total_rooms > 0 ? parseFloat(((data.fc_sold_rooms / data.fc_total_rooms) * 100).toFixed(2)) : 0
                        });
                    }
                }
            }
        });

        result.sort((a, b) => {
            if (a.month < b.month) return -1;
            if (a.month > b.month) return 1;
            const idA = a.hotel_id; const idB = b.hotel_id;
            if (idA === 0 && idB !== 0) return -1; if (idA !== 0 && idB === 0) return 1;
            if (typeof idA === 'number' && typeof idB === 'number') return idA - idB;
            return String(idA).localeCompare(String(idB));
        });
        // console.log('RMP occupancyData: Final calculated data:', JSON.parse(JSON.stringify(result)));
        return result;
    });

    const fetchData = async () => {
        // Clear existing data if no hotels are selected
        pmsTotalData.value = {};
        forecastTotalData.value = {};
        accountingTotalData.value = {};

        if (selectedHotels.value.length === 0) {
            console.log('RMP: No hotels selected. Skipping data fetch.');

            return;
        }
        if (!firstDayofFetch.value || !lastDayofFetch.value) {
            console.log('RMP: Date range is not properly set. Skipping data fetch.');
            return;
        }
        loading.value = true;

        const startDate = formatDate(firstDayofFetch.value);
        const endDate = formatDate(lastDayofFetch.value);
        let currentProcessingHotelId = null;

        try {
            for (const hotelId of selectedHotels.value) {
                currentProcessingHotelId = hotelId;
                console.log(`RMP: Fetching data for hotel ID: ${hotelId}`);

                // Fetch raw data
                const [rawPmsData, rawForecastData, rawAccountingData] = await Promise.all([
                    fetchCountReservation(hotelId, startDate, endDate),
                    fetchForecastData(hotelId, startDate, endDate),
                    fetchAccountingData(hotelId, startDate, endDate)
                ]);
                // Transform and store PMS data                
                if (rawPmsData && Array.isArray(rawPmsData)) {
                    pmsTotalData.value[String(hotelId)] = rawPmsData.map(item => ({
                        date: formatDate(normalizeDate(new Date(item.date))),
                        revenue: item.price !== undefined ? Number(item.price) : 0,
                        room_count: item.room_count !== undefined ? Number(item.room_count) : 0,
                        total_rooms: item.total_rooms !== undefined ? Number(item.total_rooms) : 0,
                        total_rooms_real: item.total_rooms_real !== undefined ? Number(item.total_rooms_real) : 0,                                
                    })).filter(item => item.date !== null); // Filter out items with invalid dates
                } else if (rawPmsData) {
                    console.warn(`RMP: PMS data for hotel ${hotelId} is not an array:`, rawPmsData);
                    pmsTotalData.value[String(hotelId)] = [];
                }

                // Transform and store Forecast data
                if (rawForecastData && Array.isArray(rawForecastData)) {
                    forecastTotalData.value[String(hotelId)] = rawForecastData.map(item => ({
                        date: formatDate(normalizeDate(new Date(item.forecast_month))),
                        revenue: item.accommodation_revenue !== undefined ? Number(item.accommodation_revenue) : 0,
                        total_rooms: item.available_room_nights !== undefined ? Number(item.available_room_nights) : 0,  
                        room_count: item.rooms_sold_nights !== undefined ? Number(item.rooms_sold_nights) : 0,                      
                    })).filter(item => item.date !== null); // Filter out items with invalid dates
                } else if (rawForecastData) {
                    console.warn(`RMP: Forecast data for hotel ${hotelId} is not an array:`, rawForecastData);
                    forecastTotalData.value[String(hotelId)] = [];
                }

                // Transform and store Accounting data  
                if (rawAccountingData && Array.isArray(rawAccountingData)) {
                    accountingTotalData.value[String(hotelId)] = rawAccountingData.map(item => ({
                        date: formatDate(normalizeDate(new Date(item.accounting_month))),
                        revenue: item.accommodation_revenue !== undefined ? Number(item.accommodation_revenue) : 0,                        
                    })).filter(item => item.date !== null);
                } else if (rawAccountingData) {
                     console.warn(`RMP: Accounting data for hotel ${hotelId} is not an array:`, rawAccountingData);
                     accountingTotalData.value[String(hotelId)] = [];
                }
            }  
            currentProcessingHotelId = null;           
        } catch (error) {
            console.error(`RMP: Error during data fetching or transformation (hotel ID ${currentProcessingHotelId || 'N/A'} may have failed):`, error);
            if (currentProcessingHotelId) {
                const hotelKey = String(currentProcessingHotelId);
                // Ensure error states are set if data wasn't populated or transformation failed
                if (!pmsTotalData.value[hotelKey]) pmsTotalData.value[hotelKey] = { error: true, message: 'Failed to load/transform PMS', details: error };
                if (!forecastTotalData.value[hotelKey]) forecastTotalData.value[hotelKey] = { error: true, message: 'Failed to load/transform Forecast', details: error };
                if (!accountingTotalData.value[hotelKey]) accountingTotalData.value[hotelKey] = { error: true, message: 'Failed to load/transform Accounting', details: error };
            }
        } finally {
            loading.value = false;
        }

        
        console.log('RMP: pmsTotalData', pmsTotalData.value);
        console.log('RMP: forecastTotalData', forecastTotalData.value);
        console.log('RMP: accountingTotalData', accountingTotalData.value);

        console.log('RMP: computed revenueData', revenueData.value);
        console.log('RMP: computed occupancyData', occupancyData.value);
        
        
    };

    const handleDateChange = async (newDate) => {
        // console.log('Parent: Date changed to', newDate);
        selectedDate.value = newDate;
        await fetchData();
    };
    const handlePeriodChange = async (newPeriod) => {
        // console.log('Parent: Period changed to', newPeriod);
        period.value = newPeriod;
        await fetchData();
    };
    const handleHotelChange = async (newSelectedHotelIds, hotels) => {
        // console.log('Parent: Selected hotels changed to', newSelectedHotelIds, hotels);
        selectedHotels.value = newSelectedHotelIds;
        allHotels.value = hotels;
        console.log('RMP: allHotels', allHotels.value);
        await fetchData();
    };

    const searchAllHotels = (hotelId) => {
        if(!allHotels.value || allHotels.value.length === 0) {
            console.log('RMP: No hotels available for search.');
            return [];
        }
        if (hotelId === 0) {
            return [
                {
                    id: 0,
                    name: '施設合計',
                }
            ];
        }

        const foundHotel = allHotels.value.find(hotel => String(hotel.id) === String(hotelId));
        if (foundHotel) {
            return [foundHotel];
        } else {
            console.log(`RMP: Hotel with ID ${hotelId} not found in allHotels.`);
            return [];
        }
    }

    onMounted(async () => {
        console.log('RMP: onMounted');
    });
</script>
<style scoped>
 
</style>