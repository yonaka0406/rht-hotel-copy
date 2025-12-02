<template>
    <Card class="col-span-12">
        <template #title>
            <div class="flex justify-between items-center">
                <p>稼働率内訳</p>
                <SelectButton v-model="occupationBreakdownViewMode" :options="occupationBreakdownViewOptions" optionLabel="name" optionValue="value" />
            </div>
        </template>
        <template #content>
            <div v-if="occupationBreakdownViewMode === 'chart'" ref="occupationBreakdownChart" class="w-full h-96"></div>
            <DataTable v-else-if="filteredOccupationBreakdownData && filteredOccupationBreakdownData.length > 0" :value="filteredOccupationBreakdownData" responsiveLayout="scroll">
                <Column field="plan_name" header="プラン名"></Column>
                <Column field="undecided_nights" header="未確定泊数" bodyStyle="text-align:right">
                    <template #body="slotProps">
                        {{ parseInt(slotProps.data.undecided_nights || '0').toLocaleString('ja-JP') }}
                    </template>
                </Column>
                <Column field="confirmed_nights" header="確定泊数" bodyStyle="text-align:right">
                    <template #body="slotProps">
                        {{ parseInt(slotProps.data.confirmed_nights || '0').toLocaleString('ja-JP') }}
                    </template>
                </Column>
                <Column field="employee_nights" header="社員泊数" bodyStyle="text-align:right">
                    <template #body="slotProps">
                        {{ parseInt(slotProps.data.employee_nights || '0').toLocaleString('ja-JP') }}
                    </template>
                </Column>
                <Column field="blocked_nights" header="ブロック泊数" bodyStyle="text-align:right">
                    <template #body="slotProps">
                        {{ parseInt(slotProps.data.blocked_nights || '0').toLocaleString('ja-JP') }}
                    </template>
                </Column>
                <Column field="total_occupied_nights" header="合計稼働泊数" bodyStyle="text-align:right">
                    <template #body="slotProps">
                        {{ parseInt(slotProps.data.total_occupied_nights || '0').toLocaleString('ja-JP') }}
                    </template>
                </Column>
                <ColumnGroup type="footer">
                    <Row>
                        <Column footer="合計:" :colspan="1" footerStyle="text-align:right"/>
                        <Column :footer="occupationBreakdownTotals.undecided_nights.toLocaleString('ja-JP')" footerStyle="text-align:right"/>
                        <Column :footer="occupationBreakdownTotals.confirmed_nights.toLocaleString('ja-JP')" footerStyle="text-align:right"/>
                        <Column :footer="occupationBreakdownTotals.employee_nights.toLocaleString('ja-JP')" footerStyle="text-align:right"/>
                        <Column :footer="occupationBreakdownTotals.blocked_nights.toLocaleString('ja-JP')" footerStyle="text-align:right"/>
                        <Column :footer="occupationBreakdownTotals.total_occupied_nights.toLocaleString('ja-JP')" footerStyle="text-align:right"/>
                    </Row>
                    <Row>
                        <Column footer="合計利用可能泊数:" :colspan="5" footerStyle="text-align:right"/>
                        <Column :footer="occupationBreakdownTotals.total_bookable_room_nights.toLocaleString('ja-JP')" footerStyle="text-align:right"/>
                    </Row>
                    <Row>
                        <Column footer="確定泊数 / (合計利用可能泊数 - ブロック泊数):" :colspan="5" footerStyle="text-align:right"/>
                        <Column :footer="
                            (() => {
                                                                        const confirmed = confirmedOccupancyNights.value;
                                                                        const totalAvailable = occupationBreakdownTotals.total_bookable_room_nights;
                                                                        const blocked = blockedOccupancyNights.value;
                                                                        const denominator = totalAvailable - blocked;                                if (denominator <= 0) return 'N/A';
                                return ((confirmed / denominator) * 100).toFixed(2) + '%';
                            })()
                        " footerStyle="text-align:right"/>
                    </Row>
                </ColumnGroup>
            </DataTable>
            <div v-else>
                <p>稼働率内訳データがありません。</p>
            </div>
        </template>
    </Card>            
</template>

