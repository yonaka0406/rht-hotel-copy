<template>
    <div>    
        <div class="flex justify-end mb-2">
            <SelectButton v-model="selectedView" :options="viewOptions" optionLabel="label" optionValue="value" />
        </div>
        
        <div v-if="selectedView === 'graph'">
            <Card>
                <template #header>
                    <span class="text-xl font-bold">収益（計画ｘ実績）</span>
                </template>
                <template #content>
                    <div v-if="!hasRevenueDataForChart" class="text-center p-4">
                        データはありません。
                    </div>
                    <div v-else class="flex flex-wrap">
                        <div class="pr-2" style="width: 75%;">
                            <div ref="monthlyChartContainer" style="height: 450px; width: 100%;"></div>
                        </div>
                        <div class="pl-2" style="width: 25%;">
                            <div ref="totalChartContainer" style="height: 450px; width: 100%;"></div>
                        </div>
                    </div>                    
                </template>                
            </Card>
        </div>

        <div v-if="selectedView === 'table'">
            <Card>
                <template #header>
                    <span class="text-xl font-bold">収益（計画ｘ実績）</span>
                </template>
                <template #content>
                    <div v-if="!props.revenueData || props.revenueData.length === 0" class="text-center p-4">
                        データはありません。
                    </div>
                    <div v-else class="text-center p-4">                        
                        <DataTable :value="props.revenueData" 
                            responsiveLayout="scroll" 
                            paginator 
                            :rows="20"
                            :rowsPerPageOptions="[10, 20, 50]"
                            stripedRows
                            sortMode="multiple"
                            removableSort
                        >
                            <Column field="hotel_name" header="施設" frozen sortable style="width: 20%"></Column>
                            <Column field="month" header="月度" sortable style="width: 10%"></Column>
                            <Column field="forecast_revenue" header="計画" sortable style="width: 20%">
                                <template #body="{ data }">
                                    <div class="flex justify-end mr-2">
                                        {{ formatCurrency(data.forecast_revenue) }}
                                    </div>
                                </template>
                            </Column>
                            <Column field="period_revenue" header="実績①" sortable style="width: 20%">
                                <template #body="{ data }">
                                    <div class="flex justify-end mr-2"> 
                                        {{ formatCurrency(data.period_revenue) }}
                                    </div>
                                </template>
                            </Column>
                            <Column header="分散" sortable style="width: 30%">
                                <template #body="{ data }">
                                    <div class="flex justify-end mr-2">                                        
                                        {{ formatCurrency(data.period_revenue - data.forecast_revenue) }}
                                        <Badge class="ml-2" :severity="getSeverity((data.period_revenue / data.forecast_revenue) - 1)" size="small">
                                            {{ formatPercentage((data.period_revenue / data.forecast_revenue) - 1) }}
                                        </Badge>
                                    </div>
                                </template>
                            </Column>
                            <template #footer>
                                <div class="flex justify-content-between">
                                    <small>① 会計データがない場合はPMSの数値になっています。</small>                                    
                                </div>
                            </template>
                            <template #paginatorstart>                                
                            </template>
                            <template #paginatorend>
                                <Button type="button" icon="pi pi-download" text @click="exportCSV('revenue')" />
                            </template>
                        </DataTable>
                    </div>
                </template>
            </Card>
        </div>
    </div>
