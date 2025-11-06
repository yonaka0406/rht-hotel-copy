<template>
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div class="grid grid-cols-12 gap-4">
            <Card class="flex col-span-6 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                <template #title>                    
                    <span>顧客データ割合</span>
                </template>
                <template #subtitle>                    
                    登録数：{{ formatNumberWithCommas(clientsCount.total) }}
                </template>
                <template #content>  
                    <div ref="halfPie" class="w-full h-56"></div>
                </template>
            </Card>
            <Card class="flex col-span-6 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                <template #title>
                    <span>顧客ロイヤリティ階層</span>
                </template>
                <template #subtitle>
                    <span>総顧客数：{{ formatNumberWithCommas(loyaltyClientsCount) }}</span>
                </template>
                <template #content>
                    <div ref="loyaltyTierChartRef" class="w-full h-56"></div>
                </template>
            </Card>
            <!--
            <Card class="flex col-span-6">
                <template #title>
                    <p>CARD</p>
                </template>
                <template #subtitle>                    
                </template>
                <template #content>                    
                </template>
            </Card>
            <Card class="flex col-span-12">
                <template #title>
                    <p>CARD</p>
                </template>
                <template #subtitle>                    
                </template>
                <template #content>                    
                </template>
            </Card>            
            -->
        </div>
    </div>
</template>
  