<script setup>
import { defineProps, ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Card, SelectButton, DataTable, Column, ColumnGroup, Row } from 'primevue';
import * as echarts from 'echarts/core';
import {
    TooltipComponent,
    LegendComponent,
    GridComponent,
    VisualMapComponent,
    TitleComponent
} from 'echarts/components';
import { BarChart, ScatterChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    TooltipComponent,
    LegendComponent,
    GridComponent,
    VisualMapComponent,
    TitleComponent,
    BarChart,
    ScatterChart,
    CanvasRenderer
]);

const props = defineProps({
    occupationBreakdownData: {
        type: Array,
        required: true
    }
});

const occupationBreakdownViewMode = ref('chart');
const occupationBreakdownViewOptions = ref([
    { name: 'グラフ', value: 'chart' },
    { name: 'テーブル', value: 'table' }
]);

const occupationBreakdownChart = ref(null);
let myOccupationBreakdownChart = null;

const occupationBreakdownTotals = computed(() => {
    if (!props.occupationBreakdownData) return { undecided_nights: 0, confirmed_nights: 0, employee_nights: 0, blocked_nights: 0, total_occupied_nights: 0, total_reservation_details_nights: 0, not_booked_nor_blocked_nights: 0, total_bookable_room_nights: 0 };

    let totalBookable = 0;
    const filteredData = props.occupationBreakdownData.filter(item => {
        if (item.plan_name === 'Total Available') {
            totalBookable = parseInt(item.total_bookable_room_nights || '0');
            return false; // Exclude this row from the sum
        }
        return true;
    });

    const totals = filteredData.reduce((acc, item) => {
        const undecided = parseInt(item.undecided_nights || '0');
        const confirmed = parseInt(item.confirmed_nights || '0');
        const employee = parseInt(item.employee_nights || '0');
        const blocked = parseInt(item.blocked_nights || '0');
        const totalOccupied = parseInt(item.total_occupied_nights || '0');
        const totalReservationDetails = parseInt(item.total_reservation_details_nights || '0');

        acc.undecided_nights += undecided;
        acc.confirmed_nights += confirmed;
        acc.employee_nights += employee;
        acc.blocked_nights += blocked;
        acc.total_occupied_nights += totalOccupied;
        acc.total_reservation_details_nights += totalReservationDetails;
        acc.not_booked_nor_blocked_nights += (totalReservationDetails - totalOccupied);
        return acc;
    }, { undecided_nights: 0, confirmed_nights: 0, employee_nights: 0, blocked_nights: 0, total_occupied_nights: 0, total_reservation_details_nights: 0, not_booked_nor_blocked_nights: 0 });

    totals.total_bookable_room_nights = totalBookable;
    return totals;
});

const confirmedOccupancyNights = computed(() => {
    if (!props.occupationBreakdownData) return 0;
    return props.occupationBreakdownData
        .filter(item => 
            item.plan_name !== 'Total Available' &&
            item.sales_category !== 'employee' &&
            item.sales_category !== 'block'
        )
        .reduce((sum, item) => sum + parseInt(item.confirmed_nights || '0'), 0);
});

const blockedOccupancyNights = computed(() => {
    if (!props.occupationBreakdownData) return 0;
    return props.occupationBreakdownData
        .filter(item => 
            item.plan_name !== 'Total Available' &&
            item.sales_category !== 'employee' && 
            item.sales_category !== 'block'     
        )
        .reduce((sum, item) => sum + parseInt(item.blocked_nights || '0'), 0);
});

const filteredOccupationBreakdownData = computed(() => {
    if (!props.occupationBreakdownData) return [];
    return props.occupationBreakdownData.filter(item => 
        item.plan_name !== 'Total Available' &&
        item.sales_category !== 'employee' &&
        item.sales_category !== 'block'
    );
});

const processOccupationBreakdownChartData = () => {
    if (occupationBreakdownViewMode.value === 'chart') {
        initOccupationBreakdownChart();
    }
};

