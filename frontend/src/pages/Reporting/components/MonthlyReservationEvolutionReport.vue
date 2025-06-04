<template>
    <div class="p-4">
        <h3 class="text-xl font-semibold mb-2">予約進化 (OTBマトリクス) - {{ formatTargetMonthForDisplay(props.targetMonth) }}</h3>
        
        <div v-if="loading" class="flex justify-center items-center py-10">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" animationDuration=".5s" />
        </div>
        <div v-else-if="error" class="text-red-500 bg-red-100 border border-red-400 p-4 rounded">
            <p class="font-bold">エラーが発生しました</p>
            <p>{{ error }}</p>
        </div>
        <div v-else>
            <Card class="mb-6">
                <template #title>
                    <div class="flex items-center gap-2">
                        <i class="pi pi-th-large"></i> <!-- Changed icon for heatmap -->
                        <span class="font-semibold">OTB Heatmap (Lead Days vs. Stay Date)</span>
                    </div>
                </template>
                <template #content>
                    <div ref="heatmapChartContainer" style="height: 600px;" v-if="heatmapEchartsOptions"></div> <!-- Taller height for heatmap -->
                    <p v-else class="text-gray-500 p-4">Heatmap data is not available or being processed.</p>
                </template>
            </Card>

            <Card>
                <template #title>
                    <div class="flex items-center gap-2">
                        <i class="pi pi-chart-line"></i>
                        <span class="font-semibold">平均OTB (リード日数別)</span>
                    </div>
                </template>
                <template #content>
                    <div ref="lineChartContainer" style="height: 400px" v-if="averageData.length && echartsOptions"></div>
                    <p v-else-if="!averageData.length" class="text-gray-500 p-4">平均OTBデータがありません。</p>
                    <!-- The fallback DataTable that was here is removed as it's likely unreachable -->
                </template>
            </Card>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import { useReportStore } from '@/composables/useReportStore';
import { useHotelStore } from '@/composables/useHotelStore';
import ProgressSpinner from 'primevue/progressspinner';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Card from 'primevue/card'; // Assuming Card is kept from previous change

// ECharts imports
import * as echarts from 'echarts/core';
import {
  TooltipComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  VisualMapComponent // Added
} from 'echarts/components';
import { LineChart, HeatmapChart } from 'echarts/charts'; // Added
import { CanvasRenderer } from 'echarts/renderers';

// Register ECharts components
echarts.use([
  TooltipComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  VisualMapComponent, // Added
  LineChart,
  HeatmapChart,       // Added
  CanvasRenderer,
]);

const props = defineProps({
    hotelId: { type: [Number, String], required: true },
    targetMonth: { type: String, required: true }, // YYYY-MM-DD, first day of month
    triggerFetch: { type: [String, Number, Object, Boolean], default: () => new Date().toISOString() }
});

const { fetchMonthlyReservationEvolution } = useReportStore();
const hotelStore = useHotelStore();
const matrixData = ref([]);
const averageData = ref([]); // This is populated by fetchReportData
const loading = ref(false);
const error = ref(null);

