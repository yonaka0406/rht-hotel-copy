<template>
    <div class="p-4">
        <h3 class="text-xl font-semibold mb-4">予約分析（単月）</h3>

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
                <Card v-if="scatterPlotSeriesData.length > 0">
                    <template #header>
                        <div class="flex-1 text-center font-bold">ホテル別チャネル分布</div>
                    </template>
                    <template #content>
                        <div ref="scatterPlotContainer" style="width: 100%; height: 500px;"></div>
                    </template>
                </Card>

                <Card class="mt-4" v-if="paymentTimingChartData.hotels.length > 0">
                    <template #header>
                        <div class="flex-1 text-center font-bold">ホテル別支払タイミング分布</div>
                    </template>
                    <template #content>
                        <div ref="paymentTimingChartContainer" style="width: 100%; height: 500px;"></div>
                    </template>
                </Card>

                <Card class="mt-4" v-if="bookerTypeChartData.hotels.length > 0">
                    <template #header>
                        <div class="flex-1 text-center font-bold">ホテル別予約者区分</div>
                    </template>
                    <template #content>
                        <div ref="bookerTypeChartContainer" style="width: 100%; height: 500px;"></div>
                    </template>
                </Card>

                <Card class="mt-4" v-if="lengthOfStayChartData.length > 0">
                    <template #header>
                        <div class="flex-1 text-center font-bold">ホテル別滞在日数</div>
                    </template>
                    <template #content>
                        <div ref="lengthOfStayChartContainer" style="width: 100%; height: 500px;"></div>
                    </template>
                </Card>
            </div>
            <div v-else-if="selectedView === 'table'">
                <Card>
                    <template #header>
                        <div class="flex-1 text-center font-bold">チャネルサマリーデータ</div>
                    </template>
                    <template #content>
                        <DataTable :value="chartData" responsiveLayout="scroll">
                            <Column field="hotel_name" sortable align="center">
                                <template #header>
                                    <div class="flex-1 text-center font-bold">ホテル名</div>
                                </template>
                            </Column>
                            <Column field="reserved_dates" sortable align="center">
                                <template #header>
                                    <div class="flex-1 text-center font-bold">宿泊数</div>
                                </template>
                                <template #body="slotProps">
                                    <div class="flex justify-center">
                                        {{ parseInt(slotProps.data.reserved_dates).toLocaleString('ja-JP') }}
                                    </div>
                                </template>
                            </Column>
                            <Column field="web_percentage" sortable align="center">
                                <template #header>
                                    <div class="flex-1 text-center font-bold">WEB/OTA予約率 (%)</div>
                                </template>
                                <template #body="slotProps">
                                    <div class="flex justify-center">
                                        {{ parseFloat(slotProps.data.web_percentage).toFixed(1) }}%
                                    </div>
                                </template>
                            </Column>
                            <Column field="direct_percentage" sortable align="center">
                                <template #header>
                                    <div class="flex-1 text-center font-bold">直予約率 (%)</div>
                                </template>
                                <template #body="slotProps">
                                    <div class="flex justify-center">
                                        {{ parseFloat(slotProps.data.direct_percentage).toFixed(1) }}%
                                    </div>
                                </template>
                            </Column>
                            <Column field="payment_timing" sortable align="center">
                                <template #header>
                                    <div class="flex-1 text-center font-bold">支払タイミング</div>
                                </template>
                                <template #body="slotProps">
                                    <div class="text-right">
                                        <div v-for="(value, key) in slotProps.data.payment_timing" :key="key">
                                            {{ translateReservationPaymentTiming(key) }}: {{
                                                Math.round(value).toLocaleString('ja-JP') }} 泊
                                            <Tag v-if="paymentTimingChartData.hotelTotals[slotProps.data.hotel_name] > 0"
                                                :value="`${(value / paymentTimingChartData.hotelTotals[slotProps.data.hotel_name] * 100).toFixed(1)}%`"
                                                severity="info" class="ml-2" />
                                        </div>
                                    </div>
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
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, shallowRef } from 'vue';
import { useReportStore } from '@/composables/useReportStore';
import ProgressSpinner from 'primevue/progressspinner';
import Card from 'primevue/card';
import SelectButton from 'primevue/selectbutton';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag'; // Added for percentage tag
import * as echarts from 'echarts/core';
import { ScatterChart, BarChart } from 'echarts/charts';
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
    BarChart, // Added BarChart
    CanvasRenderer
]);

