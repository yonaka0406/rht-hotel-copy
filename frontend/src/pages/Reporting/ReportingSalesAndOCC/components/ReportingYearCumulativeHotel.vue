<template>
    <div>
        <div class="flex justify-end mb-2 items-center gap-2">

            <SelectButton v-model="selectedComparison" :options="comparisonOptions" optionLabel="label"
                optionValue="value" />
            <SelectButton v-model="selectedView" :options="viewOptions" optionLabel="label" optionValue="value"
                class="ml-2" />
        </div>

        <div v-if="selectedView === 'graph'">
            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">主要KPI（{{ currentHotelName }}）</span>
                </template>
                <template #content>
                    <KpiSummaryCards :actualADR="actualADR" :forecastADR="forecastADR" :ADRDifference="ADRDifference"
                        :actualRevPAR="actualRevPAR" :revPARDifference="revPARDifference"
                        :forecastRevPAR="forecastRevPAR" :formatCurrency="formatCurrency" variant="cards" />
                </template>
                <template #footer>
                    <div class="flex justify-content-between">
                        <small>会計データがない場合はPMSの数値になっています。期間： {{ periodMinDate }}～{{ periodMaxDate }}。</small>
                    </div>
                </template>
            </Card>

            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">収益（計画ｘ実績・予約）- {{ currentHotelName }}</span>
                </template>
                <template #content>
                    <div v-if="!currentHotelRevenueData || currentHotelRevenueData.length === 0"
                        class="text-center p-4">
                        データはありません。
                    </div>
                    <div v-else class="flex flex-col md:flex-row md:gap-4 p-4">
                        <div class="w-full md:w-3/4 mb-4 md:mb-0">
                            <MonthlyRevenuePlanVsActualChart :revenueData="currentHotelRevenueData"
                                :prevYearRevenueData="currentHotelPrevYearRevenueData"
                                :comparisonType="selectedComparison" height="450px" />
                        </div>
                        <div class="w-full md:w-1/4">
                            <RevenuePlanVsActualChart :revenueData="aggregateRevenueDataForChart" height="450px" />
                        </div>
                    </div>
                </template>
                <template #footer>
                    <div class="flex justify-content-between">
                        <small>会計データがない場合はPMSの数値になっています。施設： {{ currentHotelName }}</small>
                    </div>
                </template>
            </Card>

            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">稼働率（計画ｘ実績・予約）- {{ currentHotelName }}</span>
                </template>
                <template #content>
                    <div v-if="!currentHotelOccupancyData || currentHotelOccupancyData.length === 0"
                        class="text-center p-4">
                        データはありません。
                    </div>
                    <div v-else class="flex flex-col md:flex-row md:gap-4 p-4">
                        <div class="w-full md:w-3/4 mb-4 md:mb-0">
                            <MonthlyOccupancyChart :occupancyData="currentHotelOccupancyData"
                                :prevYearOccupancyData="currentHotelPrevYearOccupancyData"
                                :comparisonType="selectedComparison" :title="currentHotelName" height="450px" />
                        </div>
                        <div class="w-full md:w-1/4">
                            <OccupancyGaugeChart :occupancyData="aggregatedCurrentHotelOccupancy" height="450px" />
                        </div>
                    </div>
                </template>
            </Card>

        </div>

        <div v-if="selectedView === 'table'">
            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">主要KPI（{{ currentHotelName }}）</span>
                </template>
                <template #content>
                    <KpiSummaryCards :actualADR="actualADR" :forecastADR="forecastADR" :ADRDifference="ADRDifference"
                        :actualRevPAR="actualRevPAR" :revPARDifference="revPARDifference"
                        :forecastRevPAR="forecastRevPAR" :formatCurrency="formatCurrency" variant="grid" />
                </template>
                <template #footer>
                    <div class="flex justify-content-between">
                        <small>会計データがない場合はPMSの数値になっています。期間： {{ periodMinDate }}～{{ periodMaxDate }}。</small>
                    </div>
                </template>
            </Card>

            <RevenuePlanVsActualTable :revenueData="currentHotelRevenueData" />

            <Card>
                <template #header>
                    <span class="text-xl font-bold">稼働状況（計画ｘ実績・予約）- {{ currentHotelName }}</span>
                </template>
                <template #content>
                    <OccupancyPlanVsActualTable :occupancyData="currentHotelOccupancyData"
                        :rawOccupationBreakdownData="props.rawOccupationBreakdownData" :showHotelColumn="false"
                        :showNonAccommodationColumn="false" :showDetailedCsvButton="true" :rows="12"
                        :rowsPerPageOptions="[12, 24, 36, 48]" />
                </template>
            </Card>
        </div>
    </div>
