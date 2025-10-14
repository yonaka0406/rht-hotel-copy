<template>
  <Card>
    <template #title>ホテル別確定予約数 ({{ metricDate }})</template>
    <template #content>
      <div class="h-96">
        <VChart :option="chartOption" autoresize />
      </div>
    </template>
  </Card>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import Card from 'primevue/card';

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
]);

const props = defineProps({
  reportData: {
    type: Array,
    default: () => [],
  },
  metricDate: {
    type: String,
    default: '',
  },
});

const chartOption = ref({
  // title: {
  //   text: 'ホテル別予約数',
  //   left: 'center',
  // },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
    },
  },
  legend: {
    data: [],
    bottom: 0,
    selectedMode: 'multiple',
  },
  xAxis: {
    type: 'category',
    data: [],
    axisLabel: {
      interval: 0,
      rotate: 30,
    },
  },
  yAxis: {
    type: 'value',
    name: '予約数',
  },
  series: [],
});

  const processedChartData = computed(() => {
    const monthlyAggregatedData = props.reportData.reduce((acc, item) => {
      const month = item.month.substring(0, 7); // Extract YYYY-MM from YYYY-MM-DD
      if (!acc[month]) {
        acc[month] = { totalPendingStays: 0 }; // Initialize totalPendingStays for the month
      }
      if (!acc[month][item.hotel_name]) {
        acc[month][item.hotel_name] = 0;
      }
      acc[month][item.hotel_name] += Number(item.confirmed_stays);
      acc[month].totalPendingStays += Number(item.pending_stays); // Sum pending stays
      return acc;
    }, {});

    const months = Object.keys(monthlyAggregatedData).sort();
    const hotelNames = [...new Set(props.reportData.map(item => item.hotel_name))];

    const series = hotelNames.map(hotelName => {
      const data = months.map(month => {
        const value = monthlyAggregatedData[month][hotelName] || 0;
        return value === 0 ? { value: 0, symbol: 'none' } : value;
      });
      return {
        name: hotelName,
        type: 'line',
        smooth: true,
        stack: 'total', // Add stack property for stacking
        areaStyle: {}, // Add areaStyle for area chart
        data: data,
      };
    });

    // Add series for total pending stays
    const totalPendingStaysSeries = {
      name: '仮予約合計',
      type: 'line',
      smooth: true,
      stack: 'total',
      areaStyle: {},
      data: months.map(month => monthlyAggregatedData[month].totalPendingStays || 0),
    };
    series.push(totalPendingStaysSeries);

    hotelNames.push('仮予約合計'); // Add to legend data

    return { hotelNames, months, series };
  });
watch(processedChartData, (newData) => {
  //console.log('Chart Data:', newData);
  chartOption.value.xAxis.data = newData.months;
  chartOption.value.legend.data = newData.hotelNames;
  chartOption.value.series = newData.series;
}, { immediate: true });
</script>

<style scoped>
/* Add any specific styles for the chart component here */
</style>