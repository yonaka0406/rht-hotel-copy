<template>
    <div class="lg:col-span-12 xl:col-span-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl p-6 h-full flex flex-col">
        <div class="mb-4">
            <h2 class="text-lg font-black text-slate-800 dark:text-white">売上インパクト分析</h2>
            <p class="text-xs text-slate-400 mt-1">各経費科目の売上に対する影響度比較（全施設 vs 個別施設）</p>
        </div>
        <div class="flex-1 min-h-[400px]">
            <v-chart class="h-full w-full" :option="radarOption" autoresize />
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import VChart from 'vue-echarts';

const props = defineProps({
    analyticsSummary: {
        type: Array,
        required: true
    },
    rawData: {
        type: Object,
        required: true
    },
    mappedHotels: {
        type: Array,
        required: true
    }
});

/**
 * Calculate revenue impact for each hotel individually
 */
const calculateHotelRevenueImpacts = computed(() => {
    if (!props.rawData?.timeSeries?.length || !props.analyticsSummary?.length) return [];

    const hotelImpacts = [];
    
    // Get unique hotels from mapped hotels
    const uniqueHotels = props.mappedHotels || [];
    
    uniqueHotels.forEach(hotel => {
        const hotelData = {
            hotelId: hotel.hotel_id,
            hotelName: hotel.hotel_name,
            impacts: []
        };

        props.analyticsSummary.forEach(account => {
            // Get data for this hotel and account
            const accountData = props.rawData.timeSeries.filter(d => 
                d.account_code === account.code && d.hotel_id === hotel.hotel_id
            );
            
            if (accountData.length > 0) {
                const totalCost = accountData.reduce((sum, d) => sum + Number(d.cost), 0);
                const totalSales = accountData.reduce((sum, d) => sum + Number(d.sales), 0);
                const revenueImpact = totalSales > 0 ? (totalCost / totalSales) * 100 : 0;
                
                hotelData.impacts.push(revenueImpact);
            } else {
                hotelData.impacts.push(0);
            }
        });

        hotelImpacts.push(hotelData);
    });

    return hotelImpacts;
});

/**
 * Radar Chart configuration
 */
const radarOption = computed(() => {
    const indicators = props.analyticsSummary.map(item => ({
        name: item.name,
        // Max value should be slightly higher than the max revenue impact percentage across all series
        max: Math.max(
            Math.max(...props.analyticsSummary.map(i => i.revenueImpact)),
            ...calculateHotelRevenueImpacts.value.flatMap(h => h.impacts)
        ) * 1.2 || 5
    }));

    // Generate colors for hotels
    const hotelColors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
        '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
        '#8b5cf6', '#a855f7', '#c084fc', '#d946ef', '#ec4899', '#f43f5e',
        '#64748b', '#6b7280', '#78716c', '#a3a3a3', '#525252', '#404040',
        '#1f2937', '#111827', '#0f172a', '#020617'
    ];

    // Create series data
    const seriesData = [
        // All Hotels series (main one)
        {
            value: props.analyticsSummary.map(i => i.revenueImpact),
            name: '全施設平均',
            itemStyle: { color: '#8b5cf6' },
            areaStyle: { opacity: 0.3 },
            lineStyle: { width: 3 }
        }
    ];

    // Add individual hotel series
    calculateHotelRevenueImpacts.value.forEach((hotel, index) => {
        seriesData.push({
            value: hotel.impacts,
            name: hotel.hotelName,
            itemStyle: { color: hotelColors[index % hotelColors.length] },
            areaStyle: { opacity: 0.05 },
            lineStyle: { width: 1, type: 'dashed' }
        });
    });

    // Create legend data
    const legendData = ['全施設平均', ...calculateHotelRevenueImpacts.value.map(h => h.hotelName)];

    return {
        tooltip: {
            trigger: 'item',
            formatter: (params) => {
                const dataIndex = params.dataIndex;
                const item = props.analyticsSummary[dataIndex];
                return `${item.name}<br/>${params.seriesName}: ${params.value.toFixed(1)}%`;
            }
        },
        legend: {
            data: legendData,
            bottom: 0,
            textStyle: { color: '#94a3b8', fontSize: 10 },
            type: 'scroll',
            pageIconColor: '#94a3b8',
            pageIconInactiveColor: '#64748b',
            pageTextStyle: { color: '#94a3b8' }
        },
        radar: {
            indicator: indicators,
            shape: 'circle',
            splitNumber: 5,
            axisName: {
                color: '#64748b',
                fontWeight: 'bold',
                fontSize: 10
            },
            splitLine: {
                lineStyle: {
                    color: ['rgba(148, 163, 184, 0.1)']
                }
            },
            splitArea: {
                show: false
            },
            axisLine: {
                lineStyle: {
                    color: 'rgba(148, 163, 184, 0.2)'
                }
            }
        },
        series: [
            {
                name: '売上インパクト比較',
                type: 'radar',
                data: seriesData
            }
        ]
    };
});
</script>