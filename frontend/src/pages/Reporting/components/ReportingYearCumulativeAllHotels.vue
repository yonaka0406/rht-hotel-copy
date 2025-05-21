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
                <template #footer>
                    <div class="flex justify-content-between">
                        <small>会計データがない場合はPMSの数値になっています。選択中の施設： {{ allHotelNames }}</small>
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
                            :rows="5"
                            :rowsPerPageOptions="[5, 15, 30, 50]"
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

    // Computed property to get all unique hotel names from revenueData    
    const allHotelNames = computed(() => {
        if (!props.revenueData || props.revenueData.length === 0) {
            return 'N/A';
        }
        const names = props.revenueData
            .map(item => item.hotel_name)
            .filter(name => name && name !== '施設合計'); // Exclude null/undefined and "施設合計"
        
        const uniqueNames = [...new Set(names)];
        return uniqueNames.join(', ');
    });


    // Color scheme    
    const colorScheme = {
        // Solid base colors
        actual: '#C8102E',       // Deep red for actual revenue
        forecast: '#F2A900',     // Golden yellow for projected revenue
        variance: '#555555',     // Neutral gray for variance label

        // Gradient for Actual (from dark red to light red)
        actual_gradient_top: '#A60D25',
        actual_gradient_middle: '#C8102E',
        actual_gradient_bottom: '#E94A57',

        // Gradient for Forecast (from golden to soft yellow)
        forecast_gradient_top: '#D48F00',
        forecast_gradient_middle: '#F2A900',
        forecast_gradient_bottom: '#FFE066',

        // Gradient for Variance (negative to positive)
        variance_gradient_top: '#888888',      // Light gray (low variance)
        variance_gradient_middle: '#555555',   // Medium gray (baseline)
        variance_gradient_bottom: '#222222',   // Dark gray (high variance)
    };

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
                { type: 'value', axisLabel: { show: false }, splitLine: { show: false } }
            ],
            series: [
                { name: '計画売上', type: 'bar', data: forecastRevenues, emphasis: { focus: 'series' }, itemStyle: { color: colorScheme.forecast } },
                { name: '実績売上', type: 'bar', data: periodRevenues, emphasis: { focus: 'series' }, itemStyle: { color: colorScheme.actual } },
                { name: '分散 (%)', type: 'line', yAxisIndex: 1, data: variances, smooth: true, itemStyle: { color: colorScheme.variance }, label: { show: true, position: 'top', formatter: (params) => `${params.value}%`} }
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
                { type: 'value', axisLabel: { show: false, formatter: (value) => `${(value / 10000).toLocaleString('ja-JP')}` }, splitLine: { show: false } },
                { type: 'value', axisLabel: { show: false }, splitLine: { show: false } }
            ],
            series: [
                { name: '計画売上', type: 'bar', data: [totalForecastRevenue], barWidth: '30%', label: { show: true, position: 'top', formatter: (params) => formatYenInTenThousands(params.value)}, itemStyle: { color: colorScheme.forecast } },
                { name: '実績売上', type: 'bar', data: [totalPeriodRevenue], barWidth: '30%', label: { show: true, position: 'top', formatter: (params) => formatYenInTenThousands(params.value)}, itemStyle: { color: colorScheme.actual } },
                { name: '分散 (%)', type: 'bar', yAxisIndex: 1, data: [totalVariancePercent], barWidth: '15%', 
                    itemStyle: { 
                        opacity: 0.8,
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: colorScheme.variance_gradient_bottom },
                            { offset: 0.5, color: colorScheme.variance_gradient_middle },
                            { offset: 1, color: colorScheme.variance_gradient_top }
                        ])                        
                    },
                    label: { show: true, position: 'top', formatter: (params) => `${params.value}%` }                
                }
            ]
        };
    });

    // Initialize charts
    const initOrUpdateChart = (instanceRef, containerRef, options) => {
        if (containerRef.value) { // Ensure the container element exists
            if (!instanceRef.value || instanceRef.value.isDisposed?.()) {
                // If no instance or it's disposed, initialize a new one
                instanceRef.value = echarts.init(containerRef.value);
            }
            // Always set options and resize
            instanceRef.value.setOption(options, true); // true for notMerge
            instanceRef.value.resize();
        } else if (instanceRef.value && !instanceRef.value.isDisposed?.()) {
            // Container is gone (e.g., v-if became false), but instance exists. Dispose it.
            instanceRef.value.dispose();
            instanceRef.value = null; // Clear the ref
        }
    };
    const refreshAllCharts = () => {
        if (hasRevenueDataForChart.value) {
            initOrUpdateChart(monthlyChartInstance, monthlyChartContainer, monthlyChartOptions.value);
            initOrUpdateChart(totalChartInstance, totalChartContainer, totalChartOptions.value);
        } else {
            // If no data, ensure charts are cleared/disposed
            if (monthlyChartInstance.value && !monthlyChartInstance.value.isDisposed?.()) {
                monthlyChartInstance.value.dispose(); // Dispose instead of clear for a cleaner state
                monthlyChartInstance.value = null;
            }
            if (totalChartInstance.value && !totalChartInstance.value.isDisposed?.()) {
                totalChartInstance.value.dispose(); // Dispose instead of clear
                totalChartInstance.value = null;
            }
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
        if (tableType === 'revenue' && props.revenueData && props.revenueData.length > 0) {
            const headers = [
                "施設",         // hotel_name
                "月度",         // month
                "計画売上 (円)", // forecast_revenue
                "実績売上 (円)", // period_revenue
                "分散額 (円)",   // period_revenue - forecast_revenue
                "分散率 (%)"    // ((period_revenue / forecast_revenue) - 1) * 100
            ];

            const csvRows = [headers.join(',')]; // Add header row

            props.revenueData.forEach(row => {
                const forecastRevenue = row.forecast_revenue || 0;
                const periodRevenue = row.period_revenue || 0;
                
                const varianceAmount = periodRevenue - forecastRevenue;
                let variancePercentage = 0;
                if (forecastRevenue !== 0) {
                    variancePercentage = ((periodRevenue / forecastRevenue) - 1) * 100;
                } else if (periodRevenue !== 0) {
                    variancePercentage = Infinity; // Or some other indicator for division by zero with non-zero period
                }


                const csvRow = [
                    `"${row.hotel_name || ''}"`,
                    `"${row.month || ''}"`,
                    forecastRevenue,
                    periodRevenue,
                    varianceAmount,
                    forecastRevenue === 0 && periodRevenue !== 0 ? "N/A" : variancePercentage.toFixed(2) // Represent as percentage value
                ];
                csvRows.push(csvRow.join(','));
            });

            const csvString = csvRows.join('\n');
            const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // Added BOM for Excel
            
            const link = document.createElement("a");
            if (link.download !== undefined) { // Feature detection
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", "revenue_data.csv");
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        } else {
            console.log(`RSMAll: No data to export for ${tableType} or invalid table type.`);
        }        
    };

    onMounted(async () => {
        console.log('RSMAll: onMounted', props.revenueData, props.occupancyData);

        if (selectedView.value === 'graph') {
            // Use nextTick to ensure containers are rendered before initializing
            nextTick(() => {
                refreshAllCharts();
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
            refreshAllCharts();
        }
    }, { deep: true });
    watch(selectedView, async (newView) => {
        if (newView === 'graph') {
            await nextTick(); 
            
            if (monthlyChartInstance.value && !monthlyChartInstance.value.isDisposed?.()) {
                monthlyChartInstance.value.dispose();
                monthlyChartInstance.value = null;
            }
            if (totalChartInstance.value && !totalChartInstance.value.isDisposed?.()) {
                totalChartInstance.value.dispose();
                totalChartInstance.value = null;
            }
            
            // Now, refresh (which will re-initialize) the charts
            refreshAllCharts();
        }
    });
</script>