</template>
<script setup>
// Vue
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef, nextTick } from 'vue';

// Props
const props = defineProps({
    revenueData: {
        type: Array,
        required: true
    },
    occupancyData: {
        type: Array,
        required: true
    },
    rawOccupationBreakdownData: {
        type: Array,
        default: () => []
    },
    prevYearRevenueData: {
        type: Array,
        default: () => []
    },
    prevYearOccupancyData: {
        type: Array,
        default: () => []
    },
    selectedMonth: {
        type: Date,
        default: null
    }
});

// Primevue
import { Card, Badge, SelectButton, Button, DataTable, Column, Select } from 'primevue';
import OccupancyPlanVsActualTable from './tables/OccupancyPlanVsActualTable.vue';
import RevenuePlanVsActualTable from './tables/RevenuePlanVsActualTable.vue';
import MonthlyRevenuePlanVsActualChart from './charts/MonthlyRevenuePlanVsActualChart.vue';
import RevenuePlanVsActualChart from './charts/RevenuePlanVsActualChart.vue';
import MonthlyOccupancyChart from './charts/MonthlyOccupancyChart.vue';
import OccupancyGaugeChart from './charts/OccupancyGaugeChart.vue';
import KpiSummaryCards from './KpiSummaryCards.vue';

// Utilities
import {
    formatCurrencyForReporting as formatCurrency,
    formatPercentage,
    formatYenInTenThousands,
    formatYenInTenThousandsNoDecimal
} from '@/utils/formatUtils';
import { getSeverity as getSeverityUtil, colorScheme, calculateVariancePercentage } from '@/utils/reportingUtils';

// View selection
const selectedView = ref('graph'); // Default view
const viewOptions = ref([
    { label: 'グラフ', value: 'graph' },
    { label: 'テーブル', value: 'table' }
]);

// Comparison selection
const selectedComparison = ref('forecast'); // Default comparison
const comparisonOptions = ref([
    { label: '計画', value: 'forecast' },
    { label: '前年', value: 'yoy' }
]);

// --- Date Filtering Logic ---

// Available Months
const availableMonths = computed(() => {
    if (!props.revenueData || props.revenueData.length === 0) return [];

    // Extract unique months
    const uniqueMonths = [...new Set(props.revenueData.map(item => item.month))];

    // Sort
    uniqueMonths.sort((a, b) => new Date(a) - new Date(b));

    return uniqueMonths.map(m => {
        const d = new Date(m);
        return {
            label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
            value: m
        };
    });
});

// Selected End Month
const selectedEndMonth = ref(null);

// Initialize default (watch availableMonths to set default when data loads)
watch([availableMonths, () => props.selectedMonth], () => {
    if (availableMonths.value.length === 0) return;

    if (props.selectedMonth) {
        const targetYear = props.selectedMonth.getFullYear();
        const targetMonth = props.selectedMonth.getMonth();
        const match = availableMonths.value.find(m => {
            const d = new Date(m.value);
            return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
        });
        if (match) {
            selectedEndMonth.value = match.value;
            return;
        }
    }

    // Fallback
    const currentIsValid = selectedEndMonth.value && availableMonths.value.some(m => m.value === selectedEndMonth.value);
    if (!currentIsValid) {
        selectedEndMonth.value = availableMonths.value[availableMonths.value.length - 1].value;
    }
}, { immediate: true });

// Filter Logic
const cutoffDate = computed(() => {
    return selectedEndMonth.value ? new Date(selectedEndMonth.value) : null;
});

const prevYearCutoffDate = computed(() => {
    if (!cutoffDate.value) return null;
    const d = new Date(cutoffDate.value);
    d.setFullYear(d.getFullYear() - 1);
    return d;
});