</template>
<script setup>
    // Vue
    import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef, nextTick } from 'vue';
    
    // Props
    const props = defineProps({
        revenueData: {
            type: Array,
            required: true
        },
        occupancyData: {
            type: Array,
            required: true
        },   
    });

    // Primevue
    import { Card, Badge, SelectButton, Button, DataTable, Column } from 'primevue';

    // Helper
    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '-';
        return parseFloat(value).toLocaleString('ja-JP') + ' 円';
    };
    const formatPercentage = (value) => {
        if (value === null || value === undefined) return '-';
        return parseFloat(value).toLocaleString('ja-JP', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const calculateVariancePercentage = (period, forecast) => {
        if (forecast === 0 || forecast === null || forecast === undefined) {
            return (period === 0 || period === null || period === undefined) ? '0.00' : 'N/A'; // Or handle as per requirement, e.g. 100% if period > 0
        }
        const variance = ((period - forecast) / forecast) * 100;
        return variance.toFixed(2);
    };
    const formatYenInTenThousands = (value) => {
        if (value === null || value === undefined) return '-';
        const valueInMan = value / 10000;        
        return valueInMan.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '万円';
    };

    // View selection
    const selectedView = ref('graph'); // Default view
    const viewOptions = ref([
        { label: 'グラフ', value: 'graph' },
        { label: 'テーブル', value: 'table' }
    ]);

    // ECharts imports
    import * as echarts from 'echarts/core';
    import {        
        TitleComponent,
        TooltipComponent,
        GridComponent,
        LegendComponent,
        DatasetComponent,
        TransformComponent,
    } from 'echarts/components';    
    import { BarChart, LineChart } from 'echarts/charts';    
    import { CanvasRenderer } from 'echarts/renderers';

    // Register ECharts components
    echarts.use([        
        TitleComponent,
        TooltipComponent,
        GridComponent,
        LegendComponent,
        DatasetComponent,
        TransformComponent,
        BarChart,
        LineChart,
        CanvasRenderer
    ]);
    const resizeChartHandler = () => {
        monthlyChartInstance.value?.resize();
        totalChartInstance.value?.resize();
    };

    // Revenue Chart
    const monthlyChartContainer = ref(null);
    const totalChartContainer = ref(null);
    const monthlyChartInstance = shallowRef(null);
    const totalChartInstance = shallowRef(null);
    const filteredRevenueForChart = computed(() => {
        if (!props.revenueData) return [];
        return props.revenueData.filter(item => item.hotel_id === 0);
    });
    const hasRevenueDataForChart = computed(() => {
        return filteredRevenueForChart.value.length > 0;
    });

    const monthlyChartOptions = computed(() => {
        const data = filteredRevenueForChart.value;
        if (!data.length) return {};

        const months = [...new Set(data.map(item => item.month))].sort();
        const getDataForMonth = (month, key) => data.find(d => d.month === month)?.[key] ?? 0;
        
        const forecastRevenues = months.map(month => getDataForMonth(month, 'forecast_revenue'));
        const periodRevenues = months.map(month => getDataForMonth(month, 'period_revenue'));
        const variances = months.map(month => {
            const forecast = getDataForMonth(month, 'forecast_revenue');
            const period = getDataForMonth(month, 'period_revenue');
            return parseFloat(calculateVariancePercentage(period, forecast)) || 0; // Ensure numeric for chart
        });

        return {
            tooltip: { 
                trigger: 'axis', 
                axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
                formatter: (params) => {
                    let tooltipText = `${params[0].axisValueLabel}<br/>`;
                    params.forEach(param => {
                        if (param.seriesName === '分散 (%)') {
                            tooltipText += `${param.marker} ${param.seriesName}: ${param.value}%<br/>`;
                        } else {
                            tooltipText += `${param.marker} ${param.seriesName}: ${formatYenInTenThousands(param.value)}<br/>`;
                        }
                    });
                    return tooltipText;
                }
            },
            legend: { data: ['計画売上', '実績売上', '分散 (%)'], top: 'bottom' },
            grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
            xAxis: [{ type: 'category', data: months, axisPointer: { type: 'shadow' } }],
            yAxis: [
                { type: 'value', name: '売上 (万円)', axisLabel: { formatter: (value) => `${(value / 10000).toLocaleString('ja-JP')}` }, scale: true },
                { type: 'value', name: '分散 (%)', axisLabel: { formatter: '{value}%' }, scale: true }
            ],
            series: [
                { name: '計画売上', type: 'bar', data: forecastRevenues, emphasis: { focus: 'series' } },
                { name: '実績売上', type: 'bar', data: periodRevenues, emphasis: { focus: 'series' } },
                { name: '分散 (%)', type: 'line', yAxisIndex: 1, data: variances, smooth: true, itemStyle: { color: '#FFBF00' } }
            ]
        };
    });
    const totalChartOptions = computed(() => {
        const data = filteredRevenueForChart.value;
        if (!data.length) return {};

        const totalForecastRevenue = data.reduce((sum, item) => sum + (item.forecast_revenue || 0), 0);
        const totalPeriodRevenue = data.reduce((sum, item) => sum + (item.period_revenue || 0), 0);
        const totalVariancePercent = parseFloat(calculateVariancePercentage(totalPeriodRevenue, totalForecastRevenue)) || 0; // Ensure numeric

        return {
            tooltip: { 
                trigger: 'axis', 
                axisPointer: { type: 'shadow' },
                formatter: (params) => {
                    let tooltipText = `${params[0].axisValueLabel}<br/>`;
                    params.forEach(param => {
                        if (param.seriesName === '分散 (%)') {
                            tooltipText += `${param.marker} ${param.seriesName}: ${param.value}%<br/>`;
                        } else {
                            tooltipText += `${param.marker} ${param.seriesName}: ${formatYenInTenThousands(param.value)}<br/>`;
                        }
                    });
                    return tooltipText;
                }
            },
            legend: { data: ['計画売上', '実績売上', '分散 (%)'], top: 'bottom' },
            grid: { left: '3%', right: '10%', bottom: '10%', containLabel: true },
            xAxis: [{ type: 'category', data: ['期間合計'] }],
            yAxis: [
                { type: 'value', axisLabel: { show: false, formatter: (value) => `${(value / 10000).toLocaleString('ja-JP')}` } }, // Display in 万円
                { type: 'value', axisLabel: { show: false, formatter: '{value}%' } }
            ],
            series: [
                { name: '計画売上', type: 'bar', data: [totalForecastRevenue], barWidth: '30%', label: { show: true, position: 'top', formatter: (params) => formatYenInTenThousands(params.value)} },
                { name: '実績売上', type: 'bar', data: [totalPeriodRevenue], barWidth: '30%', label: { show: true, position: 'top', formatter: (params) => formatYenInTenThousands(params.value)} },
                { name: '分散 (%)', type: 'bar', yAxisIndex: 1, data: [totalVariancePercent], barWidth: '15%', 
                    itemStyle: { 
                        opacity: 0.8,
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: '#fff7cc' },
                            { offset: 0.5, color: '#ffd700' },
                            { offset: 1, color: '#b8860b' }
                        ])                        
                    },
                    label: { show: true, position: 'top', formatter: (params) => `${params.value}%` }                
                }
            ]
        };
    });

    // Initialize charts
    const initCharts = () => {
        if (monthlyChartContainer.value && hasRevenueDataForChart.value && !monthlyChartInstance.value) {
            monthlyChartInstance.value = echarts.init(monthlyChartContainer.value);
            monthlyChartInstance.value.setOption(monthlyChartOptions.value);
        }
        if (totalChartContainer.value && hasRevenueDataForChart.value && !totalChartInstance.value) {
            totalChartInstance.value = echarts.init(totalChartContainer.value);
            totalChartInstance.value.setOption(totalChartOptions.value);
        }
    };

    // Update charts
    const updateCharts = () => {
        if (hasRevenueDataForChart.value) {
            if (monthlyChartInstance.value) {
                monthlyChartInstance.value.setOption(monthlyChartOptions.value, true);
            } else if (monthlyChartContainer.value) { // If instance was cleared but container exists
                monthlyChartInstance.value = echarts.init(monthlyChartContainer.value);
                monthlyChartInstance.value.setOption(monthlyChartOptions.value);
            }
            if (totalChartInstance.value) {
                totalChartInstance.value.setOption(totalChartOptions.value, true);
            } else if (totalChartContainer.value) { // If instance was cleared but container exists
                totalChartInstance.value = echarts.init(totalChartContainer.value);
                totalChartInstance.value.setOption(totalChartOptions.value);
            }
        } else {
            monthlyChartInstance.value?.clear();
            totalChartInstance.value?.clear();
        }
    };

    // Table
    const getSeverity = (value) => {
        if (value === null || value === undefined || value === -1) return 'secondary';
        if (value > 0) return 'success';
        if (value < -0.5) return 'danger';
        if (value < 0) return 'warn';
        return 'info';
    };
    const exportCSV = (tableType) => {
        if(tableType === 'revenue') {
            console.log(`RSMAll: exportCSV ${tableType}`, props.revenueData);        
        }        
    };

    onMounted(async () => {
        console.log('RSMAll: onMounted', props.revenueData, props.occupancyData);

        if (selectedView.value === 'graph') {
            // Use nextTick to ensure containers are rendered before initializing
            nextTick(() => {
                initCharts();
            });
        }
        window.addEventListener('resize', resizeChartHandler);
    });
    onBeforeUnmount(() => {
        monthlyChartInstance.value?.dispose();
        totalChartInstance.value?.dispose();
        window.removeEventListener('resize', resizeChartHandler);
    });

    // Watch for changes in computed chart options
    watch([monthlyChartOptions, totalChartOptions], () => {
        if (selectedView.value === 'graph') {
            updateCharts();
        }
    }, { deep: true });
</script>