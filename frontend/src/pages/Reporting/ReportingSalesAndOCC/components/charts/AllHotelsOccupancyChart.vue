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
});

const chartContainer = ref(null);
const chartInstance = shallowRef(null);

const chartHeight = computed(() => {
  if (!props.occupancyData || props.occupancyData.length === 0) return 450;
  
  // Calculate height based on number of hotels (similar to original logic)
  const hotelMap = new Map();
  props.occupancyData.filter(item => item.hotel_id !== 0).forEach(item => {
    if (item.hotel_name) {
      hotelMap.set(item.hotel_name, true);
    }
  });
  
  const numHotels = hotelMap.size;
  const baseHeight = 150; // Base height for axes, legend, etc.
  const heightPerHotel = 50; // Pixels per hotel bar
  const minHeight = 450; // Minimum height to prevent it from being too small

  const calculatedHeight = baseHeight + (numHotels * heightPerHotel);

  return Math.max(minHeight, calculatedHeight);
});

const chartOptions = computed(() => {
  return ChartConfigurationService.getAllHotelsOccupancyConfig(props.occupancyData, { height: chartHeight.value });
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
