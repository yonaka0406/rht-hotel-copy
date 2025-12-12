<template>
  <div ref="chartContainer" style="height: 450px; width: 100%;"></div>
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
import { GaugeChart } from 'echarts/charts';
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
  GaugeChart,
  CanvasRenderer,
]);

const props = defineProps({
  occupancyData: {
    type: Object,
    required: true,
  },
});

const chartContainer = ref(null);
const chartInstance = shallowRef(null);

const chartOptions = computed(() => {
  const {
    total_sold_rooms = 0,
    total_available_rooms = 0,
    total_fc_sold_rooms = 0,
    total_fc_available_rooms = 0,
  } = props.occupancyData;

  // Map to expected names with defaults
  const sold_rooms = total_sold_rooms;
  const total_rooms = total_available_rooms;
  const net_total_rooms = undefined; // Still undefined as it's not from aggregateHotelZeroData
  const fc_sold_rooms = total_fc_sold_rooms;
  const fc_total_rooms = total_fc_available_rooms;
  const fc_net_total_rooms = undefined; // Still undefined as it's not from aggregateHotelZeroData

  // Use net capacity if available, otherwise fall back to gross capacity (now with defaults)
  const actualTotalRooms = net_total_rooms !== undefined && net_total_rooms !== null ? net_total_rooms : total_rooms;
  const forecastTotalRooms = fc_net_total_rooms !== undefined && fc_net_total_rooms !== null ? fc_net_total_rooms : fc_total_rooms;

  // Guard against division by zero
  const totalActualOccupancy = actualTotalRooms > 0 ? sold_rooms / actualTotalRooms : 0;
  const totalForecastOccupancy = forecastTotalRooms > 0 ? fc_sold_rooms / forecastTotalRooms : 0;

  return {
    tooltip: {
      formatter: (params) => {
        if (params.seriesName === '実績稼働率') {
          return `実績稼働率: ${formatPercentage(params.value)}<br/>計画稼働率: ${formatPercentage(totalForecastOccupancy)}`;
        }
        return '';
      },
    },
    series: [{
      type: 'gauge',
      radius: '90%',
      center: ['50%', '55%'],
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 1,
      splitNumber: 4,
      axisLine: {
        lineStyle: {
          width: 22,
          color: [
            [1, '#E0E0E0'],
          ],
        },
      },
      progress: {
        show: true,
        width: 22,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: colorScheme.actual_gradient_bottom },
            { offset: 1, color: colorScheme.actual_gradient_top },
          ]),
        },
      },
      pointer: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        show: true,
        distance: 5,
        formatter: function (value) { return (value * 100).toFixed(0) + '%'; },
        fontSize: 10,
        color: '#555',
      },
      title: {
        offsetCenter: [0, '25%'],
        fontSize: 14,
        color: '#333',
        fontWeight: 'normal',
      },
      detail: {
        width: '70%',
        lineHeight: 22,
        offsetCenter: [0, '-10%'],
        valueAnimation: true,
        formatter: function (value) {
          let forecastText = `計画: ${formatPercentage(totalForecastOccupancy)}`;
          return `{actual|${formatPercentage(value)}}
{forecast|${forecastText}}`;
        },
        rich: {
          actual: { fontSize: 24, fontWeight: 'bold', color: colorScheme.actual },
          forecast: { fontSize: 13, color: colorScheme.forecast, paddingTop: 8 },
        },
      },
      data: [{ value: totalActualOccupancy, name: '実績稼働率' }],
    }],
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
