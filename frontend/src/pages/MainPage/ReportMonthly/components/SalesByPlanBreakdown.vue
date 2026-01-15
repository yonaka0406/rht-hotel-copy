<template>
    <Card class="col-span-12">
        <template #title>
            <div class="flex justify-between items-center">
                <div>
                    <p>カテゴリー別宿泊売上内訳</p>
                    <small v-if="salesByPlanChartMode === 'tax_included'">（税込み）</small>
                    <small v-else>（税抜き）</small>
                </div>
                <SelectButton v-model="salesByPlanChartMode" :options="salesByPlanChartOptions" optionLabel="name"
                    optionValue="value" />
                <SelectButton v-model="salesByPlanViewMode" :options="salesByPlanViewOptions" optionLabel="name"
                    optionValue="value" class="ml-2" />
            </div>
        </template>
        <template #content>
            <div v-if="salesByPlanViewMode === 'chart'" ref="salesByPlanChart" class="w-full h-96"></div>
            <DataTable v-else :value="processedSalesByPlan" responsiveLayout="scroll">
                <Column field="plan_name" header="カテゴリー名">
                    <template #body="slotProps">
                        {{ slotProps.data.plan_name }}
                        <Badge v-if="slotProps.data.sales_category === 'other'" value="宿泊以外" severity="warn"
                            class="ml-2" />
                    </template>
                </Column>
                <Column header="宿泊売上" bodyStyle="text-align:right">
                    <template #body="slotProps">
                        <span v-if="salesByPlanChartMode === 'tax_included'">
                            {{ slotProps.data.regular_sales.toLocaleString('ja-JP') }} 円
                        </span>
                        <span v-else>
                            {{ slotProps.data.regular_net_sales.toLocaleString('ja-JP') }} 円
                        </span>
                    </template>
                </Column>
                <Column header="キャンセル売上" bodyStyle="text-align:right">
                    <template #body="slotProps">
                        <span v-if="salesByPlanChartMode === 'tax_included'">
                            {{ slotProps.data.cancelled_sales.toLocaleString('ja-JP') }} 円
                        </span>
                        <span v-else>
                            {{ slotProps.data.cancelled_net_sales.toLocaleString('ja-JP') }} 円
                        </span>
                    </template>
                </Column>
                <Column header="合計" bodyStyle="text-align:right" headerClass="text-center font-bold">
                    <template #body="slotProps">
                        <span v-if="salesByPlanChartMode === 'tax_included'">
                            {{ (slotProps.data.regular_sales + slotProps.data.cancelled_sales).toLocaleString('ja-JP')
                            }} 円
                            <Badge v-if="salesByPlanTotals.grand_total_sales > 0"
                                :value="((slotProps.data.regular_sales + slotProps.data.cancelled_sales) / salesByPlanTotals.grand_total_sales * 100).toFixed(1) + '%'"
                                severity="secondary" class="ml-2" />
                        </span>
                        <span v-else>
                            {{ (slotProps.data.regular_net_sales +
                                slotProps.data.cancelled_net_sales).toLocaleString('ja-JP') }} 円
                            <Badge v-if="salesByPlanTotals.grand_total_net_sales > 0"
                                :value="((slotProps.data.regular_net_sales + slotProps.data.cancelled_net_sales) / salesByPlanTotals.grand_total_net_sales * 100).toFixed(1) + '%'"
                                severity="info" class="ml-2" />
                        </span>
                    </template>
                </Column>
                <Column v-if="salesByPlanChartMode !== 'tax_included'" header="計画売上" bodyStyle="text-align:right">
                    <template #body="slotProps">
                        {{ slotProps.data.forecast_sales.toLocaleString('ja-JP') }} 円
                        <Badge v-if="salesByPlanTotals.grand_total_forecast_sales > 0"
                            :value="(slotProps.data.forecast_sales / salesByPlanTotals.grand_total_forecast_sales * 100).toFixed(1) + '%'"
                            severity="contrast" class="ml-2" />
                    </template>
                </Column>
                <ColumnGroup type="footer">
                    <Row>
                        <Column footer="合計" :colspan="1" footerStyle="text-align:left" />
                        <Column v-if="salesByPlanChartMode === 'tax_included'"
                            :footer="salesByPlanTotals.regular_sales.toLocaleString('ja-JP') + ' 円'"
                            footerStyle="text-align:right" />
                        <Column v-else :footer="salesByPlanTotals.regular_net_sales.toLocaleString('ja-JP') + ' 円'"
                            footerStyle="text-align:right" />
                        <Column v-if="salesByPlanChartMode === 'tax_included'"
                            :footer="salesByPlanTotals.cancelled_sales.toLocaleString('ja-JP') + ' 円'"
                            footerStyle="text-align:right" />
                        <Column v-else :footer="salesByPlanTotals.cancelled_net_sales.toLocaleString('ja-JP') + ' 円'"
                            footerStyle="text-align:right" />
                        <Column v-if="salesByPlanChartMode === 'tax_included'" footerStyle="text-align:right">
                            <template #footer>
                                <span class="font-bold">{{ (salesByPlanTotals.regular_sales +
                                    salesByPlanTotals.cancelled_sales).toLocaleString('ja-JP') }} 円</span>
                                <Badge value="100%" severity="secondary" class="ml-2" />
                            </template>
                        </Column>
                        <Column v-else footerStyle="text-align:right">
                            <template #footer>
                                <span class="font-bold">{{ (salesByPlanTotals.regular_net_sales +
                                    salesByPlanTotals.cancelled_net_sales).toLocaleString('ja-JP') }} 円</span>
                                <Badge value="100%" severity="info" class="ml-2" />
                            </template>
                        </Column>
                        <Column v-if="salesByPlanChartMode !== 'tax_included'" footerStyle="text-align:right">
                            <template #footer>
                                <span class="font-bold">{{ salesByPlanTotals.forecast_sales.toLocaleString('ja-JP') }}
                                    円</span>
                                <Badge value="100%" severity="contrast" class="ml-2" />
                            </template>
                        </Column>
                    </Row>
                    <!-- 宿泊以外売上 row (appears after 合計) -->
                    <Row v-if="salesByPlanTotals.other_sales > 0 || salesByPlanTotals.other_net_sales > 0">
                        <Column footerStyle="text-align:left">
                            <template #footer>
                                <span>宿泊以外売上</span>
                                <Badge value="宿泊以外" severity="warn" class="ml-2" />
                            </template>
                        </Column>
                        <Column v-if="salesByPlanChartMode === 'tax_included'"
                            :footer="salesByPlanTotals.other_sales.toLocaleString('ja-JP') + ' 円'"
                            footerStyle="text-align:right" />
                        <Column v-else :footer="salesByPlanTotals.other_net_sales.toLocaleString('ja-JP') + ' 円'"
                            footerStyle="text-align:right" />
                        <Column footer="0 円" footerStyle="text-align:right" />
                        <Column v-if="salesByPlanChartMode === 'tax_included'" footerStyle="text-align:right">
                            <template #footer>
                                <span class="font-bold">{{ salesByPlanTotals.other_sales.toLocaleString('ja-JP') }} 円</span>
                            </template>
                        </Column>
                        <Column v-else footerStyle="text-align:right">
                            <template #footer>
                                <span class="font-bold">{{ salesByPlanTotals.other_net_sales.toLocaleString('ja-JP') }} 円</span>
                            </template>
                        </Column>
                        <Column v-if="salesByPlanChartMode !== 'tax_included'" footer="-" footerStyle="text-align:right" />
                    </Row>
                    <!-- 総売上 row (grand total including other sales) -->
                    <Row v-if="salesByPlanTotals.other_sales > 0 || salesByPlanTotals.other_net_sales > 0">
                        <Column footer="総売上" :colspan="3" footerStyle="text-align:left; font-weight:bold; background-color:#f8f9fa" />
                        <Column v-if="salesByPlanChartMode === 'tax_included'" footerStyle="text-align:right; font-weight:bold; background-color:#f8f9fa">
                            <template #footer>
                                <span class="font-bold text-lg">{{ (salesByPlanTotals.regular_sales + salesByPlanTotals.cancelled_sales + salesByPlanTotals.other_sales).toLocaleString('ja-JP') }} 円</span>
                            </template>
                        </Column>
                        <Column v-else footerStyle="text-align:right; font-weight:bold; background-color:#f8f9fa">
                            <template #footer>
                                <span class="font-bold text-lg">{{ (salesByPlanTotals.regular_net_sales + salesByPlanTotals.cancelled_net_sales + salesByPlanTotals.other_net_sales).toLocaleString('ja-JP') }} 円</span>
                            </template>
                        </Column>
                        <Column v-if="salesByPlanChartMode !== 'tax_included'" footer="-" footerStyle="text-align:right; background-color:#f8f9fa" />
                    </Row>
                </ColumnGroup>
            </DataTable>
        </template>
    </Card>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Card, SelectButton, DataTable, Column, ColumnGroup, Row, Badge } from 'primevue';
