<template>
    <div class="p-4">
        <Card>
            <template #header>
                <div class="flex justify-end mt-4 mr-4">
                    <Button label="最新情報を取得" @click="fetchTemplate()" />
                </div>
            </template>
            <template #content>
                <DataTable :value="roomMaster">                    
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
                    <Button label="保存" severity="info" @click="saveRoomMaster(roomMaster)" />
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
    const { template, tlRoomMaster, fetchServiceName, fetchFieldName, fetchXMLTemplate, insertXMLResponse, fetchTLRoomMaster, insertTLRoomMaster } = useXMLStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { fetchHotelRoomTypes } = useHotelStore();
    
    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { Card, Select, Button, DataTable, Column } from 'primevue';

    // Master data
    const roomMaster = ref(null);
    const roomTypes = ref(null);
    const saveRoomMaster = async (data) => {
        // Filter out items with null netRmTypeGroupCode
        const filteredData = data.filter(item => item.netrmtypegroupcode != null);

        console.log('saveRoomMaster', filteredData);

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
            await insertTLRoomMaster(filteredData);
            toast.add({severity: 'success', summary: '成功', detail: 'ネット室マスター保存されました。', life: 3000});
        } catch (error) {
            console.error('Failed to save room master:', error);
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to save room master',
                life: 3000,
            });
        }

    };

    // Template    
    const templateName = 'NetRoomTypeMasterSearchService';
    const extractionProcedureCode = 0;
    const modifiedTemplate = ref(null);
    const fetchTemplate = async () => {
        await fetchXMLTemplate(props.hotel_id, templateName);
        modifiedTemplate.value = template.value.replace(
            `{{extractionProcedureCode}}`,
            extractionProcedureCode
        );

        const xmlResponse = await insertXMLResponse(props.hotel_id, templateName, modifiedTemplate.value);
        roomMaster.value = parseXmlResponse(xmlResponse.data);

        if (tlRoomMaster.value && roomMaster.value) {
            roomMaster.value.forEach((room) => {
                const matchingTLRoom = tlRoomMaster.value.find(
                    (tlRoom) => tlRoom.rmtypecode === room.rmtypecode && tlRoom.netrmtypegroupcode === room.netrmtypegroupcode
                );
                if (matchingTLRoom) {
                    room.room_type_id = matchingTLRoom.room_type_id;
                }
            });            
        }
    };
    const parseXmlResponse = (data) => {
        const returnData = data['S:Envelope']['S:Body']['ns2:executeResponse']['return'];

        const rmTypeList = returnData.rmTypeList;
        const netRmTypeGroupList = returnData.netRmTypeGroupList;
        const netAgtRmTypeList = returnData.netAgtRmTypeList;

        // console.log('rmTypeList', rmTypeList);
        // console.log('netRmTypeGroupList', netRmTypeGroupList);
        // console.log('netAgtRmTypeList', netAgtRmTypeList);

        const getGroupName = (groupCode) => {
            const group = netRmTypeGroupList?.find((g) => g.netRmTypeGroupCode == groupCode);
            return group ? group.netRmTypeGroupName : undefined;
        };
        const getTypeName = (rmTypeCode) => {
            const type = rmTypeList?.find((t) => t.rmTypeCode == rmTypeCode);
            return type ? type.rmTypeName : undefined;
        };

        const rooms = [];
        
        if (Array.isArray(netAgtRmTypeList)) {
            netAgtRmTypeList.forEach((item) => {
                rooms.push({
                    hotel_id: props.hotel_id,
                    rmtypecode: item.rmTypeCode,
                    rmtypename: getTypeName(item.rmTypeCode),
                    netrmtypegroupcode: item.netRmTypeGroupCode,
                    netrmtypegroupname: getGroupName(item.netRmTypeGroupCode),
                    agtcode: item.agtCode,
                    netagtrmtypecode: item.netAgtRmTypeCode,
                    netagtrmtypename: item.netAgtRmTypeName,
                    isstockadjustable: item.isStockAdjustable,
                    lincolnuseflag: item.lincolnUseFlag,
                    
                });
            });
        }

        return rooms;
    };
         

    onMounted(async () => {        
        await fetchTLRoomMaster(props.hotel_id);
        roomTypes.value = await fetchHotelRoomTypes(props.hotel_id);        
        roomMaster.value = tlRoomMaster.value;
        console.log('onMounted roomMaster', roomMaster.value);
        console.log('onMounted roomTypes', roomTypes.value);
    });

</script>

