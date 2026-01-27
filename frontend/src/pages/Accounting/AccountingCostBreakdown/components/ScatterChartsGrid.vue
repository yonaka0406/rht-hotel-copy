<template>
    <div class="mb-8">
        <div class="mb-6 flex items-center gap-3">
            <div class="h-8 w-1 bg-violet-600 rounded-full"></div>
            <h2 class="text-xl font-bold text-slate-800 dark:text-white">科目別相関分析 (稼働率 vs 客室単価コスト)</h2>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div v-for="account in topAccounts" :key="account.code"
                class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-slate-700 dark:text-slate-200">{{ account.name }}</h3>
                    <span class="text-[10px] py-0.5 px-2 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">
                        {{ account.code }}
                    </span>
                </div>
                <div class="h-[300px]">
                    <v-chart class="h-full w-full" :option="getScatterOption(account)" autoresize />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import VChart from 'vue-echarts';

const props = defineProps({
    topAccounts: {
        type: Array,
        required: true
    },
    rawData: {
        type: Object,
        required: true
    },
    selectedHotelId: {
        type: Number,
        required: true
    },
    mappedHotels: {
        type: Array,
        required: true
    }
});

/**
 * Scatter Chart configuration for occupancy vs cost per occupied room analysis
 */
const getScatterOption = (account) => {
    const accountData = props.rawData.timeSeries.filter(d => d.account_code === account.code);
    const occupancyData = props.rawData.occupancyData || [];
    
    // Create series data for each hotel
    const hotelSeries = [];
    const hotelColors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
        '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
        '#8b5cf6', '#a855f7', '#c084fc', '#d946ef', '#ec4899', '#f43f5e'
    ];

    // Get unique hotels to analyze
    const hotelsToAnalyze = props.selectedHotelId === 0 
        ? props.mappedHotels 
        : props.mappedHotels.filter(h => h.hotel_id === props.selectedHotelId);

    hotelsToAnalyze.forEach((hotel, index) => {
        const hotelAccountData = accountData.filter(d => d.hotel_id === hotel.hotel_id);
        const hotelOccupancyData = occupancyData.filter(d => d.hotel_id === hotel.hotel_id);
        
        // Combine cost and occupancy data by month
        const combinedData = [];
        hotelAccountData.forEach(costRecord => {
            const occupancyRecord = hotelOccupancyData.find(o => o.month === costRecord.month);
            if (occupancyRecord && occupancyRecord.total_sold_rooms > 0) {
                const costPerOccupiedRoom = costRecord.cost / occupancyRecord.total_sold_rooms;
                const occupancyPercentage = parseFloat(occupancyRecord.occupancy_percentage);
                
                combinedData.push([
                    occupancyPercentage, // X-axis: Occupancy Percentage
                    costPerOccupiedRoom, // Y-axis: Cost per Occupied Room
                    costRecord.month,    // For tooltip
                    costRecord.cost,     // For tooltip
                    occupancyRecord.total_sold_rooms // For tooltip
                ]);
            }
        });

        if (combinedData.length > 0) {
            hotelSeries.push({
                name: hotel.hotel_name,
                type: 'scatter',
                data: combinedData,
                symbolSize: 8,
                itemStyle: {
                    color: hotelColors[index % hotelColors.length],
                    opacity: 0.7
                }
            });
        }
    });

    return {
        grid: {
            top: 60,
            left: 80,
            right: 40,
            bottom: 60
        },
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                const [occupancy, costPerRoom, month, totalCost, soldRooms] = params.data;
                return `
                    <strong>${params.seriesName}</strong><br/>
                    ${month}<br/>
                    稼働率: ${occupancy.toFixed(1)}%<br/>
                    客室単価コスト: ${formatCurrency(costPerRoom)}<br/>
                    総コスト: ${formatCurrency(totalCost)}<br/>
                    販売客室数: ${soldRooms}室
                `;
            }
        },
        legend: {
            data: hotelSeries.map(s => s.name),
            top: 10,
            textStyle: { fontSize: 10 }
        },
        xAxis: {
            name: '稼働率 (%)',
            nameLocation: 'middle',
            nameGap: 35,
            type: 'value',
            min: 0,
            max: 100,
            splitLine: { 
                lineStyle: { type: 'dashed', color: 'rgba(148, 163, 184, 0.1)' } 
            },
            axisLabel: { 
                formatter: (v) => v + '%' 
            }
        },
        yAxis: {
            name: '客室単価コスト (円)',
            nameLocation: 'middle',
            nameGap: 60,
            type: 'value',
            splitLine: { 
                lineStyle: { type: 'dashed', color: 'rgba(148, 163, 184, 0.1)' } 
            },
            axisLabel: { 
                formatter: (v) => formatCurrency(v, false) 
            }
        },
        series: hotelSeries
    };
};

const formatCurrency = (value, withSymbol = true) => {
    if (withSymbol) {
        return new Intl.NumberFormat('ja-JP', { 
            style: 'currency', 
            currency: 'JPY', 
            maximumFractionDigits: 0 
        }).format(value);
    } else {
        return new Intl.NumberFormat('ja-JP', { 
            maximumFractionDigits: 0 
        }).format(value);
    }
};
</script>