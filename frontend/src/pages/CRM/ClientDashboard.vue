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
    import { ref, computed, onMounted, onBeforeUnmount } from "vue";

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
    const halfPieOption = ref(
        {
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
                    data: [
                        { value: clientsCount.value.legal, name: '法人' },
                        { value: clientsCount.value.natural, name: '個人' },                    
                    ]
                }
            ]
        }
    );

    const initHalfPie = () => {        
        myHalfPie = echarts.getInstanceByDom(halfPie.value);
        if (myHalfPie) {
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
        initHalfPie();
        
        window.addEventListener('resize', handleResize);
    });

    onBeforeUnmount(() => {
        window.removeEventListener('resize', handleResize);
    });
    
</script>
<style scoped>
</style>