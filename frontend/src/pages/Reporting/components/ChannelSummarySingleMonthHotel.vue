<template>
    <div class="p-4">
        <h3 class="text-xl font-semibold mb-4">予約分析</h3>

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
            <Panel header="予約チャンネルと支払タイミング" toggleable :collapsed="false">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div ref="bookingSourceChart" class="w-full h-60"></div>
                    <div ref="paymentTimingChart" class="w-full h-60"></div>
                </div>
            </Panel>

            <Panel header="予約者属性と滞在日数" toggleable :collapsed="false" class="mt-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div ref="bookerTypeChart" class="w-full h-60"></div>
                    <div ref="averageLengthOfStayChart" class="w-full h-60"></div>
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
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import { useReportStore } from '@/composables/useReportStore';
import ProgressSpinner from 'primevue/progressspinner';
import Card from 'primevue/card';
import SelectButton from 'primevue/selectbutton';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Panel from 'primevue/panel';
import Tag from 'primevue/tag';
import * as echarts from 'echarts/core';
import { TreemapChart, PieChart, ScatterChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, VisualMapComponent, MarkLineComponent, MarkPointComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { formatDate } from '@/utils/dateUtils';

echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    VisualMapComponent,
    MarkLineComponent,
    MarkPointComponent,
    TreemapChart,
    PieChart,
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

const { fetchChannelSummary, fetchBookingSourceBreakdown, fetchPaymentTimingBreakdown, fetchBookerTypeBreakdown, fetchReservationListView } = useReportStore();
const chartData = ref([]);
const loading = ref(false);
const error = ref(null);
const bookingSourceChart = ref(null);
let myBookingSourceChart = null;
const paymentTimingChart = ref(null);
let myPaymentTimingChart = null;
const bookerTypeChart = ref(null);
let myBookerTypeChart = null;
const averageLengthOfStayChart = ref(null);
let myAverageLengthOfStayChart = null;

const bookingSourceData = ref([]);
const paymentTimingData = ref([]);
const bookerTypeData = ref([]);
const averageLengthOfStayData = ref([]);
const averageNights = ref(0);
const averagePeople = ref(0);

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
        
        const [data, bookingSourceResult, paymentResult, bookerTypeResult, reservationListResult] = await Promise.all([
            fetchChannelSummary([props.hotelId], startDate, endDate),
            fetchBookingSourceBreakdown(props.hotelId, startDate, endDate),
            fetchPaymentTimingBreakdown(props.hotelId, startDate, endDate),
            fetchBookerTypeBreakdown(props.hotelId, startDate, endDate),
            fetchReservationListView(props.hotelId, startDate, endDate)
        ]);

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

        processBookerTypeData(bookerTypeResult);
        processAverageLengthOfStayData(reservationListResult);

    } catch (err) {
        error.value = err.message || 'データの取得中にエラーが発生しました。';
    } finally {
        loading.value = false;
    }
};

const processBookerTypeData = (bookerTypeBreakdownData) => {
    if (!bookerTypeBreakdownData || bookerTypeBreakdownData.length === 0) {
        bookerTypeData.value = [];
        initBookerTypeChart();
        return;
    }

    const mappedData = bookerTypeBreakdownData.map(item => {
        let name;
        if (item.legal_or_natural_person === 'individual' || item.legal_or_natural_person === 'natural') {
            name = '個人';
        } else if (item.legal_or_natural_person === 'corporate' || item.legal_or_natural_person === 'legal') {
            name = '法人';
        } else {
            name = '未設定';
        }
        return { name, value: item.room_nights };
    });

    const aggregatedData = mappedData.reduce((acc, current) => {
        const existing = acc.find(item => item.name === current.name);
        if (existing) {
            existing.value += current.value;
        } else {
            acc.push({ ...current });
        }
        return acc;
    }, []);

    bookerTypeData.value = aggregatedData.filter(item => item.value > 0);
    initBookerTypeChart();
};

const initBookerTypeChart = () => {
    if (!bookerTypeChart.value) return;
    if (myBookerTypeChart) {
        myBookerTypeChart.dispose();
    }
    myBookerTypeChart = echarts.init(bookerTypeChart.value);

    const option = {
        color: ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc"],
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} 泊 ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            bottom: 'bottom'
        },
        series: [
            {
                name: '予約者区分',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['50%', '50%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: true,
                    position: 'outside',
                    formatter: (params) => {
                        const total = bookerTypeData.value.reduce((sum, item) => sum + item.value, 0);
                        const percentage = (params.value / total * 100);
                        return percentage > 5 ? `${params.name}: ${percentage.toFixed(1)}%` : '';
                    }
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 20,
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: true
                },
                data: bookerTypeData.value
            }
        ]
    };
    myBookerTypeChart.setOption(option, true);
};

