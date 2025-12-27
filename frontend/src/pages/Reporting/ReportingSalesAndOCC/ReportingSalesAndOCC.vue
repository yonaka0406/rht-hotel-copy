<template>
    <div>
        <div class="flex justify-end gap-2 mb-4">
            <Button label="デイリーレポート(Excel)" icon="pi pi-file-excel" severity="success" @click="downloadDailyTemplate(futureOutlookData, comparisonDate, 'xlsx')" :disabled="loading" />
            <Button label="デイリーレポート(PDF)" icon="pi pi-file-pdf" @click="downloadDailyTemplate(futureOutlookData, comparisonDate, 'pdf')" :disabled="loading" />
        </div>
        <div v-if="Object.keys(dataErrors).length > 0" class="mb-4">
            <Message severity="error" :closable="true" v-for="(error, hotelId) in dataErrors" :key="hotelId">
                ホテルID {{ hotelId }}: {{ error.message }} - 詳細: {{ error.details?.message || error.details }}
            </Message>
        </div>
        <div v-if="loading" class="flex justify-center items-center h-full">
            <ProgressSpinner />
        </div>
        <div v-else>
            <ReportingSingleMonthAllHotels v-if="selectedView === 'singleMonthAllHotels'" :revenueData="revenueData"
                :occupancyData="occupancyData" :rawOccupationBreakdownData="occupationBreakdownAllHotels"
                :prevYearRevenueData="prevYearRevenueData" :prevYearOccupancyData="prevYearOccupancyData"
                :futureOutlookData="futureOutlookData" :asOfDate="comparisonDate" />
            <ReportingSingleMonthHotel v-else-if="selectedView === 'singleMonthHotel'" :revenueData="revenueData"
                :occupancyData="occupancyData" :rawOccupationBreakdownData="occupationBreakdownAllHotels"
                :dayOverDayChange="dayOverDayChange" :prevYearRevenueData="prevYearRevenueData"
                :prevYearOccupancyData="prevYearOccupancyData" :futureOutlookData="futureOutlookData"
                :asOfDate="comparisonDate" />
            <ReportingYearCumulativeAllHotels v-else-if="selectedView === 'yearCumulativeAllHotels'"
                :revenueData="revenueData" :occupancyData="occupancyData"
                :rawOccupationBreakdownData="occupationBreakdownAllHotels" :prevYearRevenueData="prevYearRevenueData"
                :prevYearOccupancyData="prevYearOccupancyData" />
            <ReportingYearCumulativeHotel v-else-if="selectedView === 'yearCumulativeHotel'" :revenueData="revenueData"
                :occupancyData="occupancyData" :rawOccupationBreakdownData="occupationBreakdownAllHotels"
                :prevYearRevenueData="prevYearRevenueData" :prevYearOccupancyData="prevYearOccupancyData" />
            <div v-else class="text-gray-700 dark:text-gray-200 text-center mt-4">
                レポートタイプに対応するサマリービューが見つかりません。
            </div>
        </div>
    </div>
</template>
<script setup>
// Vue
import { ref, computed, onMounted, toRefs, watch } from 'vue';
import { useRouter } from 'vue-router';

import ReportingSingleMonthAllHotels from './components/ReportingSingleMonthAllHotels.vue';
import ReportingYearCumulativeAllHotels from './components/ReportingYearCumulativeAllHotels.vue';
import ReportingSingleMonthHotel from './components/ReportingSingleMonthHotel.vue';
import ReportingYearCumulativeHotel from './components/ReportingYearCumulativeHotel.vue';
import { formatDateToYMD, formatDate } from '@/utils/dateUtils';

// Defin Props
const props = defineProps({
    selectedDate: { type: Date, required: true },
    period: { type: String, required: true },
    selectedHotels: { type: Array, required: true },
    allHotels: { type: Array, required: true },
    reportType: { type: String, required: true }
});

const { selectedDate, period, selectedHotels, allHotels, reportType } = toRefs(props);

// Stores
import { useReportStore } from '@/composables/useReportStore';
const dayOverDayChange = ref({ rooms: 0, occ: 0, sales: 0 }); // To store pickup for selected period
const futureOutlookData = ref([]); // Store Future Outlook
const dataErrors = ref({}); // To store errors for specific hotel data fetches
const { fetchBatchCountReservation, fetchBatchForecastData, fetchBatchAccountingData, fetchBatchOccupationBreakdown, fetchDailyReportData, fetchBatchFutureOutlook, fetchLatestDailyReportDate, fetchDailyReportDataByHotel, downloadDailyTemplate } = useReportStore();

// Primevue
import { Message, ProgressSpinner } from 'primevue';
import Button from 'primevue/button';

// Router
const router = useRouter();

const pmsFallbackCapacities = ref({}); // To store fallback capacities per hotel

// --- State for initial data loading control ---
const isInitialized = ref(false); // Flag to control initial data fetch