const props = defineProps({
    selectedHotels: {
        type: Array,
        required: true
    },
    triggerFetch: {
        type: [String, Number, Object, Boolean],
        default: () => new Date().toISOString(),
    },
    selectedDate: {
        type: Date,
        required: true
    },
    reservationData: {
        type: Array,
        default: () => []
    },
    bookerTypeData: {
        type: Object,
        default: () => ({})
    }
});

const selectedView = ref('graph');
const viewOptions = ref([
    { label: 'グラフ', value: 'graph' },
    { label: 'テーブル', value: 'table' }
]);

const { fetchChannelSummary } = useReportStore();
const chartData = ref([]);
const bookerTypeData = ref([]);
const lengthOfStayData = ref([]);
const loading = ref(false);
const error = ref(null);
const scatterPlotContainer = ref(null);
const scatterPlotInstance = shallowRef(null);
const paymentTimingChartContainer = ref(null);
const paymentTimingChartInstance = shallowRef(null);
const bookerTypeChartContainer = ref(null);
const bookerTypeChartInstance = shallowRef(null);
const lengthOfStayChartContainer = ref(null);
const lengthOfStayChartInstance = shallowRef(null);

const translateReservationPaymentTiming = (timing) => {
    const map = {
        'not_set': '未設定',
        'prepaid': '事前決済',
        'on-site': '現地決済',
        'postpaid': '後払い'
    };
    return map[timing] || timing;
};

const reversetranslateReservationPaymentTiming = (translatedTiming) => {
    const map = {
        '未設定': 'not_set',
        '事前決済': 'prepaid',
        '現地決済': 'on-site',
        '後払い': 'postpaid'
    };
    return map[translatedTiming] || translatedTiming;
};

const paymentTimingChartData = computed(() => {
    if (!chartData.value || chartData.value.length === 0) {
        return {
            hotels: [],
            paymentTimings: [],
            series: []
        };
    }

    const allHotels = [...new Set(chartData.value.map(item => item.hotel_name))];
    const paymentTimings = [...new Set(chartData.value.flatMap(item => Object.keys(item.payment_timing || {})))];

    if (paymentTimings.length === 0) { // Handle case where no payment timings exist
        return {
            hotels: [],
            paymentTimings: [],
            series: []
        };
    }

    const firstSeriesTiming = paymentTimings[0]; // This is the "first series"

    // Calculate total reserved nights per hotel for percentage calculation
    const hotelTotals = {};
    chartData.value.forEach(hotel => {
        let total = 0;
        for (const timing in hotel.payment_timing) {
            total += hotel.payment_timing[timing];
        }
        hotelTotals[hotel.hotel_name] = total;
    });

    // Sort hotels based on the percentage of the first series timing
    const sortedHotels = [...allHotels].sort((hotelNameA, hotelNameB) => {
        const hotelDataA = chartData.value.find(item => item.hotel_name === hotelNameA);
        const rawValueA = hotelDataA?.payment_timing?.[firstSeriesTiming] || 0;
        const totalA = hotelTotals[hotelNameA];
        const percentageA = totalA > 0 ? (rawValueA / totalA) : 0;

        const hotelDataB = chartData.value.find(item => item.hotel_name === hotelNameB);
        const rawValueB = hotelDataB?.payment_timing?.[firstSeriesTiming] || 0;
        const totalB = hotelTotals[hotelNameB];
        const percentageB = totalB > 0 ? (rawValueB / totalB) : 0;

        return percentageB - percentageA; // Descending order
    });

    const series = paymentTimings.map(timing => {
        return {
            name: translateReservationPaymentTiming(timing),
            type: 'bar',
            stack: 'total', // Re-added stack: 'total' for stacking
            label: {
                show: true,
                formatter: (params) => {
                    // params.value is already a percentage here
                    const percentage = parseFloat(params.value.toFixed(1));
                    return percentage >= 5 ? `${percentage}%` : ''; // Hide if less than 5%
                },
                position: 'inside' // Center label inside the bar
            },
            emphasis: {
                focus: 'series'
            },
            data: sortedHotels.map(hotelName => {
                const hotelData = chartData.value.find(item => item.hotel_name === hotelName);
                const rawValue = hotelData?.payment_timing?.[timing] || 0;
                const total = hotelTotals[hotelName];
                return total > 0 ? parseFloat((rawValue / total * 100).toFixed(1)) : 0; // Convert to percentage
            })
        };
    });

    return {
        hotels: sortedHotels,
        paymentTimings,
        series,
        hotelTotals // Expose hotelTotals for tooltip formatter
    };
});

