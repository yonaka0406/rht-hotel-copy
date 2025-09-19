<template>
    <div class="p-4">
        <h3 class="text-xl font-semibold mb-4">チャネルサマリー</h3>

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
                <Panel header="予約チャンネルと支払タイミング" toggleable :collapsed="false" class="col-span-12">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-12">
                            <Card>
                                <template #title>予約チャンネル内訳 (泊数ベース)</template>
                                <template #content>
                                    <div ref="bookingSourceChart" class="w-full h-60"></div>
                                </template>
                            </Card>
                        </div>
                        <div class="col-span-12 md:col-span-12">
                            <Card>
                                <template #title>支払タイミング内訳 (泊数ベース)</template>
                                <template #content>
                                    <div ref="paymentTimingChart" class="w-full h-60"></div>
                                </template>
                            </Card>
                        </div>
                    </div>
                </Panel>
            </div>
            <div v-else-if="selectedView === 'table'">
                <Panel header="テーブル表示" toggleable :collapsed="false" class="col-span-12">
                    <div class="grid grid-cols-12 gap-4">
                        <Card class="col-span-12 md:col-span-6">
                            <template #header>
                                <div class="flex-1 text-center font-bold">予約チャンネル内訳 (泊数ベース)</div>
                            </template>
                            <template #content>
                                <DataTable :value="bookingSourceData" responsiveLayout="scroll">
                                    <template #footer>
                                        <div class="flex justify-end font-bold">
                                            合計: {{ totalBookingSourceRoomNights.toLocaleString('ja-JP') }} 泊
                                        </div>
                                    </template>
                                    <Column field="type" bodyStyle="text-align:center">
                                        <template #header>
                                            <div class="flex-1 text-center font-bold">タイプ</div>
                                        </template>
                                        <template #body="slotProps">
                                            {{ translateBookingSourceType(slotProps.data.type) }}
                                        </template>
                                    </Column>
                                    <Column field="agent" bodyStyle="text-align:center"
                                        headerStyle="text-align:center">
                                        <template #header><div class="flex-1 text-center font-bold">エージェント</div></template>
                                    </Column>
                                    <Column field="room_nights" bodyStyle="text-align:center"
                                        headerStyle="text-align:center">
                                        <template #header><div class="flex-1 text-center font-bold">宿泊数</div></template>
                                        <template #body="slotProps">
                                            <div class="flex items-center justify-end gap-2">
                                                <span>{{ slotProps.data.room_nights.toLocaleString('ja-JP') }}</span>
                                                <Tag :value="`${slotProps.data.percentage.toFixed(1)}%`" severity="info" />
                                            </div>
                                        </template>
                                    </Column>
                                </DataTable>
                            </template>
                        </Card>
                        <Card class="col-span-12 md:col-span-6">
                            <template #header>
                                <div class="flex-1 text-center font-bold">支払タイミング内訳 (泊数ベース)</div>
                            </template>
                            <template #content>
                                <DataTable :value="paymentTimingData" responsiveLayout="scroll">
                                    <template #footer>
                                        <div class="flex justify-end font-bold">
                                            合計: {{ totalPaymentTimingCount.toLocaleString('ja-JP') }} 泊
                                        </div>
                                    </template>
                                    <Column field="paymentTiming" bodyStyle="text-align:center"
                                        headerStyle="text-align:center">
                                        <template #header><div class="flex-1 text-center font-bold">支払タイミング</div></template>
                                        <template #body="slotProps">
                                            {{ translatePaymentTiming(slotProps.data.paymentTiming) }}
                                        </template>
                                    </Column>
                                    <Column field="count" bodyStyle="text-align:center"
                                        headerStyle="text-align:center">
                                        <template #header><div class="flex-1 text-center font-bold">宿泊数</div></template>
                                        <template #body="slotProps">
                                            <div class="flex items-center justify-end gap-2">
                                                <span>{{ slotProps.data.count.toLocaleString('ja-JP') }}</span>
                                                <Tag :value="`${slotProps.data.percentage.toFixed(1)}%`" severity="info" />
                                            </div>
                                        </template>
                                    </Column>
                                </DataTable>
                            </template>
                        </Card>
                    </div>
                </Panel>
            </div>
        </div>
        <div v-else class="text-gray-500">
            データがありません。
        </div>
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
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';
import * as echarts from 'echarts/core';
import { TreemapChart, PieChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { formatDate } from '@/utils/dateUtils';

echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    VisualMapComponent,
    TreemapChart,
    PieChart,
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

const formattedMonth = computed(() => {
    const date = props.selectedDate;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
});

const { fetchChannelSummary, fetchBookingSourceBreakdown, fetchPaymentTimingBreakdown } = useReportStore();
const chartData = ref([]);
const loading = ref(false);
const error = ref(null);
const bookingSourceChart = ref(null);
let myBookingSourceChart = null;
const paymentTimingChart = ref(null);
let myPaymentTimingChart = null;

const bookingSourceData = ref([]);
const paymentTimingData = ref([]);

const translatePaymentTiming = (timing) => {
    const map = {
        'not_set': '未設定',
        'prepaid': '事前決済',
        'on-site': '現地決済',
        'postpaid': '後払い'
    };
    return map[timing] || timing;
};

const translateBookingSourceType = (type) => {
    const map = {
        'default': '通常',
        'ota': 'OTA',
        'web': 'WEB'
    };
    return map[type] || type;
};

const totalBookingSourceRoomNights = computed(() => {
    return bookingSourceData.value.reduce((sum, item) => sum + item.room_nights, 0);
});

const totalPaymentTimingCount = computed(() => {
    return paymentTimingData.value.reduce((sum, item) => sum + item.count, 0);
});

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
        const month = props.selectedDate.getMonth();
        const startDate = formatDate(new Date(year, month, 1));
        const endDate = formatDate(new Date(year, month + 1, 0));
        const data = await fetchChannelSummary([props.hotelId], startDate, endDate);
        const bookingSourceResult = await fetchBookingSourceBreakdown(props.hotelId, startDate, endDate);
        const paymentResult = await fetchPaymentTimingBreakdown(props.hotelId, startDate, endDate);

        const currentTotalBookingSourceRoomNights = bookingSourceResult.reduce((sum, item) => sum + item.room_nights, 0);
        const currentTotalPaymentTimingCount = paymentResult.reduce((sum, item) => sum + item.count, 0);

        bookingSourceData.value = bookingSourceResult.map(item => ({
            ...item,
            percentage: currentTotalBookingSourceRoomNights > 0 ? (item.room_nights / currentTotalBookingSourceRoomNights) * 100 : 0
        }));
        paymentTimingData.value = paymentResult.map(item => ({
            ...item,
            percentage: currentTotalPaymentTimingCount > 0 ? (item.count / currentTotalPaymentTimingCount) * 100 : 0
        }));

        chartData.value = data;

    } catch (err) {
        error.value = err.message || 'データの取得中にエラーが発生しました。';
    } finally {
        loading.value = false;
    }
};







