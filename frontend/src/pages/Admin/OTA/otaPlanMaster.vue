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
                    <Column field="rmtypename">
                        <template #header>{{ fetchFieldName('rmTypeName') }}</template>
                    </Column>                    
                    <Column field="netrmtypegroupname">
                        <template #header>{{ fetchFieldName('netRmTypeGroupName') }}</template>
                    </Column>                                        
                    <Column field="netagtrmtypename">
                        <template #header>{{ fetchFieldName('netAgtRmTypeName') }}</template>
                    </Column>                    
                    <Column header="PMS部屋タイプ紐づけ">
                        <template #body="slotProps">
                            <Select
                                v-model="slotProps.data.room_type_id" 
                                :options="roomTypes"
                                optionLabel="name" 
                                optionValue="id" 
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
        // Filter out items with null netRmTypeGroupCode
        const filteredData = data.filter(item => item.netrmtypegroupcode != null);

        console.log('savePlanMaster', filteredData);

        return;

        const groupToRoomMap = new Map();
        const roomToGroupMap = new Map();

        for (const item of filteredData) {
            const groupCode = item.netrmtypegroupcode;
            const roomTypeId = item.room_type_id;

            // Check: netrmtypegroupcode must only map to ONE room_type_id
            if (groupToRoomMap.has(groupCode)) {
                const existingRoomType = groupToRoomMap.get(groupCode);
                if (existingRoomType !== roomTypeId) {
                    toast.add({
                        severity: 'error',
                        summary: 'エラー',
                        detail: `ネット室タイプグループに複数のPMS部屋タイプが割り当てられています。`,
                        life: 5000,
                    });
                    return;
                }
            } else {
                groupToRoomMap.set(groupCode, roomTypeId);
            }

            // Check: room_type_id must only map to ONE netrmtypegroupcode
            if (roomToGroupMap.has(roomTypeId)) {
                const existingGroupCode = roomToGroupMap.get(roomTypeId);
                if (existingGroupCode !== groupCode) {
                    toast.add({
                        severity: 'error',
                        summary: 'エラー',
                        detail: `PMS部屋タイプが複数のネット室タイプグループに割り当てられています。`,
                        life: 5000,
                    });
                    return;
                }
            } else {
                roomToGroupMap.set(roomTypeId, groupCode);
            }
        }
       
        try {
            await insertTLPlanMaster(filteredData);
            toast.add({severity: 'success', summary: '成功', detail: 'ネット室マスター保存されました。', life: 3000});
        } catch (error) {
            console.error('Failed to save plan master:', error);
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to save plan master',
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
                    plan.room_type_id = matchingTLRoom.room_type_id;
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
                    plangroupname: getTypeName(item.planGroupName),                                        
                });
            });
        }

        return plans;
    };
         

    onMounted(async () => {
        await fetchTLPlanMaster(props.hotel_id);
        planMaster.value = tlPlanMaster.value;

        roomTypes.value = await fetchPlansForHotel(props.hotel_id);        
        
        console.log('onMounted planMaster', planMaster.value);
        console.log('onMounted plans', plans.value);
        
        
    });

</script>

