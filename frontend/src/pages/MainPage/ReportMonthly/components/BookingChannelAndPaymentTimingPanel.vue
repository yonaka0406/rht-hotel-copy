<template>
    <Panel header="予約チャンネルと支払タイミング" toggleable :collapsed="false" class="col-span-12">
        <div class="grid grid-cols-12 gap-4">
            <div class="col-span-12 md:col-span-6">
                <Card>
                    <template #title>予約チャンネル内訳 (泊数ベース)</template>
                    <template #content>
                        <div ref="bookingSourceChart" class="w-full h-60"></div>
                    </template>
                </Card>
            </div>
            <div class="col-span-12 md:col-span-6">
                <Card>
                    <template #title>支払タイミング内訳 (泊数ベース)</template>
                    <template #content>
                        <div ref="paymentTimingChart" class="w-full h-60"></div>
                    </template>
                </Card>
            </div>
        </div>
    </Panel>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { Card, Panel } from 'primevue';
import * as echarts from 'echarts/core';
import {
    TooltipComponent,
    LegendComponent
} from 'echarts/components';
import { TreemapChart, PieChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    TooltipComponent,
    LegendComponent,
    TreemapChart,
    PieChart,
    CanvasRenderer
]);

const props = defineProps({
    bookingSourceData: {
        type: Array,
        required: true
    },
    paymentTimingData: {
        type: Array,
        required: true
    },
    translateReservationPaymentTiming: {
        type: Function,
        required: true
    }
});

// Booking Source Chart (Treemap)
const bookingSourceChart = ref(null);
let myBookingSourceChart = null;

const initBookingSourceChart = () => {
    if (!bookingSourceChart.value) return;

    const sourceData = props.bookingSourceData;
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
            label: {
                formatter: (params) => {
                    // This formatter will now apply to lower levels
                    if (params.treePathInfo && params.treePathInfo.length > 0) {
                        const current = params.treePathInfo[params.treePathInfo.length - 1];
                        const rootTotal = params.treePathInfo[0].value;
                        const percentage = (current.value / rootTotal * 100).toFixed(1);

                        if (percentage > 2) { // Only show for lower levels if percentage is significant
                            return `${params.name}
${percentage}%`;
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
                            return `${params.name}
${percentage}%`; // Always show name and percentage for top-level
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

// Payment Timing Chart (Pie)
const paymentTimingChart = ref(null);
let myPaymentTimingChart = null;

const initPaymentTimingChart = () => {
    if (!paymentTimingChart.value) return;

    const paymentData = props.paymentTimingData;
    if (!paymentData || paymentData.length === 0) return;

    const chartData = paymentData.map(item => ({
        value: item.count,
        name: props.translateReservationPaymentTiming(item.paymentTiming)
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

const handleResize = () => {
    if (myBookingSourceChart) myBookingSourceChart.resize();
    if (myPaymentTimingChart) myPaymentTimingChart.resize();
};

onMounted(() => {
    initBookingSourceChart();
    initPaymentTimingChart();
    window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (myBookingSourceChart) myBookingSourceChart.dispose();
    if (myPaymentTimingChart) myPaymentTimingChart.dispose();
});

watch(() => props.bookingSourceData, () => {
    initBookingSourceChart();
}, { deep: true });

watch(() => props.paymentTimingData, () => {
    initPaymentTimingChart();
}, { deep: true });
</script>