const paymentTimingChartOptions = computed(() => ({
    color: ["#3fb1e3", "#6be6c1", "#626c91", "#a0a7e6", "#c4ebad", "#96dee8"], // Added color palette
    tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        },
        formatter: function (params) {
            let tooltipContent = params[0].name + '<br/>'; // Hotel Name
            const hotelName = params[0].name;
            const hotelData = chartData.value.find(item => item.hotel_name === hotelName);

            params.forEach(function (item) {
                const translatedTiming = item.seriesName; // e.g., "現地決済"
                const timingKey = reversetranslateReservationPaymentTiming(translatedTiming); // e.g., "on-site"
                const rawValue = hotelData?.payment_timing?.[timingKey] || 0;
                const percentage = item.value; // This is the percentage

                tooltipContent += item.marker + translatedTiming + ': ' + Math.round(rawValue) + ' 泊 (' + percentage.toFixed(1) + '%)<br/>';
            });
            return tooltipContent;
        }
    },
    legend: {
        data: paymentTimingChartData.value.paymentTimings.map(translateReservationPaymentTiming),
        bottom: 0
    },
    grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
    },
    xAxis: {
        type: 'value',
        name: '割合 (%)',
        axisLabel: {
            formatter: '{value}%'
        },
        max: 100 // Ensures 100% stacked bar
    },
    yAxis: {
        type: 'category',
        data: paymentTimingChartData.value.hotels,
        axisLabel: {
            interval: 0,
            rotate: 0
        }
    },
    series: paymentTimingChartData.value.series
}));

