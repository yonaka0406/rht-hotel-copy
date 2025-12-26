<template>
  <div 
    ref="chartContainer" 
    class="chart-container"
    :style="{ height: props.height }"
  ></div>
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
import ChartConfigurationService from '../../../services/ChartConfigurationService';

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
  return ChartConfigurationService.getOccupancyGaugeConfig(props.occupancyData, { 
    height: props.height,
    previousYearOccupancy: props.previousYearOccupancy 
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
</script>

<style scoped>
</style>
