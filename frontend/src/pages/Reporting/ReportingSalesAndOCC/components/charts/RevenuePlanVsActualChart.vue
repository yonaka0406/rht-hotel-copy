<template>
  <div 
    ref="chartContainer" 
    :style="printDimensions"
    class="chart-container revenue-chart-print-optimized"
    :class="{ 'print-mode': isPrintMode }"
  ></div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef, nextTick } from 'vue';
import { usePrintOptimization } from '@/composables/usePrintOptimization';
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

// Print optimization composable
const { 
  isPrintMode, 
  isPreparingForPrint, 
  optimizeChartForPrint, 
  restoreChartFromPrint, 
  getPrintChartDimensions 
} = usePrintOptimization();

const chartOptions = computed(() => {
  return ChartConfigurationService.getRevenuePlanVsActualConfig(props.revenueData, { height: props.height });
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

watch(() => props.revenueData, () => {
  nextTick(initOrUpdateChart);
}, { deep: true });
</script>

<style scoped>
.revenue-chart-print-optimized {
  transition: all 0.3s ease;
}

@media print {
  .revenue-chart-print-optimized {
    page-break-inside: avoid !important;
    margin-bottom: 12pt !important;
    border: 1px solid #ddd !important;
    padding: 8pt !important;
    background: white !important;
  }
  
  .revenue-chart-print-optimized.print-mode {
    height: 250px !important;
    max-height: 250px !important;
  }
}
</style>
