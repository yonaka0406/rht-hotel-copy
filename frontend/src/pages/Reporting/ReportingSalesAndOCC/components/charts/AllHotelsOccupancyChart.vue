<template>
  <div class="hotel-occupancy-chart print-no-break">
    <div class="print-chart-wrapper">
      <img v-if="isPrintMode && printImage" :src="printImage" alt="施設別 稼働率（計画 vs 実績）" />
      <div v-else ref="chartContainer"
        :style="chartHeight > 0 ? { height: chartHeight + 'px', width: '100%' } : { width: '100%' }"
        class="chart-container all-hotels-occupancy-print-optimized" :class="{ 'print-mode': isPrintMode }"></div>
    </div>
  </div>
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
const printImage = ref(null);

// Print optimization composable
const {
  isPrintMode,
  isPreparingForPrint,
  optimizeChartForPrint,
  restoreChartFromPrint,
  getPrintChartDimensions
} = usePrintOptimization();

const chartHeight = computed(() => {
  if (!props.occupancyData || props.occupancyData.length === 0) return 450;

  // Skip height calculation for print mode - let CSS handle it
  if (isPrintMode.value) {
    return 0; // Return 0 instead of null to prevent "nullpx" in styles
  }

  // Calculate height based on number of hotels for screen display only
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

// Store original options for print restoration
const originalOptions = ref(null);

const initOrUpdateChart = () => {
  if (chartContainer.value) {
    if (!chartInstance.value || chartInstance.value.isDisposed?.()) {
      chartInstance.value = echarts.init(chartContainer.value);
    }

    // Only store original options when NOT in print mode to avoid capturing print-optimized options
    if (!isPrintMode.value) {
      // Deep clone the options to prevent mutation
      originalOptions.value = JSON.parse(JSON.stringify(chartOptions.value));
    }

    // Apply current options (print-optimized if in print mode)
    if (isPrintMode.value) {
      // Use stored original options for print optimization, not current computed options
      if (originalOptions.value) {
        optimizeChartForPrint(chartInstance.value, originalOptions.value);
      }
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
watch(isPrintMode, async (newPrintMode) => {
  if (chartInstance.value && originalOptions.value) {
    if (newPrintMode) {
      // Capture chart as static image for print
      const imageDataUrl = optimizeChartForPrint(chartInstance.value, originalOptions.value);
      printImage.value = imageDataUrl;
    } else {
      // Clear print image first
      printImage.value = null;

      // Wait for DOM to update before restoring chart
      await nextTick();

      // Ensure container still exists after DOM update
      if (chartContainer.value && chartInstance.value && !chartInstance.value.isDisposed?.()) {
        restoreChartFromPrint(chartInstance.value, originalOptions.value);
      } else {
        // Container was replaced, reinitialize chart
        nextTick(initOrUpdateChart);
      }
    }
  }
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

<style scoped>
.all-hotels-occupancy-print-optimized {
  transition: all 0.3s ease;
}

@media print {

  /* Root element - print-safe */
  .hotel-occupancy-chart {
    display: block !important;
    width: 100% !important;
    height: auto !important;
    position: static !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Print chart wrapper for static images */
  .print-chart-wrapper {
    display: block !important;
    width: 100% !important;
    min-height: 220mm !important;
    page-break-inside: avoid !important;
    text-align: center !important;
  }

  .print-chart-wrapper img {
    width: 100% !important;
    height: auto !important;
    max-width: 100% !important;
    display: block !important;
    margin: 0 auto !important;
  }
}
</style>
