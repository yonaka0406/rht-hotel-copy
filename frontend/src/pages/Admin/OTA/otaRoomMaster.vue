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
                    <Column field="rmTypeCode">
                        <template #header>{{ fetchFieldName('rmTypeCode') }}</template>
                    </Column>
                    <Column field="rmTypeName">
                        <template #header>{{ fetchFieldName('rmTypeName') }}</template>
                    </Column>
                    <Column field="netRmTypeGroupCode">
                        <template #header>{{ fetchFieldName('netRmTypeGroupCode') }}</template>
                    </Column>
                    <Column field="netRmTypeGroupName">
                        <template #header>{{ fetchFieldName('netRmTypeGroupName') }}</template>
                    </Column>
                    <Column field="agtCode">
                        <template #header>{{ fetchFieldName('agtCode') }}</template>
                    </Column>
                    <Column field="netAgtRmTypeCode">
                        <template #header>{{ fetchFieldName('netAgtRmTypeCode') }}</template>
                    </Column>
                    <Column field="netAgtRmTypeName">
                        <template #header>{{ fetchFieldName('netAgtRmTypeName') }}</template>
                    </Column>                    
                    <Column header="Link to Room Type">
                        <template #default="slotProps">
                        <Select v-model="slotProps.data.room_type_id">
                            <option v-for="type in roomTypes" :key="type.id" :value="type.id">
                            {{ type.name }}
                            </option>
                        </Select>
                        </template>
                    </Column>                    
                </DataTable>
            </template>
            <Button label="保存" severity="info" @click="saveRoom(roomMaster)" />
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
    const { template, fetchServiceName, fetchFieldName, fetchXMLTemplate, insertXMLResponse, fetchTLRoomMaster, insertTLRoomMaster } = useXMLStore();

    // Primevue
    import { Panel, Accordion, AccordionPanel, AccordionHeader, AccordionContent, Card, FloatLabel, InputText, Select, Button, DataTable, Column, Badge, Dialog } from 'primevue';

    // Master data
    const roomMaster = ref(null);

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
        
        if (!roomMaster.value) {
            console.log('roomMaster is empty');
            const xmlResponse = await insertXMLResponse(props.hotel_id, templateName, modifiedTemplate.value);
            console.log('xmlResponse', xmlResponse.data);
            roomMaster.value = parseXmlResponse(xmlResponse.data);
            console.log('fetchTemplate roomMaster', roomMaster.value)
        }
    };
    const parseXmlResponse = (data) => {
        const returnData = data['S:Envelope']['S:Body']['ns2:executeResponse']['return'];

        const rmTypeList = returnData.rmTypeList;
        const netRmTypeGroupList = returnData.netRmTypeGroupList;
        const netAgtRmTypeList = returnData.netAgtRmTypeList;

        const rooms = [];

        const processRoomType = (rmType) => ({
            rmTypeCode: rmType.rmTypeCode,
            rmTypeName: rmType.rmTypeName,
        });

        const processGroup = (group, roomsArray) => {
            const room = roomsArray.find((r) => r.rmTypeCode === group.rmTypeCode);
            if (room) {
            room.netRmTypeGroupCode = group.netRmTypeGroupCode;
            room.netRmTypeGroupName = group.netRmTypeGroupName;
            }
        };

        const processAgtRoom = (agtRoom, roomsArray) => {
            const room = roomsArray.find((r) => r.rmTypeCode === agtRoom.rmTypeCode);
            if (room) {
            room.agtCode = agtRoom.agtCode;
            room.netAgtRmTypeCode = agtRoom.netAgtRmTypeCode;
            room.netAgtRmTypeName = agtRoom.netAgtRmTypeName;
            room.isStockAdjustable = agtRoom.isStockAdjustable;
            room.lincolnUseFlag = agtRoom.lincolnUseFlag;
            }
        };

        if (Array.isArray(rmTypeList)) {
            rmTypeList.forEach((rmType) => rooms.push(processRoomType(rmType)));
        } else if (rmTypeList) {
            rooms.push(processRoomType(rmTypeList));
        }

        if (Array.isArray(netRmTypeGroupList)) {
            netRmTypeGroupList.forEach((group) => processGroup(group, rooms));
        } else if (netRmTypeGroupList) {
            processGroup(netRmTypeGroupList, rooms);
        }

        if (Array.isArray(netAgtRmTypeList)) {
            netAgtRmTypeList.forEach((agtRoom) => processAgtRoom(agtRoom, rooms));
        } else if (netAgtRmTypeList) {
            processAgtRoom(netAgtRmTypeList, rooms);
        }

        return rooms;
    };
         

    onMounted(async () => {
        roomMaster.value = await fetchTLRoomMaster(props.hotel_id);

        console.log('roomMaster', roomMaster.value)
    });

</script>

