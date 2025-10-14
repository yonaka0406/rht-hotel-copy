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
import { BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import Card from 'primevue/card';

use([
  CanvasRenderer,
  BarChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
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
    name: '確定予約数',
  },
  series: [
    {
      name: '確定予約数',
      type: 'bar',
      data: [],
      itemStyle: {
        color: '#5470C6',
      },
    },
  ],
});

const processedChartData = computed(() => {
  const hotelNames = [];
  const confirmedStays = [];

  // Aggregate confirmed stays per hotel
  const aggregatedData = props.reportData.reduce((acc, item) => {
    if (!acc[item.hotel_name]) {
      acc[item.hotel_name] = 0;
    }
    acc[item.hotel_name] += Number(item.confirmed_stays);
    return acc;
  }, {});

  for (const hotelName in aggregatedData) {
    hotelNames.push(hotelName);
    confirmedStays.push(aggregatedData[hotelName]);
  }

  return { hotelNames, confirmedStays };
});

watch(processedChartData, (newData) => {
  console.log('Chart Data:', newData);
  chartOption.value.xAxis.data = newData.hotelNames;
  chartOption.value.series[0].data = newData.confirmedStays;
}, { immediate: true });
</script>

<style scoped>
/* Add any specific styles for the chart component here */
</style>