// -- Helper Functions --
// Helper to get first day of month
const getFirstDayOfMonth = (date) => {
    if (!date) return null;
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

// Helper to get last day of month  
const getLastDayOfMonth = (date) => {
    if (!date) return null;
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

// Helper to get first day of year
const getFirstDayOfYear = (date) => {
    if (!date) return null;
    return new Date(date.getFullYear(), 0, 1);
};

// Helper to get last day of year
const getLastDayOfYear = (date) => {
    if (!date) return null;
    return new Date(date.getFullYear(), 11, 31);
};

// Helper to format a Date object to YYYY-MM
function formatDateMonth(date) {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
// Helper to normalize a Date object to local midnight (00:00:00)
const normalizeDate = (date) => {
    if (!date) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};
// Helper to get the number of days in a given month (1-indexed) of a year
function getDaysInMonth(year, month) {
    if (typeof year !== 'number' || typeof month !== 'number') return 0;
    // month - 1 because Date constructor expects 0-indexed month
    return new Date(year, month, 0).getDate();
}

// --- Reactive State for the Parent Component ---
const loading = ref(false);

const reportTriggerKey = ref(Date.now());
const comparisonDate = ref(null);

// Computed property for the first day of the selected month for API calls
const firstDayofFetch = computed(() => {
    if (!selectedDate.value) {
        return null;
    }

    const date = period.value === 'year'
        ? getFirstDayOfYear(selectedDate.value)
        : getFirstDayOfMonth(selectedDate.value);

    return date;
});
const lastDayofFetch = computed(() => {
    if (!selectedDate.value) {
        return null;
    }

    const date = period.value === 'year'
        ? getLastDayOfYear(selectedDate.value)
        : getLastDayOfMonth(selectedDate.value);

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
            viewName += 'singleMonth';
        }
    }

    // Check if '全施設' (id: 0) is the only selected hotel
    const isAllFacilitiesSelected = selectedHotels.value.length === 1 && selectedHotels.value[0] === 0;

    if (isAllFacilitiesSelected || selectedHotels.value.length > 1) {
        viewName += 'AllHotels';
    } else if (selectedHotels.value.length === 1) {
        viewName += 'Hotel';
    } else {
        // No hotels selected, or invalid state for summary views
        if (viewName === '') return null;
    }
    return viewName;
});

// --- Data Storage for existing summary reports ---
const pmsTotalData = ref({});
const forecastTotalData = ref({});
const accountingTotalData = ref({});
const occupationBreakdownAllHotels = ref([]);

const prevYearPmsTotalData = ref({});
const prevYearForecastTotalData = ref({});
const prevYearAccountingTotalData = ref({});
const prevYearOccupationBreakdownAllHotels = ref([]);

const prevYearRevenueData = computed(() => {
    if (!selectedView.value) return [];

    const result = [];
    if (!firstDayofFetch.value || !lastDayofFetch.value || selectedHotels.value.length === 0) {
        return result;
    }
    const hotelIdLookup = new Map();
    selectedHotels.value.forEach(hotelId => {
        hotelIdLookup.set(String(hotelId), hotelId);
    });

    // Aggregate prev year data
    const monthlyAggregates = {};
    // Calculate date range for previous year
    let currentIterMonth = new Date(firstDayofFetch.value);
    currentIterMonth.setFullYear(currentIterMonth.getFullYear() - 1);
    const lastIterMonthDate = new Date(lastDayofFetch.value);
    lastIterMonthDate.setFullYear(lastIterMonthDate.getFullYear() - 1);



    while (currentIterMonth <= lastIterMonthDate) {
        const monthKey = formatDateMonth(normalizeDate(currentIterMonth));
        monthlyAggregates[monthKey] = {};
        monthlyAggregates[monthKey]['0'] = { pms_revenue: null, pms_accommodation_revenue: null, pms_other_revenue: null, forecast_revenue: null, acc_revenue: null };
        selectedHotels.value.forEach(hotelId => {
            monthlyAggregates[monthKey][String(hotelId)] = { pms_revenue: null, pms_accommodation_revenue: null, pms_other_revenue: null, forecast_revenue: null, acc_revenue: null };
        });
        currentIterMonth.setMonth(currentIterMonth.getMonth() + 1);
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
            }
        }
    };

    const aggregatePmsDataSource = (sourceDataByHotel) => {


        for (const stringHotelIdKey in sourceDataByHotel) {
            const hotelDataArray = sourceDataByHotel[stringHotelIdKey];
            if (Array.isArray(hotelDataArray)) {
                hotelDataArray.forEach((record, index) => {
                    if (record && record.date) {
                        const monthKey = formatDateMonth(new Date(record.date));

                        // Log first few records to see what dates are being processed


                        if (monthlyAggregates[monthKey]) {
                            if (monthlyAggregates[monthKey][stringHotelIdKey]) {
                                if (typeof record.revenue === 'number') {
                                    monthlyAggregates[monthKey][stringHotelIdKey].pms_revenue += record.revenue;
                                }
                                if (typeof record.accommodation_revenue === 'number') {
                                    monthlyAggregates[monthKey][stringHotelIdKey].pms_accommodation_revenue += record.accommodation_revenue;
                                }
                                if (typeof record.other_revenue === 'number') {
                                    monthlyAggregates[monthKey][stringHotelIdKey].pms_other_revenue += record.other_revenue;
                                }
                            }
                            if (monthlyAggregates[monthKey]['0']) {
                                if (typeof record.revenue === 'number') {
                                    monthlyAggregates[monthKey]['0'].pms_revenue += record.revenue;
                                }
                                if (typeof record.accommodation_revenue === 'number') {
                                    monthlyAggregates[monthKey]['0'].pms_accommodation_revenue += record.accommodation_revenue;
                                }
                                if (typeof record.other_revenue === 'number') {
                                    monthlyAggregates[monthKey]['0'].pms_other_revenue += record.other_revenue;
                                }
                            }
                        } else if (index < 3) {

                        }
                    }
                });
            }
        }
    };



    aggregatePmsDataSource(prevYearPmsTotalData.value);
    aggregateDataSource(prevYearAccountingTotalData.value, 'acc_revenue');

    Object.keys(monthlyAggregates).sort().forEach(monthKey => {
        for (const hotelIdStringKeyInMonth in monthlyAggregates[monthKey]) {
            let outputHotelId = hotelIdStringKeyInMonth === '0' ? 0 : hotelIdLookup.get(hotelIdStringKeyInMonth);
            if (outputHotelId === undefined && hotelIdStringKeyInMonth !== '0') {
                const parsed = parseInt(hotelIdStringKeyInMonth, 10);
                outputHotelId = String(parsed) === hotelIdStringKeyInMonth ? parsed : hotelIdStringKeyInMonth;
            }
            const aggregatedMonthData = monthlyAggregates[monthKey][hotelIdStringKeyInMonth];
            const pmsRev = aggregatedMonthData.pms_revenue;
            const pmsAccommodationRev = aggregatedMonthData.pms_accommodation_revenue;
            const pmsOtherRev = aggregatedMonthData.pms_other_revenue;
            const accRev = aggregatedMonthData.acc_revenue;
            const hotelName = searchAllHotels(outputHotelId)[0]?.name || 'Unknown Hotel';

            let periodRev = (accRev !== null) ? accRev : (pmsRev || 0);
            let accommodationRev = (accRev !== null) ? accRev : (pmsAccommodationRev || 0);
            let otherRev = (accRev !== null) ? 0 : (pmsOtherRev || 0);

            // Map previous year month to current year month for easy matching in components
            const [y, m] = monthKey.split('-');
            const currentYearMonth = `${parseInt(y) + 1}-${m}`;

            result.push({
                month: monthKey,
                current_year_month: currentYearMonth,
                hotel_id: outputHotelId,
                hotel_name: hotelName,
                pms_revenue: pmsRev,
                acc_revenue: accRev,
                period_revenue: periodRev,
                accommodation_revenue: accommodationRev,
                other_revenue: otherRev,
            });
        }
    });



    if (selectedView.value?.endsWith('Hotel')) {
        return result.filter(item => item.hotel_id !== 0);
    }
    return result;
});

