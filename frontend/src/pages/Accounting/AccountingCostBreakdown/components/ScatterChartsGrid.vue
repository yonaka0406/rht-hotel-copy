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
import { formatMonth } from '@/utils/formatUtils';

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
    
    console.log(`\n=== SCATTER CHART ANALYSIS: ${account.name} (${account.code}) ===`);
    console.log('Account Cost Data Records:', accountData.length);
    console.log('Occupancy Data Records:', occupancyData.length);
    
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

    console.log('Hotels to Analyze:', hotelsToAnalyze.map(h => `${h.hotel_name} (ID: ${h.hotel_id})`));
    console.log('Selected Hotel ID:', props.selectedHotelId);

    hotelsToAnalyze.forEach((hotel, index) => {
        const hotelAccountData = accountData.filter(d => d.hotel_id === hotel.hotel_id);
        const hotelOccupancyData = occupancyData.filter(d => d.hotel_id === hotel.hotel_id);
        
        console.log(`\n--- Hotel: ${hotel.hotel_name} (ID: ${hotel.hotel_id}) ---`);
        console.log('  Cost Data Records:', hotelAccountData.length);
        console.log('  Occupancy Data Records:', hotelOccupancyData.length);
        
        // Debug: Show the actual months in each dataset
        console.log('  Cost Data Months:', hotelAccountData.map(d => d.month).sort());
        console.log('  Occupancy Data Months:', hotelOccupancyData.map(d => d.month).sort());
        
        // Debug: Show sample records from each dataset
        if (hotelAccountData.length > 0) {
            console.log('  Sample Cost Record:', hotelAccountData[0]);
        }
        if (hotelOccupancyData.length > 0) {
            console.log('  Sample Occupancy Record:', hotelOccupancyData[0]);
        }
        
        // Combine cost and occupancy data by month
        const combinedData = [];
        let zeroOccupancyCount = 0;
        let noMatchCount = 0;
        
        hotelAccountData.forEach(costRecord => {
            const occupancyRecord = hotelOccupancyData.find(o => o.month === costRecord.month);
            
            console.log(`  Checking month ${costRecord.month}:`);
            console.log(`    Cost Record: ¥${Number(costRecord.cost).toLocaleString()}`);
            console.log(`    Occupancy Record Found: ${occupancyRecord ? 'YES' : 'NO'}`);
            
            if (occupancyRecord) {
                console.log(`    Occupancy Details: ${occupancyRecord.occupancy_percentage}%, Sold Rooms: ${occupancyRecord.total_sold_rooms}, Available Rooms: ${occupancyRecord.total_available_rooms}`);
                
                if (occupancyRecord.total_sold_rooms > 0) {
                    const costPerOccupiedRoom = costRecord.cost / occupancyRecord.total_sold_rooms;
                    const occupancyPercentage = parseFloat(occupancyRecord.occupancy_percentage);
                    
                    console.log(`    ✓ MATCH: Occupancy ${occupancyPercentage.toFixed(1)}%, Cost/Room ¥${costPerOccupiedRoom.toLocaleString()}, Total Cost ¥${Number(costRecord.cost).toLocaleString()}, Sold Rooms ${occupancyRecord.total_sold_rooms}`);
                    
                    combinedData.push([
                        occupancyPercentage, // X-axis: Occupancy Percentage
                        costPerOccupiedRoom, // Y-axis: Cost per Occupied Room
                        costRecord.month,    // For tooltip
                        costRecord.cost,     // For tooltip
                        occupancyRecord.total_sold_rooms // For tooltip
                    ]);
                } else {
                    zeroOccupancyCount++;
                    console.log(`    ✗ SKIP: No sold rooms (${occupancyRecord.total_sold_rooms}) - Hotel may be closed/under construction`);
                }
            } else {
                noMatchCount++;
                console.log(`    ✗ SKIP: No matching occupancy record for month ${costRecord.month}`);
            }
        });
        
        // Summary for this hotel
        console.log(`  SUMMARY: ${combinedData.length} data points, ${zeroOccupancyCount} zero-occupancy months, ${noMatchCount} unmatched months`);

        console.log(`  Combined Data Points: ${combinedData.length}`);
        
        if (combinedData.length > 0) {
            const avgOccupancy = combinedData.reduce((sum, d) => sum + d[0], 0) / combinedData.length;
            const avgCostPerRoom = combinedData.reduce((sum, d) => sum + d[1], 0) / combinedData.length;
            console.log(`  Average Occupancy: ${avgOccupancy.toFixed(1)}%`);
            console.log(`  Average Cost per Room: ¥${avgCostPerRoom.toLocaleString()}`);
            
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
        } else {
            console.log(`  No matching data points for ${hotel.hotel_name}`);
            console.log(`  → This hotel may have been closed, under construction, or had data quality issues during the cost periods`);
        }
    });

    console.log(`\nTotal Series Created: ${hotelSeries.length}`);
    console.log('=== END SCATTER CHART ANALYSIS ===\n');

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
                    ${formatMonth(month)}<br/>
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