import * as echarts from 'echarts/core';
import {
    TooltipComponent,
    LegendComponent,
    GridComponent
} from 'echarts/components';
import { BarChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    TooltipComponent,
    LegendComponent,
    GridComponent,
    BarChart,
    CanvasRenderer
]);

const props = defineProps({
    salesByPlan: {
        type: Array,
        required: true
    },
    forecastDataByPlan: {
        type: Array,
        required: true
    }
});

const salesByPlanViewMode = ref('chart');
const salesByPlanViewOptions = ref([
    { name: 'グラフ', value: 'chart' },
    { name: 'テーブル', value: 'table' }
]);

const salesByPlanChartMode = ref('tax_excluded'); // 'tax_included' or 'tax_excluded'
const salesByPlanChartOptions = ref([
    { name: '税込み', value: 'tax_included' },
    { name: '税抜き', value: 'tax_excluded' }
]);

const combinedSalesByPlan = computed(() => {
    const combined = {};
    
    // Process both sales and forecast data using consistent category-based grouping
    [...props.salesByPlan, ...props.forecastDataByPlan].forEach(item => {
        let categoryKey;
        let displayName;
        
        // Check if this is forecast data or sales data
        const isForecastData = item.hasOwnProperty('accommodation_revenue') || item.hasOwnProperty('non_accommodation_revenue');
        
        // Try multiple possible field names for category IDs
        const typeCategoryId = item.plan_type_category_id || item.type_category_id;
        const packageCategoryId = item.plan_package_category_id || item.package_category_id;
        const typeCategoryName = item.type_category_name || item.plan_type_category_name;
        const packageCategoryName = item.package_category_name || item.plan_package_category_name;
        
        const hasCategoryIds = typeCategoryId || packageCategoryId;

        if (hasCategoryIds) {
            // New category-based structure - use ID combination as key
            categoryKey = `${typeCategoryId || 'null'}_${packageCategoryId || 'null'}`;
            displayName = `${typeCategoryName || '未設定'} - ${packageCategoryName || '未設定'}`;
        } else if (item.plan_name) {
            // Fallback to plan name for backward compatibility or addons
            categoryKey = item.plan_name;
            displayName = item.plan_name;
        } else {
            // Fallback for data without category IDs or plan names
            categoryKey = 'unset_unset';
            displayName = '未設定 - 未設定';
        }
        
        if (!combined[categoryKey]) {
            combined[categoryKey] = {
                plan_name: displayName,
                has_category: !!hasCategoryIds,
                sales_category: item.sales_category || (isForecastData ? 'forecast' : 'accommodation'),
                regular_sales: 0,
                cancelled_sales: 0,
                regular_net_sales: 0,
                cancelled_net_sales: 0,
                forecast_sales: 0,
                other_sales: 0,
                other_net_sales: 0
            };
        }
        
        if (isForecastData) {
            // Handle forecast data
            const accommodationRevenue = parseFloat(item.accommodation_revenue || 0);
            const nonAccommodationRevenue = parseFloat(item.non_accommodation_revenue || 0);
            combined[categoryKey].forecast_sales += accommodationRevenue + nonAccommodationRevenue;
        } else {
            // Handle sales data
            if (item.is_cancelled_billable) {
                combined[categoryKey].cancelled_sales += parseFloat(item.accommodation_sales || 0) + parseFloat(item.other_sales || 0);
                combined[categoryKey].cancelled_net_sales += parseFloat(item.accommodation_sales_net || 0) + parseFloat(item.other_sales_net || 0);
            } else {
                // 宿泊売上 should only include accommodation_sales, not other_sales
                combined[categoryKey].regular_sales += parseFloat(item.accommodation_sales || 0);
                combined[categoryKey].regular_net_sales += parseFloat(item.accommodation_sales_net || 0);
                // Track other_sales separately
                combined[categoryKey].other_sales += parseFloat(item.other_sales || 0);
                combined[categoryKey].other_net_sales += parseFloat(item.other_sales_net || 0);
            }
        }
    });

    return Object.values(combined);
});

