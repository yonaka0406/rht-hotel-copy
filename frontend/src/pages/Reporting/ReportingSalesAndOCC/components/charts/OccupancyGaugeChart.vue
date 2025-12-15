<template>
  <div ref="chartContainer" :style="{ height: height, width: '100%' }"></div>
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
  height: {
    type: String,
    default: '450px',
  },
  previousYearOccupancy: {
    type: Number,
    default: null
  }
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

  // Simplify to use total_rooms directly.
  // TODO: If net capacity support is reintroduced, re-evaluate this logic.
  const actualTotalRooms = total_available_rooms;
  const forecastTotalRooms = total_fc_available_rooms;

  // Guard against division by zero
  const totalActualOccupancy = actualTotalRooms > 0 ? sold_rooms / actualTotalRooms : 0;
  const totalForecastOccupancy = forecastTotalRooms > 0 ? fc_sold_rooms / forecastTotalRooms : 0;

  console.log('[GaugeChart] Props Data:', props.occupancyData);
  console.log('[GaugeChart] Actual:', { sold_rooms, actualTotalRooms, totalActualOccupancy });
  console.log('[GaugeChart] Forecast:', { fc_sold_rooms, forecastTotalRooms, totalForecastOccupancy });
  console.log('[GaugeChart] Prev:', props.previousYearOccupancy);

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
      radius: '100%',
      center: ['50%', '80%'],
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
          let prevYearText = props.previousYearOccupancy !== null ? `前年度同月度: ${formatPercentage(props.previousYearOccupancy)}` : '';
          return `{actual|${formatPercentage(value)}}
{forecast|${forecastText}}
{prev|${prevYearText}}`;
        },
        rich: {
          actual: { fontSize: 24, fontWeight: 'bold', color: colorScheme.actual },
          forecast: { fontSize: 13, color: colorScheme.forecast, paddingTop: 8 },
          prev: { fontSize: 13, color: '#999', paddingTop: 4 },
        },
      },
      data: [{ value: totalActualOccupancy, name: '実績稼働率' }],
    }
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
