<template>
    <div class="p-4">
        <h3 class="text-xl font-semibold mb-4">アクティブ予約変動レポート</h3>
        <div v-if="loading" class="flex justify-center items-center">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" animationDuration=".5s" />
        </div>
        <div v-else-if="error" class="text-red-500 bg-red-100 border border-red-400 p-4 rounded">
            <p class="font-bold">エラーが発生しました</p>
            <p>{{ error }}</p>
        </div>
        <div v-else-if="reportData && reportData.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Cards remain here -->
            <Card>
                <template #title>
                    <div class="flex items-center">
                        <i class="pi pi-calendar mr-2"></i>
                        <span>前日合計</span>
                    </div>
                </template>
                <template #content>                    
                    <p class="text-sm text-gray-600 mb-1">在庫数合計:</p>
                    <p class="text-3xl font-bold text-blue-600">{{ formatNumberWithThousandsSeparator(totalPreviousDayEnd) }}</p>
                </template>
            </Card>
            <Card>
                <template #title>
                    <div class="flex items-center">
                        <i class="pi pi-calendar-plus mr-2"></i>
                        <span>指定日合計</span>
                    </div>
                </template>
                <template #content>                    
                    <p class="text-sm text-gray-600 mb-1">在庫数合計:</p>
                    <p class="text-3xl font-bold text-green-600">{{ formatNumberWithThousandsSeparator(totalSnapshotDayEnd) }}</p>
                </template>
            </Card>
        </div>
        <!-- ECharts container to be added here -->
        <div v-if="reportData && reportData.length > 0" class="mt-8">
            <Card>
                <template #header>
                    <h4 class="text-lg font-semibold mb-3">日次差異チャート</h4>
                </template>
                <template #content>
                    <div ref="lineChartContainer" style="width: 100%; height: 400px;"></div>
                </template>
            </Card>
        </div>
        <div v-if="reportData && reportData.length > 0" class="mt-8">
            <Card>
                <template #header>
                    <h4 class="text-lg font-semibold mb-3">詳細データ</h4>
                </template>
                <template #content>
                    <DataTable
                        :value="sortedReportDataForTable"
                        responsiveLayout="scroll"
                        rowGroupMode="subheader"
                        groupRowsBy="yearMonth"
                        expandableRowGroups
                        v-model:expandedRowGroups="expandedRowGroups"                       
                    >
                        <template #groupheader="slotProps">
                            <div class="p-datatable-group-header-content flex items-center p-2 cursor-pointer w-full" @click="toggleRowGroup(slotProps.data.yearMonth)">
                                <!-- Column 1: Month and Toggle Icon -->
                                <div class="flex items-center" style="width: 25%;">
                                    <i :class="expandedRowGroups.includes(slotProps.data.yearMonth) ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" class="mr-2 text-blue-500 text-sm"></i>
                                    <span class="font-bold text-gray-800 text-sm">{{ slotProps.data.yearMonth }}</span>
                                </div>

                                <!-- Column 2: Previous Day Total (aligned right) -->
                                <div style="width: 25%; text-align: right; padding-right: 0.5rem;">
                                    <span class="text-xs text-gray-500">前日合計: <span class="font-semibold text-gray-700">{{ formatNumberWithThousandsSeparator(calculateGroupTotals(slotProps.data.yearMonth).prevDayTotal) }}</span></span>
                                </div>

                                <!-- Column 3: Snapshot Day Total (aligned right) -->
                                <div style="width: 25%; text-align: right; padding-right: 0.5rem;">
                                    <span class="text-xs text-gray-500">指定日合計: <span class="font-semibold text-gray-700">{{ formatNumberWithThousandsSeparator(calculateGroupTotals(slotProps.data.yearMonth).snapshotDayTotal) }}</span></span>
                                </div>

                                <!-- Column 4: Daily Difference Total (aligned right, with color for positive/negative) -->
                                <div style="width: 25%; text-align: right; padding-right: 0.5rem;">
                                    <span class="text-xs text-gray-500">日次差異合計: <span class="font-semibold" :class="{'text-red-500': calculateGroupTotals(slotProps.data.yearMonth).diffTotal < 0, 'text-green-500': calculateGroupTotals(slotProps.data.yearMonth).diffTotal >= 0}">{{ formatNumberWithThousandsSeparator(calculateGroupTotals(slotProps.data.yearMonth).diffTotal) }}</span></span>
                                </div>
                            </div>
                        </template>

                        <Column field="inventory_date_formatted" header="日付 (現地時間)" :sortable="true" style="flex: 1;"></Column>
                        <Column field="count_as_of_previous_day_end" header="前日在庫" :sortable="true" style="flex: 1; text-align: right;">
                            <template #body="columnSlotProps">
                                {{ columnSlotProps.data.count_as_of_previous_day_end }}
                            </template>
                        </Column>
                        <Column field="count_as_of_snapshot_day_end" header="当日在庫" :sortable="true" style="flex: 1; text-align: right;">
                            <template #body="columnSlotProps">
                                {{ columnSlotProps.data.count_as_of_snapshot_day_end }}
                            </template>
                        </Column>
                        <Column field="daily_difference" header="日次差異" :sortable="true" style="flex: 1; text-align: right;">
                            <template #body="columnSlotProps">
                                {{ columnSlotProps.data.daily_difference }}
                            </template>
                        </Column>
                    </DataTable>
                </template>
            </Card>
        </div>
        <div v-else class="text-gray-500">
            データがありません。適切なホテルが選択されているか、または指定日にデータが存在するか確認してください。
        </div>
    </div>