const processedSalesByPlan = computed(() => {
    // Filter out categories with zero total sales
    const filteredData = combinedSalesByPlan.value.filter(item => {
        const totalSales = item.regular_sales + item.cancelled_sales;
        const totalNetSales = item.regular_net_sales + item.cancelled_net_sales;
        const totalForecastSales = item.forecast_sales;
        const totalOtherSales = item.other_sales;
        const totalOtherNetSales = item.other_net_sales;
        
        // Include if any of the sales values are greater than 0
        // OR if it is an identified category (has Type or Package ID)
        return totalSales > 0 || totalNetSales > 0 || totalForecastSales > 0 || totalOtherSales > 0 || totalOtherNetSales > 0 || item.has_category;
    });

    const sortedData = [...filteredData];
    sortedData.sort((a, b) => {
        // Primary sort by has_category (identified categories first)
        if (a.has_category !== b.has_category) {
            return a.has_category ? -1 : 1;
        }

        // Secondary sort by regular_sales (descending)
        if (b.regular_sales !== a.regular_sales) {
            return b.regular_sales - a.regular_sales;
        }

        // Tertiary sort by plan_name (ascending)
        if (a.plan_name < b.plan_name) return -1;
        if (a.plan_name > b.plan_name) return 1;
        return 0;
    });
    
    return sortedData;
});

