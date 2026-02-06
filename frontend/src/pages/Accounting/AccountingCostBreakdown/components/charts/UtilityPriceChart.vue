<template>
    <div class="h-80">
        <v-chart class="h-full w-full" :option="chartOption" autoresize />
    </div>
</template>

<script setup>
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { getUtilityUnit } from '@/utils/accountingUtils';

const props = defineProps({
    chartData: {
        type: Object,
        required: true
    },
    showPreviousYear: {
        type: Boolean,
        required: true
    },
    selectedType: {
        type: String,
        required: true
    }
});

const chartOption = computed(() => {
    const { mode, data, globalAvg } = props.chartData;
    if (!data) return {};

    const unit = getUtilityUnit(props.selectedType);

    if (mode === 'ranking') {
        const sorted = [...data].sort((a, b) => b.average_price - a.average_price);
        const avgVal = globalAvg.average_price;
        const insertIdx = sorted.findIndex(h => h.average_price < avgVal);
        const displayData = insertIdx === -1 
            ? [...sorted, globalAvg] 
            : [...sorted.slice(0, insertIdx), globalAvg, ...sorted.slice(insertIdx)];

        const series = [
            {
                name: '平均単価 (当年)',
                type: 'bar',
                itemStyle: { color: '#10b981' },
                data: displayData.map(d => ({
                    value: d.average_price,
                    itemStyle: { color: d.isAverage ? '#ef4444' : '#10b981' }
                }))
            }
        ];

        if (props.showPreviousYear) {
            series.push({
                name: '平均単価 (前年)',
                type: 'bar',
                itemStyle: { color: '#6ee7b7' },
                data: displayData.map(d => ({
                    value: d.prev_average_price,
                    itemStyle: { color: d.isAverage ? '#fca5a5' : '#6ee7b7', opacity: 0.8 }
                }))
            });
        }

        return {
            title: { text: '平均単価 施設別ランキング', left: 'center', textStyle: { fontSize: 14 } },
            tooltip: { 
                trigger: 'axis', 
                axisPointer: { type: 'shadow' },
                formatter: (params) => {
                    const d = displayData[params[0].dataIndex];
                    let html = `<div class="font-bold mb-2">${d.hotel_name}</div>`;
                    
                    const mainVal = d.average_price;
                    const prevVal = d.prev_average_price;
                    const diff = prevVal > 0 ? ((mainVal - prevVal) / prevVal) * 100 : null;
                    
                    html += `<div class="flex justify-between gap-4 mb-1">
                        <span class="text-slate-400">当年単価:</span>
                        <span class="font-bold text-emerald-500">¥${Math.round(mainVal).toLocaleString()} / ${unit}</span>
                    </div>`;

                    if (props.showPreviousYear) {
                        html += `<div class="flex justify-between gap-4 mb-1">
                            <span class="text-slate-400">前年単価:</span>
                            <span class="font-bold text-slate-500">¥${Math.round(prevVal).toLocaleString()} / ${unit}</span>
                        </div>`;
                        if (diff !== null) {
                            html += `<div class="flex justify-between gap-4 mb-1 text-[10px]">
                                <span class="text-slate-400">単価騰落率:</span>
                                <span class="${diff > 0 ? 'text-red-500' : 'text-emerald-500'} font-bold">${diff > 0 ? '+' : ''}${diff.toFixed(1)}%</span>
                            </div>`;
                        }
                    }
                    return html;
                }
            },
            legend: { data: ['平均単価 (当年)', '平均単価 (前年)'].filter(n => props.showPreviousYear || !n.includes('(前年)')), bottom: 0 },
            grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
            xAxis: { type: 'category', data: displayData.map(d => d.hotel_name), axisLabel: { interval: 0, rotate: 45 } },
            yAxis: { type: 'value', name: `単価 (¥/${unit})` },
            series
        };
    } else {
        const months = data.map(d => `${new Date(d.month).getMonth() + 1}月`);
        const series = [
            {
                name: '平均単価 (当年)',
                type: 'line',
                data: data.map(d => d.average_price),
                itemStyle: { color: '#10b981' },
                areaStyle: { opacity: 0.1 },
                smooth: true
            }
        ];

        if (props.showPreviousYear) {
            series.push({
                name: '平均単価 (前年)',
                type: 'line',
                data: data.map(d => d.prev_average_price),
                itemStyle: { color: '#6ee7b7' },
                lineStyle: { type: 'dashed' },
                smooth: true
            });
        }

        return {
            title: { text: '平均単価の推移', left: 'center', textStyle: { fontSize: 14 } },
            tooltip: { 
                trigger: 'axis',
                formatter: (params) => {
                    const d = data[params[0].dataIndex];
                    let html = `<div class="font-bold mb-2">${new Date(d.month).getMonth() + 1}月のデータ</div>`;
                    
                    const mainVal = d.average_price;
                    const prevVal = d.prev_average_price;
                    const diff = prevVal > 0 ? ((mainVal - prevVal) / prevVal) * 100 : null;
                    
                    html += `<div class="flex justify-between gap-4 mb-1">
                        <span class="text-slate-400">当年単価:</span>
                        <span class="font-bold text-emerald-500">¥${Math.round(mainVal).toLocaleString()} / ${unit}</span>
                    </div>`;

                    if (props.showPreviousYear) {
                        html += `<div class="flex justify-between gap-4 mb-1">
                            <span class="text-slate-400">前年単価:</span>
                            <span class="font-bold text-slate-500">¥${Math.round(prevVal).toLocaleString()} / ${unit}</span>
                        </div>`;
                        if (diff !== null) {
                            html += `<div class="flex justify-between gap-4 mb-1 text-[10px]">
                                <span class="text-slate-400">単価騰落率:</span>
                                <span class="${diff > 0 ? 'text-red-500' : 'text-emerald-500'} font-bold">${diff > 0 ? '+' : ''}${diff.toFixed(1)}%</span>
                            </div>`;
                        }
                    }
                    return html;
                }
            },
            legend: { data: ['平均単価 (当年)', '平均単価 (前年)'].filter(n => props.showPreviousYear || !n.includes('(前年)')), bottom: 0 },
            grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
            xAxis: { type: 'category', data: months },
            yAxis: { type: 'value', name: `単価 (¥/${unit})` },
            series
        };
    }
});
</script>