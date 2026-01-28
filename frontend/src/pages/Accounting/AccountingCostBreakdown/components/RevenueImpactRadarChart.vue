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
    },
    selectedMonth: {
        type: String,
        default: null
    },
    latestMonth: {
        type: String,
        default: null
    }
});

/**
 * Calculate revenue impact for each hotel individually using consistent denominator
 */
const calculateHotelRevenueImpacts = computed(() => {
    if (!props.rawData?.timeSeries?.length || !props.analyticsSummary?.length) return [];

    // Calculate total accumulated revenue up to selected date (same denominator for all)
    const selectedDate = props.selectedMonth ? new Date(props.selectedMonth) : (props.latestMonth ? new Date(props.latestMonth) : new Date());
    const allRevenueDataUpToDate = props.rawData.timeSeries.filter(d => new Date(d.month) <= selectedDate);
    
    const hotelImpacts = [];
    
    // Get unique hotels from mapped hotels
    const uniqueHotels = props.mappedHotels || [];
    
    uniqueHotels.forEach(hotel => {
        const hotelData = {
            hotelId: hotel.hotel_id,
            hotelName: hotel.hotel_name,
            impacts: []
        };

        // Calculate total accumulated revenue for this hotel up to selected date
        const hotelTotalRevenue = allRevenueDataUpToDate
            .filter(d => d.hotel_id === hotel.hotel_id)
            .reduce((sum, d) => sum + Number(d.sales), 0);

        props.analyticsSummary.forEach(account => {
            // Get ALL lifetime data for this hotel and account (no time filtering)
            const accountData = props.rawData.timeSeries.filter(d => 
                d.account_code === account.code && d.hotel_id === hotel.hotel_id
            );
            
            if (accountData.length > 0) {
                // Use total lifetime cost for this account at this hotel
                const totalCost = accountData.reduce((sum, d) => sum + Number(d.cost), 0);
                
                // Use the same denominator (total accumulated revenue for this hotel)
                const revenueImpact = hotelTotalRevenue > 0 ? (totalCost / hotelTotalRevenue) * 100 : 0;
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
    // Safely calculate the max value across all series for consistent scaling
    const allImpactValues = [
        ...props.analyticsSummary.map(i => i.revenueImpact),
        ...calculateHotelRevenueImpacts.value.flatMap(h => h.impacts)
    ].filter(v => Number.isFinite(v) && v > 0);

    const maxIndicatorValue = allImpactValues.length > 0 
        ? Math.max(...allImpactValues) * 1.2 
        : 5;

    const indicators = props.analyticsSummary.map(item => ({
        name: item.name,
        max: maxIndicatorValue
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
                let html = `<div class="font-bold mb-1">${params.name}</div>`;
                if (Array.isArray(params.value)) {
                    props.analyticsSummary.forEach((item, index) => {
                        const val = params.value[index];
                        const valStr = (typeof val === 'number') ? val.toFixed(1) : '0.0';
                        html += `<div>${item.name}: ${valStr}%</div>`;
                    });
                }
                return html;
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