<template>
  <div 
    ref="chartContainer" 
    class="chart-container"
    :style="{ height: props.height }"
  ></div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef, nextTick } from 'vue';
// ECharts imports
// Note: A "non-passive event listener" warning for mousewheel/wheel events may appear in the console.
// This is typically due to ECharts's internal event handling and is not directly configurable via component props.
// Addressing it would require deeper ECharts customization or global event listener manipulation,
// which is beyond the scope of a simple component fix.
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
  revenueData: {
    type: Object,
    required: true,
  },
  height: {
    type: String,
    default: '450px',
  },
});

const chartContainer = ref(null);
const chartInstance = shallowRef(null);

const chartOptions = computed(() => {
  return ChartConfigurationService.getRevenuePlanVsActualConfig(props.revenueData, { height: props.height });
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

watch(() => props.revenueData, () => {
  nextTick(initOrUpdateChart);
}, { deep: true });
</script>