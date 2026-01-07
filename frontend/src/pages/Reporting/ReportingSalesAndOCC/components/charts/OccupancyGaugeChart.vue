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
let resizeObserver = null;

const chartOptions = computed(() => {
  return ChartConfigurationService.getOccupancyGaugeConfig(props.occupancyData, { 
    height: props.height,
    previousYearOccupancy: props.previousYearOccupancy 
  });
});

const initOrUpdateChart = () => {
  if (chartContainer.value) {
    const width = chartContainer.value.clientWidth;
    const height = chartContainer.value.clientHeight;

    if (width === 0 || height === 0) {
      return;
    }

    if (!chartInstance.value || chartInstance.value.isDisposed?.()) {
      chartInstance.value = echarts.init(chartContainer.value);
    }
    
    chartInstance.value.setOption(chartOptions.value, true);
    
    chartInstance.value.resize();
  }
};

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        if (!Array.isArray(entries) || !entries.length) return;
        initOrUpdateChart();
      });
    });
    if (chartContainer.value) {
      resizeObserver.observe(chartContainer.value);
    }
  } else {
    // Fallback
    window.addEventListener('resize', initOrUpdateChart);
    nextTick(initOrUpdateChart);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  } else {
    window.removeEventListener('resize', initOrUpdateChart);
  }
  
  if (chartInstance.value) {
    chartInstance.value.dispose();
    chartInstance.value = null;
  }
});

watch(() => props.occupancyData, () => {
  nextTick(initOrUpdateChart);
}, { deep: true });
</script>
