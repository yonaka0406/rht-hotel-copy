<template>
    <div class="min-h-screen">
        <div class="grid grid-cols-12 gap-4">
            <Card class="flex col-span-6">
                <template #title>                    
                    <span>顧客データ割合</span>
                </template>
                <template #subtitle>                    
                    登録数：{{ clientsCount.total }}
                </template>
                <template #content>  
                    <div ref="halfPie" class="w-full h-40"></div>
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

    let myHalfPie;
    const halfPie = ref(null);

    const halfPieOption = computed(() => ({
        tooltip: {
            trigger: 'item',
            formatter: "{b}: {c} ({d}%)", // b = name, c = value, d = percentage
        },            
        series: [
            {
                name: '顧客データ割合',
                type: 'pie',
                radius: ['40%', '90%'],
                center: ['50%', '50%'],                
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

    const initHalfPie = () => {
        if (!halfPie.value || clients.value.length === 0) {
            // If DOM element isn't ready or no client data, don't proceed
            return; 
        }

        let currentChartInstance = echarts.getInstanceByDom(halfPie.value);
        if (currentChartInstance) {
            myHalfPie = currentChartInstance; // Ensure myHalfPie is assigned
            myHalfPie.setOption(halfPieOption.value);
        } else {
            myHalfPie = echarts.init(halfPie.value);
            myHalfPie.setOption(halfPieOption.value);
        }
    };

    const handleResize = () => {
        if (myHalfPie) {
            myHalfPie.resize();
        }
    };  

    onMounted(async () => {
        await nextTick(); // Wait for DOM updates
        initHalfPie(); 
        window.addEventListener('resize', handleResize);
    });

    watch(clientsCount, async (newCounts) => {
        if (newCounts.total > 0) { // Only attempt to update if there's actual data
            await nextTick(); // Wait for DOM updates
            initHalfPie();
        }
        // If total is 0, initHalfPie will be guarded by clients.value.length === 0 anyway
    }, { deep: true }); // immediate: false is default, so not explicitly set.

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
    });
    
</script>
<style scoped>
</style>