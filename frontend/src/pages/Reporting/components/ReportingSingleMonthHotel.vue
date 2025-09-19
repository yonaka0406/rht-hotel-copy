<template>
    <div>    
        <div class="flex justify-end mb-2">
            <SelectButton v-model="selectedView" :options="viewOptions" optionLabel="label" optionValue="value" />
        </div>

        <div v-if="selectedView === 'graph'">
            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">主要KPI（{{ currentHotelName }}）</span>
                </template>
                <template #content>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                        <div class="p-4 bg-gray-50 rounded-lg shadow">
                            <h6 class="text-sm font-medium text-gray-500">実績 ADR</h6>
                            <p class="text-2xl font-bold text-gray-800">{{ formatCurrency(actualADR) }}</p>
                        </div>
                        <div class="p-4 bg-gray-50 rounded-lg shadow">
                            <h6 class="text-sm font-medium text-gray-500">計画 ADR</h6>
                            <p class="text-2xl font-bold text-gray-800">{{ formatCurrency(forecastADR) }}</p>
                        </div>
                        <div class="p-4 bg-gray-50 rounded-lg shadow">
                            <h6 class="text-sm font-medium text-gray-500">実績 RevPAR</h6>
                            <p class="text-2xl font-bold text-gray-800">{{ formatCurrency(actualRevPAR) }}</p>
                        </div>
                        <div class="p-4 bg-gray-50 rounded-lg shadow">
                            <h6 class="text-sm font-medium text-gray-500">計画 RevPAR</h6>
                            <p class="text-2xl font-bold text-gray-800">{{ formatCurrency(forecastRevPAR) }}</p>
                        </div>
                    </div>
                </template>
                <template #footer>
                    <div class="flex justify-content-between">
                        <small>会計データがない場合はPMSの数値になっています。期間： {{ periodMaxDate }}。</small>
                    </div>
                </template>
            </Card>

            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">収益・稼働率 （計画ｘ実績）- {{ currentHotelName }}</span>
                </template>
                <template #content>
                    <div v-if="!hasRevenueDataForChart" class="text-center p-4">
                        データはありません。
                    </div>
                    <div v-else class="flex flex-col md:flex-row md:gap-4 p-4">                        
                        <div class="w-full md:w-1/2">
                            <div ref="totalChartContainer" style="height: 450px; width: 100%;"></div>
                        </div>
                        <div class="w-full md:w-1/2">
                            <div ref="totalOccupancyChartContainer" style="height: 450px; width: 100%;"></div>
                        </div>                        
                    </div>
                </template> 
                <template #footer>
                    <div class="flex justify-content-between">
                        <small>会計データがない場合はPMSの数値になっています。期間： {{ periodMaxDate }}。</small>
                    </div>
                </template>
            </Card>

        </div>

        <div v-if="selectedView === 'table'">            
            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">主要KPI（{{ currentHotelName }}）</span>
                </template>
                <template #content>
                     <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                        <div class="p-4 bg-gray-50 rounded-lg shadow">
                            <h6 class="text-sm font-medium text-gray-500">実績 ADR</h6>
                            <p class="text-2xl font-bold text-gray-800">{{ formatCurrency(actualADR) }}</p>
                        </div>
                        <div class="p-4 bg-gray-50 rounded-lg shadow">
                            <h6 class="text-sm font-medium text-gray-500">計画 ADR</h6>
                            <p class="text-2xl font-bold text-gray-800">{{ formatCurrency(forecastADR) }}</p>
                        </div>
                        <div class="p-4 bg-gray-50 rounded-lg shadow">
                            <h6 class="text-sm font-medium text-gray-500">実績 RevPAR</h6>
                            <p class="text-2xl font-bold text-gray-800">{{ formatCurrency(actualRevPAR) }}</p>
                        </div>
                        <div class="p-4 bg-gray-50 rounded-lg shadow">
                            <h6 class="text-sm font-medium text-gray-500">計画 RevPAR</h6>
                            <p class="text-2xl font-bold text-gray-800">{{ formatCurrency(forecastRevPAR) }}</p>
                        </div>
                    </div>
                </template>
                <template #footer>
                    <div class="flex justify-content-between">
                        <small>会計データがない場合はPMSの数値になっています。期間： {{ periodMaxDate }}。</small>
                    </div>
                </template>
            </Card>

            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">収益（計画ｘ実績）- {{ currentHotelName }}</span>
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

            <Card>
                <template #header>
                    <span class="text-xl font-bold">稼働状況（計画ｘ実績）- {{ currentHotelName }}</span>
                </template>
                <template #content>
                     <div v-if="!props.occupancyData || props.occupancyData.length === 0" class="text-center p-4">
                        データはありません。
                    </div>
                    <div v-else class="p-fluid">
                        <DataTable :value="props.occupancyData"
                            responsiveLayout="scroll" 
                            paginator 
                            :rows="5"
                            :rowsPerPageOptions="[5, 15, 30, 50]"
                            stripedRows
                            sortMode="multiple"
                            removableSort
                        >
                            <Column field="hotel_name" header="施設" frozen sortable style="min-width: 150px; width: 15%"></Column>
                            <Column field="month" header="月度" sortable style="min-width: 100px; width: 10%"></Column>
                            <Column field="fc_sold_rooms" header="計画販売室数" sortable style="min-width: 100px; width: 10%">
                                <template #body="{data}">{{ data.fc_sold_rooms?.toLocaleString('ja-JP') || 0 }}</template>
                            </Column>
                            <Column field="sold_rooms" header="実績販売室数" sortable style="min-width: 100px; width: 10%">
                                <template #body="{data}">{{ data.sold_rooms?.toLocaleString('ja-JP') || 0 }}</template>
                            </Column>
                            <Column header="販売室数差異" sortable style="min-width: 100px; width: 10%">
                                <template #body="{data}">{{ ( (data.sold_rooms || 0) - (data.fc_sold_rooms || 0) ).toLocaleString('ja-JP') }}</template>
                            </Column>
                            <Column field="fc_occ" header="計画稼働率" sortable style="min-width: 100px; width: 10%">
                                <template #body="{data}">{{ formatPercentage(data.fc_occ / 100) }}</template>
                            </Column>
                            <Column field="occ" header="実績稼働率" sortable style="min-width: 100px; width: 10%">
                                <template #body="{data}">{{ formatPercentage(data.occ / 100) }}</template>
                            </Column>
                            <Column header="稼働率差異 (p.p.)" sortable style="min-width: 120px; width: 10%">
                                 <template #body="{ data }">
                                    <div class="flex justify-center items-center mr-2">                                        
                                         <Badge class="ml-2" :severity="getSeverity((data.occ || 0) - (data.fc_occ || 0))" size="small">
                                            {{ ((data.occ || 0) - (data.fc_occ || 0)) >= 0 ? '+' : '' }}{{ ((data.occ || 0) - (data.fc_occ || 0)).toFixed(2) }}
                                        </Badge>
                                    </div>
                                </template>
                            </Column>
                            <Column field="fc_total_rooms" header="計画総室数" sortable style="min-width: 100px; width: 7.5%">
                                <template #body="{data}">{{ data.fc_total_rooms?.toLocaleString('ja-JP') || 0 }}</template>
                            </Column>
                            <Column field="total_rooms" header="実績総室数" sortable style="min-width: 100px; width: 7.5%">
                                <template #body="{data}">{{ data.total_rooms?.toLocaleString('ja-JP') || 0 }}</template>
                            </Column>
                            <template #paginatorstart>                                
                            </template>
                             <template #paginatorend>
                                <Button type="button" icon="pi pi-download" text @click="exportCSV('occupancy')" />
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
        if (value === null || value === undefined || Number.isNaN(value)) return '- 円'; // Handle NaN
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
    const formatYenInTenThousandsNoDecimal = (value) => {
        if (value === null || value === undefined) return '-';
        const valueInMan = value / 10000;        
        return valueInMan.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '万円';
    };

    // View selection
    const selectedView = ref('graph'); // Default view
    const viewOptions = ref([
        { label: 'グラフ', value: 'graph' },
        { label: 'テーブル', value: 'table' }
    ]);

    // --- Current Hotel Data ---
    const currentHotelRevenueEntry = computed(() => {        
        return props.revenueData?.[0] || {};
    });
    
    const currentHotelName = computed(() => {
        //console.log('currentHotelRevenueEntry', currentHotelRevenueEntry.value);
        return currentHotelRevenueEntry.value?.hotel_name || '選択ホテル';
    });
        
    const periodMaxDate = computed(() => {
        if (!props.revenueData || props.revenueData.length === 0) return 'N/A';
        const maxDate = new Date(Math.max(...props.revenueData.map(item => new Date(item.month))));
        return maxDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' });
    });

    // --- KPI Calculations (ADR, RevPAR) for the Current Hotel ---
    const currentHotelAggregateData = computed(() => {
        // Sums up values from props.revenueData and props.occupancyData.
        // This is useful if parent sends multiple month data for the single selected hotel.
        // For a single month view, it will correctly use the single entry.
        
        let total_forecast_revenue = 0;
        let total_period_revenue = 0;
        props.revenueData?.forEach(item => {
            total_forecast_revenue += (item.forecast_revenue || 0);
            total_period_revenue += (item.period_revenue || 0);
        });

        let total_fc_sold_rooms = 0;
        let total_sold_rooms = 0;
        let total_fc_available_rooms = 0;
        let total_available_rooms = 0;
        props.occupancyData?.forEach(item => {
            total_fc_sold_rooms += (item.fc_sold_rooms || 0);
            total_sold_rooms += (item.sold_rooms || 0);
            total_fc_available_rooms += (item.fc_total_rooms || 0); // fc_total_rooms is total available rooms for forecast
            total_available_rooms += (item.total_rooms || 0);    // total_rooms is total available rooms for actual
        });

        return {
            total_forecast_revenue,
            total_period_revenue,
            total_fc_sold_rooms,
            total_sold_rooms,
            total_fc_available_rooms,
            total_available_rooms,
        };
    });

    const actualADR = computed(() => {
        const { total_period_revenue, total_sold_rooms } = currentHotelAggregateData.value;
        if (total_sold_rooms === 0 || total_sold_rooms === null || total_sold_rooms === undefined) return NaN;
        return Math.round(total_period_revenue / total_sold_rooms);
    });

    const forecastADR = computed(() => {
        const { total_forecast_revenue, total_fc_sold_rooms } = currentHotelAggregateData.value;
        if (total_fc_sold_rooms === 0 || total_fc_sold_rooms === null || total_fc_sold_rooms === undefined) return NaN;
        return Math.round(total_forecast_revenue / total_fc_sold_rooms);
    });

    const actualRevPAR = computed(() => {
        const { total_period_revenue, total_available_rooms } = currentHotelAggregateData.value;
        if (total_available_rooms === 0 || total_available_rooms === null || total_available_rooms === undefined) return NaN;
        return Math.round(total_period_revenue / total_available_rooms);
    });

    const forecastRevPAR = computed(() => {
        const { total_forecast_revenue, total_fc_available_rooms } = currentHotelAggregateData.value;
        if (total_fc_available_rooms === 0 || total_fc_available_rooms === null || total_fc_available_rooms === undefined) return NaN;
        return Math.round(total_forecast_revenue / total_fc_available_rooms);
    });


    // Color scheme    
    const colorScheme = {
        // Solid base colors
        actual: '#C8102E',      // Deep red for actual revenue
        forecast: '#F2A900',    // Golden yellow for projected revenue
        variance: '#555555',    // Neutral gray for variance label
        toForecast: '#5AB1BB',  // Light blue for gap to forecast

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

        // Gradient for To Forecast
        toForecast_gradient_top: '#7FC5CC',
        toForecast_gradient_middle: '#5AB1BB',
        toForecast_gradient_bottom: '#3C8E93',
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
    import { BarChart, LineChart, GaugeChart } from 'echarts/charts';    
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
        GaugeChart,
        CanvasRenderer
    ]);    
    const resizeChartHandler = () => {
        if (selectedView.value === 'graph') {            
            totalChartInstance.value?.resize();
            totalOccupancyChartInstance.value?.resize();
        }
    };

    // --- Chart Refs and Instances ---    
    const totalChartContainer = ref(null);
    const totalOccupancyChartContainer = ref(null);
    
    const totalChartInstance = shallowRef(null);
    const totalOccupancyChartInstance = shallowRef(null);

    // --- Data Computeds for Charts ---
    // Provides the data for the main revenue chart (now for the single hotel)
    const singleHotelRevenueChartDataSource = computed(() => {
        // currentHotelAggregateData sums up all entries in props.revenueData
        // The chart expects an array of data points, here it's a single point for the period total.
        if (!currentHotelAggregateData.value) return [];
        return [currentHotelAggregateData.value]; // Wrap in array
    });
    
    const hasRevenueDataForChart = computed(() => {
        return singleHotelRevenueChartDataSource.value.length > 0 &&
               (singleHotelRevenueChartDataSource.value[0].total_forecast_revenue !== undefined || 
                singleHotelRevenueChartDataSource.value[0].total_period_revenue !== undefined);
    });

    // --- ECharts Options ---    
    const totalChartOptions = computed(() => {
        if (!hasRevenueDataForChart.value) { 
            return {};
        }

        // Data comes from currentHotelAggregateData via singleHotelRevenueChartDataSource
        const { total_forecast_revenue, total_period_revenue } = singleHotelRevenueChartDataSource.value[0];        
        const varianceAmount = total_period_revenue - total_forecast_revenue;
    
        let displayVariancePercent;
        if (total_forecast_revenue === 0 || total_forecast_revenue === null) {
        displayVariancePercent = (total_period_revenue === 0 || total_period_revenue === null) ? "0.00%" : "N/A";
        } else {
        const percent = (varianceAmount / total_forecast_revenue) * 100;
            displayVariancePercent = `${percent.toFixed(2)}%`;
        }

        const variancePositiveColor = '#4CAF50'; // Green for positive variance
        const varianceNegativeColor = '#F44336'; // Red for negative variance

        return {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params) => {
                const valueParam = params.find(p => p.seriesName === '売上');
                if (!valueParam || valueParam.value === undefined) { // Check for undefined value from placeholder
                                // Try to get data from the placeholder if main series has no value (e.g. for base of variance)
                                const placeholderParam = params.find(p => p.seriesName === 'PlaceholderBase');
                                if(placeholderParam && valueParam && valueParam.name === '分散'){
                                        // Special handling for variance tooltip if actual value is on placeholder
                                } else if (!valueParam) {
                                    return '';
                                }
                                }

                let tooltipText = `${valueParam.name}<br/>`; // X-axis category
                
                if (valueParam.name === '分散') {
                    tooltipText += `${valueParam.marker || ''} 金額: ${formatYenInTenThousands(varianceAmount)}<br/>`; // Use varianceAmount directly
                    tooltipText += `率: ${displayVariancePercent}`;
                } else {
                                // For '計画売上' and '実績売上', valueParam.value is correct
                    tooltipText += `${valueParam.marker || ''} 金額: ${formatYenInTenThousands(valueParam.value)}`;
                }
                return tooltipText;
                }
            },        
            grid: { left: '3%', right: '10%', bottom: '10%', containLabel: true },
            xAxis: [{
                type: 'category',
                data: ['計画売上', '分散', '実績売上'],
                        splitLine: { show: false },
                axisLabel: { interval: 0 }
            }],
            yAxis: [{
                type: 'value',
                name: '金額 (万円)',
                axisLabel: { formatter: (value) => `${(value / 10000).toLocaleString('ja-JP')}` },
                splitLine: { show: true } 
            }],
            series: [
                { // Invisible base for stacking
                    name: 'PlaceholderBase', 
                    type: 'bar',
                    stack: 'total',
                                barWidth: '60%', // Adjust bar width as needed
                    itemStyle: { borderColor: 'transparent', color: 'transparent' },
                    emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' }},
                    data: [
                        0, // Base for '計画売上' is 0
                        varianceAmount >= 0 ? total_forecast_revenue : total_period_revenue, // Base for '分散'
                        0  // Base for '実績売上' is 0
                    ]
                },
                { // Visible bars
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
                        }
                    },
                    data: [
                        { // 計画売上
                        value: total_forecast_revenue,
                        itemStyle: { color: colorScheme.forecast },
                        label: { position: 'top' } 
                        },
                        { // 分散                
                            value: Math.abs(varianceAmount),                
                            itemStyle: { color: varianceAmount >= 0 ? variancePositiveColor : varianceNegativeColor },
                            label: { position: 'top' }
                        },
                        { // 実績売上
                        value: total_period_revenue,
                        itemStyle: { color: colorScheme.actual },
                        label: { position: 'top'}
                        }
                    ]
                }
            ]
        };
    });

    const totalOccupancyChartOptions = computed(() => {        
        if (!props.occupancyData ) return {};

        const actualSold = props.occupancyData[0].sold_rooms;
        const actualAvailable = props.occupancyData[0].total_rooms;
        const forecastSold = props.occupancyData[0].fc_sold_rooms;
        const forecastAvailable = props.occupancyData[0].fc_total_rooms;
        
        const totalActualOccupancy = actualAvailable > 0 ? actualSold / actualAvailable : 0;
        const totalForecastOccupancy = forecastAvailable > 0 ? forecastSold / forecastAvailable : 0;
        
        return {
            tooltip: {
                formatter: (params) => {
                    if (params.seriesName === '実績稼働率') {
                        return `実績稼働率: ${formatPercentage(params.value)}<br/>計画稼働率: ${formatPercentage(totalForecastOccupancy)}`;
                    }
                    return '';
                }
            },
            series: [{
                type: 'gauge',
                radius: '90%',
                center: ['50%', '55%'], 
                startAngle: 180, 
                endAngle: 0,     
                min: 0,
                max: 1, 
                splitNumber: 4, 
                axisLine: {
                    lineStyle: {
                        width: 22, 
                        color: [ 
                            [1, '#E0E0E0'] 
                        ]
                    }
                },
                progress: { 
                    show: true,
                    width: 22, 
                    itemStyle: { 
                        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                            { offset: 0, color: colorScheme.actual_gradient_bottom }, 
                            { offset: 1, color: colorScheme.actual_gradient_top }    
                        ])
                    }
                },
                pointer: { show: false }, 
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: { 
                    show: true,
                    distance: 5, 
                    formatter: function (value) { return (value * 100).toFixed(0) + '%'; },
                    fontSize: 10,
                    color: '#555'
                },
                title: { 
                    offsetCenter: [0, '25%'], 
                    fontSize: 14,
                    color: '#333',
                    fontWeight: 'normal'
                },
                detail: { 
                    width: '70%',
                    lineHeight: 22,
                    offsetCenter: [0, '-10%'], 
                    valueAnimation: true,
                    formatter: function (value) {
                        let forecastText = `計画: ${formatPercentage(totalForecastOccupancy)}`;
                        return `{actual|${formatPercentage(value)}}\n{forecast|${forecastText}}`;
                    },
                    rich: {
                        actual: { fontSize: 24, fontWeight: 'bold', color: colorScheme.actual },
                        forecast: { fontSize: 13, color: colorScheme.forecast, paddingTop: 8 }
                    }
                },
                data: [{ value: totalActualOccupancy, name: '実績稼働率' }]
            }]
        };
    });
    
    // Initialize charts
    const initOrUpdateChart = (instanceRef, containerRef, options) => {
        if (containerRef.value) { 
            if (!instanceRef.value || instanceRef.value.isDisposed?.()) {
                instanceRef.value = echarts.init(containerRef.value);
            }
            instanceRef.value.setOption(options, true); 
            instanceRef.value.resize();
        } else if (instanceRef.value && !instanceRef.value.isDisposed?.()) {
            instanceRef.value.dispose();
            instanceRef.value = null; 
        }
    };    
    const refreshAllCharts = () => {
        if (hasRevenueDataForChart.value) {            
            initOrUpdateChart(totalChartInstance, totalChartContainer, totalChartOptions.value);
        } else {            
            totalChartInstance.value?.dispose(); totalChartInstance.value = null;
        }  
        
        // Occupancy Charts
        if (props.occupancyData) {            
            // Total Occupancy Gauge Chart (now in the combined card with revenue)
            initOrUpdateChart(totalOccupancyChartInstance, totalOccupancyChartContainer, totalOccupancyChartOptions.value);
        } else {            
            totalOccupancyChartInstance.value?.dispose(); totalOccupancyChartInstance.value = null;
        }
    };
    const disposeAllCharts = () => {        
        totalChartInstance.value?.dispose(); totalChartInstance.value = null;totalOccupancyChartInstance.value?.dispose(); totalOccupancyChartInstance.value = null;
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
        let csvString = '';
        let filename = 'data.csv';
        const hotelNameForFile = currentHotelName.value.replace(/\s+/g, '_') || 'selected_hotel'; // Sanitize name for filename
        const periodForFile = periodMaxDate.value.replace(/[^0-9]/g, ''); // Get YYYYMM from period

        if (tableType === 'revenue' && props.revenueData && props.revenueData.length > 0) {            
            filename = `${hotelNameForFile}_収益データ_${periodForFile}.csv`;
            const headers = ["施設","月度","計画売上 (円)","実績売上 (円)","分散額 (円)","分散率 (%)"];
            const csvRows = [headers.join(',')]; 
            // props.revenueData here should already be filtered for the single hotel by the parent.
            // If it contains multiple months for that hotel, they will be exported.
            props.revenueData.forEach(row => {
                const forecastRevenue = row.forecast_revenue || 0;
                const periodRevenue = row.period_revenue || 0;
                const varianceAmount = periodRevenue - forecastRevenue;
                let variancePercentage = 0;
                if (forecastRevenue !== 0) variancePercentage = ((periodRevenue / forecastRevenue) - 1) * 100;
                else if (periodRevenue !== 0) variancePercentage = Infinity; // Or "N/A" or specific handling
                
                const csvRow = [
                    `"${row.hotel_name || ''}"`,
                    `"${row.month || ''}"`,
                    forecastRevenue,
                    periodRevenue,
                    varianceAmount,
                    (forecastRevenue === 0 && periodRevenue !== 0) ? "N/A" : variancePercentage.toFixed(2)
                ];
                csvRows.push(csvRow.join(','));
            });
            csvString = csvRows.join('\n');

        } else if (tableType === 'occupancy' && props.occupancyData && props.occupancyData.length > 0) {
            filename = `${hotelNameForFile}_稼働率データ_${periodForFile}.csv`;
            const headers = [
                "施設", "月度", 
                "計画販売室数", "実績販売室数", "販売室数差異",
                "計画稼働率 (%)", "実績稼働率 (%)", "稼働率差異 (p.p.)",
                "計画総室数", "実績総室数"
            ];
            const csvRows = [headers.join(',')];
            props.occupancyData.forEach(row => {
                const fcSold = row.fc_sold_rooms || 0;
                const sold = row.sold_rooms || 0;
                const fcOcc = row.fc_occ || 0;
                const occ = row.occ || 0;

                const csvRow = [
                    `"${row.hotel_name || ''}"`,
                    `"${row.month || ''}"`,
                    fcSold,
                    sold,
                    sold - fcSold,
                    fcOcc.toFixed(2),
                    occ.toFixed(2),
                    (occ - fcOcc).toFixed(2),
                    row.fc_total_rooms || 0,
                    row.total_rooms || 0
                ];
                csvRows.push(csvRow.join(','));
            });
            csvString = csvRows.join('\n');
        } else {
            console.log(`RSMHotel: No data to export for ${tableType} or invalid table type.`); // Updated console log prefix
            return;
        }
        
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }        
    };

    onMounted(async () => {
        // console.log('RSMHotel: onMounted', props.revenueData, props.occupancyData); // Updated console log prefix

        if (selectedView.value === 'graph') {
            // Use nextTick to ensure containers are rendered before initializing
            nextTick(refreshAllCharts);
        }
        window.addEventListener('resize', resizeChartHandler);
    });
    onBeforeUnmount(() => {
        disposeAllCharts();
        window.removeEventListener('resize', resizeChartHandler);
    });

    // Watch for changes in computed chart options    
    watch(selectedView, async (newView) => {
        if (newView === 'graph') {
            await nextTick(); 
            disposeAllCharts();            
            refreshAllCharts();
        } else {            
            disposeAllCharts();
        }
    });    

</script>