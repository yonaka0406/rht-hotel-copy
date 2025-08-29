<template>
    <div class="p-4">
        <Card>
            <template #header>
                <div class="flex justify-end mt-4 mr-4">
                    <Button label="最新情報を取得" @click="fetchTemplate()" />
                </div>
            </template>
            <template #content>
                <DataTable :value="planMaster">                    
                    <Column field="plangroupcode" header="プラングループコード"></Column>
                    <Column field="plangroupname" header="プラングループ名"></Column>
                    <Column header="PMSプラン紐づけ">
                        <template #body="slotProps">
                            <Select
                                v-model="slotProps.data.plan_key" 
                                :options="plans"
                                optionLabel="name" 
                                optionValue="plan_key" 
                            >                            
                            </Select>
                        </template>                        
                    </Column>                    
                </DataTable>
                <div class="mt-4">
                    <Button label="保存" severity="info" @click="savePlanMaster(planMaster)" />
                </div>
                
            </template>
            
        </Card>
    </div>
</template>
<script setup>
    // Vue
    import { ref, onMounted } from 'vue';

    const props = defineProps({        
        hotel_id: {
            type: [Number],
            required: true,
        },
    });

    // Stores
    import { useXMLStore } from '@/composables/useXMLStore';
    const { template, tlPlanMaster, fetchServiceName, fetchFieldName, fetchXMLTemplate, insertXMLResponse, fetchTLPlanMaster, insertTLPlanMaster } = useXMLStore();
    import { usePlansStore } from '@/composables/usePlansStore';
    const { plans, fetchPlansForHotel } = usePlansStore();
    
    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { Card, Select, Button, DataTable, Column } from 'primevue';

    // Master data
    const planMaster = ref(null);
    const roomTypes = ref(null);
    const savePlanMaster = async (data) => {
        // Filter out items with not int planGroupCode        
        const filteredData = data.filter(item => Number.isInteger(item.plangroupcode * 1));
                
        const updatedFilteredData = filteredData.map(item => {
            const matchingPlan = plans.value.find(plan => plan.plan_key === item.plan_key);

            return {
                ...item,
                plans_global_id: matchingPlan?.plans_global_id || null,
                plans_hotel_id: matchingPlan?.plans_hotel_id || null,
                plan_key: matchingPlan?.plan_key || item.plan_key || null, // keep original if not found
            };
        });
        
        try {
            await insertTLPlanMaster(updatedFilteredData);
            toast.add({severity: 'success', summary: '成功', detail: 'プランマスター保存されました。', life: 3000});
        } catch (error) {
            console.error('プランマスターの保存失敗:', error);
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: 'プランマスターの保存に失敗しました',
                life: 3000,
            });
        }
    };

    // Template    
    const templateName = 'NetPlanMasterSearchR2Service';
    const extractionProcedureCode = 0;
    const modifiedTemplate = ref(null);
    const fetchTemplate = async () => {
        await fetchXMLTemplate(props.hotel_id, templateName);
        modifiedTemplate.value = template.value.replace(
            `{{extractionProcedureCode}}`,
            extractionProcedureCode
        );

        const xmlResponse = await insertXMLResponse(props.hotel_id, templateName, modifiedTemplate.value);
        planMaster.value = parseXmlResponse(xmlResponse.data);

        if (tlPlanMaster.value && planMaster.value) {
            planMaster.value.forEach((plan) => {
                const matchingTLPlan = tlPlanMaster.value.find(
                    (tlPlan) => tlPlan.rmtypecode === plan.rmtypecode && tlPlan.netrmtypegroupcode === plan.netrmtypegroupcode
                );
                if (matchingTLPlan) {
                    plan.room_type_id = matchingTLPlan.room_type_id;
                }
            });            
        }
    };
    const parseXmlResponse = (data) => {
        const returnData = data['S:Envelope']['S:Body']['ns2:executeResponse']['return'];

        const planGroupList = returnData.planGroupList;        
        const planList = returnData.planList;
        
        const plans = [];
        
        if (Array.isArray(planGroupList)) {
            planGroupList.forEach((item) => {
                plans.push({
                    hotel_id: props.hotel_id,
                    plangroupcode: item.planGroupCode,
                    plangroupname: item.planGroupName,
                });
            });
        }

        return plans;
    };
         

    onMounted(async () => {
        await fetchTLPlanMaster(props.hotel_id);
        planMaster.value = tlPlanMaster.value;

        roomTypes.value = await fetchPlansForHotel(props.hotel_id);        
        
        console.log('onMounted プランマスター', planMaster.value);
        console.log('onMounted プラン', plans.value);
        
        
    });

</script>
