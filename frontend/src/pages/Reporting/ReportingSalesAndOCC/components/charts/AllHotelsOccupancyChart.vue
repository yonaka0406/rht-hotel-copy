<template>
  <div 
    ref="chartContainer" 
    :style="{ height: chartHeight + 'px', width: '100%' }"
    class="chart-container all-hotels-occupancy-print-optimized"
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

// Print optimization composable
const { 
  isPrintMode, 
  isPreparingForPrint, 
  optimizeChartForPrint, 
  restoreChartFromPrint, 
  getPrintChartDimensions,
  forceChartResize
} = usePrintOptimization();

const chartHeight = computed(() => {
  if (!props.occupancyData || props.occupancyData.length === 0) return 450;
  
  // Calculate height based on number of hotels and print mode
  const hotelMap = new Map();
  props.occupancyData.filter(item => item.hotel_id !== 0).forEach(item => {
    if (item.hotel_name) {
      hotelMap.set(item.hotel_name, true);
    }
  });
  
  const numHotels = hotelMap.size;
  
  // Optimize for print mode
  if (isPrintMode.value) {
    // For print, use a fixed height that fits on one page
    return 750; // Fixed height for print mode
  }
  
  // Normal screen display logic
  const baseHeight = 150;
  const heightPerHotel = 50;
  const minHeight = 450;
  const calculatedHeight = baseHeight + (numHotels * heightPerHotel);

  return Math.max(minHeight, calculatedHeight);
});

const chartOptions = computed(() => {
  return ChartConfigurationService.getAllHotelsOccupancyConfig(props.occupancyData, { height: chartHeight.value });
});

// Store original options for print restoration
const originalOptions = ref(null);

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
      // Wait for CSS to apply, then optimize for print
      nextTick(() => {
        setTimeout(() => {
          optimizeChartForPrint(chartInstance.value, originalOptions.value);
          forceChartResize(chartInstance.value);
        }, 100);
      });
    } else {
      restoreChartFromPrint(chartInstance.value, originalOptions.value);
      forceChartResize(chartInstance.value);
    }
  }
});

watch(() => props.occupancyData, () => {
  nextTick(initOrUpdateChart);
}, { deep: true });
</script>

<style scoped>
.all-hotels-occupancy-print-optimized {
  transition: all 0.3s ease;
}

@media print {
  .all-hotels-occupancy-print-optimized {
    page-break-inside: avoid !important;
    page-break-before: always !important;
    margin-bottom: 20pt !important;
    margin-top: 0 !important;
    border: none !important; /* Remove border to maximize width */
    padding: 0 !important; /* Remove padding to maximize width */
    background: white !important;
    height: 750px !important;
    max-height: 750px !important;
    width: 100% !important;
    position: relative !important;
    clear: both !important;
    display: block !important;
    overflow: visible !important;
    box-sizing: border-box !important;
  }
  
  .all-hotels-occupancy-print-optimized.print-mode {
    height: 750px !important;
    max-height: 750px !important;
    width: 100% !important;
    padding: 0 !important;
    overflow: visible !important;
  }
}
</style>
