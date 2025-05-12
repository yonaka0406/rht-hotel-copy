<template>
    <div class="min-h-screen">
        <Card class="flex col-span-12">
            <template #title>
                所属グループ一覧
            </template>
            <template #content>
                <DataTable
                    v-model:filters="filters"
                    :value="groups"
                    dataKey="id"
                    filterDisplay="row"
                    :loading="groupsIsLoading"                    
                    tableStyle="min-width: 50rem"
                    stripedRows 
                    paginator 
                    :rows="10"
                    :rowsPerPageOptions="[5, 10, 25, 50]"
                    removableSort
                >
                    <template #empty> 所属グループ見つかりません </template>
                    <template v-if="groupsIsLoading">
                        <Skeleton class="mb-3" width="100%" height="3rem" />                                
                        <div class="grid grid-cols-6 gap-3 mb-3" v-for="i in 10":key="i"> 
                            <Skeleton width="100%" height="1.5rem" v-for="j in 6":key="j" /> 
                        </div> 
                    </template>
                    <template v-else>
                        <Column field="id" header="操作">
                            <template #body="slotProps">
                                <Button 
                                    @click="goToEditClientGroupPage(slotProps.data.id)"
                                    severity="info"
                                    class="p-button-rounded p-button-text p-button-sm"
                                >
                                    <i class="pi pi-pencil"></i>
                                </Button>
                            </template>
                        </Column>
                        <Column header="グループ名" filterField="name" sortable>
                            <template #body="{ data }">
                                {{ data.name }}
                            </template>
                            <template #filter="{ filterModel, filterCallback }">
                                <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="グループ名検索" />
                            </template>
                        </Column>
                        <Column header="メンバー数">
                            <template #body="{ data }">
                                <div class="flex justify-center">
                                    <Tag severity="secondary">{{ data.client_count }}</Tag>
                                </div>
                            </template>
                        </Column>
                        <Column header="備考" field="comment"></Column>
                    </template>
                </DataTable>
            </template>  
        </Card>
    </div>
</template>
<script setup>
    // Vue
    import { ref, onMounted } from "vue";
    import { useRouter } from 'vue-router';
    const router = useRouter();
    
    // Primevue
    import { Card, Skeleton, DataTable, Column, InputText, Button, Tag } from 'primevue';
    import { FilterMatchMode } from '@primevue/core/api';

    // Stores
    import { useClientStore } from '@/composables/useClientStore';
    const { groups, fetchClientGroups} = useClientStore();

    // Table
    const groupsIsLoading = ref(false);
    const filters = ref({        
        name: { value: null, matchMode: FilterMatchMode.CONTAINS },        
    });
    const goToEditClientGroupPage = (groupId) => {        
        router.push({ name: 'ClientGroupEdit', params: { groupId: groupId } });
    };

    onMounted( async () => {
        groupsIsLoading.value = true;
        fetchClientGroups();
        groupsIsLoading.value = false;
    });


</script>