// Console logs added previously can remain for user's debugging for now, or be removed if confident.
// For this subtask, let's assume they remain.

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const formatTargetMonthForDisplay = (isoDateString) => {
    if (!isoDateString) return '';
    try {
        const date = new Date(isoDateString);
        if (isNaN(date.getTime())) return '無効な日付';
        return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`;
    } catch (e) {
        return '日付フォーマットエラー';
    }
};

const fetchReportData = async () => {
    if (!props.hotelId || !props.targetMonth) {
        matrixData.value = [];
        averageData.value = [];
        error.value = 'ホテルIDと対象月を選択してください。';
        loading.value = false;
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        const rawData = await fetchMonthlyReservationEvolution(props.hotelId, props.targetMonth);
        console.log('Raw Data from API:', JSON.parse(JSON.stringify(rawData))); // Keep log

        matrixData.value = rawData.map(item => ({
            ...item,
            stay_date: item.stay_date
        }));
        console.log('Processed matrixData:', JSON.parse(JSON.stringify(matrixData.value))); // Keep log

        if (rawData && rawData.length > 0) {
            const leadDayMap = new Map();
            rawData.forEach(item => {
                const count = parseInt(item.booked_room_nights_count, 10);
                if (isNaN(count)) return;

                if (!leadDayMap.has(item.lead_days)) {
                    leadDayMap.set(item.lead_days, { sum: 0, items: 0 }); // Simplified
                }
                const current = leadDayMap.get(item.lead_days);
                current.sum += count;
                current.items++;
            });
            
            averageData.value = Array.from(leadDayMap.entries()).map(([lead_days, data]) => ({
                lead_days: parseInt(lead_days, 10),
                avg_booked_room_nights: data.items > 0 ? data.sum / data.items : 0
            })).sort((a, b) => a.lead_days - b.lead_days);
        } else {
            averageData.value = [];
        }
        console.log('Calculated averageData:', JSON.parse(JSON.stringify(averageData.value))); // Keep log
    } catch (err) {
        console.error('Failed to fetch OTB Evolution report:', err);
        error.value = err.message || 'データの取得中にエラーが発生しました。';
        matrixData.value = [];
        averageData.value = [];
    } finally {
        loading.value = false;
    }
};

// Helper function to get all dates in a given month (YYYY-MM-DD format for the first day)
const getDaysInMonth = (targetMonthIsoString) => {
    if (!targetMonthIsoString) return [];
    const date = new Date(targetMonthIsoString);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArray = [];
    for (let i = 1; i <= daysInMonth; i++) {
        // Format as 'DD' for y-axis category
        daysArray.push(String(i).padStart(2, '0'));
    }
    return daysArray;
};

const heatmapData = computed(() => {
    if (!matrixData.value || matrixData.value.length === 0 || !props.targetMonth) {
        return { seriesData: [], xAxisData: [], yAxisData: [], maxCount: 0 };
    }

    // Y-Axis: Days of the target month (e.g., ["01", "02", ..., "30"])
    const yAxisData = getDaysInMonth(props.targetMonth);

    // X-Axis: Lead days (0 to 180, as strings)
    // Determine actual range from matrixData to avoid overly sparse xAxis if possible,
    // but for consistency with line chart and SQL, 0-180 is expected.
    // Let's find min/max lead_days present in matrixData for a potentially tighter axis.
    let minLead = 180;
    let maxLead = 0;
    if (matrixData.value.length > 0) {
        matrixData.value.forEach(item => {
            if (item.lead_days < minLead) minLead = item.lead_days;
            if (item.lead_days > maxLead) maxLead = item.lead_days;
        });
    } else {
        minLead = 0; // Default if matrixData is empty but somehow this computed runs
    }
    // Ensure maxLead is at least minLead, and generate categories from 0 up to maxLead found or a default like 30/60/90 if too large.
    // For OTB, 0-180 is the full range from SQL. Let's stick to a fixed sensible range for now e.g. 0-90 or make it dynamic.
    // Or, more simply, use all lead_days that appear in matrixData.
    const uniqueLeadDays = [...new Set(matrixData.value.map(item => item.lead_days))].sort((a, b) => a - b);
    const xAxisData = uniqueLeadDays.map(String);


    const seriesData = [];
    let maxCount = 0;

    matrixData.value.forEach(item => {
        const leadDay = item.lead_days;
        const stayDate = new Date(item.stay_date);
        const dayOfMonth = String(stayDate.getDate()).padStart(2, '0'); // Use getUTCDate for consistency if dates are UTC

        const count = parseInt(item.booked_room_nights_count, 10);
        if (isNaN(count)) return; // Should not happen with SQL COUNT

        if (count > maxCount) {
            maxCount = count;
        }

        // For ECharts heatmap, data is typically [xIndex, yIndex, value]
        // Find index of leadDay in xAxisData and dayOfMonth in yAxisData
        const xIndex = xAxisData.indexOf(String(leadDay));
        const yIndex = yAxisData.indexOf(dayOfMonth);

        if (xIndex !== -1 && yIndex !== -1) {
            seriesData.push([xIndex, yIndex, count]);
        }
    });

    // If using actual values for heatmap series [xVal, yVal, value]
    // const seriesDataWithValue = matrixData.value.map(item => {
    //     const count = parseInt(item.booked_room_nights_count, 10);
    //     if (isNaN(count)) return [item.lead_days, new Date(item.stay_date).getUTCDate(), 0]; // Default on error
    //     if (count > maxCount) maxCount = count;
    //     return [item.lead_days, new Date(item.stay_date).getUTCDate(), count];
    // });


    return {
        seriesData: seriesData, // This is [xIndex, yIndex, value]
        xAxisData: xAxisData,     // Categories for X-axis (lead_days as strings)
        yAxisData: yAxisData,     // Categories for Y-axis (day of month as "DD" strings)
        maxCount: maxCount        // Max value for visualMap
    };
});

const currentHotelTotalRooms = computed(() => {
    if (props.hotelId && hotelStore.hotels.value && hotelStore.hotels.value.length > 0) {
        const currentHotel = hotelStore.hotels.value.find(
            (hotel) => hotel.id === Number(props.hotelId) // Ensure props.hotelId is compared as a number
        );
        if (currentHotel && typeof currentHotel.total_rooms === 'number') {
            return currentHotel.total_rooms;
        }
    }
    // Fallback or default if total_rooms cannot be found.
    // For visualMap.max, a value of 0 or 1 might make sense if total_rooms is unknown,
    // or we could rely on hData.maxCount from heatmapData as an alternative.
    // Let's return null for now, and handle fallback in heatmapEchartsOptions.
    return null;
});

// ECharts refs
const lineChartContainer = ref(null); // Ref to the chart's DOM container
const lineChartInstance = shallowRef(null); // Ref to the ECharts instance
const heatmapChartContainer = ref(null); // Ref for the heatmap's DOM container
const heatmapChartInstance = shallowRef(null); // Ref for the heatmap ECharts instance

// ECharts options computed property - definition remains the same
const echartsOptions = computed(() => {
    if (!averageData.value || averageData.value.length === 0) {
        return null;
    }
    return {
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                const param = params[0];
                return `リード日数: ${param.axisValueLabel}<br/>平均予約室数: ${param.value}`;
            }
        },
        legend: {
            data: ['平均予約室数'],
            bottom: 10,
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            name: 'リード日数 (Lead Days)',
            nameLocation: 'middle',
            nameGap: 30,
            data: averageData.value.map(item => item.lead_days.toString()),
        },
        yAxis: {
            type: 'value',
            name: '平均予約室数',
            nameLocation: 'middle',
            nameGap: 40,
            min: 0, // Keep min 0
            axisLabel: {
                formatter: '{value}'
            }
        },
        series: [
            {
                name: '平均予約室数',
                type: 'line',
                data: averageData.value.map(item => parseFloat(item.avg_booked_room_nights)), // Using parseFloat as per last fix
                smooth: true,
                emphasis: {
                    focus: 'series'
                }
            }
        ],
        responsive: true,
    };
});

// Watch for prop changes to refetch data
watch(() => [props.hotelId, props.targetMonth, props.triggerFetch], fetchReportData, { immediate: true, deep: true });

const heatmapEchartsOptions = computed(() => {
    const hData = heatmapData.value; // from previous step { seriesData, xAxisData, yAxisData, maxCount }
    if (!hData || !hData.seriesData || hData.seriesData.length === 0) {
        return null; // No data, no options
    }

    return {
        tooltip: {
            position: 'top',
            formatter: (params) => {
                // params.value will be [xIndex, yIndex, count]
                // We need to map xIndex back to lead_day and yIndex back to day_of_month
                if (params.componentType === 'series') {
                    const leadDay = hData.xAxisData[params.value[0]];
                    const dayOfMonth = hData.yAxisData[params.value[1]];
                    const count = params.value[2];
                    return `Date: ${props.targetMonth.substring(0, 7)}-${dayOfMonth}<br/>Lead Day: ${leadDay}<br/>Reservations: ${count}`;
                }
                return '';
            }
        },
        grid: {
            height: '60%', // Adjust as needed
            top: '10%',
            bottom: '25%', // Make space for visualMap and xAxis labels
            left: '5%',
            right: '5%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: hData.xAxisData,
            name: 'Lead Days',
            nameLocation: 'middle',
            nameGap: 25, // Adjust if labels overlap
            splitArea: { show: true },
            axisLabel: {
                // Optional: rotate if too many categories
                // rotate: 45,
            }
        },
        yAxis: {
            type: 'category',
            data: hData.yAxisData, // Day numbers "01", "02", ...
            name: `Days of ${formatTargetMonthForDisplay(props.targetMonth)}`, // Dynamic month name
            nameLocation: 'middle',
            nameGap: 35, // Adjust
            splitArea: { show: true }
        },
        visualMap: {
            min: 0,
            max: (currentHotelTotalRooms.value && currentHotelTotalRooms.value > 0) ? currentHotelTotalRooms.value : (hData.maxCount > 0 ? hData.maxCount : 1),
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '5%',
            color: ['#F0F0F0', '#FFFFE0', '#B22222'], // Added/Updated color scheme
        },
        series: [{
            name: 'Booked Room Nights',
            type: 'heatmap',
            data: hData.seriesData, // [xIndex, yIndex, value]
            label: {
                show: true,
                formatter: (params) => {
                    return params.value[2] > 0 ? params.value[2] : ''; // Show count if > 0
                }
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }],
        responsive: true
    };
});

// NEW: Watcher for echartsOptions to manage chart lifecycle
watch(echartsOptions, (newOptions) => {
    if (newOptions) {
        // Options are available (meaning data is ready)
        nextTick(() => {
            if (lineChartContainer.value) { // Ensure DOM element is ready
                if (!lineChartInstance.value) { // If no instance, create one
                    lineChartInstance.value = echarts.init(lineChartContainer.value);
                }
                lineChartInstance.value.setOption(newOptions, true); // Apply new options
            } else {
                // This might happen if the v-if on the container somehow isn't true yet,
                // though nextTick after options are ready should make it available.
                // console.warn('Chart container not found when trying to render chart.');
            }
        });
    } else {
        // Options are null (meaning averageData is empty)
        disposeLineChart();
    }
}, { deep: true }); // deep: true might be useful if options object structure is complex and changes internally

const disposeLineChart = () => {
    if (lineChartInstance.value) {
        lineChartInstance.value.dispose();
        lineChartInstance.value = null;
    }
};

// Watcher for heatmapEchartsOptions
watch(heatmapEchartsOptions, (newOptions) => {
    if (newOptions) {
        nextTick(() => {
            if (heatmapChartContainer.value) {
                if (!heatmapChartInstance.value) {
                    heatmapChartInstance.value = echarts.init(heatmapChartContainer.value);
                }
                heatmapChartInstance.value.setOption(newOptions, true);
            }
        });
    } else {
        if (heatmapChartInstance.value) {
            heatmapChartInstance.value.dispose();
            heatmapChartInstance.value = null;
        }
    }
}, { deep: true });

const disposeHeatmapChart = () => {
    if (heatmapChartInstance.value) {
        heatmapChartInstance.value.dispose();
        heatmapChartInstance.value = null;
    }
};

const handleChartsResize = () => {
    if (lineChartInstance.value) {
        lineChartInstance.value.resize();
    }
    if (heatmapChartInstance.value) {
        heatmapChartInstance.value.resize();
    }
};

onMounted(() => {
    window.addEventListener('resize', handleChartsResize); // Use combined handler
});

onBeforeUnmount(() => {
    disposeLineChart();
    disposeHeatmapChart(); // Dispose heatmap too
    window.removeEventListener('resize', handleChartsResize); // Use combined handler
});

</script>

<style scoped>
/* Using Tailwind CSS utility classes. */
/* :deep() can be used to style child components from PrimeVue if needed */
/* e.g., :deep(.p-panel-header) { background-color: #f0f0f0; } */
</style>