const salesByPlanTotals = computed(() => {
    const totals = processedSalesByPlan.value.reduce((acc, item) => {
        acc.regular_sales += item.regular_sales;
        acc.cancelled_sales += item.cancelled_sales;
        acc.regular_net_sales += item.regular_net_sales;
        acc.cancelled_net_sales += item.cancelled_net_sales;
        acc.forecast_sales += item.forecast_sales;
        acc.other_sales += item.other_sales;
        acc.other_net_sales += item.other_net_sales;
        return acc;
    }, { regular_sales: 0, cancelled_sales: 0, regular_net_sales: 0, cancelled_net_sales: 0, forecast_sales: 0, other_sales: 0, other_net_sales: 0 });

    totals.grand_total_sales = totals.regular_sales + totals.cancelled_sales;
    totals.grand_total_net_sales = totals.regular_net_sales + totals.cancelled_net_sales;
    totals.grand_total_forecast_sales = totals.forecast_sales;

    console.log('[カテゴリー別宿泊売上内訳] 宿泊売上 (税抜):', totals.regular_net_sales.toLocaleString('ja-JP'), '円');
    console.log('[カテゴリー別宿泊売上内訳] キャンセル売上 (税抜):', totals.cancelled_net_sales.toLocaleString('ja-JP'), '円');
    console.log('[カテゴリー別宿泊売上内訳] 宿泊以外売上 (税抜):', totals.other_net_sales.toLocaleString('ja-JP'), '円');
    console.log('[カテゴリー別宿泊売上内訳] 合計 (税抜):', totals.grand_total_net_sales.toLocaleString('ja-JP'), '円');
    console.log('[カテゴリー別宿泊売上内訳] 総売上 (税抜):', (totals.grand_total_net_sales + totals.other_net_sales).toLocaleString('ja-JP'), '円');

    return totals;
});

const salesByPlanChart = ref(null);
let mySalesByPlanChart = null;

const processSalesByPlanChartData = () => {
    if (salesByPlanViewMode.value === 'chart') {
        initSalesByPlanChart();
    }
};

