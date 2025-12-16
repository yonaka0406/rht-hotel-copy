<template>
    <div class="hotel-sales-chart print-no-break">
        <h6 class="text-center">施設別 売上合計（計画 vs 実績）</h6>
        <div v-if="!hasAllHotelsRevenueData" class="text-center p-4">データはありません。</div>
        <div v-else class="print-chart-wrapper">
            <img v-if="isPrintMode && printImage" :src="printImage" alt="施設別 売上合計（計画 vs 実績）" />
            <div v-else
                ref="allHotelsRevenueChartContainer"
                :style="allHotelsChartHeight > 0 ? { height: allHotelsChartHeight + 'px', width: '100%' } : { width: '100%' }"
                class="chart-container hotel-sales-comparison-print-optimized"
                :class="{ 'print-mode': isPrintMode }"
            ></div>
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

// Register ECharts components
echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DatasetComponent,
    TransformComponent,
    BarChart,
    CanvasRenderer
]);

const props = defineProps({
    revenueData: {
        type: Array,
        required: true
    }
});

const allHotelsRevenueChartContainer = ref(null);
const allHotelsRevenueChartInstance = shallowRef(null);
const printImage = ref(null);

// Print optimization composable
const { 
  isPrintMode, 
  isPreparingForPrint, 
  optimizeChartForPrint, 
  restoreChartFromPrint, 
  getPrintChartDimensions 
} = usePrintOptimization();

const hasAllHotelsRevenueData = computed(() => props.revenueData && props.revenueData.length > 0);

const allHotelsChartHeight = computed(() => {
    if (!hasAllHotelsRevenueData.value) return 450;
    
    // Skip height calculation for print mode - let CSS handle it
    if (isPrintMode.value) {
        return 0; // Return 0 instead of null to prevent "nullpx" in styles
    }
    
    // Calculate height based on number of hotels for screen display only
    const hotelMap = new Map();
    props.revenueData.forEach(item => {
        if (item.hotel_name && item.hotel_name !== '施設合計') {
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

const allHotelsRevenueChartOptions = computed(() => {
    return ChartConfigurationService.getAllHotelsRevenueConfig(props.revenueData, { height: allHotelsChartHeight.value });
});

// Store original options for print restoration
const originalOptions = ref(null);

const initOrUpdateChart = () => {
    if (allHotelsRevenueChartContainer.value) {
        if (!allHotelsRevenueChartInstance.value || allHotelsRevenueChartInstance.value.isDisposed?.()) {
            allHotelsRevenueChartInstance.value = echarts.init(allHotelsRevenueChartContainer.value);
        }
        
        // Only store original options when NOT in print mode to avoid capturing print-optimized options
        if (!isPrintMode.value) {
            // Deep clone the options to prevent mutation
            originalOptions.value = JSON.parse(JSON.stringify(allHotelsRevenueChartOptions.value));
        }
        
        // Apply current options (print-optimized if in print mode)
        if (isPrintMode.value) {
            // Use stored original options for print optimization, not current computed options
            if (originalOptions.value) {
                optimizeChartForPrint(allHotelsRevenueChartInstance.value, originalOptions.value);
            }
        } else {
            allHotelsRevenueChartInstance.value.setOption(allHotelsRevenueChartOptions.value, true);
        }
        
        allHotelsRevenueChartInstance.value.resize();
    } else if (allHotelsRevenueChartInstance.value && !allHotelsRevenueChartInstance.value.isDisposed?.()) {
        allHotelsRevenueChartInstance.value.dispose();
        allHotelsRevenueChartInstance.value = null;
    }
};

const disposeChart = () => {
    allHotelsRevenueChartInstance.value?.dispose();
    allHotelsRevenueChartInstance.value = null;
};

const resizeHandler = () => {
    allHotelsRevenueChartInstance.value?.resize();
};

onMounted(() => {
    nextTick(initOrUpdateChart);
    window.addEventListener('resize', resizeHandler);
});

onBeforeUnmount(() => {
    disposeChart();
    window.removeEventListener('resize', resizeHandler);
});

// Watch for print mode changes
watch(isPrintMode, async (newPrintMode) => {
    if (allHotelsRevenueChartInstance.value && originalOptions.value) {
        if (newPrintMode) {
            // Capture chart as static image for print
            const imageDataUrl = optimizeChartForPrint(allHotelsRevenueChartInstance.value, originalOptions.value);
            printImage.value = imageDataUrl;
        } else {
            // Clear print image first
            printImage.value = null;
            
            // Wait for DOM to update before restoring chart
            await nextTick();
            
            // Ensure container still exists after DOM update
            if (allHotelsRevenueChartContainer.value && allHotelsRevenueChartInstance.value && !allHotelsRevenueChartInstance.value.isDisposed?.()) {
                restoreChartFromPrint(allHotelsRevenueChartInstance.value, originalOptions.value);
            } else {
                // Container was replaced, reinitialize chart
                nextTick(initOrUpdateChart);
            }
        }
    }
});

watch(() => props.revenueData, () => {
    nextTick(initOrUpdateChart);
}, { deep: true });

</script>

<style scoped>
.hotel-sales-comparison-print-optimized {
  transition: all 0.3s ease;
}

@media print {
  /* Root element - print-safe */
  .hotel-sales-chart {
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