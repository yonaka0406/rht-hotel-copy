<template>
  <div 
    ref="chartContainer" 
    :style="printDimensions"
    class="chart-container occupancy-gauge-print-optimized"
    :class="{ 'print-mode': isPrintMode }"
  ></div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef, nextTick } from 'vue';
import { usePrintOptimization } from '@/composables/usePrintOptimization';
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

// Print optimization composable
const { 
  isPrintMode, 
  isPreparingForPrint, 
  optimizeChartForPrint, 
  restoreChartFromPrint, 
  getPrintChartDimensions 
} = usePrintOptimization();

const chartOptions = computed(() => {
  return ChartConfigurationService.getOccupancyGaugeConfig(props.occupancyData, { 
    height: props.height,
    previousYearOccupancy: props.previousYearOccupancy 
  });
});

// Store original options for print restoration
const originalOptions = ref(null);

// Print-optimized dimensions
const printDimensions = computed(() => {
  return getPrintChartDimensions(props.height);
});

const initOrUpdateChart = () => {
  if (chartContainer.value) {
    if (!chartInstance.value || chartInstance.value.isDisposed?.()) {
      chartInstance.value = echarts.init(chartContainer.value);
    }
    
    // Store original options for print restoration
    originalOptions.value = chartOptions.value;
    
    // Apply current options (print-optimized if in print mode)
    if (isPrintMode.value) {
      optimizeChartForPrint(chartInstance.value, chartOptions.value);
    } else {
      chartInstance.value.setOption(chartOptions.value, true);
    }
    
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

// Watch for print mode changes
watch(isPrintMode, (newPrintMode) => {
  if (chartInstance.value && originalOptions.value) {
    if (newPrintMode) {
      optimizeChartForPrint(chartInstance.value, originalOptions.value);
    } else {
      restoreChartFromPrint(chartInstance.value, originalOptions.value);
    }
  }
});

watch(() => props.occupancyData, () => {
  nextTick(initOrUpdateChart);
}, { deep: true });
</script>

<style scoped>
.occupancy-gauge-print-optimized {
  transition: all 0.3s ease;
}

@media print {
  .occupancy-gauge-print-optimized {
    page-break-inside: avoid !important;
    margin-bottom: 12pt !important;
    border: 1px solid #ddd !important;
    padding: 8pt !important;
    background: white !important;
  }
  
  .occupancy-gauge-print-optimized.print-mode {
    height: 200px !important;
    max-height: 200px !important;
  }
}
</style>
