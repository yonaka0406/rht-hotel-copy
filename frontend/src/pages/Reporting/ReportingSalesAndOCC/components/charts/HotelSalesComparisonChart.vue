<template>
    <div class="hotel-sales-chart">
        <h6 class="text-center">施設別 売上合計（計画 vs 実績）</h6>
        <div v-if="!hasAllHotelsRevenueData" class="text-center p-4">データはありません。</div>
        <div v-else>
            <div ref="allHotelsRevenueChartContainer"
                :style="allHotelsChartHeight > 0 ? { height: allHotelsChartHeight + 'px', width: '100%' } : { width: '100%' }"
                class="chart-container">
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef, nextTick, toRef } from 'vue';
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
import { useHotelChartHeight } from '@/composables/useHotelChartHeight';

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
    },
    prevYearRevenueData: {
        type: Array,
        default: () => []
    },
    comparisonType: {
        type: String,
        default: 'forecast'
    }
});

const allHotelsRevenueChartContainer = ref(null);
const allHotelsRevenueChartInstance = shallowRef(null);

const hasAllHotelsRevenueData = computed(() => props.revenueData && props.revenueData.length > 0);

// Use the extracted height calculation logic
const allHotelsChartHeight = useHotelChartHeight(toRef(props, 'revenueData'), hasAllHotelsRevenueData);

const allHotelsRevenueChartOptions = computed(() => {
    return ChartConfigurationService.getAllHotelsRevenueConfig(props.revenueData, {
        height: allHotelsChartHeight.value,
        prevYearRevenueData: props.prevYearRevenueData,
        comparisonType: props.comparisonType
    });
});

const initOrUpdateChart = () => {
    if (allHotelsRevenueChartContainer.value) {
        try {
            if (!allHotelsRevenueChartInstance.value || allHotelsRevenueChartInstance.value.isDisposed?.()) {
                allHotelsRevenueChartInstance.value = echarts.init(allHotelsRevenueChartContainer.value);
            }

            allHotelsRevenueChartInstance.value.setOption(allHotelsRevenueChartOptions.value, true);
            allHotelsRevenueChartInstance.value.resize();
        } catch (error) {
            console.error('[HotelSalesComparisonChart] Error initializing or updating chart:', error);
            if (allHotelsRevenueChartInstance.value) {
                allHotelsRevenueChartInstance.value.dispose();
                allHotelsRevenueChartInstance.value = null;
            }
        }
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

watch(() => props.revenueData, () => {
    nextTick(initOrUpdateChart);
}, { deep: true });

watch(() => props.comparisonType, () => {
    nextTick(initOrUpdateChart);
});

watch(() => props.prevYearRevenueData, () => {
    nextTick(initOrUpdateChart);
}, { deep: true });

</script>
