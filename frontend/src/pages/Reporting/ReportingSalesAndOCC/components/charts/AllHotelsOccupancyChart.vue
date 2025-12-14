<template>
  <div ref="chartContainer" :style="{ height: chartHeight + 'px', width: '100%' }"></div>
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
import { formatPercentage } from '@/utils/formatUtils';
import { colorScheme } from '@/utils/reportingUtils';

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  TransformComponent,
  BarChart,
  CanvasRenderer,
]);

const props = defineProps({
  occupancyData: {
    type: Array,
    required: true,
  },
});

const chartContainer = ref(null);
const chartInstance = shallowRef(null);

const allHotelsOccupancyChartData = computed(() => {
  if (!props.occupancyData || props.occupancyData.length === 0) return [];
  const hotelMap = new Map();
  props.occupancyData.forEach(item => {
    if (item.hotel_name) {
      const entry = hotelMap.get(item.hotel_name) || {
        hotel_name: item.hotel_name,
        sum_fc_sold_rooms: 0, sum_fc_total_rooms: 0,
        sum_sold_rooms: 0, sum_total_rooms: 0,
      };
      entry.sum_fc_sold_rooms += (item.fc_sold_rooms || 0);
      entry.sum_fc_total_rooms += (item.fc_total_rooms || 0);
      entry.sum_sold_rooms += (item.sold_rooms || 0);
      entry.sum_total_rooms += (item.total_rooms || 0);
      hotelMap.set(item.hotel_name, entry);
    }
  });
  return Array.from(hotelMap.values()).map(hotel => {
    const forecast_occupancy_rate = hotel.sum_fc_total_rooms > 0 ? (hotel.sum_fc_sold_rooms / hotel.sum_fc_total_rooms) * 100 : 0;
    const actual_occupancy_rate = hotel.sum_total_rooms > 0 ? (hotel.sum_sold_rooms / hotel.sum_total_rooms) * 100 : 0;
    const occupancy_variance = actual_occupancy_rate - forecast_occupancy_rate;
    return { ...hotel, forecast_occupancy_rate, actual_occupancy_rate, occupancy_variance };
  });
});

const chartHeight = computed(() => {
  const numHotels = allHotelsOccupancyChartData.value.length;
  const baseHeight = 150; // Base height for axes, legend, etc.
  const heightPerHotel = 50; // Pixels per hotel bar
  const minHeight = 450; // Minimum height to prevent it from being too small

  const calculatedHeight = baseHeight + (numHotels * heightPerHotel);

  return Math.max(minHeight, calculatedHeight);
});

const chartOptions = computed(() => {
  const data = allHotelsOccupancyChartData.value;
  if (!data.length) return {};
  const hotelNames = data.map(item => item.hotel_name);
  const forecastValues = data.map(item => item.forecast_occupancy_rate);
  const actualValues = data.map(item => item.actual_occupancy_rate);
  const varianceValues = data.map(item => item.occupancy_variance);

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: params => {
        let tooltip = `${params[0].name}<br/>`;
        params.forEach(param => {
          tooltip += `${param.marker} ${param.seriesName}: ${formatPercentage(param.value / 100)}${param.seriesName.includes('差異') ? 'p.p.' : '%'}<br/>`;
        });
        return tooltip;
      },
    },
    legend: { data: ['計画稼働率', '実績稼働率', '稼働率差異 (p.p.)'], top: 'bottom' },
    grid: { containLabel: true, left: '3%', right: '5%', bottom: '10%' },
    xAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: hotelNames, inverse: true },
    series: [
      { name: '計画稼働率', type: 'bar', data: forecastValues, itemStyle: { color: colorScheme.forecast }, barGap: '5%', label: { show: true, position: 'right', formatter: (params) => params.value !== 0 ? formatPercentage(params.value / 100) : '' } },
      { name: '実績稼働率', type: 'bar', data: actualValues, itemStyle: { color: colorScheme.actual }, barGap: '5%', label: { show: true, position: 'right', formatter: (params) => params.value !== 0 ? formatPercentage(params.value / 100) : '' } },
      { name: '稼働率差異 (p.p.)', type: 'bar', data: varianceValues, itemStyle: { color: colorScheme.variance }, barGap: '5%', barMaxWidth: '15%', label: { show: true, position: (params) => params.value < 0 ? 'left' : 'right', formatter: (params) => params.value !== 0 ? formatPercentage(params.value / 100) : '' } },
    ],
  };
});

const initOrUpdateChart = () => {
  if (chartContainer.value) {
    if (!chartInstance.value || chartInstance.value.isDisposed?.()) {
      chartInstance.value = echarts.init(chartContainer.value);
    }
    chartInstance.value.setOption(chartOptions.value, true);
    chartInstance.value.resize();
  }
};

const resizeChartHandler = () => {
  chartInstance.value?.resize();
};

onMounted(() => {
  nextTick(initOrUpdateChart);
  window.addEventListener('resize', resizeChartHandler);
});

onBeforeUnmount(() => {
  chartInstance.value?.dispose();
  window.removeEventListener('resize', resizeChartHandler);
});

watch(() => props.occupancyData, () => {
  nextTick(initOrUpdateChart);
}, { deep: true });
</script>