const initBookingSourceChart = () => {
    if (!bookingSourceChart.value) return;

    const sourceData = bookingSourceData.value;
    if (!sourceData || sourceData.length === 0) return;

    const data = [];
    const directNode = { name: '直予約', value: 0 };
    const otaNode = { name: 'OTA', children: [] };
    const webNode = { name: '自社HP', children: [] }; // Renamed to represent 自社HP specifically
    const webParentNode = { name: 'WEB', children: [] }; // New parent node for WEB

    const otaAgentMap = new Map();
    const webAgentMap = new Map(); // This will now collect agents for 自社HP

    sourceData.forEach(item => {
        if (item.type === 'ota') {
            const agentName = item.agent || 'その他';
            if (!otaAgentMap.has(agentName)) {
                otaAgentMap.set(agentName, 0);
            }
            otaAgentMap.set(agentName, otaAgentMap.get(agentName) + item.room_nights);
        } else if (item.type === 'web') {
            const agentName = item.agent || 'その他'; // This 'agent' would be 'official' or 'other' for web
            if (!webAgentMap.has(agentName)) {
                webAgentMap.set(agentName, 0);
            }
            webAgentMap.set(agentName, webAgentMap.get(agentName) + item.room_nights);
        } else {
            directNode.value += item.room_nights;
        }
    });

    otaAgentMap.forEach((value, name) => {
        otaNode.children.push({ name, value });
    });

    webAgentMap.forEach((value, name) => {
        webNode.children.push({ name, value });
    });

    // Now, construct the main 'data' array
    if (directNode.value > 0) data.push(directNode);

    // Add OTA and 自社HP (webNode) as children of webParentNode
    if (otaNode.children.length > 0) webParentNode.children.push(otaNode);
    if (webNode.children.length > 0) webParentNode.children.push(webNode);

    // Push the webParentNode if it has children
    if (webParentNode.children.length > 0) data.push(webParentNode);

    const option = {
        color: ['#FFDAB9', '#B2EBF2', '#E6E6FA', '#F08080', '#EEE8AA'], // New pastel colors
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                if (params.treePathInfo && params.treePathInfo.length > 0) {
                    const current = params.treePathInfo[params.treePathInfo.length - 1];
                    const rootTotal = params.treePathInfo[0].value; // Get the total from the root node
                    const percentage = (current.value / rootTotal * 100).toFixed(1);
                    return `${params.name}: ${current.value}泊 (${percentage}%)`;
                }
                return `${params.name}: ${params.value}泊`;
            }
        },
        series: {
            type: 'treemap',
            data: data,
            radius: [0, '100%'],
            center: ['50%', '50%'],
            label: {
                formatter: (params) => {
                    // This formatter will now apply to lower levels
                    if (params.treePathInfo && params.treePathInfo.length > 0) {
                        const current = params.treePathInfo[params.treePathInfo.length - 1];
                        const rootTotal = params.treePathInfo[0].value;
                        const percentage = (current.value / rootTotal * 100).toFixed(1);

                        if (percentage > 2) { // Only show for lower levels if percentage is significant
                            return `${params.name}\n${percentage}%`;
                        }
                    }
                    return '';
                },
                color: '#000' // Labels black
            },
            itemStyle: {
                borderColor: '#fff',
                borderRadius: 5 // Rounded borders for the main treemap items
            },
            levels: [
                {
                    itemStyle: {
                        borderWidth: 4, // Thicker border
                        borderColor: 'rgba(70, 92, 107, 0.5)', // Dark blue-grey border with transparency
                        gapWidth: 2, // Thicker gap
                        borderRadius: 5 // Rounded borders for the first level
                    },
                    upperLabel: {
                        show: false, // Changed to false
                        formatter: (params) => {
                            const current = params.treePathInfo[params.treePathInfo.length - 1];
                            const rootTotal = params.treePathInfo[0].value;
                            const percentage = (current.value / rootTotal * 100).toFixed(1);
                            return `${params.name}\n${percentage}%`; // Always show name and percentage for top-level
                        },
                        color: '#000' // Labels black
                    },
                    emphasis: { // Added emphasis for first level
                        itemStyle: {
                            borderColor: 'rgba(221, 221, 221, 0.7)', // Light grey border with transparency on hover
                            borderWidth: 4 // Thicker border on hover
                        }
                    }
                },
                {
                    itemStyle: {
                        borderWidth: 6, // Thicker border
                        borderColor: 'rgba(70, 92, 107, 0.5)', // Dark blue-grey border with transparency
                        gapWidth: 2, // Thicker gap
                        borderRadius: 5 // Rounded borders for the second level
                    },
                    emphasis: {
                        itemStyle: {
                            borderColor: 'rgba(221, 221, 221, 0.7)', // Light grey border with transparency on hover
                            borderWidth: 4 // Thicker border on hover
                        }
                    }
                },
                {
                    itemStyle: {
                        borderWidth: 6, // Thicker border
                        borderColor: 'rgba(70, 92, 107, 0.5)', // Dark blue-grey border with transparency
                        gapWidth: 2, // Thicker gap
                        borderRadius: 5 // Rounded borders for the third level
                    },
                    emphasis: {
                        itemStyle: {
                            borderColor: 'rgba(221, 221, 221, 0.7)', // Light grey border with transparency on hover
                            borderWidth: 2 // Thicker border on hover
                        }
                    }
                }
            ]
        }
    };

    if (!myBookingSourceChart) {
        myBookingSourceChart = echarts.init(bookingSourceChart.value);
    }
    myBookingSourceChart.setOption(option, true);
};

