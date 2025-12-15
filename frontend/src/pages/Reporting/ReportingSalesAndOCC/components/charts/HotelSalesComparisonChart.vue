<template>
    <div>
        <h6 class="text-center">施設別 売上合計（計画 vs 実績）</h6>
        <div v-if="!hasAllHotelsRevenueData" class="text-center p-4">データはありません。</div>
        <div v-else ref="allHotelsRevenueChartContainer"
            :style="{ height: allHotelsChartHeight + 'px', width: '100%' }"></div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef, nextTick } from 'vue';
import * as echarts from 'echarts/core';
import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DatasetComponent,
    TransformComponent,
} from 'echarts/components';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

import {
    formatCurrencyForReporting as formatCurrency,
    formatPercentage,
    formatYenInTenThousands,
    formatYenInTenThousandsNoDecimal
} from '@/utils/formatUtils';
import { colorScheme } from '@/utils/reportingUtils';

// Register ECharts components
echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DatasetComponent,
    TransformComponent,
    BarChart,
    CanvasRenderer
]);

const props = defineProps({
    revenueData: {
        type: Array,
        required: true
    }
});

const allHotelsRevenueChartContainer = ref(null);
const allHotelsRevenueChartInstance = shallowRef(null);

const allHotelsRevenueChartData = computed(() => {
    if (!props.revenueData || props.revenueData.length === 0) return [];
    const hotelMap = new Map();
    props.revenueData.forEach(item => {
        if (item.hotel_name && item.hotel_name !== '施設合計') {
            const entry = hotelMap.get(item.hotel_name) || {
                hotel_name: item.hotel_name,
                total_forecast_revenue: 0,
                total_period_accommodation_revenue: 0,
                revenue_to_forecast: 0,
                forecast_achieved_percentage: 0
            };
            entry.total_forecast_revenue += (item.forecast_revenue || 0);
            entry.total_period_accommodation_revenue += (item.accommodation_revenue || 0);
            hotelMap.set(item.hotel_name, entry);
        }
    });
    // Calculate derived fields after summing up
    return Array.from(hotelMap.values()).map(hotel => {
        if ((hotel.total_forecast_revenue - hotel.total_period_accommodation_revenue) < 0) {
            hotel.revenue_to_forecast = 0;
        } else {
            hotel.revenue_to_forecast = hotel.total_forecast_revenue - hotel.total_period_accommodation_revenue;
        }

        if (hotel.total_forecast_revenue > 0) {
            hotel.forecast_achieved_percentage = (hotel.total_period_accommodation_revenue / hotel.total_forecast_revenue) * 100;
        } else {
            // Handle cases where forecast is 0
            hotel.forecast_achieved_percentage = hotel.total_period_accommodation_revenue > 0 ? Infinity : 0;
        }
        return hotel;
    }).sort((a, b) => {
        const diffA = a.total_period_accommodation_revenue - a.total_forecast_revenue;
        const diffB = b.total_period_accommodation_revenue - b.total_forecast_revenue;
        return diffB - diffA;
    });
});
const hasAllHotelsRevenueData = computed(() => allHotelsRevenueChartData.value.length > 0);

const allHotelsChartHeight = computed(() => {
    const numHotels = allHotelsRevenueChartData.value.length;
    const baseHeight = 150; // Base height for axes, legend, etc.
    const heightPerHotel = 50; // Pixels per hotel bar
    const minHeight = 450; // Minimum height to prevent it from being too small

    const calculatedHeight = baseHeight + (numHotels * heightPerHotel);

    return Math.max(minHeight, calculatedHeight);
});

const allHotelsRevenueChartOptions = computed(() => {
    const data = allHotelsRevenueChartData.value;
    if (!data.length) return {};
    const hotelNames = data.map(item => item.hotel_name);
    const forecastValues = data.map(item => item.total_forecast_revenue);
    const accommodationValues = data.map(item => item.total_period_accommodation_revenue);
    const revenueToForecastValues = data.map(item => item.revenue_to_forecast);

    const extraData = data.map(item => ({
        revenue_to_forecast: item.revenue_to_forecast,
        forecast_achieved_percentage: item.forecast_achieved_percentage
    }));

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: params => {
                const dataIndex = params[0].dataIndex;
                const currentHotelExtraData = extraData[dataIndex];
                let tooltip = `${params[0].name}<br/>`;
                params.forEach(param => {
                    tooltip += `${param.marker} ${param.seriesName}: ${formatYenInTenThousands(param.value)}<br/>`;
                });
                tooltip += `達成率: ${currentHotelExtraData.forecast_achieved_percentage === Infinity ? 'N/A' : currentHotelExtraData.forecast_achieved_percentage.toFixed(2) + '%'}<br/>`;
                return tooltip;
            }
        },
        legend: { data: ['計画売上合計', '実績売上合計', '計画達成まで'], top: 'bottom' },
        grid: { containLabel: true, left: '3%', right: '10%', bottom: '10%' },
        xAxis: { type: 'value', name: '売上 (万円)', axisLabel: { formatter: value => (value / 10000).toLocaleString('ja-JP') } },
        yAxis: { type: 'category', data: hotelNames, inverse: true },
        series: [
            { name: '計画売上合計', type: 'bar', data: forecastValues, itemStyle: { color: colorScheme.forecast }, barGap: '5%', label: { show: true, position: 'inside', formatter: params => params.value > 0 ? formatYenInTenThousandsNoDecimal(params.value) : '' } },
            { name: '実績売上合計', type: 'bar', data: accommodationValues, itemStyle: { color: colorScheme.actual }, barGap: '5%', label: { show: true, position: 'inside', formatter: params => params.value > 0 ? formatYenInTenThousandsNoDecimal(params.value) : '' } },
            {
                name: '計画達成まで',
                type: 'bar',
                data: revenueToForecastValues,
                itemStyle: { color: colorScheme.toForecast },
                barGap: '5%',
                label: { show: true, position: 'right', formatter: params => params.value > 0 ? formatYenInTenThousandsNoDecimal(params.value) : '' }
            }
        ]
    };
});

const initOrUpdateChart = () => {
    if (allHotelsRevenueChartContainer.value) {
        if (!allHotelsRevenueChartInstance.value || allHotelsRevenueChartInstance.value.isDisposed?.()) {
            allHotelsRevenueChartInstance.value = echarts.init(allHotelsRevenueChartContainer.value);
        }
        allHotelsRevenueChartInstance.value.setOption(allHotelsRevenueChartOptions.value, true);
        allHotelsRevenueChartInstance.value.resize();
    } else if (allHotelsRevenueChartInstance.value && !allHotelsRevenueChartInstance.value.isDisposed?.()) {
        allHotelsRevenueChartInstance.value.dispose();
        allHotelsRevenueChartInstance.value = null;
    }
};

const disposeChart = () => {
    allHotelsRevenueChartInstance.value?.dispose();
    allHotelsRevenueChartInstance.value = null;
};

const resizeHandler = () => {
    allHotelsRevenueChartInstance.value?.resize();
};

onMounted(() => {
    nextTick(initOrUpdateChart);
    window.addEventListener('resize', resizeHandler);
});

onBeforeUnmount(() => {
    disposeChart();
    window.removeEventListener('resize', resizeHandler);
});

watch(() => props.revenueData, () => {
    nextTick(initOrUpdateChart);
}, { deep: true });

</script>