const revenueData = computed(() => {
    if (!selectedView.value) return [];

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
        const monthKey = formatDateMonth(normalizeDate(currentIterMonth));
        monthlyAggregates[monthKey] = {};
        monthlyAggregates[monthKey]['0'] = { pms_revenue: null, pms_accommodation_revenue: null, pms_other_revenue: null, forecast_revenue: null, acc_revenue: null };
        selectedHotels.value.forEach(hotelId => {
            monthlyAggregates[monthKey][String(hotelId)] = { pms_revenue: null, pms_accommodation_revenue: null, pms_other_revenue: null, forecast_revenue: null, acc_revenue: null };
        });
        currentIterMonth.setMonth(currentIterMonth.getMonth() + 1);
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
            }
        }
    };

    // Aggregate PMS data with separate accommodation and other revenue
    const aggregatePmsDataSource = (sourceDataByHotel) => {
        for (const stringHotelIdKey in sourceDataByHotel) {
            const hotelDataArray = sourceDataByHotel[stringHotelIdKey];
            if (Array.isArray(hotelDataArray)) {
                hotelDataArray.forEach(record => {
                    if (record && record.date) {
                        const monthKey = formatDateMonth(new Date(record.date));
                        if (monthlyAggregates[monthKey]) {
                            if (monthlyAggregates[monthKey][stringHotelIdKey]) {
                                if (typeof record.revenue === 'number') {
                                    monthlyAggregates[monthKey][stringHotelIdKey].pms_revenue += record.revenue;
                                }
                                if (typeof record.accommodation_revenue === 'number') {
                                    monthlyAggregates[monthKey][stringHotelIdKey].pms_accommodation_revenue += record.accommodation_revenue;
                                }
                                if (typeof record.other_revenue === 'number') {
                                    monthlyAggregates[monthKey][stringHotelIdKey].pms_other_revenue += record.other_revenue;
                                }
                            }
                            if (monthlyAggregates[monthKey]['0']) {
                                if (typeof record.revenue === 'number') {
                                    monthlyAggregates[monthKey]['0'].pms_revenue += record.revenue;
                                }
                                if (typeof record.accommodation_revenue === 'number') {
                                    monthlyAggregates[monthKey]['0'].pms_accommodation_revenue += record.accommodation_revenue;
                                }
                                if (typeof record.other_revenue === 'number') {
                                    monthlyAggregates[monthKey]['0'].pms_other_revenue += record.other_revenue;
                                }
                            }
                        }
                    }
                });
            }
        }
    };

    aggregatePmsDataSource(pmsTotalData.value);
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
            const pmsAccommodationRev = aggregatedMonthData.pms_accommodation_revenue;
            const pmsOtherRev = aggregatedMonthData.pms_other_revenue;
            const forecastRev = aggregatedMonthData.forecast_revenue;
            const accRev = aggregatedMonthData.acc_revenue;
            const hotelName = searchAllHotels(outputHotelId)[0]?.name || 'Unknown Hotel';
            // Prioritize accounting revenue if available, otherwise use PMS
            let periodRev = (accRev !== null) ? accRev : (pmsRev || 0);
            let accommodationRev = (accRev !== null) ? accRev : (pmsAccommodationRev || 0);
            let otherRev = (accRev !== null) ? 0 : (pmsOtherRev || 0); // If using accounting, other is 0 since accounting only has accommodation
            result.push({
                month: monthKey, hotel_id: outputHotelId, hotel_name: hotelName,
                pms_revenue: pmsRev, forecast_revenue: forecastRev, acc_revenue: accRev, period_revenue: periodRev,
                accommodation_revenue: accommodationRev, other_revenue: otherRev,
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
    if (!selectedView.value) return [];

    const result = [];
    if (!firstDayofFetch.value || !lastDayofFetch.value || selectedHotels.value.length === 0 || allHotels.value.length === 0) {
        return result;
    }
    const monthlyOccupancyAggregates = {};
    let currentIterMonth = new Date(firstDayofFetch.value);
    const lastIterMonthDate = new Date(lastDayofFetch.value);
    while (currentIterMonth <= lastIterMonthDate) {
        const iterDateForMonthKey = normalizeDate(currentIterMonth);
        const monthKey = formatDateMonth(iterDateForMonthKey);
        monthlyOccupancyAggregates[monthKey] = {};
        monthlyOccupancyAggregates[monthKey]['0'] = { total_rooms: 0, sold_rooms: 0, non_accommodation_stays: 0, roomDifferenceSum: 0, fc_total_rooms: 0, fc_sold_rooms: 0 };
        const year = iterDateForMonthKey.getFullYear();
        const monthIndex = iterDateForMonthKey.getMonth();
        const daysInCalendarMonth = getDaysInMonth(year, monthIndex + 1);
        const firstDayOfCurrentProcessingMonth = normalizeDate(new Date(year, monthIndex, 1));
        const lastDayOfCurrentProcessingMonth = normalizeDate(new Date(year, monthIndex, daysInCalendarMonth));

        if (!firstDayOfCurrentProcessingMonth || !lastDayOfCurrentProcessingMonth) {
            const currentMonthLoop = currentIterMonth.getMonth();
            currentIterMonth.setMonth(currentMonthLoop + 1);
            if (currentIterMonth.getMonth() === (currentMonthLoop + 2) % 12) {
                currentIterMonth.setDate(0);
                currentIterMonth.setMonth(currentIterMonth.getMonth() + 2);
            }
            currentIterMonth.setDate(1);
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
                    else if (openDate > firstDayOfCurrentProcessingMonth) effectiveDaysForHotelInMonth = lastDayOfCurrentProcessingMonth.getDate() - openDate.getDate() + 1;
                }
            }
            effectiveDaysForHotelInMonth = Math.max(0, effectiveDaysForHotelInMonth);
            const monthlyAvailableRoomDays = physicalRooms * effectiveDaysForHotelInMonth;
            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey]['0']) {
                monthlyOccupancyAggregates[monthKey]['0'].total_rooms += monthlyAvailableRoomDays;
            }
            monthlyOccupancyAggregates[monthKey][String(hotelId)] = { total_rooms: monthlyAvailableRoomDays, sold_rooms: 0, non_accommodation_stays: 0, roomDifferenceSum: 0, fc_total_rooms: 0, fc_sold_rooms: 0 };
        });
        currentIterMonth.setMonth(currentIterMonth.getMonth() + 1);
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
                        if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey][stringHotelIdKey] && typeof record.non_accommodation_stays === 'number') {
                            monthlyOccupancyAggregates[monthKey][stringHotelIdKey].non_accommodation_stays += record.non_accommodation_stays;
                        }
                        if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey]['0'] && typeof record.non_accommodation_stays === 'number') {
                            monthlyOccupancyAggregates[monthKey]['0'].non_accommodation_stays += record.non_accommodation_stays;
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
        // console.log('[DEBUG] Processing forecastTotalData:', forecastTotalData.value);
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
        let totalGrossRoomsSum = 0;

        // First, calculate total_available_rooms_for_month_calc for each individual hotel
        for (const hotelId in monthData) {
            if (hotelId === '0') continue;

            const hotelData = monthData[hotelId];
            let total_available_rooms_for_month_calc = 0;
            let total_gross_rooms_for_month_calc = 0;
            const fallbackCapacityForHotel = pmsFallbackCapacities.value[hotelId] || 0;
            const dailyRealRoomsMap = new Map();
            const dailyGrossRoomsMap = new Map();
            const hotelPmsDataForMonth = (pmsTotalData.value[hotelId] || []).filter(
                pmsRecord => pmsRecord.date.startsWith(monthKey)
            );

            hotelPmsDataForMonth.forEach(pmsRecord => {
                if (Object.prototype.hasOwnProperty.call(pmsRecord, 'total_rooms_real') && pmsRecord.total_rooms_real !== null) {
                    const realRooms = parseInt(pmsRecord.total_rooms_real, 10);
                    if (!isNaN(realRooms)) {
                        dailyRealRoomsMap.set(pmsRecord.date, realRooms);
                    }
                }
                if (Object.prototype.hasOwnProperty.call(pmsRecord, 'total_rooms') && pmsRecord.total_rooms !== null) {
                    const grossRooms = parseInt(pmsRecord.total_rooms, 10);
                    if (!isNaN(grossRooms)) {
                        dailyGrossRoomsMap.set(pmsRecord.date, grossRooms);
                    }
                }
            });

            const [yearStr, monthStr] = monthKey.split('-');
            const year = parseInt(yearStr, 10);
            const monthJS = parseInt(monthStr, 10) - 1;
            const daysInCurrentMonth = getDaysInMonth(year, monthJS + 1);

            for (let day = 1; day <= daysInCurrentMonth; day++) {
                const dateForDay = new Date(year, monthJS, day);
                const currentDateStr = formatDateToYMD(dateForDay);

                total_available_rooms_for_month_calc += dailyRealRoomsMap.has(currentDateStr) ? dailyRealRoomsMap.get(currentDateStr) : fallbackCapacityForHotel;
                total_gross_rooms_for_month_calc += dailyGrossRoomsMap.has(currentDateStr) ? dailyGrossRoomsMap.get(currentDateStr) : fallbackCapacityForHotel;
            }

            hotelData.total_available_rooms_for_month_calc = total_available_rooms_for_month_calc;
            hotelData.total_gross_rooms_for_month_calc = total_gross_rooms_for_month_calc;

            totalRoomsSum += total_available_rooms_for_month_calc;
            totalGrossRoomsSum += total_gross_rooms_for_month_calc;
        }

        // Assign the sum to the '0' hotel entry
        if (monthData['0']) {
            monthData['0'].total_available_rooms_for_month_calc = totalRoomsSum;
            monthData['0'].total_gross_rooms_for_month_calc = totalGrossRoomsSum;
        }

        // Now, create the result array for the month
        for (const hotelId in monthData) {
            const data = monthData[hotelId];
            const total_rooms = data.total_available_rooms_for_month_calc || 0;
            const total_gross_rooms = data.total_gross_rooms_for_month_calc || 0;
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
                        net_total_rooms: total_rooms,
                        gross_total_rooms: total_gross_rooms,
                        sold_rooms: data.sold_rooms,
                        non_accommodation_stays: data.non_accommodation_stays,
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



const prevYearOccupancyData = computed(() => {
    if (!selectedView.value) return [];

    const result = [];
    if (!firstDayofFetch.value || !lastDayofFetch.value || selectedHotels.value.length === 0 || allHotels.value.length === 0) {
        return result;
    }

    const monthlyOccupancyAggregates = {};
    let currentIterMonth = new Date(firstDayofFetch.value);
    currentIterMonth.setFullYear(currentIterMonth.getFullYear() - 1);
    const lastIterMonthDate = new Date(lastDayofFetch.value);
    lastIterMonthDate.setFullYear(lastIterMonthDate.getFullYear() - 1);

    while (currentIterMonth <= lastIterMonthDate) {
        const iterDateForMonthKey = normalizeDate(currentIterMonth);
        const monthKey = formatDateMonth(iterDateForMonthKey);
        monthlyOccupancyAggregates[monthKey] = {};
        monthlyOccupancyAggregates[monthKey]['0'] = { total_rooms: 0, sold_rooms: 0, non_accommodation_stays: 0, roomDifferenceSum: 0, fc_total_rooms: 0, fc_sold_rooms: 0 };
        const year = iterDateForMonthKey.getFullYear();
        const monthIndex = iterDateForMonthKey.getMonth();
        const daysInCalendarMonth = getDaysInMonth(year, monthIndex + 1);
        const firstDayOfCurrentProcessingMonth = normalizeDate(new Date(year, monthIndex, 1));
        const lastDayOfCurrentProcessingMonth = normalizeDate(new Date(year, monthIndex, daysInCalendarMonth));

        if (!firstDayOfCurrentProcessingMonth || !lastDayOfCurrentProcessingMonth) {
            const currentMonthLoop = currentIterMonth.getMonth();
            currentIterMonth.setMonth(currentMonthLoop + 1);
            if (currentIterMonth.getMonth() === (currentMonthLoop + 2) % 12) {
                currentIterMonth.setDate(0);
                currentIterMonth.setMonth(currentIterMonth.getMonth() + 2);
            }
            currentIterMonth.setDate(1);
            continue;
        }

        selectedHotels.value.forEach(hotelId => {
            const hotelInfo = allHotels.value.find(h => String(h.id) === String(hotelId));
            let physicalRooms = (hotelInfo && typeof hotelInfo.total_rooms === 'number') ? hotelInfo.total_rooms : 0;
            let effectiveDaysForHotelInMonth = daysInCalendarMonth;
            if (hotelInfo && hotelInfo.open_date) {
                const openDate = normalizeDate(new Date(hotelInfo.open_date));
                if (openDate && !isNaN(openDate.getTime())) {
                    // Adjust openDate to previous year
                    const prevYearOpenDate = new Date(openDate);
                    prevYearOpenDate.setFullYear(prevYearOpenDate.getFullYear() - 1);

                    if (prevYearOpenDate > lastDayOfCurrentProcessingMonth) effectiveDaysForHotelInMonth = 0;
                    else if (prevYearOpenDate > firstDayOfCurrentProcessingMonth) effectiveDaysForHotelInMonth = lastDayOfCurrentProcessingMonth.getDate() - prevYearOpenDate.getDate() + 1;
                }
            }
            effectiveDaysForHotelInMonth = Math.max(0, effectiveDaysForHotelInMonth);
            const monthlyAvailableRoomDays = physicalRooms * effectiveDaysForHotelInMonth;
            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey]['0']) {
                monthlyOccupancyAggregates[monthKey]['0'].total_rooms += monthlyAvailableRoomDays;
            }
            monthlyOccupancyAggregates[monthKey][String(hotelId)] = { total_rooms: monthlyAvailableRoomDays, sold_rooms: 0, non_accommodation_stays: 0, roomDifferenceSum: 0, fc_total_rooms: 0, fc_sold_rooms: 0 };
        });
        currentIterMonth.setMonth(currentIterMonth.getMonth() + 1);
    }

    if (prevYearPmsTotalData.value) {
        for (const stringHotelIdKey in prevYearPmsTotalData.value) {
            const pmsRecords = prevYearPmsTotalData.value[stringHotelIdKey];
            if (Array.isArray(pmsRecords)) {
                pmsRecords.forEach(record => {
                    const recordDateObj = normalizeDate(new Date(record.date));
                    if (!recordDateObj) return; const monthKey = formatDateMonth(recordDateObj);
                    if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey][stringHotelIdKey]) {
                        if (record.room_count !== undefined) {
                            const val = Number(record.room_count) || 0;
                            monthlyOccupancyAggregates[monthKey][stringHotelIdKey].sold_rooms += val;
                            if (monthlyOccupancyAggregates[monthKey]['0']) monthlyOccupancyAggregates[monthKey]['0'].sold_rooms += val;
                        }
                    }
                });
            }
        }
    }

    Object.keys(monthlyOccupancyAggregates).sort().forEach(monthKey => {
        const monthData = monthlyOccupancyAggregates[monthKey];
        for (const hotelId in monthData) {
            const data = monthData[hotelId];
            const total_rooms = data.total_rooms || 0;
            const occupancyRate = total_rooms > 0 ? (data.sold_rooms / total_rooms) * 100 : 0;

            let outputHotelId = hotelId === '0' ? 0 : parseInt(hotelId, 10);
            const hotelName = searchAllHotels(outputHotelId)[0]?.name || 'Unknown Hotel';

            // Shift monthKey by 1 year to match current year view alignment if needed?
            // Usually we return the ACTUAL date, and the component matches it.
            // But wait, the component might expect this data to correspond to the CURRENT view's month
            // for easy matching in array lookups?
            // Actually, ReportingSingleMonthAllHotels looks up by `hotel_id===0`.
            // And it likely just takes the first element if it's a single month view.
            // If `period='month'`, result has 1 entry.
            // If `period='year'`, result has 12 entries.

            result.push({
                month: monthKey,
                hotel_id: outputHotelId, hotel_name: hotelName,
                sold_rooms: data.sold_rooms,
                total_rooms: total_rooms,
                occ: parseFloat(occupancyRate.toFixed(2))
            });
        }
    });

    if (selectedView.value?.endsWith('Hotel')) {
        return result.filter(item => item.hotel_id !== 0);
    }
    return result;
});


