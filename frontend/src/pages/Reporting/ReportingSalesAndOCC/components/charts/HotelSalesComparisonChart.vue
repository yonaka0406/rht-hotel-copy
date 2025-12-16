<template>
    <div>
        <h6 class="text-center">施設別 売上合計（計画 vs 実績）</h6>
        <div v-if="!hasAllHotelsRevenueData" class="text-center p-4">データはありません。</div>
        <div v-else 
            ref="allHotelsRevenueChartContainer"
            :style="{ height: allHotelsChartHeight + 'px', width: '100%' }"
            class="chart-container hotel-sales-comparison-print-optimized"
            :class="{ 'print-mode': isPrintMode }"
        ></div>
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
    
    // Calculate height based on number of hotels and print mode
    const hotelMap = new Map();
    props.revenueData.forEach(item => {
        if (item.hotel_name && item.hotel_name !== '施設合計') {
            hotelMap.set(item.hotel_name, true);
        }
    });
    
    const numHotels = hotelMap.size;
    
    // Optimize for print mode
    if (isPrintMode.value) {
        // For print, use a fixed height that fits on one page
        return 600; // Fixed height for print mode
    }
    
    // Normal screen display logic
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
        
        // Store original options for print restoration
        originalOptions.value = allHotelsRevenueChartOptions.value;
        
        // Apply current options (print-optimized if in print mode)
        if (isPrintMode.value) {
            optimizeChartForPrint(allHotelsRevenueChartInstance.value, allHotelsRevenueChartOptions.value);
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
watch(isPrintMode, (newPrintMode) => {
    if (allHotelsRevenueChartInstance.value && originalOptions.value) {
        if (newPrintMode) {
            optimizeChartForPrint(allHotelsRevenueChartInstance.value, originalOptions.value);
        } else {
            restoreChartFromPrint(allHotelsRevenueChartInstance.value, originalOptions.value);
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
  .hotel-sales-comparison-print-optimized {
    page-break-inside: avoid !important;
    page-break-after: always !important;
    margin-bottom: 0 !important;
    border: 1px solid #ddd !important;
    padding: 8pt !important;
    background: white !important;
    height: 600px !important;
    max-height: 600px !important;
    position: relative !important;
    clear: both !important;
    display: block !important;
    overflow: hidden !important;
  }
  
  .hotel-sales-comparison-print-optimized.print-mode {
    height: 600px !important;
    max-height: 600px !important;
    overflow: hidden !important;
  }
}
</style>