const initSalesByPlanChart = () => {
    if (!salesByPlanChart.value) return;

    // Filter out categories with zero total sales for the chart
    const filteredChartData = processedSalesByPlan.value.filter(item => {
        const totalSales = salesByPlanChartMode.value === 'tax_included' 
            ? (item.regular_sales + item.cancelled_sales)
            : (item.regular_net_sales + item.cancelled_net_sales);
        const totalForecast = item.forecast_sales;
        
        // In tax_excluded mode, show if there's any sales OR forecast OR it's an identified category
        if (salesByPlanChartMode.value === 'tax_excluded') {
            return totalSales > 0 || totalForecast > 0 || item.has_category;
        }
        
        // In tax_included mode, only show if there's actual sales (since forecast is not shown)
        return totalSales > 0;
    });

    const planNames = filteredChartData.map(item => item.plan_name);

    let regularSalesData;
    let cancelledSalesData;
    let forecastSalesData;
    let valueLabel;
    let axisLabel;

    if (salesByPlanChartMode.value === 'tax_included') {
        regularSalesData = filteredChartData.map(item => item.regular_sales);
        cancelledSalesData = filteredChartData.map(item => item.cancelled_sales);
        forecastSalesData = filteredChartData.map(item => item.forecast_sales);
        valueLabel = ' 万円 (税込み)';
        axisLabel = '売上 (税込み)';
    } else {
        regularSalesData = filteredChartData.map(item => item.regular_net_sales);
        cancelledSalesData = filteredChartData.map(item => item.cancelled_net_sales);
        forecastSalesData = filteredChartData.map(item => item.forecast_sales);
        valueLabel = ' 万円 (税抜き)';
        axisLabel = '売上 (税抜き)';
    }

    const series = [
        {
            name: '宿泊売上',
            type: 'bar',
            stack: 'total',
            label: {
                show: false,
                formatter: (params) => Math.round(params.value / 10000).toLocaleString('ja-JP') + valueLabel
            },
            emphasis: {
                focus: 'series'
            },
            data: regularSalesData
        },
        {
            name: 'キャンセル売上',
            type: 'bar',
            stack: 'total',
            label: {
                show: false,
                formatter: (params) => Math.round(params.value / 10000).toLocaleString('ja-JP') + valueLabel
            },
            emphasis: {
                focus: 'series'
            },
            data: cancelledSalesData
        }
    ];

    if (salesByPlanChartMode.value !== 'tax_included') {
        series.push({
            name: '計画売上',
            type: 'bar',
            // Removed stack: 'total' to unstack it
            label: {
                show: false,
                formatter: (params) => Math.round(params.value / 10000).toLocaleString('ja-JP') + valueLabel
            },
            emphasis: {
                focus: 'series'
            },
            data: forecastSalesData
        });
    }

    const option = {
        color: ["#3fb1e3", "#6be6c1", "#626c91", "#a0a7e6", "#c4ebad", "#96dee8"],
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            valueFormatter: (value) => Math.round(value / 10000).toLocaleString('ja-JP') + valueLabel
        },
        legend: {
            data: salesByPlanChartMode.value !== 'tax_included' ? ['宿泊売上', 'キャンセル売上', '計画売上'] : ['宿泊売上', 'キャンセル売上'],
            top: '5%' // Move legend down slightly
        },
        grid: {
            left: '3%',
            right: '4%',
            top: '15%', // Increased top to give more space for legend
            bottom: '10%',
            height: '65%', // Reduced height
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: axisLabel,
            nameLocation: 'middle',
            nameGap: 30,
            axisLabel: {
                formatter: (value) => Math.round(value / 10000).toLocaleString('ja-JP') + ' 万円'
            },
            nameTextStyle: {
                fontWeight: 'bold',
                fontSize: 12
            }
        },
        yAxis: {
            type: 'category',
            data: planNames
        },
        series: series
    };

    if (!mySalesByPlanChart) {
        mySalesByPlanChart = echarts.init(salesByPlanChart.value);
    }
    mySalesByPlanChart.setOption(option, true);
};

const handleResize = () => {
    if (mySalesByPlanChart) mySalesByPlanChart.resize();
};

onMounted(() => {
    processSalesByPlanChartData();
    window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (mySalesByPlanChart) mySalesByPlanChart.dispose();
});

watch([() => props.salesByPlan, () => props.forecastDataByPlan, salesByPlanChartMode], () => {
    processSalesByPlanChartData();
}, { deep: true });

watch(salesByPlanViewMode, (newValue) => {
    if (newValue === 'table' && mySalesByPlanChart) {
        mySalesByPlanChart.dispose();
        mySalesByPlanChart = null;
    } else if (newValue === 'chart') {
        nextTick(() => {
            processSalesByPlanChartData();
        });
    }
});

watch(salesByPlanChartMode, (newValue) => {
    if (mySalesByPlanChart) {
        nextTick(() => {
            processSalesByPlanChartData();
        });
    }
});
</script>
