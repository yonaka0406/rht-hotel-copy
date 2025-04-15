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
                    <Column header="Link to Room Type">
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
    import { Panel, Accordion, AccordionPanel, AccordionHeader, AccordionContent, Card, FloatLabel, InputText, Select, Button, DataTable, Column, Badge, Dialog } from 'primevue';

    // Master data
    const roomMaster = ref(null);
    const roomTypes = ref(null);
    const saveRoomMaster = async (data) => {
        // Filter out items with null netRmTypeGroupCode
        const filteredData = data.filter(item => item.netrmtypegroupcode != null);

        // Validation for duplicate
        const groupRoomTypeCheck = new Set();
        const roomTypeCheck = new Set();
        for (const item of filteredData) {
            const groupRoomTypeKey = `${item.netRmTypeGroupCode}-${item.room_type_id}`;
            const roomTypeKey = `${item.room_type_id}`;
            if (groupRoomTypeCheck.has(groupRoomTypeKey)) {
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: `ネット室タイプグループとPMSの部屋タイプ重複されています。`,
                life: 5000,
            });
            return;
            }

            if (roomTypeCheck.has(roomTypeKey)) {
                toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: `PMSの部屋タイプ重複されています。`,
                life: 5000,
                });
                return;
            }

            groupRoomTypeCheck.add(groupRoomTypeKey);
            roomTypeCheck.add(roomTypeKey);
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


        const rooms = [];
        
        console.log('netRmTypeGroupList', netRmTypeGroupList);        
        const processGroup = (group) => {            
            return {
                netrmtypegroupcode: group.netRmTypeGroupCode,
                netrmtypegroupname: group.netRmTypeGroupName,
                rmtypecode: group.rmTypeCode
            };
        };
        if (Array.isArray(netRmTypeGroupList)) {
            netRmTypeGroupList.forEach((group) => rooms.push(processGroup(group)));
        } else if (netRmTypeGroupList) {
            rooms.push(processGroup(netRmTypeGroupList));
        }

        console.log('rooms after processGroup', rooms);

        console.log('rmTypeList', rmTypeList);
        const processRoomType = (type, roomsArray) => {
            const room = roomsArray.find((r) => String(r.rmtypecode) === String(type.rmTypeCode));
            if (room) {
                room.hotel_id = props.hotel_id;
                room.rmtypename = type.rmTypeName;
            } else {
                console.warn('No match for type:', type.rmTypeCode, type.rmTypeName);
            }
        };        
        if (Array.isArray(rmTypeList)) {
            rmTypeList.forEach((type) => processRoomType(type, rooms));
        } else if (rmTypeList) {
            processRoomType(rmTypeList, rooms);
        }        

        console.log('rooms after processRoomType', rooms);

        console.log('netAgtRmTypeList', netAgtRmTypeList);
        const processAgtRoom = (agtRoom, roomsArray) => {
            const room = roomsArray.find((r) => r.rmtypecode === agtRoom.rmTypeCode && r.netrmtypegroupcode === agtRoom.netRmTypeGroupCode);
            if (room) {
                room.agtcode = agtRoom.agtCode;
                room.netagtrmtypecode = agtRoom.netAgtRmTypeCode;
                room.netagtrmtypename = agtRoom.netAgtRmTypeName;
                room.isstockadjustable = agtRoom.isStockAdjustable;
                room.lincolnuseflag = agtRoom.lincolnUseFlag;
            }
        };
        if (Array.isArray(netAgtRmTypeList)) {
            netAgtRmTypeList.forEach((agtRoom) => processAgtRoom(agtRoom, rooms));
        } else if (netAgtRmTypeList) {
            processAgtRoom(netAgtRmTypeList, rooms);
        }

        console.log('rooms after processAgtRoom', rooms);        

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

