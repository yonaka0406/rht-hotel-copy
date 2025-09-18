
<template>
    <div class="p-4">
        <h3 class="text-xl font-semibold mb-4">チャネルサマリー（年間累計）</h3>

        <div class="flex justify-end mb-2">
            <SelectButton v-model="selectedView" :options="viewOptions" optionLabel="label" optionValue="value" />
        </div>

        <div v-if="loading" class="flex justify-center items-center">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" animationDuration=".5s" />
        </div>

        <div v-else-if="error" class="text-red-500 bg-red-100 border border-red-400 p-4 rounded">
            <p class="font-bold">エラーが発生しました</p>
            <p>{{ error }}</p>
        </div>
        <div v-else-if="chartData && chartData.length > 0">
            <div v-if="selectedView === 'graph'">
                <Card>
                    <template #header>
                        <h4 class="text-lg font-semibold mb-3">ホテル別チャネル分布</h4>
                    </template>
                    <template #content>
                        <div ref="scatterPlotContainer" style="width: 100%; height: 500px;"></div>
                    </template>
                </Card>
            </div>
            <div v-else-if="selectedView === 'table'">
                <Card>
                    <template #header>
                        <h4 class="text-lg font-semibold mb-3">チャネルサマリーデータ</h4>
                    </template>
                    <template #content>
                        <DataTable :value="chartData" responsiveLayout="scroll">
                            <Column field="hotel_name" header="ホテル名"></Column>
                            <Column field="reserved_dates" header="予約日数"></Column>
                            <Column field="web_percentage" header="WEB/OTA予約率 (%)">
                                <template #body="slotProps">
                                    {{ parseFloat(slotProps.data.web_percentage).toFixed(1) }}%
                                </template>
                            </Column>
                            <Column field="direct_percentage" header="直予約率 (%)">
                                <template #body="slotProps">
                                    {{ parseFloat(slotProps.data.direct_percentage).toFixed(1) }}%
                                </template>
                            </Column>
                        </DataTable>
                    </template>
                </Card>
            </div>
        </div>
        <div v-else class="text-gray-500">
            データがありません。
        </div>
        }
    </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, shallowRef, nextTick, computed } from 'vue';
import { useReportStore } from '@/composables/useReportStore';
import ProgressSpinner from 'primevue/progressspinner';
import Card from 'primevue/card';
import SelectButton from 'primevue/selectbutton';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import * as echarts from 'echarts/core';
import { ScatterChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { formatDate } from '@/utils/dateUtils';

echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    VisualMapComponent,
    ScatterChart,
    CanvasRenderer
]);

const props = defineProps({
    hotelId: {
        type: Number,
        required: true
    },
    triggerFetch: {
        type: [String, Number, Object, Boolean],
        default: () => new Date().toISOString(),
    },
    selectedDate: {
        type: Date,
        required: true
    }
});

const selectedView = ref('graph');
const viewOptions = ref([
    { label: 'グラフ', value: 'graph' },
    { label: 'テーブル', value: 'table' }
]);

const { fetchChannelSummary } = useReportStore();
const chartData = ref([]);
const loading = ref(false);
const error = ref(null);
const scatterPlotContainer = ref(null);
const scatterPlotInstance = shallowRef(null);

const fetchReportData = async () => {
    if (!props.hotelId) {
        chartData.value = [];
        error.value = 'ホテルが選択されていません。';
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        const year = props.selectedDate.getFullYear();
        const startDate = formatDate(new Date(year, 0, 1)); // January 1st of the selected year
        const endDate = formatDate(props.selectedDate); // The selected date
        const data = await fetchChannelSummary([props.hotelId], startDate, endDate);
        chartData.value = data;
    } catch (err) {
        error.value = err.message || 'データの取得中にエラーが発生しました。';
    } finally {
        loading.value = false;
    }
};

const chartOptions = {
    xAxis: {
        name: 'WEB/OTA予約率 (%)',
        type: 'value',
        axisLabel: {
            formatter: '{value} %'
        }
    },
    yAxis: {
        name: '直予約率 (%)',
        type: 'value',
        axisLabel: {
            formatter: '{value} %'
        }
    },
    tooltip: {
        trigger: 'item',
        formatter: function (params) {
            const webPercentage = parseFloat(params.data.value[0]).toFixed(1);
            const directPercentage = parseFloat(params.data.value[1]).toFixed(1);
            return `${params.data.name}<br/>WEB/OTA: ${webPercentage}%<br/>Direct: ${directPercentage}%<br/>予約日数: ${params.data.reserved_dates}`;
        }
    },
    series: [{
        name: 'ホテル',
        type: 'scatter',
        data: [],
        symbolSize: function (value, params) {
            return Math.sqrt(params.data.reserved_dates) * 2;
        },
        emphasis: {
            focus: 'series',
            label: {
                show: true,
                formatter: function (param) {
                    return param.data.name;
                },
                position: 'top'
            }
        },
    }]
};


const initChart = () => {
    if (scatterPlotContainer.value) {
        scatterPlotInstance.value = echarts.init(scatterPlotContainer.value);
        scatterPlotInstance.value.setOption(chartOptions);
    } else {
        console.error('Scatter plot container not found');
    }
};

const initOrUpdateChart = (instanceRef, containerRef, options) => {
    if (containerRef.value) {
        if (!instanceRef.value || instanceRef.value.isDisposed?.()) {
            instanceRef.value = echarts.init(containerRef.value);
        }
        instanceRef.value.setOption(options, true);
        instanceRef.value.resize();
    } else if (instanceRef.value && !instanceRef.value.isDisposed?.()) {
        instanceRef.value.dispose();
        instanceRef.value = null;
    }
};

const refreshAllCharts = () => {
    if (chartData.value && chartData.value.length > 0) {
        initOrUpdateChart(scatterPlotInstance, scatterPlotContainer, chartOptions);
    } else {
        scatterPlotInstance.value?.dispose();
        scatterPlotInstance.value = null;
    }
};

const disposeAllCharts = () => {
    scatterPlotInstance.value?.dispose();
    scatterPlotInstance.value = null;
};

const resizeChart = () => {
    scatterPlotInstance.value?.resize();
};

onMounted(() => {
    fetchReportData();
    window.addEventListener('resize', resizeChart);
});

onBeforeUnmount(() => {
    disposeAllCharts();
    window.removeEventListener('resize', resizeChart);
});

watch(() => [props.hotelId, props.triggerFetch, props.selectedDate], fetchReportData, { deep: true });

watch(selectedView, async (newView) => {
    if (newView === 'graph') {
        await nextTick();
        refreshAllCharts();
    } else {
        disposeAllCharts();
    }
});


</script>
