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
                        <small>会計データがない場合はPMSの数値になっています。期間： {{ periodMinDate }}～{{ periodMaxDate }}。</small>
                    </div>
                </template>
            </Card>            

            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">収益（計画ｘ実績）- {{ currentHotelName }}</span>
                </template>
                <template #content>
                    <div v-if="!currentHotelRevenueData || currentHotelRevenueData.length === 0" class="text-center p-4">
                        データはありません。
                    </div>
                    <div v-else class="flex flex-col md:flex-row md:gap-4 p-4">
                        <div class="w-full md:w-3/4 mb-4 md:mb-0">
                            <div ref="monthlyChartContainer" style="height: 450px; width: 100%;"></div>
                        </div>
                        <div class="w-full md:w-1/4">
                            <div ref="totalChartContainer" style="height: 450px; width: 100%;"></div>
                        </div>
                    </div>
                </template> 
                <template #footer>
                    <div class="flex justify-content-between">
                        <small>会計データがない場合はPMSの数値になっています。施設： {{ currentHotelName }}</small>
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
                        <small>会計データがない場合はPMSの数値になっています。期間： {{ periodMinDate }}～{{ periodMaxDate }}。</small>
                    </div>
                </template>
            </Card>            

            <Card class="mb-4">
                <template #header>
                    <span class="text-xl font-bold">収益（計画ｘ実績）- {{ currentHotelName }}</span>
                </template>
                <template #content>
                    <div v-if="!currentHotelRevenueData || currentHotelRevenueData.length === 0" class="text-center p-4">
                        データはありません。
                    </div>
                    <div v-else class="text-center p-4">                        
                        <DataTable :value="currentHotelRevenueData" 
                            responsiveLayout="scroll" 
                            paginator 
                            :rows="12"
                            :rowsPerPageOptions="[12, 24, 36, 48]"
                            stripedRows
                            sortMode="multiple"
                            removableSort
                        >
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
                     <div v-if="!currentHotelOccupancyData || currentHotelOccupancyData.length === 0" class="text-center p-4">
                        データはありません。
                    </div>
                    <div v-else class="p-fluid">
                        <DataTable :value="currentHotelOccupancyData"
                            responsiveLayout="scroll" 
                            paginator 
                            :rows="12"
                            :rowsPerPageOptions="[12, 24, 36, 48]"
                            stripedRows
                            sortMode="multiple"
                            removableSort
                        >
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
                                         <Badge class="ml-2" :severity="getSeverity(((data.occ || 0) - (data.fc_occ || 0))/100)" size="small">
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
        if (value === null || value === undefined || Number.isNaN(value)) return '- 円';
        return parseFloat(value).toLocaleString('ja-JP') + ' 円';
    };
    const formatPercentage = (value) => {
        if (value === null || value === undefined || Number.isNaN(value)) return '-';
         if (value === Infinity || value === -Infinity) return 'N/A';
        return parseFloat(value).toLocaleString('ja-JP', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const calculateVariancePercentage = (period, forecast) => {
        if (forecast === 0 || forecast === null || forecast === undefined) {
            return (period === 0 || period === null || period === undefined) ? 0 : Infinity; 
        }
        const variance = ((period - forecast) / forecast); // Keep as ratio for formatting
        return variance;
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

    // Data extraction for the single hotel
    const currentHotelId = computed(() => {
        // This component is for a single hotel, so we expect all data to belong to the same hotel_id.
        // Or, if revenueData is pre-filtered by parent, it will contain only one hotel_id.
        if (props.revenueData && props.revenueData.length > 0) {
             // Prioritize a non-zero hotel_id if multiple types exist (e.g. summary row with id 0)
            const specificHotelEntry = props.revenueData.find(item => item.hotel_id !== 0 && item.hotel_id != null);
            if (specificHotelEntry) return specificHotelEntry.hotel_id;
            return props.revenueData[0]?.hotel_id; // Fallback to the first entry's hotel_id
        }
        return null;
    });

    const currentHotelRevenueData = computed(() => {
        if (!props.revenueData) return [];
        // If currentHotelId is 0 or null (meaning it's a summary or no specific hotel identified),
        // and the data contains a hotel_id 0, use that. Otherwise, filter by currentHotelId.
        if ((currentHotelId.value === 0 || currentHotelId.value === null) && props.revenueData.some(item => item.hotel_id === 0)) {
            return props.revenueData.filter(item => item.hotel_id === 0);
        }
        return props.revenueData.filter(item => item.hotel_id === currentHotelId.value);
    });

    const currentHotelOccupancyData = computed(() => {
        if (!props.occupancyData) return [];
        if ((currentHotelId.value === 0 || currentHotelId.value === null) && props.occupancyData.some(item => item.hotel_id === 0)) {
             return props.occupancyData.filter(item => item.hotel_id === 0);
        }
        return props.occupancyData.filter(item => item.hotel_id === currentHotelId.value);
    });
    
    const currentHotelName = computed(() => {
        return currentHotelRevenueData.value[0]?.hotel_name || '選択ホテル';
    });


    const periodMinDate = computed(() => {
        if (!currentHotelRevenueData.value || currentHotelRevenueData.value.length === 0) return 'N/A';
        const dates = currentHotelRevenueData.value.map(item => new Date(item.month));
        const minDate = new Date(Math.min(...dates));
        return minDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' });
    });
    const periodMaxDate = computed(() => {
         if (!currentHotelRevenueData.value || currentHotelRevenueData.value.length === 0) return 'N/A';
        const dates = currentHotelRevenueData.value.map(item => new Date(item.month));
        const maxDate = new Date(Math.max(...dates));
        return maxDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' });
    });


    // Aggregated data for KPIs
    const aggregatedCurrentHotelRevenue = computed(() => {
        if (!currentHotelRevenueData.value) return { total_forecast_revenue: 0, total_period_revenue: 0 };
        return currentHotelRevenueData.value.reduce((acc, item) => {
            acc.total_forecast_revenue += (item.forecast_revenue || 0);
            acc.total_period_revenue += (item.period_revenue || 0);
            return acc;
        }, { total_forecast_revenue: 0, total_period_revenue: 0 });
    });

    const aggregatedCurrentHotelOccupancy = computed(() => {
        if (!currentHotelOccupancyData.value) return {
            total_sold_rooms: 0, total_fc_sold_rooms: 0,
            total_available_rooms: 0, total_fc_available_rooms: 0
        };
        return currentHotelOccupancyData.value.reduce((acc, item) => {
            acc.total_sold_rooms += (item.sold_rooms || 0);
            acc.total_fc_sold_rooms += (item.fc_sold_rooms || 0);
            acc.total_available_rooms += (item.total_rooms || 0); 
            acc.total_fc_available_rooms += (item.fc_total_rooms || 0); 
            return acc;
        }, { 
            total_sold_rooms: 0, total_fc_sold_rooms: 0,
            total_available_rooms: 0, total_fc_available_rooms: 0
        });
    });

    // KPIs
    const actualADR = computed(() => {
        const revenue = aggregatedCurrentHotelRevenue.value.total_period_revenue;
        const soldRooms = aggregatedCurrentHotelOccupancy.value.total_sold_rooms;
        return soldRooms ? Math.round(revenue / soldRooms) : NaN;
    });
    const forecastADR = computed(() => {
        const revenue = aggregatedCurrentHotelRevenue.value.total_forecast_revenue;
        const soldRooms = aggregatedCurrentHotelOccupancy.value.total_fc_sold_rooms;
        return soldRooms ? Math.round(revenue / soldRooms) : NaN;
    });
    const actualRevPAR = computed(() => {
        const revenue = aggregatedCurrentHotelRevenue.value.total_period_revenue;
        const availableRooms = aggregatedCurrentHotelOccupancy.value.total_available_rooms;
        return availableRooms ? Math.round(revenue / availableRooms) : NaN;
    });
    const forecastRevPAR = computed(() => {
        const revenue = aggregatedCurrentHotelRevenue.value.total_forecast_revenue;
        const availableRooms = aggregatedCurrentHotelOccupancy.value.total_fc_available_rooms;
        return availableRooms ? Math.round(revenue / availableRooms) : NaN;
    });


    // Color scheme    
    const colorScheme = {
        actual: '#C8102E', forecast: '#F2A900', variance: '#555555',
        actual_gradient_top: '#A60D25', actual_gradient_middle: '#C8102E', actual_gradient_bottom: '#E94A57',
        forecast_gradient_top: '#D48F00', forecast_gradient_middle: '#F2A900', forecast_gradient_bottom: '#FFE066',
        variance_gradient_top: '#888888', variance_gradient_middle: '#555555', variance_gradient_bottom: '#222222',
    };

    // ECharts imports
    import * as echarts from 'echarts/core';
    import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, DatasetComponent, TransformComponent } from 'echarts/components';    
    import { BarChart, LineChart } from 'echarts/charts';    
    import { CanvasRenderer } from 'echarts/renderers';

    echarts.use([ TitleComponent, TooltipComponent, GridComponent, LegendComponent, DatasetComponent, TransformComponent, BarChart, LineChart, CanvasRenderer ]);    
    
    const resizeChartHandler = () => {
        if (selectedView.value === 'graph') {
            monthlyChartInstance.value?.resize();
            totalChartInstance.value?.resize();
        }
    };

    const monthlyChartContainer = ref(null);
    const totalChartContainer = ref(null);
    const monthlyChartInstance = shallowRef(null);
    const totalChartInstance = shallowRef(null);

    const monthlyChartOptions = computed(() => {
        const data = currentHotelRevenueData.value;
        if (!data || data.length === 0) return {};

        const months = [...new Set(data.map(item => item.month))].sort((a,b) => new Date(a) - new Date(b));
        const forecastRevenues = months.map(month => data.find(d => d.month === month)?.forecast_revenue ?? 0);
        const periodRevenues = months.map(month => data.find(d => d.month === month)?.period_revenue ?? 0);
        const variances = months.map(month => {
            const forecast = data.find(d => d.month === month)?.forecast_revenue ?? 0;
            const period = data.find(d => d.month === month)?.period_revenue ?? 0;
            const varianceRatio = calculateVariancePercentage(period, forecast);
            return varianceRatio === Infinity || varianceRatio === -Infinity ? 0 : parseFloat(varianceRatio * 100);
        });

        return {
            tooltip: { 
                trigger: 'axis', 
                axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
                formatter: (params) => {
                    let tooltipText = `${currentHotelName.value} - ${params[0].axisValueLabel}<br/>`;
                    params.forEach(param => {
                        if (param.seriesName === '分散 (%)') {
                            tooltipText += `${param.marker} ${param.seriesName}: ${param.value.toFixed(2)}%<br/>`;
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
                { name: '分散 (%)', type: 'line', yAxisIndex: 1, data: variances, smooth: true, itemStyle: { color: colorScheme.variance }, label: { show: true, position: 'top', formatter: (params) => `${params.value.toFixed(2)}%`} }
            ]
        };
    });

    const totalChartOptions = computed(() => {
        const aggData = aggregatedCurrentHotelRevenue.value;
        if (!aggData) return {};

        const totalForecastRevenue = aggData.total_forecast_revenue;
        const totalPeriodRevenue = aggData.total_period_revenue;
        const totalVarianceRatio = calculateVariancePercentage(totalPeriodRevenue, totalForecastRevenue);
        const totalVariancePercent = totalVarianceRatio === Infinity || totalVarianceRatio === -Infinity ? 0 : parseFloat(totalVarianceRatio * 100);


        return {
            tooltip: { 
                trigger: 'item', 
                axisPointer: { type: 'shadow' },
                formatter: (params) => {
                     if (params.seriesName === '分散 (%)') {
                        return `${currentHotelName.value} - ${params.seriesName}: ${params.value.toFixed(2)}%`;
                    }
                    return `${currentHotelName.value} - ${params.seriesName}: ${formatYenInTenThousands(params.value)}`;
                }
            },
            legend: { data: ['計画売上合計', '実績売上合計', '分散 (%)'], top: 'bottom' },
            grid: { left: '3%', right: '10%', bottom: '10%', containLabel: true },
            xAxis: [{ type: 'category', data: ['期間合計'] }], 
            yAxis: [
                { type: 'value', axisLabel: { show: false, formatter: (value) => `${(value / 10000).toLocaleString('ja-JP')}` }, splitLine: { show: false } },
                { type: 'value', axisLabel: { show: false }, splitLine: { show: false } }
            ],
            series: [
                { name: '計画売上合計', type: 'bar', data: [totalForecastRevenue], barWidth: '30%', label: { show: true, position: 'top', formatter: (params) => formatYenInTenThousandsNoDecimal(params.value)}, itemStyle: { color: colorScheme.forecast } },
                { name: '実績売上合計', type: 'bar', data: [totalPeriodRevenue], barWidth: '30%', label: { show: true, position: 'top', formatter: (params) => formatYenInTenThousandsNoDecimal(params.value)}, itemStyle: { color: colorScheme.actual } },
                { 
                    name: '分散 (%)', type: 'bar', yAxisIndex: 1, data: [totalVariancePercent], barWidth: '15%', 
                    itemStyle: { opacity: 0.8, color: new echarts.graphic.LinearGradient(0,0,0,1, [{offset:0, color:colorScheme.variance_gradient_bottom}, {offset:0.5, color:colorScheme.variance_gradient_middle}, {offset:1, color:colorScheme.variance_gradient_top}])},
                    label: { show: true, position: 'top', formatter: (params) => `${params.value.toFixed(2)}%` }                
                }
            ]
        };
    });
    
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
        if (currentHotelRevenueData.value && currentHotelRevenueData.value.length > 0) {
            initOrUpdateChart(monthlyChartInstance, monthlyChartContainer, monthlyChartOptions.value);
            initOrUpdateChart(totalChartInstance, totalChartContainer, totalChartOptions.value);
        } else {
            monthlyChartInstance.value?.dispose(); monthlyChartInstance.value = null;
            totalChartInstance.value?.dispose(); totalChartInstance.value = null;
        }
    };

    const disposeAllCharts = () => {
        monthlyChartInstance.value?.dispose(); monthlyChartInstance.value = null;
        totalChartInstance.value?.dispose(); totalChartInstance.value = null;
    };

    const getSeverity = (value) => {
        if (value === null || value === undefined || value === Infinity || value === -Infinity || Number.isNaN(value)) return 'secondary';
        if (value > 0) return 'success';
        if (value < -0.5) return 'danger'; 
        if (value < 0) return 'warning'; 
        return 'info'; 
    };

    const exportCSV = (tableType) => {
        let csvString = '';
        let filename = `${currentHotelName.value || 'SingleHotel'}_YearCumulative_data.csv`;
        const hotelDataRevenue = currentHotelRevenueData.value;
        const hotelDataOccupancy = currentHotelOccupancyData.value;

        if (tableType === 'revenue' && hotelDataRevenue && hotelDataRevenue.length > 0) {            
            filename = `${currentHotelName.value || 'SingleHotel'}_YearCumulative_Revenue.csv`;
            const headers = ["月度","計画売上 (円)","実績売上 (円)","分散額 (円)","分散率 (%)"];
            const csvRows = [headers.join(',')]; 
            hotelDataRevenue.forEach(row => {
                const forecastRevenue = row.forecast_revenue || 0;
                const periodRevenue = row.period_revenue || 0;
                const varianceAmount = periodRevenue - forecastRevenue;
                let variancePercentageRatio = calculateVariancePercentage(periodRevenue, forecastRevenue);
                
                const csvRow = [
                    `"${row.month || ''}"`,
                    forecastRevenue,
                    periodRevenue,
                    varianceAmount,
                    (variancePercentageRatio === Infinity || variancePercentageRatio === -Infinity || Number.isNaN(variancePercentageRatio)) ? "N/A" : (variancePercentageRatio * 100).toFixed(2)
                ];
                csvRows.push(csvRow.join(','));
            });
            csvString = csvRows.join('\n');

        } else if (tableType === 'occupancy' && hotelDataOccupancy && hotelDataOccupancy.length > 0) {
            filename = `${currentHotelName.value || 'SingleHotel'}_YearCumulative_Occupancy.csv`;
            const headers = ["月度", "計画販売室数", "実績販売室数", "販売室数差異", "計画稼働率 (%)", "実績稼働率 (%)", "稼働率差異 (p.p.)", "計画総室数", "実績総室数"];
            const csvRows = [headers.join(',')];
            hotelDataOccupancy.forEach(row => {
                const fcSold = row.fc_sold_rooms || 0;
                const sold = row.sold_rooms || 0;
                const fcOcc = row.fc_occ || 0;
                const occ = row.occ || 0;

                const csvRow = [
                    `"${row.month || ''}"`,
                    fcSold, sold, sold - fcSold,
                    fcOcc.toFixed(2), occ.toFixed(2), (occ - fcOcc).toFixed(2),
                    row.fc_total_rooms || 0, row.total_rooms || 0
                ];
                csvRows.push(csvRow.join(','));
            });
            csvString = csvRows.join('\n');
        } else {
            console.log(`RYCHotel: No data to export for ${tableType} or invalid table type.`);
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
        if (selectedView.value === 'graph') {
            nextTick(refreshAllCharts);
        }
        window.addEventListener('resize', resizeChartHandler);
    });
    onBeforeUnmount(() => {
        disposeAllCharts();
        window.removeEventListener('resize', resizeChartHandler);
    });

    watch([monthlyChartOptions, totalChartOptions, currentHotelRevenueData], () => { 
        if (selectedView.value === 'graph') {
             nextTick(refreshAllCharts); 
        }
    }, { deep: true });

    watch(selectedView, async (newView) => {
        if (newView === 'graph') {
            await nextTick();          
            refreshAllCharts();
        } else {            
            disposeAllCharts();
        }
    });
</script>