const initOccupationBreakdownChart = () => {
    if (!occupationBreakdownChart.value || !props.occupationBreakdownData || !Array.isArray(props.occupationBreakdownData)) return;

    const chartData = props.occupationBreakdownData;
    
    // Find the total bookable room nights from the 'Total Available' row
    const totalAvailableRow = chartData.find(row => row.plan_name === 'Total Available');
    const totalBookableRoomNights = totalAvailableRow ? parseInt(totalAvailableRow.total_bookable_room_nights || '0') : 0;
    
    // Filter out the 'Total Available' row from plan data
    const planData = chartData.filter(row => row.plan_name !== 'Total Available');
    
    // If no plan data, show empty chart
    if (!planData.length) {
        const option = {
            title: {
                text: 'データがありません',
                left: 'center',
                top: 'middle'
            }
        };
        if (!myOccupationBreakdownChart) {
            myOccupationBreakdownChart = echarts.init(occupationBreakdownChart.value);
        }
        myOccupationBreakdownChart.setOption(option, true);
        return;
    }
    
    // Define Y-axis categories
    const yAxisCategories = ['確定', '確定 (その他)', 'ブロック', '未予約'];
    
    // Get unique plan names and process them
    const planMap = new Map();
    let totalOccupiedNights = 0;
    let totalConfirmedNights = 0; // Initialize totalConfirmedNights
    
    planData.forEach(plan => {
        let planName = plan.plan_name;
        
        // Check if this is an employee reservation and rename it
        if (plan.employee_nights && parseInt(plan.employee_nights) > 0) {
            planName = '社員';
        }
        
        // Skip 未定 plans - they will be counted in "not booked"
        if (planName === '未定') {
            const undecidedNights = parseInt(plan.undecided_nights || '0');
            totalOccupiedNights += undecidedNights;
            return;
        }
        
        if (!planMap.has(planName)) {
            planMap.set(planName, {
                '確定': 0,
                '確定 (その他)': 0,
                'ブロック': 0,
                '未予約': 0
            });
        }
        
        const planEntry = planMap.get(planName);
        
        // Add confirmed nights
        const confirmed = parseInt(plan.confirmed_nights || '0');
        if (plan.sales_category === 'other') {
             planEntry['確定 (その他)'] += confirmed;
        } else {
             planEntry['確定'] += confirmed;
        }
        totalConfirmedNights += confirmed; // Accumulate total confirmed nights
        
        // Add blocked nights
        planEntry['ブロック'] += parseInt(plan.blocked_nights || '0');
        
        // Count total occupied nights for this plan
        totalOccupiedNights += confirmed;
        totalOccupiedNights += parseInt(plan.blocked_nights || '0');
        totalOccupiedNights += parseInt(plan.employee_nights || '0');
    });
    
    // Calculate total not booked nights
    const totalNotBookedNights = totalBookableRoomNights - totalOccupiedNights;
    
    // Add "not booked" as a separate series if there are unbooked nights
    if (totalNotBookedNights > 0) {
        planMap.set('未予約', {
            '確定': 0,
            '確定 (その他)': 0,
            'ブロック': 0,
            '未予約': totalNotBookedNights
        });
    }
    
    // Convert map to array and sort by total nights (descending)
    const processedPlans = Array.from(planMap.entries()).map(([planName, data]) => ({
        planName,
        ...data,
        total: data['確定'] + data['確定 (その他)'] + data['ブロック'] + data['未予約']
    })).sort((a, b) => b.total - a.total);

    
    
    // Create series data for each plan
    const series = processedPlans.map(plan => ({
        name: plan.planName,
        type: 'bar',
        stack: 'total',
        emphasis: {
            focus: 'series'
        },
        label: {
            show: true,
            position: 'top',
            formatter: (params) => {
                const value = params.value;
                if (value === 0) return '';
                
                // Calculate percentage of total bookable nights
                const percentage = totalBookableRoomNights > 0 ? ((value / totalBookableRoomNights) * 100) : 0;
                // Only show label if percentage is 10% or higher
                if (percentage >= 10) {
                    return `${value.toLocaleString('ja-JP')} 泊 (${percentage.toFixed(1)}%)`;
                }
                return '';
            }
        },
        data: yAxisCategories.map(category => plan[category])
    }));

    // Add a dummy series for the total confirmed nights markPoint
    series.push({
        name: '', // Set an empty name to prevent it from showing in tooltip/legend
        type: 'scatter', // Use scatter to just show a point
        showInLegend: false, // Hide this series from the legend
        data: [
            {
                name: '確定合計',
                value: totalConfirmedNights,
                xAxis: totalConfirmedNights,
                yAxis: '確定',
                label: {
                    show: true,
                    formatter: `{c} 泊`,
                    position: 'right'
                },
                itemStyle: {
                    opacity: 0 // Make the point invisible
                }
            }
        ],
        markPoint: {
            data: [
                {
                    name: '確定合計',
                    value: totalConfirmedNights,
                    xAxis: totalConfirmedNights,
                    yAxis: '確定',
                    label: {
                        show: true,
                        formatter: `{c} 泊`,
                        position: 'right'
                    }
                }
            ]
        }
    });

    const option = {
        color: ["#2ec7c9", "#b6a2de", "#5ab1ef", "#ffb980", "#d87a80", "#8d98b3", "#e5cf0d", "#97b552", "#95706d", "#dc69aa", "#07a2a4", "#9a7fd1", "#588dd5", "#f5994e", "#c05050", "#59678c", "#c9ab00", "#7eb00a", "#6f5553", "#c14089", "#FFC0CB", "#ADD8E6", "#90EE90", "#FFD700", "#FFA07A"],
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: (params) => {
                const categoryName = params[0].axisValue;
                let tooltipContent = `${categoryName}<br/>`;
                let totalForCategory = 0;
                
                // Filter out the dummy series from params for total calculation
                const filteredParams = params.filter(item => item.seriesName !== '' && item.seriesName !== '確定合計');

                // Calculate total for the current category
                filteredParams.forEach(item => {
                    totalForCategory += item.value;
                });

                filteredParams.forEach(item => {
                    if (item.value > 0) {
                        const categoryPercentage = totalBookableRoomNights > 0 ? ((item.value / totalBookableRoomNights) * 100).toFixed(1) : 0;
                        const withinCategoryPercentage = totalForCategory > 0 ? ((item.value / totalForCategory) * 100).toFixed(1) : 0;
                        tooltipContent += `${item.marker} ${item.seriesName}: ${item.value.toLocaleString('ja-JP')} 泊 (合計の${categoryPercentage}%, ${categoryName}の${withinCategoryPercentage}%)<br/>`;
                    }
                });
                tooltipContent += `<br/>合計利用可能泊数: ${totalBookableRoomNights.toLocaleString('ja-JP')} 泊`;
                return tooltipContent;
            }
        },
        legend: {
            data: processedPlans.map(plan => plan.planName),
            // Removed type: 'scroll' to allow wrapping
            bottom: 0
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%', // Increased to accommodate scrollable legend
            top: '5%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: '泊数',
            axisLabel: {
                formatter: (value) => value.toLocaleString('ja-JP') + ' 泊'
            }
        },
        yAxis: {
            type: 'category',
            data: yAxisCategories,
            axisLabel: {
                formatter: (value) => {
                    const labels = {
                        '確定': '確定 (宿泊)',
                        '確定 (その他)': '確定 (その他)',
                        'ブロック': 'ブロック',
                        '未予約': '未予約'
                    };
                    return labels[value] || value;
                }
            }
        },
        series: series
    };

    if (!myOccupationBreakdownChart) {
        myOccupationBreakdownChart = echarts.init(occupationBreakdownChart.value);
    }
    myOccupationBreakdownChart.setOption(option, true);
};


const handleResize = () => {
    if (myOccupationBreakdownChart) myOccupationBreakdownChart.resize();
};

onMounted(() => {
    processOccupationBreakdownChartData();
    window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (myOccupationBreakdownChart) myOccupationBreakdownChart.dispose();
});

watch([() => props.occupationBreakdownData], () => {
    processOccupationBreakdownChartData();
}, { deep: true });

watch(occupationBreakdownViewMode, (newValue) => {
    if (newValue === 'table' && myOccupationBreakdownChart) {
        myOccupationBreakdownChart.dispose();
        myOccupationBreakdownChart = null;
    } else if (newValue === 'chart') {
        nextTick(() => {
            processOccupationBreakdownChartData();
        });
    }
});
</script>