// fetchActiveReservationsChange logic
// ...



const fetchData = async () => {
    if (!isInitialized.value) {
        return;
    }

    // Clear previous errors at the start of a new fetch operation
    dataErrors.value = {};

    const newPmsTotalData = {};
    const newForecastTotalData = {};
    const newAccountingTotalData = {};

    if (selectedHotels.value.length === 0) {
        loading.value = false;
        // ... clear all
        return;
    }
    if (!firstDayofFetch.value || !lastDayofFetch.value) {
        loading.value = false;
        return;
    }
    loading.value = true;
    dayOverDayChange.value = { rooms: 0, occ: 0, sales: 0 }; // Reset
    let currentProcessingHotelId = null;

    // Dates for Current Year
    const yearOfSelectedDate = selectedDate.value.getFullYear();
    // For monthly reports, PMS should use the same date range as forecast/accounting
    // For yearly reports, PMS should start from Jan 1st for full year context
    const pmsFetchStartDate = period.value === 'year'
        ? formatDateToYMD(new Date(yearOfSelectedDate, 0, 1))
        : formatDateToYMD(firstDayofFetch.value);
    const pmsFetchEndDate = formatDateToYMD(lastDayofFetch.value);
    const startDateFormatted = formatDateToYMD(firstDayofFetch.value);
    const endDateFormatted = formatDateToYMD(lastDayofFetch.value);
    const forecastAndAccountingStartDate = formatDateToYMD(firstDayofFetch.value);
    const forecastAndAccountingEndDate = formatDateToYMD(lastDayofFetch.value);

    // Dates for Previous Year
    const prevYearStart = new Date(firstDayofFetch.value);
    prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
    const prevYearEnd = new Date(lastDayofFetch.value);
    prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1);



    // For PMS Prev Year, we might need full year context if we do YTD? 
    // Usually 'Previous Year Same Month' implies comparing Nov 2022 to Nov 2023.
    // If we view 'Cumulative', we need Prev Year Cumulative.
    // period='year' means Jan-Dec. So PmsFetchStartDate equivalent for prev year is Jan 1, PrevYear.
    const prevYearOfSelectedDate = yearOfSelectedDate - 1;
    // For monthly reports, previous year PMS should use the same date range as current year
    // For yearly reports, previous year PMS should start from Jan 1st for full year context
    const prevPmsFetchStartDate = period.value === 'year'
        ? formatDateToYMD(new Date(prevYearOfSelectedDate, 0, 1))
        : formatDateToYMD(prevYearStart);
    const prevPmsFetchEndDate = formatDateToYMD(prevYearEnd);
    const prevStartDateFormatted = formatDateToYMD(prevYearStart);
    const prevEndDateFormatted = formatDateToYMD(prevYearEnd);

    // Log the date calculations for debugging


    pmsFallbackCapacities.value = {};

    try {
        const [
            batchPmsData, batchForecastData, batchAccountingData, batchOccupationBreakdownData,
            batchPrevPmsData, batchPrevAccountingData, batchPrevOccupationBreakdownData
        ] = await Promise.all([
            // Current Year
            fetchBatchCountReservation(selectedHotels.value, pmsFetchStartDate, pmsFetchEndDate),
            fetchBatchForecastData(selectedHotels.value, forecastAndAccountingStartDate, forecastAndAccountingEndDate),
            fetchBatchAccountingData(selectedHotels.value, forecastAndAccountingStartDate, forecastAndAccountingEndDate),
            fetchBatchOccupationBreakdown(selectedHotels.value, startDateFormatted, endDateFormatted),

            // Previous Year
            fetchBatchCountReservation(selectedHotels.value, prevPmsFetchStartDate, prevPmsFetchEndDate),
            // User requested no prev year forecast fetch
            fetchBatchAccountingData(selectedHotels.value, prevStartDateFormatted, prevEndDateFormatted),
            fetchBatchOccupationBreakdown(selectedHotels.value, prevStartDateFormatted, prevEndDateFormatted)
        ]);



        // Log sample of previous year data to see what dates are actually returned


        // Process Current Year Data (Existing logic...)
        // ... (Keep existing logic for newPmsTotalData etc)

        // Process Prev Year Data
        let prevBreakdownItems = [];
        for (const hotelIdKey in batchPrevOccupationBreakdownData) {
            const hotelOccupationData = batchPrevOccupationBreakdownData[hotelIdKey];
            if (Array.isArray(hotelOccupationData)) prevBreakdownItems = prevBreakdownItems.concat(hotelOccupationData);
        }
        prevYearOccupationBreakdownAllHotels.value = prevBreakdownItems;

        const newPrevPmsData = {};
        const newPrevForecastData = {};
        const newPrevAccountingData = {};

        for (const hotelId of selectedHotels.value) {
            const hKey = String(hotelId);
            // Prev PMS
            const rawPrevPms = batchPrevPmsData[hKey] || [];
            if (Array.isArray(rawPrevPms)) {
                newPrevPmsData[hKey] = rawPrevPms.map(item => ({
                    date: formatDateToYMD(item.date),
                    revenue: item.price !== undefined ? Number(item.price) : 0,
                    accommodation_revenue: item.accommodation_price !== undefined ? Number(item.accommodation_price) : 0,
                    other_revenue: item.other_price !== undefined ? Number(item.other_price) : 0,
                    room_count: item.room_count !== undefined ? Number(item.room_count) : 0,
                    non_accommodation_stays: item.non_accommodation_stays !== undefined ? Number(item.non_accommodation_stays) : 0,
                    total_rooms: item.total_rooms !== undefined ? Number(item.total_rooms) : 0,
                    total_rooms_real: item.total_rooms_real !== undefined ? Number(item.total_rooms_real) : 0,
                })).filter(item => item.date !== null);
            } else newPrevPmsData[hKey] = [];

            // Prev Forecast/Accounting... (simplified)
            // ...
            newPrevForecastData[hKey] = []; // No prev year forecast

            // Prev Accounting
            const rawPrevAccounting = batchPrevAccountingData[hKey] || [];
            if (Array.isArray(rawPrevAccounting)) {
                newPrevAccountingData[hKey] = rawPrevAccounting.map(item => ({
                    date: formatDateToYMD(item.accounting_month),
                    revenue: item.accommodation_revenue !== undefined ? Number(item.accommodation_revenue) : 0,
                })).filter(item => item.date !== null);
            } else {
                newPrevAccountingData[hKey] = [];
            }
        }
        prevYearPmsTotalData.value = newPrevPmsData;
        prevYearForecastTotalData.value = newPrevForecastData;
        prevYearAccountingTotalData.value = newPrevAccountingData;


        // Day-over-Day Change Fetch (Only if Single Hotel & period='month')
        if (selectedHotels.value.length === 1 && period.value === 'month') {
            try {
                const latestDateStrRaw = await fetchLatestDailyReportDate();
                if (latestDateStrRaw) {
                    const latestDate = new Date(latestDateStrRaw);
                    const latestDateStr = formatDateToYMD(latestDate);

                    // Find previous date (Assume previous day for now as finding sorted list is expensive without available-dates)
                    // Or since we only need DoD for one hotel, we can just fetch the daily report for the previous calendar day.
                    // If no report exists, it's 0 or null.
                    const previousDate = new Date(latestDate);
                    previousDate.setDate(previousDate.getDate() - 1);
                    const previousDateStr = formatDateToYMD(previousDate);

                    const [latestData, previousData] = await Promise.all([
                        fetchDailyReportData(latestDateStr),
                        fetchDailyReportData(previousDateStr)
                    ]);

                    // Filter for the TARGET month (selectedDate) and Hotel
                    const targetMonthStr = formatDateMonth(selectedDate.value); // YYYY-MM
                    const targetHotelId = selectedHotels.value[0];

                    const findRecord = (data) => {
                        if (!Array.isArray(data)) return null;
                        return data.find(item =>
                            String(item.hotel_id) === String(targetHotelId) &&
                            formatDateMonth(new Date(item.month)) === targetMonthStr
                        );
                    };

                    const latestRecord = findRecord(latestData);
                    const previousRecord = findRecord(previousData);

                    if (latestRecord && previousRecord) {
                        const roomChange = (latestRecord.confirmed_stays || 0) - (previousRecord.confirmed_stays || 0);
                        const salesChange = (latestRecord.total_sales || 0) - (previousRecord.total_sales || 0);

                        const latestOcc = (latestRecord.total_rooms > 0) ? (latestRecord.confirmed_stays / latestRecord.total_rooms) : 0;
                        const previousOcc = (previousRecord.total_rooms > 0) ? (previousRecord.confirmed_stays / previousRecord.total_rooms) : 0;
                        const occChange = latestOcc - previousOcc;

                        dayOverDayChange.value = { rooms: roomChange, occ: occChange, sales: salesChange };
                    }
                }
            } catch (e) {
                console.error('DoD Change fetch failed', e);
            }
        }

        // Future Outlook Fetch (For Single Month All Hotels or Single Hotel)
        if (selectedView.value === 'singleMonthAllHotels' || selectedView.value === 'singleMonthHotel') {
            futureOutlookData.value = [];
            try {
                const hotelIds = selectedHotels.value.filter(id => id !== 0);
                if (hotelIds.length > 0) {
                    const latestDateStrRaw = await fetchLatestDailyReportDate();
                    let targetDate = latestDateStrRaw;
                    const todayDateString = formatDateToYMD(new Date());

                    // If the latest report date is today, shift back one day to compare against the last full day
                    if (targetDate === todayDateString) {
                        const d = new Date(targetDate);
                        d.setDate(d.getDate() - 1);
                        targetDate = formatDateToYMD(d);
                    }
                    comparisonDate.value = targetDate;

                    // Use fetchDailyReportDataByHotel for optimized aggregated data
                    const [futureData, prevDayData] = await Promise.all([
                        fetchBatchFutureOutlook(hotelIds, formatDateToYMD(firstDayofFetch.value)),
                        targetDate ? fetchDailyReportDataByHotel(targetDate, hotelIds) : Promise.resolve([])
                    ]);

                    const prevByMonth = {};
                    if (Array.isArray(prevDayData)) {
                        prevDayData.forEach(item => {
                            // Backend already filters by hotelIds and aggregates data
                            const mk = formatDateMonth(new Date(item.month));
                            if (!prevByMonth[mk]) prevByMonth[mk] = { sales: 0, stays: 0, rooms: 0 };

                            const dailySales = (Number(item.accommodation_net_sales) || 0) + (Number(item.other_net_sales) || 0) + (Number(item.accommodation_net_sales_cancelled) || 0) + (Number(item.other_net_sales_cancelled) || 0);
                            //console.log(`[DEBUG] Previous data for ${mk}:`, {
                            //    accommodation_net_sales: item.accommodation_net_sales,
                            //    other_net_sales: item.other_net_sales,
                            //    accommodation_net_sales_cancelled: item.accommodation_net_sales_cancelled,
                            //    other_net_sales_cancelled: item.other_net_sales_cancelled,
                            //    dailySales: dailySales,
                            //    accommodation_sales: item.accommodation_sales, // For comparison
                            //    other_sales: item.other_sales // For comparison
                            //});
                            prevByMonth[mk].sales += dailySales;
                            prevByMonth[mk].stays += Number(item.confirmed_stays) || 0;
                        });
                    }
                    //console.log('[DEBUG] Aggregated prevByMonth:', prevByMonth);

                    const outlook = [];
                    for (const [monthLabel, hotelDataMap] of Object.entries(futureData)) {
                        let totalActualSales = 0, totalForecastSales = 0, totalForecastRooms = 0, totalForecastStays = 0;

                        let accommodationConfirmedNights = 0;
                        let accommodationBookableRoomNights = 0;
                        let accommodationBlockedNights = 0;
                        let accommodationNetAvailableRoomNights = 0;

                        for (const [hotelId, data] of Object.entries(hotelDataMap)) {
                            if (Array.isArray(data.occupation)) {
                                let hotelBookable = 0;
                                let hotelNetAvailable = 0;

                                data.occupation.forEach(row => {
                                    // Capture hotel capacity once per hotel (it's repeated on every row)
                                    if (hotelBookable === 0 && row.total_bookable_room_nights) {
                                        hotelBookable = Number(row.total_bookable_room_nights) || 0;
                                        hotelNetAvailable = Number(row.net_available_room_nights) || 0;
                                    }

                                    if (row.sales_category === 'accommodation') {
                                        accommodationConfirmedNights += Number(row.confirmed_nights) || 0;
                                        accommodationBlockedNights += Number(row.blocked_nights) || 0;
                                    }
                                });

                                accommodationBookableRoomNights += hotelBookable;
                                accommodationNetAvailableRoomNights += hotelNetAvailable;
                            }
                            if (Array.isArray(data.forecast)) { data.forecast.forEach(f => { totalForecastSales += Number(f.accommodation_revenue) || 0; totalForecastRooms += Number(f.available_room_nights) || 0; totalForecastStays += Number(f.rooms_sold_nights) || 0; }); }

                            let hotelActualSales = 0;
                            let hasAccounting = false;

                            if (Array.isArray(data.accounting) && data.accounting.length > 0) {
                                let accSum = 0;
                                data.accounting.forEach(a => { accSum += Number(a.accommodation_revenue) || 0; });
                                if (accSum > 0) {
                                    hotelActualSales = accSum;
                                    hasAccounting = true;
                                    //console.log(`[DEBUG] Hotel ${hotelId} using accounting data:`, { accSum, hotelActualSales });
                                }
                            }

                            if (!hasAccounting) {
                                // Fallback to PMS. Note: Backend now aggregates into `pms` key.
                                if (data.pms && typeof data.pms.revenue === 'number') {
                                    hotelActualSales = data.pms.revenue;
                                    //console.log(`[DEBUG] Hotel ${hotelId} using PMS data:`, { pmsRevenue: data.pms.revenue, hotelActualSales });
                                }
                            }

                            totalActualSales += hotelActualSales;
                        }
                        const actualOccAccommodation = accommodationNetAvailableRoomNights > 0 ? (accommodationConfirmedNights / accommodationNetAvailableRoomNights) * 100 : 0;
                        const forecastOcc = totalForecastRooms > 0 ? (totalForecastStays / totalForecastRooms) * 100 : 0; // This remains general forecast

                        const hasPrevData = !!prevByMonth[monthLabel];
                        const prev = prevByMonth[monthLabel] || { sales: 0, stays: 0, rooms: 0 };

                        // prevOcc is not specific to accommodation here, as prevByMonth doesn't have sales_category breakdown.
                        const prevOcc = accommodationNetAvailableRoomNights > 0 ? (prev.stays / accommodationNetAvailableRoomNights) * 100 : 0;

                        const salesDiff = hasPrevData ? totalActualSales - prev.sales : null;
                        //console.log(`[DEBUG] Sales comparison for ${monthLabel}:`, {
                        //    totalActualSales,
                        //    prevSales: prev.sales,
                        //    salesDiff,
                        //    hasPrevData
                        //});

                        outlook.push({
                            metric_date: targetDate, // Added for export
                            month: monthLabel,
                            forecast_sales: totalForecastSales,
                            sales: totalActualSales,
                            sales_diff: salesDiff,
                            prev_sales: prev.sales, // Added for hidden column
                            forecast_occ: forecastOcc,
                            occ: actualOccAccommodation, // This is now accommodation specific
                            occ_diff: hasPrevData ? actualOccAccommodation - prevOcc : null, // Diff also accommodation specific
                            prev_occ: prevOcc, // This is now accommodation specific
                            prev_confirmed_stays: prev.stays, // Added for hidden column
                            confirmed_nights: accommodationConfirmedNights,
                            total_bookable_room_nights: accommodationBookableRoomNights,
                            blocked_nights: accommodationBlockedNights,
                            net_available_room_nights: accommodationNetAvailableRoomNights
                        });
                    }
                    outlook.sort((a, b) => a.month.localeCompare(b.month));
                    futureOutlookData.value = outlook;
                }
            } catch (e) {
                console.error('Future Outlook fetch failed', e);
            }
        }

        let allBreakdownItems = [];
        for (const hotelIdKey in batchOccupationBreakdownData) {
            const hotelOccupationData = batchOccupationBreakdownData[hotelIdKey];
            if (Array.isArray(hotelOccupationData)) {
                allBreakdownItems = allBreakdownItems.concat(hotelOccupationData);
            } else if (hotelOccupationData && typeof hotelOccupationData === 'object' && hotelOccupationData.error) {
                allBreakdownItems.push(hotelOccupationData);
            }
        }
        occupationBreakdownAllHotels.value = allBreakdownItems;

        for (const hotelId of selectedHotels.value) {
            currentProcessingHotelId = hotelId;

            // Process PMS Data
            const rawPmsData = batchPmsData[String(hotelId)] || [];
            // ... (keep logic)
            if (Array.isArray(rawPmsData)) {
                if (rawPmsData.length > 0 && rawPmsData[0].total_rooms !== undefined) {
                    pmsFallbackCapacities.value[String(hotelId)] = Number(rawPmsData[0].total_rooms || 0);
                } else {
                    pmsFallbackCapacities.value[String(hotelId)] = 0; // Default if no data or no total_rooms
                }

                const mappedData = rawPmsData.map(item => ({
                    date: formatDateToYMD(item.date),
                    revenue: item.price !== undefined ? Number(item.price) : 0,
                    accommodation_revenue: item.accommodation_price !== undefined ? Number(item.accommodation_price) : 0,
                    other_revenue: item.other_price !== undefined ? Number(item.other_price) : 0,
                    room_count: item.room_count !== undefined ? Number(item.room_count) : 0,
                    non_accommodation_stays: item.non_accommodation_stays !== undefined ? Number(item.non_accommodation_stays) : 0,
                    total_rooms: item.total_rooms !== undefined ? Number(item.total_rooms) : 0,
                    total_rooms_real: item.total_rooms_real !== undefined ? Number(item.total_rooms_real) : 0,
                })).filter(item => item.date !== null);
                newPmsTotalData[String(hotelId)] = mappedData;
            } else {
                newPmsTotalData[String(hotelId)] = [];
                pmsFallbackCapacities.value[String(hotelId)] = 0;
            }

            // Process Forecast Data
            const rawForecastData = batchForecastData[String(hotelId)] || [];
            if (Array.isArray(rawForecastData)) {
                newForecastTotalData[String(hotelId)] = rawForecastData.map(item => ({
                    date: formatDateToYMD(item.forecast_month),
                    revenue: item.accommodation_revenue !== undefined ? Number(item.accommodation_revenue) : 0,
                    total_rooms: item.available_room_nights !== undefined ? Number(item.available_room_nights) : 0,
                    room_count: item.rooms_sold_nights !== undefined ? Number(item.rooms_sold_nights) : 0,
                })).filter(item => item.date !== null);
            } else {
                newForecastTotalData[String(hotelId)] = [];
            }

            // Process Accounting Data
            const rawAccountingData = batchAccountingData[String(hotelId)] || [];
            if (Array.isArray(rawAccountingData)) {
                newAccountingTotalData[String(hotelId)] = rawAccountingData.map(item => ({
                    date: formatDateToYMD(item.accounting_month),
                    revenue: item.accommodation_revenue !== undefined ? Number(item.accommodation_revenue) : 0,
                })).filter(item => item.date !== null);
            } else {
                newAccountingTotalData[String(hotelId)] = [];
            }
        }
        currentProcessingHotelId = null;
        pmsTotalData.value = newPmsTotalData;
        forecastTotalData.value = newForecastTotalData;
        accountingTotalData.value = newAccountingTotalData;
    } catch (error) {
        console.error(`RMP: Error during summary data fetching (hotel ID ${currentProcessingHotelId || 'N/A'} may have failed):`, error);
        if (currentProcessingHotelId) {
            const hotelKey = String(currentProcessingHotelId);
            // Ensure error is recorded in a separate error store to maintain array type consistency of data refs
            dataErrors.value[hotelKey] = { message: error.message || 'Failed to load data', details: error };
            // Clear or ensure data refs are empty arrays for the affected hotelKey to prevent downstream issues
            if (!pmsTotalData.value[hotelKey]) pmsTotalData.value[hotelKey] = [];
            if (!forecastTotalData.value[hotelKey]) forecastTotalData.value[hotelKey] = [];
            if (!accountingTotalData.value[hotelKey]) accountingTotalData.value[hotelKey] = [];
        }
    } finally {
        loading.value = false;
    }
};

// Debounce timer
let fetchTimeout = null;

const debouncedFetch = () => {
    if (fetchTimeout) clearTimeout(fetchTimeout);
    fetchTimeout = setTimeout(() => {
        reportTriggerKey.value = Date.now();
        fetchData();
    }, 50);
};

// React to prop changes
watch([selectedDate, period, selectedHotels], () => {
    if (props.reportType === 'monthlySummary') {
        debouncedFetch();
    }
});

const searchAllHotels = (hotelId) => {
    if (!allHotels.value || allHotels.value.length === 0) {
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
    isInitialized.value = true;
    if (props.reportType === 'monthlySummary') {
        fetchData();
    }
});
</script>