const initPaymentTimingChart = () => {
    if (!paymentTimingChart.value) return;

    const paymentData = paymentTimingData.value;
    if (!paymentData || paymentData.length === 0) return;

    const chartData = paymentData.map(item => ({
        value: item.count,
        name: translatePaymentTiming(item.paymentTiming)
    }));

    const option = {
        color: ["#3fb1e3", "#6be6c1", "#626c91", "#a0a7e6", "#c4ebad", "#96dee8"],
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} 泊 ({d}%)'
        },
        legend: {
            bottom: '5%',
            left: 'center'
        },
        series: [
            {
                name: '支払タイミング',
                type: 'pie',
                radius: ['40%', '60%'],
                center: ['50%', '40%'],
                avoidLabelOverlap: false,
                padAngle: 5,
                itemStyle: {
                    borderRadius: 10
                },
                label: {
                    show: true,
                    position: 'outside',
                    formatter: '{d}%'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 24,
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: true
                },
                data: chartData
            }
        ]
    };

    if (!myPaymentTimingChart) {
        myPaymentTimingChart = echarts.init(paymentTimingChart.value);
    }
    myPaymentTimingChart.setOption(option, true);
};

const refreshAllCharts = () => {
    if (chartData.value && chartData.value.length > 0) {
        // Dispose and re-initialize for a full re-render
        myBookingSourceChart?.dispose();
        myBookingSourceChart = null;
        myPaymentTimingChart?.dispose();
        myPaymentTimingChart = null;
        initBookingSourceChart();
        initPaymentTimingChart();
    } else {
        myBookingSourceChart?.dispose();
        myBookingSourceChart = null;
        myPaymentTimingChart?.dispose();
        myPaymentTimingChart = null;
    }
};

const disposeAllCharts = () => {
    myBookingSourceChart?.dispose();
    myBookingSourceChart = null;
    myPaymentTimingChart?.dispose();
    myPaymentTimingChart = null;
};

const resizeChart = () => {
    myBookingSourceChart?.resize();
    myPaymentTimingChart?.resize();
};

onMounted(async () => {
    await fetchReportData();
    refreshAllCharts(); // Call refreshAllCharts after data is fetched
    window.addEventListener('resize', resizeChart);
});

onBeforeUnmount(() => {
    disposeAllCharts();
    window.removeEventListener('resize', resizeChart);
});

watch(() => [props.hotelId, props.triggerFetch, props.selectedDate], async ([newHotelId, newTrigger, newDate], [oldHotelId, oldTrigger, oldDate]) => {    
    await fetchReportData();
    if (selectedView.value === 'graph') {
        refreshAllCharts();
    }
}, { deep: true });

watch(chartData, (newData) => {
    if (selectedView.value === 'graph') {
        refreshAllCharts();
    }
}, { deep: true });

watch(selectedView, async (newView) => {
    if (newView === 'graph') {
        await nextTick();
        refreshAllCharts();
    } else {
        disposeAllCharts();
    }
});

</script>