const filteredRevenueData = computed(() => {
    if (!props.revenueData || !cutoffDate.value) return props.revenueData || [];
    return props.revenueData.filter(item => new Date(item.month) <= cutoffDate.value);
});

const filteredOccupancyData = computed(() => {
    if (!props.occupancyData || !cutoffDate.value) return props.occupancyData || [];
    return props.occupancyData.filter(item => new Date(item.month) <= cutoffDate.value);
});

const filteredPrevYearRevenueData = computed(() => {
    if (!props.prevYearRevenueData || !prevYearCutoffDate.value) return props.prevYearRevenueData || [];
    return props.prevYearRevenueData.filter(item => new Date(item.month) <= prevYearCutoffDate.value);
});

const filteredPrevYearOccupancyData = computed(() => {
    if (!props.prevYearOccupancyData || !prevYearCutoffDate.value) return props.prevYearOccupancyData || [];
    return props.prevYearOccupancyData.filter(item => new Date(item.month) <= prevYearCutoffDate.value);
});

// Data extraction for the single hotel
const currentHotelId = computed(() => {
    // This component is for a single hotel, so we expect all data to belong to the same hotel_id.
    // Or, if revenueData is pre-filtered by parent, it will contain only one hotel_id.
    // Use filtered data to ensure we are looking at valid range, although ID shouldn't change.
    // However, if filtered data is empty, we might lose ID. So fall back to props.revenueData for ID detection.
    const sourceData = props.revenueData;

    if (sourceData && sourceData.length > 0) {
        // Prioritize a non-zero hotel_id if multiple types exist (e.g. summary row with id 0)
        const specificHotelEntry = sourceData.find(item => item.hotel_id !== 0 && item.hotel_id != null);
        if (specificHotelEntry) return specificHotelEntry.hotel_id;
        return sourceData[0]?.hotel_id; // Fallback to the first entry's hotel_id
    }
    return null;
});

const currentHotelRevenueData = computed(() => {
    if (!filteredRevenueData.value) return [];
    // If currentHotelId is 0 or null (meaning it's a summary or no specific hotel identified),
    // and the data contains a hotel_id 0, use that. Otherwise, filter by currentHotelId.
    if ((currentHotelId.value === 0 || currentHotelId.value === null) && filteredRevenueData.value.some(item => item.hotel_id === 0)) {
        return filteredRevenueData.value.filter(item => item.hotel_id === 0);
    }
    return filteredRevenueData.value.filter(item => item.hotel_id === currentHotelId.value);
});

const currentHotelOccupancyData = computed(() => {
    if (!filteredOccupancyData.value) return [];
    if ((currentHotelId.value === 0 || currentHotelId.value === null) && filteredOccupancyData.value.some(item => item.hotel_id === 0)) {
        return filteredOccupancyData.value.filter(item => item.hotel_id === 0);
    }
    return filteredOccupancyData.value.filter(item => item.hotel_id === currentHotelId.value);
});

const currentHotelName = computed(() => {
    return currentHotelRevenueData.value[0]?.hotel_name || '選択ホテル';
});


const periodMinDate = computed(() => {
    if (!currentHotelRevenueData.value || currentHotelRevenueData.value.length === 0) return 'N/A';
    const dates = currentHotelRevenueData.value.map(item => new Date(item.month));
    const minDate = new Date(Math.min(...dates));
    return minDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' });
});
const periodMaxDate = computed(() => {
    if (!currentHotelRevenueData.value || currentHotelRevenueData.value.length === 0) return 'N/A';
    const dates = currentHotelRevenueData.value.map(item => new Date(item.month));
    const maxDate = new Date(Math.max(...dates));
    return maxDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' });
});


// Aggregated data for KPIs
const aggregatedCurrentHotelRevenue = computed(() => {
    if (!currentHotelRevenueData.value) return { total_forecast_revenue: 0, total_period_revenue: 0, total_period_accommodation_revenue: 0 };
    console.log('[ReportingYearCumulativeHotel] currentHotelRevenueData:', currentHotelRevenueData.value);
    return currentHotelRevenueData.value.reduce((acc, item) => {
        acc.total_forecast_revenue += (item.forecast_revenue || 0);
        acc.total_period_revenue += (item.period_revenue || 0);
        acc.total_period_accommodation_revenue += (item.accommodation_revenue || item.period_revenue || 0);
        return acc;
    }, { total_forecast_revenue: 0, total_period_revenue: 0, total_period_accommodation_revenue: 0 });
});