const bookerTypeChartData = computed(() => {
    if (!bookerTypeData.value || bookerTypeData.value.length === 0) {
        return {
            hotels: [],
            series: []
        };
    }

    const filteredBookerTypeData = bookerTypeData.value.filter(hotelData =>
        hotelData.data && hotelData.data.some(d => d.room_nights > 0)
    );

    const sortedBookerTypeData = [...filteredBookerTypeData].sort((a, b) => {
        const getPercentage = (hotelData, type) => {
            const individualNights = hotelData.data.find(d => d.legal_or_natural_person === 'individual' || d.legal_or_natural_person === 'natural')?.room_nights || 0;
            const corporateNights = hotelData.data.find(d => d.legal_or_natural_person === 'corporate' || d.legal_or_natural_person === 'legal')?.room_nights || 0;
            const notSetNights = hotelData.data.find(d => d.legal_or_natural_person !== 'individual' && d.legal_or_natural_person !== 'natural' && d.legal_or_natural_person !== 'corporate' && d.legal_or_natural_person !== 'legal')?.room_nights || 0;
            const totalNights = individualNights + corporateNights + notSetNights;

            let value = 0;
            if (type === '個人') value = individualNights;
            else if (type === '法人') value = corporateNights;
            else if (type === '未設定') value = notSetNights;

            return totalNights > 0 ? (value / totalNights) : 0;
        };

        const percentageA_individual = getPercentage(a, '個人');
        const percentageB_individual = getPercentage(b, '個人');
        if (percentageA_individual !== percentageB_individual) {
            return percentageB_individual - percentageA_individual; // Descending for '個人'
        }

        const percentageA_corporate = getPercentage(a, '法人');
        const percentageB_corporate = getPercentage(b, '法人');
        if (percentageA_corporate !== percentageB_corporate) {
            return percentageB_corporate - percentageA_corporate; // Descending for '法人'
        }

        const percentageA_notSet = getPercentage(a, '未設定');
        const percentageB_notSet = getPercentage(b, '未設定');
        return percentageB_notSet - percentageA_notSet; // Descending for '未設定'
    });

    const hotels = sortedBookerTypeData.map(item => item.hotelName);
    const bookerTypes = ['個人', '法人', '未設定'];

    const series = bookerTypes.map(type => {
        return {
            name: type,
            type: 'bar',
            stack: 'total',
            label: {
                show: true,
                formatter: (params) => {
                    const percentage = parseFloat(params.value.toFixed(1));
                    return percentage >= 5 ? `${percentage}%` : '';
                },
                position: 'inside'
            },
            emphasis: {
                focus: 'series'
            },
            data: sortedBookerTypeData.map(hotelData => {
                const individualNights = hotelData.data.find(d => d.legal_or_natural_person === 'individual' || d.legal_or_natural_person === 'natural')?.room_nights || 0;
                const corporateNights = hotelData.data.find(d => d.legal_or_natural_person === 'corporate' || d.legal_or_natural_person === 'legal')?.room_nights || 0;
                const notSetNights = hotelData.data.find(d => d.legal_or_natural_person !== 'individual' && d.legal_or_natural_person !== 'natural' && d.legal_or_natural_person !== 'corporate' && d.legal_or_natural_person !== 'legal')?.room_nights || 0;
                const totalNights = individualNights + corporateNights + notSetNights;

                let value = 0;
                if (type === '個人') value = individualNights;
                else if (type === '法人') value = corporateNights;
                else if (type === '未設定') value = notSetNights;

                return totalNights > 0 ? parseFloat((value / totalNights * 100).toFixed(1)) : 0;
            })
        };
    });

    return {
        hotels,
        series
    };
});

const bookerTypeChartOptions = computed(() => ({
    color: ["#5470c6", "#91cc75", "#fac858"],
    tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        },
        formatter: function (params) {
            let tooltipContent = params[0].name + '<br/>'; // Hotel Name
            params.forEach(function (item) {
                tooltipContent += item.marker + item.seriesName + ': ' + item.value.toFixed(1) + '%<br/>';
            });
            return tooltipContent;
        }
    },
    legend: {
        data: ['個人', '法人', '未設定'],
        bottom: 0
    },
    grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
    },
    xAxis: {
        type: 'value',
        name: '割合 (%)',
        axisLabel: {
            formatter: '{value}%'
        },
        max: 100
    },
    yAxis: {
        type: 'category',
        data: bookerTypeChartData.value.hotels,
        axisLabel: {
            interval: 0,
            rotate: 0
        }
    },
    series: bookerTypeChartData.value.series
}));

