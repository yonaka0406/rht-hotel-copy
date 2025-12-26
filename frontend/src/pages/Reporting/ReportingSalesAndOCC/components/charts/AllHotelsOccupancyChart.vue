<template>
  <div class="hotel-occupancy-chart">
    <div ref="chartContainer"
      :style="chartHeight > 0 ? { height: chartHeight + 'px', width: '100%' } : { width: '100%' }"
      class="chart-container"></div>
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
import ChartConfigurationService from '../../../services/ChartConfigurationService';

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
  prevYearOccupancyData: {
    type: Array,
    default: () => [],
  },
  comparisonType: {
    type: String,
    default: 'forecast',
  },
});

const chartContainer = ref(null);
const chartInstance = shallowRef(null);

const chartHeight = computed(() => {
  if (!props.occupancyData || props.occupancyData.length === 0) return 450;

  // Calculate height based on number of hotels
  const hotelMap = new Map();
  props.occupancyData.filter(item => item.hotel_id !== 0).forEach(item => {
    if (item.hotel_name) {
      hotelMap.set(item.hotel_name, true);
    }
  });

  const numHotels = hotelMap.size;
  const baseHeight = 150;
  const heightPerHotel = 50;
  const minHeight = 450;
  const calculatedHeight = baseHeight + (numHotels * heightPerHotel);

  return Math.max(minHeight, calculatedHeight);
});

const chartOptions = computed(() => {
  return ChartConfigurationService.getAllHotelsOccupancyConfig(props.occupancyData, {
    height: chartHeight.value,
    prevYearOccupancyData: props.prevYearOccupancyData,
    comparisonType: props.comparisonType
  });
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

watch(() => props.comparisonType, () => {
  nextTick(initOrUpdateChart);
});

watch(() => props.prevYearOccupancyData, () => {
  nextTick(initOrUpdateChart);
}, { deep: true });
</script>