const aggregatedCurrentHotelOccupancy = computed(() => {
    if (!currentHotelOccupancyData.value) return {
        total_sold_rooms: 0, total_fc_sold_rooms: 0,
        total_available_rooms: 0, total_fc_available_rooms: 0
    };
    const result = currentHotelOccupancyData.value.reduce((acc, item) => {
        acc.total_sold_rooms += (item.sold_rooms || 0);
        acc.total_fc_sold_rooms += (item.fc_sold_rooms || 0);
        acc.total_available_rooms += (item.total_rooms || 0);
        acc.total_fc_available_rooms += (item.fc_total_rooms || 0);
        return acc;
    }, {
        total_sold_rooms: 0, total_fc_sold_rooms: 0,
        total_available_rooms: 0, total_fc_available_rooms: 0
    });

    const actualDenominator = result.total_fc_available_rooms > 0 ? result.total_fc_available_rooms : result.total_available_rooms;
    /*
    console.log('[ReportingYearCumulativeHotel] Actual OCC calculation:', {
        numerator: result.total_sold_rooms,
        denominator: actualDenominator,
        result: actualDenominator > 0 ? (result.total_sold_rooms / actualDenominator) * 100 : 0
    });

    console.log('[ReportingYearCumulativeHotel] Forecast OCC calculation:', {
        numerator: result.total_fc_sold_rooms,
        denominator: result.total_fc_available_rooms,
        result: result.total_fc_available_rooms > 0 ? (result.total_fc_sold_rooms / result.total_fc_available_rooms) * 100 : 0
    });
    */

    return result;
});

// Previous year revenue data for current hotel
const currentHotelPrevYearRevenueData = computed(() => {
    if (!filteredPrevYearRevenueData.value) return [];
    if ((currentHotelId.value === 0 || currentHotelId.value === null) && filteredPrevYearRevenueData.value.some(item => item.hotel_id === 0)) {
        return filteredPrevYearRevenueData.value.filter(item => item.hotel_id === 0);
    }
    return filteredPrevYearRevenueData.value.filter(item => item.hotel_id === currentHotelId.value);
});

// Previous year occupancy data for current hotel
const currentHotelPrevYearOccupancyData = computed(() => {
    if (!filteredPrevYearOccupancyData.value) return [];
    if ((currentHotelId.value === 0 || currentHotelId.value === null) && filteredPrevYearOccupancyData.value.some(item => item.hotel_id === 0)) {
        return filteredPrevYearOccupancyData.value.filter(item => item.hotel_id === 0);
    }
    return filteredPrevYearOccupancyData.value.filter(item => item.hotel_id === currentHotelId.value);
});

// Aggregate revenue data for the RevenuePlanVsActualChart
const aggregateRevenueDataForChart = computed(() => {
    const agg = aggregatedCurrentHotelRevenue.value;

    // Calculate previous year revenue from currentHotelPrevYearRevenueData
    const prevYearRevenue = currentHotelPrevYearRevenueData.value.reduce((acc, item) => {
        return acc + (item.accommodation_revenue || item.period_revenue || 0);
    }, 0);

    return {
        total_forecast_revenue: agg.total_forecast_revenue,
        total_period_accommodation_revenue: agg.total_period_accommodation_revenue,
        total_prev_year_accommodation_revenue: prevYearRevenue
    };
});