const lengthOfStayChartData = computed(() => {
    if (!lengthOfStayData.value || lengthOfStayData.value.length === 0) {
        return [];
    }
    const filteredLengthOfStayData = lengthOfStayData.value.filter(hotelData =>
        hotelData.data && hotelData.data.some(d => (Number(d.number_of_nights) || 0) > 0 || (Number(d.number_of_people) || 0) > 0)
    );

    return filteredLengthOfStayData.map(hotelData => {
        const { totalNights, totalPeople, count } = hotelData.data.reduce((acc, res) => {
            acc.totalNights += Number(res.number_of_nights) || 0;
            acc.totalPeople += Number(res.number_of_people) || 0;
            acc.count++;
            return acc;
        }, { totalNights: 0, totalPeople: 0, count: 0 });

        const avgNights = count > 0 ? totalNights / count : 0;
        const avgPeople = count > 0 ? totalPeople / count : 0;

        return {
            name: hotelData.hotelName,
            value: [avgNights, avgPeople],
        };
    });
});

const lengthOfStayChartOptions = computed(() => ({
    xAxis: {
        name: '平均泊数',
        type: 'value',
        axisLabel: {
            formatter: '{value} 泊'
        }
    },
    yAxis: {
        name: '平均人数',
        type: 'value',
        axisLabel: {
            formatter: '{value} 人'
        }
    },
    tooltip: {
        trigger: 'item',
        formatter: function (params) {
            const avgNights = parseFloat(params.data.value[0]).toFixed(2);
            const avgPeople = parseFloat(params.data.value[1]).toFixed(2);
            return `${params.data.name}<br/>平均泊数: ${avgNights}泊<br/>平均人数: ${avgPeople}人`;
        }
    },
    series: [{
        name: 'ホテル',
        type: 'scatter',
        data: lengthOfStayChartData.value,
        symbolSize: 15,
        label: {
            show: true,
            formatter: function (param) {
                return param.data.name;
            },
            position: 'top'
        },
        emphasis: {
            focus: 'series',
        },
    }]
}));

const fetchReportData = async () => {

    if (!props.selectedHotels || props.selectedHotels.length === 0) {
        chartData.value = [];
        error.value = 'ホテルが選択されていません。';
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        const year = props.selectedDate.getFullYear();
        const month = props.selectedDate.getMonth();
        const startDate = formatDate(new Date(year, month, 1)); // First day of the selected month
        const endDate = formatDate(new Date(year, month + 1, 0)); // Last day of the selected month        
        const summaryData = await fetchChannelSummary(props.selectedHotels, startDate, endDate);
        chartData.value = summaryData;

        // Use batch data passed from parent instead of making individual requests
        const bookerTypeResults = props.selectedHotels.map(hotelId => props.bookerTypeData[hotelId] || []);
        const batchLengthOfStayData = props.reservationData;


        // Process and store booker type data
        const processedBookerTypeData = [];
        for (let i = 0; i < props.selectedHotels.length; i++) {
            const hotelId = props.selectedHotels[i];
            const hotelData = bookerTypeResults[i];
            const hotelName = summaryData.find(d => d.hotel_id === hotelId)?.hotel_name || `Hotel ${hotelId}`;
            if (hotelData) {
                processedBookerTypeData.push({
                    hotelId,
                    hotelName,
                    data: hotelData
                });
            }
        }
        bookerTypeData.value = processedBookerTypeData;


        // Process and store length of stay data
        const processedLengthOfStayData = [];
        const lengthOfStayByHotel = {};

        // Group batch results by hotel_id
        if (Array.isArray(batchLengthOfStayData)) {
            batchLengthOfStayData.forEach(reservation => {
                if (!lengthOfStayByHotel[reservation.hotel_id]) {
                    lengthOfStayByHotel[reservation.hotel_id] = [];
                }
                lengthOfStayByHotel[reservation.hotel_id].push(reservation);
            });
        }

        for (let i = 0; i < props.selectedHotels.length; i++) {
            const hotelId = props.selectedHotels[i];
            const hotelData = lengthOfStayByHotel[hotelId] || [];
            const hotelName = summaryData.find(d => d.hotel_id === hotelId)?.hotel_name || `Hotel ${hotelId}`;
            
            processedLengthOfStayData.push({
                hotelId,
                hotelName,
                data: hotelData
            });
        }
        lengthOfStayData.value = processedLengthOfStayData;

    } catch (err) {
        error.value = err.message || 'データの取得中にエラーが発生しました。';
    } finally {
        loading.value = false;
    }
};

