<template>
    <Card>
        <template #title>
            <span>所属グループ情報</span>
        </template>        
        <template #content>
            <div v-if="selectedGroup">
                <div class="grid grid-cols-12">
                    <div class="col-span-4 mx-2 mt-6">
                        <FloatLabel>
                            <InputText v-model="data.name" fluid></InputText>
                            <label>グループ名</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-6 mx-2 mt-6">
                        <FloatLabel>
                            <Textarea v-model="data.comment" fluid></Textarea>
                            <label>グループ備考</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-2 mx-2 mt-6">
                        <div class="flex justify-center mx-6">
                        <Button 
                            @click="editGroup(data.id)"
                            severity="info"
                            class="p-button-sm"                            
                            fluid
                        >保存</Button>
                        </div>
                    </div>
                </div>

                <DataTable
                    :value="selectedGroup"
                >
                    <Column field="id" header="操作">
                        <template #body="slotProps">
                            <Button 
                                @click="goToEditClientPage(slotProps.data.id)"
                                severity="info"
                                class="p-button-rounded p-button-text p-button-sm"
                            >
                                <i class="pi pi-pencil"></i>
                            </Button>
                        </template>
                    </Column>
                    <Column header="氏名・名称" field="display_name"></Column>                    
                    <Column header="カナ" field="name_kana"></Column>
                    <Column field="legal_or_natural_person" header="法人 / 個人">
                        <template #body="slotProps">
                            <span v-if="slotProps.data.is_legal_person">                                    
                                <Tag icon="pi pi-building" severity="secondary" value="法人"></Tag>
                            </span>
                            <span v-else>
                                <Tag icon="pi pi-user" severity="info" value="個人"></Tag>
                            </span>                                
                        </template>                                                       
                    </Column>
                    <Column header="電話番号" field="phone"></Column>
                    <Column header="メールアドレス" field="email"></Column>
                </DataTable>
            </div>
            
        </template>
    </Card>

    
</template>
<script setup>
    // Vue
    import { ref, onMounted } from 'vue';
    import { useRoute, useRouter } from 'vue-router';
    const route = useRoute();
    const router = useRouter();

    // Stores
    import { useClientStore } from '@/composables/useClientStore';    
    const { selectedGroup, fetchGroup, updateGroup} = useClientStore();

    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { Card, FloatLabel, InputText, Textarea, Button, DataTable, Column, Tag } from 'primevue';

    const groupId = ref(route.params.groupId);
    const loadingBasicInfo = ref(false);
    const data = ref({
            id: null,
            name: '',
            comment: ''
    });
    const editGroup = async (gid) => {
        // Update group basic info        
        await updateGroup(gid, data.value);

        await fetchGroup(gid);
        toast.add({ severity: 'success', summary: 'Success', detail: 'グループ情報が編集されました。', life: 3000 });
    };
    const goToEditClientPage = (clientId) => {        
        router.push({ name: 'ClientEdit', params: { clientId: clientId } });
    };

    onMounted(async () => {
        loadingBasicInfo.value = true;
        await fetchGroup(groupId.value);
                
        data.value.id = selectedGroup.value[0].client_group_id;
        data.value.name = selectedGroup.value[0].group_name;
        data.value.comment = selectedGroup.value[0].group_comment;
        
        loadingBasicInfo.value = false;
        
    });
    
</script>