</template>

<script setup>
    // Vue
    import { ref, watch, computed, onMounted, onBeforeUnmount, shallowRef, nextTick } from 'vue';
    const props = defineProps({
        hotelId: {
            type: [Number, String], // Can be number or 'all'
            required: true
        },
        triggerFetch: { // Used to re-trigger fetch from parent if other params change
            type: [String, Number, Object, Boolean], // Allow boolean to easily toggle
            default: () => new Date().toISOString(),
        }
    });

    // Store
    import { useReportStore } from '@/composables/useReportStore';
    const { fetchActiveReservationsChange } = useReportStore();

    // Primevue
    import ProgressSpinner from 'primevue/progressspinner';
    import Card from 'primevue/card';
    import DataTable from 'primevue/datatable';
    import Column from 'primevue/column';

    // ECharts imports
    import * as echarts from 'echarts/core';
    import {
        LineChart // Specifically for line charts
    } from 'echarts/charts';
    import {
        TitleComponent,    // For chart titles
        TooltipComponent,  // For interactive tooltips
        GridComponent,     // For the chart grid
        LegendComponent    // For the legend (optional, but good to include)
    } from 'echarts/components';
    import {
        CanvasRenderer     // Renderer
    } from 'echarts/renderers';

    // Register ECharts components
    echarts.use([
        TitleComponent,
        TooltipComponent,
        GridComponent,
        LegendComponent,
        LineChart,
        CanvasRenderer
    ]);

    // Refs
    const reportData = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const lineChartContainer = ref(null); // For the DOM element
    const lineChartInstance = shallowRef(null); // For the ECharts instance
    const expandedRowGroups = ref([]);

    const totalPreviousDayEnd = computed(() => {
        if (!reportData.value || reportData.value.length === 0) {
            return 0;
        }
        return reportData.value.reduce((sum, item) => sum + item.count_as_of_previous_day_end, 0);
    });

    const totalSnapshotDayEnd = computed(() => {
        if (!reportData.value || reportData.value.length === 0) {
            return 0;
        }
        return reportData.value.reduce((sum, item) => sum + item.count_as_of_snapshot_day_end, 0);
    });

    const sortedReportDataForTable = computed(() => {
        if (!reportData.value || reportData.value.length === 0) {
            return [];
        }
        // Sort data by date to ensure the table displays chronologically by default
        return [...reportData.value].sort((a, b) => new Date(a.inventory_date_formatted) - new Date(b.inventory_date_formatted));
    });

    const lineChartOptions = computed(() => {
        if (!reportData.value || reportData.value.length === 0) {
            // Return a minimal config or one that shows 'No Data' if ECharts supports it directly
            return {
                title: {
                    text: 'データがありません',
                    left: 'center',
                    top: 'center',
                    textStyle: { color: '#888', fontSize: 16 }
                },
                xAxis: { show: false },
                yAxis: { show: false },
                series: []
            };
        }

        // Sort data by date to ensure the chart displays chronologically
        // This was previously done in `chartData` for PrimeVue and `sortedReportDataForTable`.
        // It's good practice to ensure data fed to the chart is explicitly sorted.
        const sortedData = [...reportData.value].sort((a, b) => {
            // Assuming inventory_date_formatted is 'YYYY-MM-DD'
            return new Date(a.inventory_date_formatted) - new Date(b.inventory_date_formatted);
        });

        // Define desired colors
        const bloodRed = '#8B0000';
        const darkGrey = '#696969'; // Using a slightly darker grey than A9A9A9 for better visibility
        const darkGold = '#B8860B';

        return {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                }
            },
            legend: {
                // Updated legend to include all three series
                data: ['前日終了時点在庫', '当日終了時点在庫', '日次差異'],
                top: 'bottom'
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%', // Adjust bottom to make space for legend if it's at the bottom
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false, // No gap at the ends of the axis
                data: sortedData.map(item => item.inventory_date_formatted) // Dates for X-axis
            },
            yAxis: {
                type: 'value',
                name: 'カウント', // Changed Y-axis name to be more generic
                axisLabel: {
                    formatter: '{value}'
                }
            },
            series: [
                {
                    name: '前日終了時点在庫', // Series for count_as_of_previous_day_end
                    type: 'line',
                    smooth: true,
                    data: sortedData.map(item => item.count_as_of_previous_day_end),
                    itemStyle: {
                        color: darkGrey // Updated color
                    }
                },
                {
                    name: '当日終了時点在庫',
                    type: 'line',
                    smooth: true,
                    data: sortedData.map(item => item.count_as_of_snapshot_day_end),
                    itemStyle: {
                        color: bloodRed // Updated color
                    }
                },
                {
                    name: '日次差異',
                    type: 'line',
                    smooth: true,
                    data: sortedData.map(item => item.daily_difference),
                    itemStyle: {
                        color: darkGold // Updated color
                    },
                    areaStyle: {
                        // Updated gradient to match darkGold
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                            offset: 0,
                            // Adjust alpha for gradient, e.g., from 0.3 to 0
                            color: echarts.color.modifyAlpha(darkGold, 0.3)
                        }, {
                            offset: 1,
                            color: echarts.color.modifyAlpha(darkGold, 0)
                        }])
                    }
                }
            ]
        };
    });

    // Helper function to format numbers with a thousand separator
    const formatNumberWithThousandsSeparator = (value) => {
        if (typeof value !== 'number') {
            return value;
        }
        return value.toLocaleString('ja-JP');
    };

    // Helper function to get today's date in YYYY-MM-DD format
    const getTodayDateString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Helper function to get the previous day in YYYY-MM-DD format    
    const formatInventoryDate = (isoDateString) => {
        if (!isoDateString) return 'N/A';
        try {
            // The key is that `new Date(isoDateString)` already converts it to the local timezone of the machine running the JS.
            // We just need to format it.
            const originalDate = new Date(isoDateString);
            const year = originalDate.getFullYear();
            const month = String(originalDate.getMonth() + 1).padStart(2, '0');
            const day = String(originalDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;

        } catch (e) {
            console.error("Error formatting inventory date:", e, isoDateString);
            return '日付書式エラー';
        }
    };

    const fetchReportData = async () => {
        // Dispose existing chart instance to ensure a clean slate
        if (lineChartInstance.value && typeof lineChartInstance.value.dispose === 'function' && !lineChartInstance.value.isDisposed?.()) {
            lineChartInstance.value.dispose();
            lineChartInstance.value = null; // Set to null so the watcher re-initializes
        }

        if (props.hotelId === null || typeof props.hotelId === 'undefined' || props.hotelId === '') {
            reportData.value = []; 
            error.value = 'ホテルが選択されていません。';
            loading.value = false;
            // Ensure chart options are updated for "No Data" state if reportData is empty
            // The lineChartOptions computed property already handles empty reportData,
            // and the watcher will pick it up.
            return;
        }
        loading.value = true;
        error.value = null;
        // It's important reportData is cleared *before* new data might come in,
        // so chart options can reflect an empty/loading state if needed.
        reportData.value = [];
        expandedRowGroups.value = []; // Reset expanded groups as well

        try {
            const todayDateString = getTodayDateString();
            // console.log(`Fetching room inventory report for hotel: ${props.hotelId}, date: ${todayDateString}, trigger: ${props.triggerFetch}`);
            
            // Call the new store function with hotelId and today's date
            const data = await fetchActiveReservationsChange(props.hotelId, todayDateString);
            
            // The store function fetchActiveReservationsChange should return an array directly
            // or handle the { message: '...', data: [] } structure internally.
            // Let's assume it returns the array of data rows.
            if (Array.isArray(data)) {
                reportData.value = data.map(item => {
                    const formattedDate = formatInventoryDate(item.inventory_date); // Assuming this is 'YYYY-MM-DD'
                    const yearMonth = formattedDate && formattedDate !== 'N/A' && formattedDate !== '日付書式エラー' ? formattedDate.substring(0, 7) : 'N/A'; // Extracts 'YYYY-MM'

                    return {
                        ...item,
                        inventory_date_formatted: formattedDate,
                        yearMonth: yearMonth, // Add the new yearMonth field
                        count_as_of_previous_day_end: parseInt(item.count_as_of_previous_day_end, 10) || 0,
                        count_as_of_snapshot_day_end: parseInt(item.count_as_of_snapshot_day_end, 10) || 0,
                        daily_difference: (parseInt(item.count_as_of_snapshot_day_end, 10) || 0) - (parseInt(item.count_as_of_previous_day_end, 10) || 0)
                    };
                });

            // Ensure groups are collapsed initially
            // expandedRowGroups.value = []; // Already set above

        } else {
            // This case should ideally be handled within fetchActiveReservationsChange
            // For safety, if it returns something unexpected:
            console.warn("fetchActiveReservationsChange did not return an array:", data);
            // reportData.value = []; // Already set above
            // expandedRowGroups.value = []; // Already set above
        }
            // console.log('Fetched data for room inventory report:', reportData.value);

        } catch (err) {
            console.error('Failed to fetch room inventory report:', err);
            error.value = err.message || 'データの取得中にエラーが発生しました。';
            // reportData.value = []; // Already set above
            // expandedRowGroups.value = []; // Already set above
        } finally {
            loading.value = false;
        }
    };

    // Watch for changes in props and trigger fetch
    watch(() => [props.hotelId, props.triggerFetch], fetchReportData, { immediate: true, deep: true });

    const toggleRowGroup = (yearMonth) => {
        const index = expandedRowGroups.value.indexOf(yearMonth);
        if (index === -1) {
            expandedRowGroups.value.push(yearMonth);
        } else {
            expandedRowGroups.value.splice(index, 1);
        }
    };

    const calculateGroupTotals = (yearMonth) => {
        if (!reportData.value || !yearMonth) {
            return { prevDayTotal: 0, snapshotDayTotal: 0, diffTotal: 0 };
        }
        const groupItems = reportData.value.filter(item => item.yearMonth === yearMonth);
        const totals = groupItems.reduce((acc, item) => {
            acc.prevDayTotal += item.count_as_of_previous_day_end;
            acc.snapshotDayTotal += item.count_as_of_snapshot_day_end;
            acc.diffTotal += item.daily_difference;
            return acc;
        }, { prevDayTotal: 0, snapshotDayTotal: 0, diffTotal: 0 });
        return totals;
    };

    watch(lineChartOptions, async (newOptions) => {
        // Ensure the chart container is rendered and DOM is ready
        await nextTick();

        if (lineChartContainer.value) { // Check if container exists
            if (!lineChartInstance.value || lineChartInstance.value.isDisposed?.()) {
                // If no instance or it's disposed, initialize a new one
                lineChartInstance.value = echarts.init(lineChartContainer.value);
            }
            // Set the new options
            // The 'true' argument in setOption means 'notMerge', which is often good for dynamic data
            // to prevent old series from sticking around if they are removed from new options.
            // However, if only data within a series changes, 'false' (merge) might be slightly more performant.
            // For this case, where the entire structure might change (e.g. 'No Data' state), 'true' is safer.
            lineChartInstance.value.setOption(newOptions, true);
        }
    }, { deep: true, immediate: true }); // immediate: true to run on initial load

    const resizeChartHandler = () => {
        lineChartInstance.value?.resize();
    };

    onMounted(() => {
        window.addEventListener('resize', resizeChartHandler);
        // Initial chart rendering is handled by the 'immediate' watcher on lineChartOptions
    });

    onBeforeUnmount(() => {
        lineChartInstance.value?.dispose();
        window.removeEventListener('resize', resizeChartHandler);
    });

</script>

<style scoped>
::v-deep(td[data-pc-section="rowgroupheadercell"] > button.p-datatable-row-toggle-button) {
    display: none !important;
}
</style>