// KPIs
const actualADR = computed(() => {
    const revenue = aggregatedCurrentHotelRevenue.value.total_period_accommodation_revenue;
    const soldRooms = aggregatedCurrentHotelOccupancy.value.total_sold_rooms;
    console.log('[ReportingYearCumulativeHotel] ADR calculation - accommodation_revenue:', revenue, 'sold_rooms:', soldRooms);
    return soldRooms ? Math.round(revenue / soldRooms) : NaN;
});
const forecastADR = computed(() => {
    const revenue = aggregatedCurrentHotelRevenue.value.total_forecast_revenue;
    const soldRooms = aggregatedCurrentHotelOccupancy.value.total_fc_sold_rooms;
    return soldRooms ? Math.round(revenue / soldRooms) : NaN;
});
const actualRevPAR = computed(() => {
    const revenue = aggregatedCurrentHotelRevenue.value.total_period_accommodation_revenue;
    const availableRooms = aggregatedCurrentHotelOccupancy.value.total_fc_available_rooms > 0
        ? aggregatedCurrentHotelOccupancy.value.total_fc_available_rooms
        : aggregatedCurrentHotelOccupancy.value.total_available_rooms;
    return availableRooms ? Math.round(revenue / availableRooms) : NaN;
});
const forecastRevPAR = computed(() => {
    const revenue = aggregatedCurrentHotelRevenue.value.total_forecast_revenue;
    const availableRooms = aggregatedCurrentHotelOccupancy.value.total_fc_available_rooms;
    return availableRooms ? Math.round(revenue / availableRooms) : NaN;
});

const ADRDifference = computed(() => {
    if (isNaN(actualADR.value) || isNaN(forecastADR.value)) return null;
    return actualADR.value - forecastADR.value;
});

const revPARDifference = computed(() => {
    if (isNaN(actualRevPAR.value) || isNaN(forecastRevPAR.value)) return null;
    return actualRevPAR.value - forecastRevPAR.value;
});

// ECharts are now handled by individual chart components

// All charts are now handled by components

const getSeverity = getSeverityUtil;

const exportCSV = (tableType) => {
    let csvString = '';
    let filename = `${currentHotelName.value || 'SingleHotel'}_YearCumulative_data.csv`;
    const hotelDataRevenue = currentHotelRevenueData.value;
    const hotelDataOccupancy = currentHotelOccupancyData.value;

    if (tableType === 'revenue' && hotelDataRevenue && hotelDataRevenue.length > 0) {
        filename = `${currentHotelName.value || 'SingleHotel'}_YearCumulative_Revenue.csv`;
        const headers = ["月度", "計画売上 (円)", "売上 (円)", "分散額 (円)", "分散率 (%)"];
        const csvRows = [headers.join(',')];
        hotelDataRevenue.forEach(row => {
            const forecastRevenue = row.forecast_revenue || 0;
            const periodRevenue = row.period_revenue || 0;
            const varianceAmount = periodRevenue - forecastRevenue;
            let varianceStr = calculateVariancePercentage(periodRevenue, forecastRevenue);

            const csvRow = [
                `"${row.month || ''}"`,
                forecastRevenue,
                periodRevenue,
                varianceAmount,
                varianceStr
            ];
            csvRows.push(csvRow.join(','));
        });
        csvString = csvRows.join('\n');

    } else if (tableType === 'occupancy' && hotelDataOccupancy && hotelDataOccupancy.length > 0) {
        filename = `${currentHotelName.value || 'SingleHotel'}_YearCumulative_Occupancy.csv`;
        const headers = ["月度", "計画販売室数", "販売室数", "販売室数差異", "計画稼働率 (%)", "稼働率 (%)", "稼働率差異 (p.p.)", "計画総室数", "総室数"];
        const csvRows = [headers.join(',')];
        hotelDataOccupancy.forEach(row => {
            const fcSold = row.fc_sold_rooms || 0;
            const sold = row.sold_rooms || 0;
            const fcOcc = row.fc_occ || 0;
            const occ = row.occ || 0;

            const csvRow = [
                `"${row.month || ''}"`,
                fcSold, sold, sold - fcSold,
                fcOcc.toFixed(2), occ.toFixed(2), (occ - fcOcc).toFixed(2),
                row.fc_total_rooms || 0, row.total_rooms || 0
            ];
            csvRows.push(csvRow.join(','));
        });
        csvString = csvRows.join('\n');
    } else {
        console.log(`RYCHotel: No data to export for ${tableType} or invalid table type.`);
        return;
    }

    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

onMounted(async () => {
    // All charts are now handled by child components
});
onBeforeUnmount(() => {
    // All charts are now handled by child components
});

// All chart lifecycle management is now handled by child components
</script>