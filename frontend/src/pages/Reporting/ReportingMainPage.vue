<template>
    <div class="flex flex-col h-screen bg-white">
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
            <ReportingSingleMonthAllHotels
                v-if="selectedView === 'singleMonthAllHotels'"
                :revenueData="revenueData"                
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
    import ReportingSingleMonthAllHotels from './components/ReportingSingleMonthAllHotels.vue';

    // Stores
    import { useReportStore } from '@/composables/useReportStore';
    const { fetchCountReservation, fetchForecastData, fetchAccountingData } = useReportStore();

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

    // --- Reactive State for the Parent Component ---
    const loading = ref(false);
    const selectedDate = ref(new Date());
    const period = ref('month');
    const selectedHotels = ref([]);

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

    const selectedView = ref('singleMonthAllHotels');

    // --- Data Storage ---
    const pmsTotalData = ref({});
    const forecastTotalData = ref({});
    const accountingTotalData = ref({});

    const revenueData = computed(() => {
        const result = [];
        if (!firstDayofFetch.value || !lastDayofFetch.value || selectedHotels.value.length === 0) {
            return result;
        }
        console.log('revenueData firstDayofFetch', formatDate(firstDayofFetch.value), firstDayofFetch.value);
        console.log('revenueData lastDayofFetch', formatDate(lastDayofFetch.value), lastDayofFetch.value);

        const monthlyAggregates = {};

        // Initialize all months and hotel_ids (including '0' for sum)
        let currentIterMonth = new Date(firstDayofFetch.value);
        const lastIterMonthDate = new Date(lastDayofFetch.value);

        console.log('RMP: Iterating from', formatDateMonth(currentIterMonth), 'to', formatDateMonth(lastIterMonthDate));
        while (currentIterMonth <= lastIterMonthDate) {
            const monthKey = formatDateMonth(currentIterMonth);
            monthlyAggregates[monthKey] = {};
            // Initialize for the sum (hotel_id: 0, key '0')
            monthlyAggregates[monthKey]['0'] = { pms_revenue: 0, forecast_revenue: 0, acc_revenue: 0 };
            // Initialize for each selected hotel (using stringified hotelId as key)
            selectedHotels.value.forEach(hotelId => {
                monthlyAggregates[monthKey][String(hotelId)] = { pms_revenue: 0, forecast_revenue: 0, acc_revenue: 0 };
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
        Object.keys(monthlyAggregates).sort().forEach(monthKey => { // Sorts by month string 'YYYY-MM'
            for (const hotelIdStringKeyInMonth in monthlyAggregates[monthKey]) {
                let outputHotelId;
                if (hotelIdStringKeyInMonth === '0') {
                    outputHotelId = 0; // Numeric 0 for sum
                } else {
                    // Find the original hotel ID from selectedHotels to preserve its type (number/string)
                    // This relies on selectedHotels.value containing the original IDs.
                    outputHotelId = selectedHotels.value.find(h => String(h) === hotelIdStringKeyInMonth);
                    if (outputHotelId === undefined) {
                        // Fallback if not found in selectedHotels (e.g. if selectedHotels changed, or ID is purely from data)
                        // Try to parse as int if it looks like one, otherwise use the string key.
                        const parsed = parseInt(hotelIdStringKeyInMonth, 10);
                        outputHotelId = String(parsed) === hotelIdStringKeyInMonth ? parsed : hotelIdStringKeyInMonth;
                         console.warn(`RMP: Hotel ID key ${hotelIdStringKeyInMonth} from aggregation was not found in current selectedHotels. Using key as is or parsed.`);
                    }
                }

                result.push({
                    month: monthKey,
                    hotel_id: outputHotelId,
                    pms_revenue: monthlyAggregates[monthKey][hotelIdStringKeyInMonth].pms_revenue,
                    forecast_revenue: monthlyAggregates[monthKey][hotelIdStringKeyInMonth].forecast_revenue,
                    acc_revenue: monthlyAggregates[monthKey][hotelIdStringKeyInMonth].acc_revenue,
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

        console.log('RMP: pmsDataForHotel', pmsTotalData.value);
        console.log('RMP: forecastDataForHotel', forecastTotalData.value);
        console.log('RMP: accountingDataForHotel', accountingTotalData.value);

        console.log('RMP: computed revenueData', revenueData.value);
        
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
    const handleHotelChange = async (newSelectedHotelIds) => {
        // console.log('Parent: Selected hotels changed to', newSelectedHotelIds, hotels);
        selectedHotels.value = newSelectedHotelIds;
        await fetchData();
    };

    onMounted(async () => {
        console.log('RMP: onMounted');
    });
</script>
<style scoped>
 
</style>