const scatterPlotSeriesData = computed(() => {
    if (!chartData.value || chartData.value.length === 0) {
        return [];
    }
    return chartData.value.map(item => ({
        name: item.hotel_name,
        value: [parseFloat(item.web_percentage), parseFloat(item.direct_percentage)],
        reserved_dates: item.reserved_dates
    }));
});

const chartOptions = ref({
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
            return `${params.data.name}<br/>WEB/OTA: ${webPercentage}%<br/>直予約: ${directPercentage}%<br/>予約日数: ${params.data.reserved_dates}`;
        }
    },
    series: [{
        name: 'ホテル',
        type: 'scatter',
        data: [], // Initial empty data
        symbolSize: 15,
        label: {
            show: true,
            formatter: function (param) {
                return param.data.name;
            },
            position: 'top'
        },
        emphasis: {
            focus: 'series',
        },
    }]
});

watch(scatterPlotSeriesData, (newData) => {
    chartOptions.value = {
        ...chartOptions.value,
        series: [{
            ...chartOptions.value.series[0],
            data: newData
        }]
    };
}, { deep: true, immediate: true });

watch(() => chartData.value, async () => {
    if (selectedView.value === 'graph') {
        await nextTick();
        refreshAllCharts();
    }
}, { deep: true });



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
        // Dispose and re-initialize for a full re-render
        scatterPlotInstance.value?.dispose();
        scatterPlotInstance.value = null;
        paymentTimingChartInstance.value?.dispose();
        paymentTimingChartInstance.value = null;
        bookerTypeChartInstance.value?.dispose();
        bookerTypeChartInstance.value = null;
        lengthOfStayChartInstance.value?.dispose();
        lengthOfStayChartInstance.value = null;

        initOrUpdateChart(scatterPlotInstance, scatterPlotContainer, chartOptions.value);
        initOrUpdateChart(paymentTimingChartInstance, paymentTimingChartContainer, paymentTimingChartOptions.value);
        initOrUpdateChart(bookerTypeChartInstance, bookerTypeChartContainer, bookerTypeChartOptions.value);
        initOrUpdateChart(lengthOfStayChartInstance, lengthOfStayChartContainer, lengthOfStayChartOptions.value);
    } else {
        disposeAllCharts();
    }
};

const disposeAllCharts = () => {
    scatterPlotInstance.value?.dispose();
    scatterPlotInstance.value = null;
    paymentTimingChartInstance.value?.dispose();
    paymentTimingChartInstance.value = null;
    bookerTypeChartInstance.value?.dispose();
    bookerTypeChartInstance.value = null;
    lengthOfStayChartInstance.value?.dispose();
    lengthOfStayChartInstance.value = null;
};

const resizeChart = () => {
    scatterPlotInstance.value?.resize();
    paymentTimingChartInstance.value?.resize();
    bookerTypeChartInstance.value?.resize();
    lengthOfStayChartInstance.value?.resize();
};

onMounted(async () => {
    await fetchReportData();
    if (selectedView.value === 'graph') {
        await nextTick(); // Ensure DOM is updated after data fetch
        refreshAllCharts();
    }
    window.addEventListener('resize', resizeChart);
});

onBeforeUnmount(() => {
    disposeAllCharts();
    window.removeEventListener('resize', resizeChart);
});

watch(() => [props.selectedHotels, props.triggerFetch, props.selectedDate], () => {
    fetchReportData();
}, { deep: true });

watch(selectedView, async (newView) => {
    if (newView === 'graph') {
        await nextTick();
        refreshAllCharts(); // Only refresh, don't dispose if not initialized
    } else {
        disposeAllCharts();
    }
});


</script>