<script setup>
    // Vue
    import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue";

    // Primevue
    import { Card } from 'primevue';

    // Stores
    import { useClientStore } from '@/composables/useClientStore';
    const { clients } = useClientStore();

    // Counts    
    const clientsCount = computed(() => {
        const total = clients.value.length;
        const natural = clients.value.filter(client => client.legal_or_natural_person === "natural").length;
        const legal = clients.value.filter(client => client.legal_or_natural_person === "legal").length;

        return { 
            total, 
            natural, 
            legal,
            naturalPercentage: ((natural / total) * 100).toFixed(1),
            legalPercentage: ((legal / total) * 100).toFixed(1),
        };
    });

    const loyaltyClientsCount = computed(() => {
        return clients.value.filter(client => client.loyalty_tier && client.loyalty_tier !== 'N/A').length;
    });

    const loyaltyTierDistribution = computed(() => {
        const distribution = clients.value.reduce((acc, client) => {
            if (client.loyalty_tier && client.loyalty_tier !== 'N/A') {
                const tier = client.loyalty_tier;
                if (!acc[tier]) {
                    acc[tier] = {
                        name: getTierDisplayName(tier),
                        value: 0,
                        severity: getTierSeverity(tier),
                    };
                }
                acc[tier].value++;
            }
            return acc;
        }, {});
        return Object.values(distribution);
    });
  
    // eCharts
    import * as echarts from 'echarts/core';
    import { TooltipComponent, LegendComponent } from 'echarts/components';
    import { PieChart } from 'echarts/charts';
    import { LabelLayout } from 'echarts/features';
    import { CanvasRenderer } from 'echarts/renderers';
    echarts.use([
        TooltipComponent,
        LegendComponent,
        PieChart,
        CanvasRenderer,
        LabelLayout
    ]);

    // --- Dark mode detection ---
    const isDark = ref(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    let darkMediaQuery;

    const updateIsDark = () => {
        isDark.value = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    };

    onMounted(() => {
        darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (darkMediaQuery.addEventListener) {
            darkMediaQuery.addEventListener('change', updateIsDark);
        } else if (darkMediaQuery.addListener) {
            darkMediaQuery.addListener(updateIsDark);
        }
    });
    onBeforeUnmount(() => {
        if (darkMediaQuery) {
            if (darkMediaQuery.removeEventListener) {
                darkMediaQuery.removeEventListener('change', updateIsDark);
            } else if (darkMediaQuery.removeListener) {
                darkMediaQuery.removeListener(updateIsDark);
            }
        }
    });

    // --- Chart initialization with dark mode ---
    let myHalfPie;
    const halfPie = ref(null);
    let loyaltyTierChartInstance;
    const loyaltyTierChartRef = ref(null);

    const initHalfPie = () => {
        if (!halfPie.value || clients.value.length === 0) {
            return;
        }
        let currentChartInstance = echarts.getInstanceByDom(halfPie.value);
        if (currentChartInstance) {
            myHalfPie = currentChartInstance;
            myHalfPie.setOption(halfPieOption.value);
        } else {
            myHalfPie = echarts.init(halfPie.value, isDark.value ? 'dark' : undefined);
            myHalfPie.setOption(halfPieOption.value);
        }
    };

    const initLoyaltyTierChart = () => {
        if (!loyaltyTierChartRef.value || loyaltyClientsCount.value === 0) {
            return;
        }
        let currentChartInstance = echarts.getInstanceByDom(loyaltyTierChartRef.value);
        if (currentChartInstance) {
            loyaltyTierChartInstance = currentChartInstance;
        } else {
            loyaltyTierChartInstance = echarts.init(loyaltyTierChartRef.value, isDark.value ? 'dark' : undefined);
        }
        loyaltyTierChartInstance.setOption(loyaltyTierChartOption.value);
    };

    // Watch for dark mode changes and update charts
    watch(isDark, () => {
        // Dispose and re-init charts with new theme
        if (myHalfPie && myHalfPie.dispose) myHalfPie.dispose();
        if (loyaltyTierChartInstance && loyaltyTierChartInstance.dispose) loyaltyTierChartInstance.dispose();
        nextTick(() => {
            initHalfPie();
            initLoyaltyTierChart();
        });
    });

    const cardDarkBg = '#1f2937'; // Tailwind gray-800
    const cardLightBg = '#fff';

    const halfPieOption = computed(() => ({
        backgroundColor: isDark.value ? cardDarkBg : cardLightBg,
        tooltip: {
            trigger: 'item',
            formatter: "{b}: {c} ({d}%)", // b = name, c = value, d = percentage
        },            
        series: [
            {
                name: '顧客データ割合',
                type: 'pie',
                radius: ['40%', '90%'],
                center: ['50%', '85%'],                
                startAngle: 180,            
                endAngle: 360,
                label: {
                    show: true,
                    formatter: "{b}: {d}%",
                },
                // Ensure data is valid, provide defaults if necessary
                data: [
                    { value: clientsCount.value.legal || 0, name: '法人' },
                    { value: clientsCount.value.natural || 0, name: '個人' },
                ]
            }
        ]
    }));

    const loyaltyTierChartOption = computed(() => ({
        backgroundColor: isDark.value ? cardDarkBg : cardLightBg,
        tooltip: {
            trigger: 'item',
            formatter: "{b}: {c} ({d}%)",
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            data: loyaltyTierDistribution.value.map(item => item.name),
        },
        series: [
            {
                name: 'ロイヤリティ階層',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['65%', '50%'], // Adjusted center to accommodate legend
                data: loyaltyTierDistribution.value,
                label: {
                    show: true,
                    formatter: "{b}: {d}%",
                },
            },
        ],
    }));

    const handleResize = () => {
        if (myHalfPie) {
            myHalfPie.resize();
        }
    };  

    const handleLoyaltyTierResize = () => {
        if (loyaltyTierChartInstance) {
            loyaltyTierChartInstance.resize();
        }
    };

    const getTierDisplayName = (tier) => {
        if (!tier) return 'N/A'; // Or perhaps '未分類' (Uncategorized) or '該当なし' (Not Applicable)
        switch (tier) { // tier is already lowercase
            case 'prospect': return '潜在顧客';
            case 'newbie': return '新規顧客'; // New Customer
            case 'repeater': return 'リピーター'; // Repeater
            case 'hotel_loyal': return 'ホテルロイヤル'; // Hotel Loyal
            case 'brand_loyal': return 'ブランドロイヤル'; // Brand Loyal
            default: return tier; // Fallback, should not happen with current tiers
        }
    };

    const getTierSeverity = (tier) => {
        if (!tier) return 'info';
        switch (tier) {
            case 'prospect': return 'secondary';
            case 'newbie': return 'info';
            case 'repeater': return 'success';
            case 'hotel_loyal': return 'warning';
            case 'brand_loyal': return 'danger';
            default: return 'secondary';
        }
    };

    const formatNumberWithCommas = (number) => {
        return new Intl.NumberFormat('ja-JP').format(number);
    };

    onMounted(async () => {
        await nextTick(); // Wait for DOM updates
        initHalfPie(); 
        initLoyaltyTierChart();
        window.addEventListener('resize', handleResize);
        window.addEventListener('resize', handleLoyaltyTierResize);
    });

    watch(clientsCount, async (newCounts) => {
        if (newCounts.total > 0) { // Only attempt to update if there's actual data
            await nextTick(); // Wait for DOM updates
            initHalfPie();
        }
        // If total is 0, initHalfPie will be guarded by clients.value.length === 0 anyway
    }, { deep: true });

    watch(clients, async () => {
        await nextTick();
        initLoyaltyTierChart();
    }, { deep: true });

/*
Future Dashboard Enhancements Suggestions:

Overall Client Metrics:
- Total Active Clients: Display the number of clients considered "active" based on recent interactions or status.
- New Client Acquisition Rate: A line chart showing new clients added per month/quarter.
- Client Churn/Retention Rate: Metrics on client attrition or retention over time (requires tracking client status changes).

Client Segmentation (if more data fields become available):
- Distribution by Industry/Category: If clients can be categorized by industry.
- Distribution by Client Rank/Tier: E.g., VIP, Regular, New, if such a system exists.
- Distribution by Geographic Location: E.g., clients by prefecture or city.

Activity/Engagement Metrics (consider if these require more data than available in useClientStore().clients directly):
- Average Stay: (User Suggested) Could be relevant if clients are, for example, guests in a hotel context. Would likely require linking to reservation data.
- Distribution by Times Used/Service Consumption: (User Suggested) How frequently clients use services. Would likely require linking to usage or transactional data.
- Total Interactions This Period: Aggregate count of calls, emails, meetings for the current month/quarter.
- Most Active CRM Users: Top users logging interactions.
- Clients Without Recent Contact: Identify clients who haven't been contacted in X days.

Sales Pipeline Overview (if a separate sales pipeline module/data exists):
- Sales Funnel: Chart showing stages (Lead > Qualified > Proposal > Closed).

Remember to evaluate data availability and API capabilities when planning these.
Some of these metrics might require fetching and processing additional data beyond the basic client list.
*/

    onBeforeUnmount(() => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('resize', handleLoyaltyTierResize);
    });
    
</script>
<style scoped>
</style>