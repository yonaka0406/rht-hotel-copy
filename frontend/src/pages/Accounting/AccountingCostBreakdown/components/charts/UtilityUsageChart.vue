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
    selectedMetric: {
        type: String,
        required: true
    },
    isPerRoom: {
        type: Boolean,
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
    const metricLabel = props.selectedMetric === 'quantity' ? '使用量' : '金額';
    const metricUnit = props.selectedMetric === 'quantity' ? unit : '¥';
    const normalizationLabel = props.isPerRoom ? '(1室あたり)' : '(合計)';
    
    const valueKey = props.isPerRoom 
        ? (props.selectedMetric === 'quantity' ? 'quantity_per_room' : 'value_per_room')
        : (mode === 'ranking' ? (props.selectedMetric === 'quantity' ? 'avg_monthly_quantity' : 'avg_monthly_value') : (props.selectedMetric === 'quantity' ? 'quantity' : 'total_value'));

    const prevValueKey = props.isPerRoom
        ? (props.selectedMetric === 'quantity' ? 'prev_quantity_per_room' : 'prev_value_per_room')
        : (props.selectedMetric === 'quantity' ? (mode === 'ranking' ? 'prev_avg_monthly_quantity' : 'prev_quantity') : (mode === 'ranking' ? 'prev_avg_monthly_value' : 'prev_total_value'));

    if (mode === 'ranking') {
        const sorted = [...data].sort((a, b) => b[valueKey] - a[valueKey]);
        const avgVal = globalAvg[valueKey];
        const insertIdx = sorted.findIndex(h => h[valueKey] < avgVal);
        const displayData = insertIdx === -1 
            ? [...sorted, globalAvg] 
            : [...sorted.slice(0, insertIdx), globalAvg, ...sorted.slice(insertIdx)];
        
        const series = [
            {
                name: `${metricLabel} (当年)`,
                type: 'bar',
                itemStyle: { color: props.selectedMetric === 'quantity' ? '#fbbf24' : '#8b5cf6' },
                data: displayData.map(d => ({
                    value: d[valueKey],
                    itemStyle: { color: d.isAverage ? '#ef4444' : (props.selectedMetric === 'quantity' ? '#fbbf24' : '#8b5cf6') }
                }))
            }
        ];

        if (props.showPreviousYear) {
            series.push({
                name: `${metricLabel} (前年)`,
                type: 'bar',
                itemStyle: { color: props.selectedMetric === 'quantity' ? '#fde68a' : '#c4b5fd' },
                data: displayData.map(d => ({
                    value: d[prevValueKey],
                    itemStyle: { color: d.isAverage ? '#fca5a5' : (props.selectedMetric === 'quantity' ? '#fde68a' : '#c4b5fd'), opacity: 0.8 }
                }))
            });
        }

        series.push({
            name: '稼働率 (当年)',
            type: 'line',
            yAxisIndex: 1,
            data: displayData.map(d => d.avg_occupancy),
            itemStyle: { color: '#10b981' },
            lineStyle: { width: 2, type: 'dashed' },
            symbol: 'circle'
        });

        if (props.showPreviousYear) {
            series.push({
                name: '稼働率 (前年)',
                type: 'line',
                yAxisIndex: 1,
                data: displayData.map(d => d.prev_avg_occupancy),
                itemStyle: { color: '#6ee7b7' },
                lineStyle: { width: 1, type: 'dotted' },
                symbol: 'none'
            });
        }

        return {
            title: { text: `${metricLabel}${normalizationLabel} 施設別ランキング`, left: 'center', textStyle: { fontSize: 14 } },
            tooltip: { 
                trigger: 'axis', 
                axisPointer: { type: 'shadow' },
                formatter: (params) => {
                    const d = displayData[params[0].dataIndex];
                    const isQty = props.selectedMetric === 'quantity';
                    let html = `<div class="font-bold mb-2">${d.hotel_name}</div>`;
                    
                    const mainVal = d[valueKey];
                    const prevVal = d[prevValueKey];
                    const diff = prevVal > 0 ? ((mainVal - prevVal) / prevVal) * 100 : null;
                    
                    html += `<div class="flex justify-between gap-4 mb-1">
                        <span class="text-slate-400">${metricLabel} (当年):</span>
                        <span class="font-bold text-violet-600">${isQty ? mainVal.toFixed(2) : Math.round(mainVal).toLocaleString()}${metricUnit}</span>
                    </div>`;

                    if (props.showPreviousYear) {
                        html += `<div class="flex justify-between gap-4 mb-1">
                            <span class="text-slate-400">${metricLabel} (前年):</span>
                            <span class="font-bold text-slate-500">${isQty ? prevVal.toFixed(2) : Math.round(prevVal).toLocaleString()}${metricUnit}</span>
                        </div>`;
                        if (diff !== null) {
                            html += `<div class="flex justify-between gap-4 mb-1 text-[10px]">
                                <span class="text-slate-400">前年比:</span>
                                <span class="${diff > 0 ? 'text-red-500' : 'text-emerald-500'} font-bold">${diff > 0 ? '+' : ''}${diff.toFixed(1)}%</span>
                            </div>`;
                        }
                    }
                    
                    html += `<div class="mt-2 pt-2 border-t border-slate-100">
                        <div class="flex justify-between gap-4 mb-1 text-[10px]">
                            <span class="text-slate-400">実数合計 (当年月平均):</span>
                            <span>${isQty ? d.avg_monthly_quantity.toFixed(2) : Math.round(d.avg_monthly_value).toLocaleString()}${isQty ? unit : '円'}</span>
                        </div>
                        <div class="flex justify-between gap-4 mb-1 text-[10px]">
                            <span class="text-slate-400">1室あたり (当年):</span>
                            <span>${isQty ? d.quantity_per_room.toFixed(2) : Math.round(d.value_per_room).toLocaleString()}${isQty ? unit : '円'}/室</span>
                        </div>
                    </div>`;
                    
                    html += `<div class="flex justify-between gap-4 mt-1 pt-1 border-t border-slate-50">
                        <span class="text-slate-400">稼働率 (当年):</span>
                        <span class="font-bold text-emerald-500">${d.avg_occupancy.toFixed(1)}%</span>
                    </div>`;

                    if (props.showPreviousYear) {
                        html += `<div class="flex justify-between gap-4 mb-1 text-[10px]">
                            <span class="text-slate-400">稼働率 (前年):</span>
                            <span class="text-emerald-400">${d.prev_avg_occupancy.toFixed(1)}%</span>
                        </div>`;
                    }
                    return html;
                }
            },
            legend: { 
                data: [
                    `${metricLabel} (当年)`, 
                    `${metricLabel} (前年)`, 
                    '稼働率 (当年)', 
                    '稼働率 (前年)'
                ].filter(n => props.showPreviousYear || !n.includes('(前年)')), 
                bottom: 0 
            },
            grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
            xAxis: { type: 'category', data: displayData.map(d => d.hotel_name), axisLabel: { interval: 0, rotate: 45 } },
            yAxis: [
                { type: 'value', name: `${metricLabel} (${metricUnit})`, position: 'left' },
                { type: 'value', name: '稼働率 (%)', position: 'right', min: 0, max: 100, axisLabel: { formatter: '{value}%' } }
            ],
            series
        };
    } else {
        const months = data.map(d => `${new Date(d.month).getMonth() + 1}月`);
        const series = [
            {
                name: `${metricLabel} (当年)`,
                type: 'bar',
                itemStyle: { color: props.selectedMetric === 'quantity' ? '#fbbf24' : '#8b5cf6' },
                data: data.map(d => d[valueKey])
            }
        ];

        if (props.showPreviousYear) {
            series.push({
                name: `${metricLabel} (前年)`,
                type: 'bar',
                itemStyle: { color: props.selectedMetric === 'quantity' ? '#fde68a' : '#c4b5fd', opacity: 0.8 },
                data: data.map(d => d[prevValueKey])
            });
        }

        series.push({
            name: '稼働率 (当年)',
            type: 'line',
            yAxisIndex: 1,
            data: data.map(d => d.occupancy),
            itemStyle: { color: '#10b981' },
            lineStyle: { width: 3 },
            smooth: true
        });

        if (props.showPreviousYear) {
            series.push({
                name: '稼働率 (前年)',
                type: 'line',
                yAxisIndex: 1,
                data: data.map(d => d.prev_occupancy),
                itemStyle: { color: '#6ee7b7' },
                lineStyle: { width: 1, type: 'dashed' },
                smooth: true
            });
        }
        
        return {
            title: { text: `${metricLabel}${normalizationLabel} の推移`, left: 'center', textStyle: { fontSize: 14 } },
            tooltip: { 
                trigger: 'axis', 
                axisPointer: { type: 'cross' },
                formatter: (params) => {
                    const d = data[params[0].dataIndex];
                    const isQty = props.selectedMetric === 'quantity';
                    let html = `<div class="font-bold mb-2">${new Date(d.month).getMonth() + 1}月のデータ</div>`;
                    
                    const mainVal = d[valueKey];
                    const prevVal = d[prevValueKey];
                    const diff = prevVal > 0 ? ((mainVal - prevVal) / prevVal) * 100 : null;
                    
                    html += `<div class="flex justify-between gap-4 mb-1">
                        <span class="text-slate-400">${metricLabel} (当年):</span>
                        <span class="font-bold text-violet-600">${isQty ? mainVal.toFixed(2) : Math.round(mainVal).toLocaleString()}${metricUnit}</span>
                    </div>`;

                    if (props.showPreviousYear) {
                        html += `<div class="flex justify-between gap-4 mb-1">
                            <span class="text-slate-400">${metricLabel} (前年):</span>
                            <span class="font-bold text-slate-500">${isQty ? prevVal.toFixed(2) : Math.round(prevVal).toLocaleString()}${metricUnit}</span>
                        </div>`;
                        if (diff !== null) {
                            html += `<div class="flex justify-between gap-4 mb-1 text-[10px]">
                                <span class="text-slate-400">前年比:</span>
                                <span class="${diff > 0 ? 'text-red-500' : 'text-emerald-500'} font-bold">${diff > 0 ? '+' : ''}${diff.toFixed(1)}%</span>
                            </div>`;
                        }
                    }
                    
                    html += `<div class="mt-2 pt-2 border-t border-slate-100">
                        <div class="flex justify-between gap-4 mb-1 text-[10px]">
                            <span class="text-slate-400">実数合計 (当年):</span>
                            <span>${isQty ? d.quantity.toFixed(2) : Math.round(d.total_value).toLocaleString()}${isQty ? unit : '円'}</span>
                        </div>
                    </div>`;
                    
                    html += `<div class="flex justify-between gap-4 mt-1 pt-1 border-t border-slate-50">
                        <span class="text-slate-400">稼働率 (当年):</span>
                        <span class="font-bold text-emerald-500">${d.occupancy.toFixed(1)}%</span>
                    </div>`;

                    if (props.showPreviousYear) {
                        html += `<div class="flex justify-between gap-4 mb-1 text-[10px]">
                            <span class="text-slate-400">稼働率 (前年):</span>
                            <span class="text-emerald-400">${d.prev_occupancy.toFixed(1)}%</span>
                        </div>`;
                    }
                    return html;
                }
            },
            legend: { 
                data: [
                    `${metricLabel} (当年)`, 
                    `${metricLabel} (前年)`, 
                    '稼働率 (当年)', 
                    '稼働率 (前年)'
                ].filter(n => props.showPreviousYear || !n.includes('(前年)')), 
                bottom: 0 
            },
            grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
            xAxis: { type: 'category', data: months },
            yAxis: [
                { type: 'value', name: `${metricLabel} (${metricUnit})`, position: 'left' },
                { type: 'value', name: '稼働率 (%)', position: 'right', min: 0, max: 100, axisLabel: { formatter: '{value}%' } }
            ],
            series
        };
    }
});
</script>