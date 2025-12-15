<template>
  <div ref="chartContainer" style="height: 450px; width: 100%;"></div>
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
import {
  formatYenInTenThousands,
  formatYenInTenThousandsNoDecimal,
} from '@/utils/formatUtils';
import { colorScheme } from '@/utils/reportingUtils';

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
});

const chartContainer = ref(null);
const chartInstance = shallowRef(null);

const chartOptions = computed(() => {
  const { total_forecast_revenue, total_period_accommodation_revenue, total_prev_year_accommodation_revenue } = props.revenueData;
  const varianceAmount = total_period_accommodation_revenue - total_forecast_revenue;
  const prevYearAmount = total_prev_year_accommodation_revenue || 0;

  let displayVariancePercent;
  if (total_forecast_revenue === 0 || total_forecast_revenue === null) {
    displayVariancePercent = (total_period_accommodation_revenue === 0 || total_period_accommodation_revenue === null) ? "0.00%" : "N/A";
  } else {
    const percent = (varianceAmount / total_forecast_revenue) * 100;
    displayVariancePercent = `${percent.toFixed(2)}%`;
  }

  const variancePositiveColor = '#4CAF50';
  const varianceNegativeColor = '#F44336';
  const prevYearColor = '#909399';

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const valueParam = params.find(p => p.seriesName === '売上');
        if (!valueParam || valueParam.value === undefined) {
          const placeholderParam = params.find(p => p.seriesName === 'PlaceholderBase');
          if (placeholderParam && valueParam && valueParam.name === '分散') {
            // Special handling for variance tooltip
          } else if (!valueParam) {
            return '';
          }
        }

        let tooltipText = `${valueParam.name}<br/>`;
        if (valueParam.name === '分散') {
          tooltipText += `${valueParam.marker || ''} 金額: ${formatYenInTenThousands(varianceAmount)}<br/>`;
          tooltipText += `率: ${displayVariancePercent}`;
        } else {
          tooltipText += `${valueParam.marker || ''} 金額: ${formatYenInTenThousands(valueParam.value)}`;
        }
        return tooltipText;
      },
    },
    grid: { left: '3%', right: '10%', bottom: '10%', containLabel: true },
    xAxis: [{
      type: 'category',
      data: ['計画売上', '分散', '実績売上', '前年実績'], // Reordered: Plan, Variance, Actual, PrevYear
      splitLine: { show: false },
      axisLabel: { interval: 0 },
    }],
    yAxis: [{
      type: 'value',
      name: '金額 (万円)',
      axisLabel: { formatter: (value) => `${(value / 10000).toLocaleString('ja-JP')}` },
      splitLine: { show: true },
    }],
    series: [
      {
        name: 'PlaceholderBase',
        type: 'bar',
        stack: 'total',
        barWidth: '60%',
        itemStyle: { borderColor: 'transparent', color: 'transparent' },
        emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
        data: [
          0, // Plan
          varianceAmount >= 0 ? total_forecast_revenue : total_period_accommodation_revenue, // Variance base
          0, // Actual
          0, // Prev Year
        ],
      },
      {
        name: '売上',
        type: 'bar',
        stack: 'total',
        barWidth: '60%',
        label: {
          show: true,
          formatter: (params) => {
            if (params.name === '分散') {
              return displayVariancePercent;
            }
            return formatYenInTenThousandsNoDecimal(params.value);
          },
        },
        data: [
          {
            value: total_forecast_revenue,
            itemStyle: { color: colorScheme.forecast },
            label: { position: 'top' },
          },
          {
            value: Math.abs(varianceAmount),
            itemStyle: { color: varianceAmount >= 0 ? variancePositiveColor : varianceNegativeColor },
            label: { position: 'top' },
          },
          {
            value: total_period_accommodation_revenue,
            itemStyle: { color: colorScheme.actual },
            label: { position: 'top' },
          },
          {
            value: prevYearAmount,
            itemStyle: { color: prevYearColor },
            label: { position: 'top' },
          },
        ],
      },
    ],
  };
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