const processAverageLengthOfStayData = (reservationListData) => {
    if (!reservationListData) {
        averageLengthOfStayData.value = [];
        averageNights.value = 0;
        averagePeople.value = 0;
        initAverageLengthOfStayChart();
        return;
    }

    const rawDataForScatter = [];
    let totalNightsSum = 0;
    let totalPeopleSum = 0;
    let reservationCount = 0;

    reservationListData
        .filter(res => res.number_of_nights > 0 && res.number_of_people > 0)
        .forEach(res => {
            const nights = Number(res.number_of_nights);
            const people = Number(res.number_of_people);
            rawDataForScatter.push([nights, people]);
            totalNightsSum += nights;
            totalPeopleSum += people;
            reservationCount++;
        });

    averageLengthOfStayData.value = rawDataForScatter;
    averageNights.value = reservationCount > 0 ? (totalNightsSum / reservationCount) : 0;
    averagePeople.value = reservationCount > 0 ? (totalPeopleSum / reservationCount) : 0;

    initAverageLengthOfStayChart();
};

const initAverageLengthOfStayChart = () => {
    if (!averageLengthOfStayChart.value) return;
    if(myAverageLengthOfStayChart) {
        myAverageLengthOfStayChart.dispose();
    }
    myAverageLengthOfStayChart = echarts.init(averageLengthOfStayChart.value);

    const option = {
        grid: {
            left: '3%',
            right: '7%',
            bottom: '7%',
            containLabel: true
        },
        tooltip: {
            showDelay: 0,
            formatter: function (params) {
                if (params.value.length > 1) {
                    return `泊数: ${params.value[0]}泊<br/>人数: ${params.value[1]}人`;
                }
                return `${params.seriesName} :<br/>${params.name} : ${params.value} `;
            },
            axisPointer: {
                show: true,
                type: 'cross',
                lineStyle: {
                    type: 'dashed',
                    width: 1
                }
            }
        },
        xAxis: [
            {
                type: 'value',
                scale: true,
                axisLabel: {
                    formatter: '{value} 泊'
                },
                splitLine: {
                    show: false
                }
            }
        ],
        yAxis: [
            {
                type: 'value',
                scale: true,
                axisLabel: {
                    formatter: '{value} 人'
                },
                splitLine: {
                    show: false
                }
            }
        ],
        series: [
            {
                name: '予約データ',
                type: 'scatter',
                data: averageLengthOfStayData.value,
                markPoint: {
                    data: [
                        { type: 'max', name: '最大値' },
                        { type: 'min', name: '最小値' }
                    ]
                },
                markLine: {
                    lineStyle: {
                        type: 'solid'
                    },
                    data: [
                        { xAxis: averageNights.value, name: '平均泊数' },
                        { yAxis: averagePeople.value, name: '平均人数' }
                    ]
                }
            }
        ]
    };
    myAverageLengthOfStayChart.setOption(option, true);
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
        myBookerTypeChart?.dispose();
        myBookerTypeChart = null;
        myAverageLengthOfStayChart?.dispose();
        myAverageLengthOfStayChart = null;

        initBookingSourceChart();
        initPaymentTimingChart();
        initBookerTypeChart();
        initAverageLengthOfStayChart();
    } else {
        disposeAllCharts();
    }
};

const disposeAllCharts = () => {
    myBookingSourceChart?.dispose();
    myBookingSourceChart = null;
    myPaymentTimingChart?.dispose();
    myPaymentTimingChart = null;
    myBookerTypeChart?.dispose();
    myBookerTypeChart = null;
    myAverageLengthOfStayChart?.dispose();
    myAverageLengthOfStayChart = null;
};

const resizeChart = () => {
    myBookingSourceChart?.resize();
    myPaymentTimingChart?.resize();
    myBookerTypeChart?.resize();
    myAverageLengthOfStayChart?.resize();
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

watch(() => [props.hotelId, props.triggerFetch, props.selectedDate], async () => {    
    await fetchReportData();
    if (selectedView.value === 'graph') {
        refreshAllCharts();
    }
}, { deep: true });

watch(chartData, () => {
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
