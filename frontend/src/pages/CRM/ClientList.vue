<template>
    <div class="min-h-screen">
        <div class="grid grid-cols-12 gap-4">            
            <Card class="flex col-span-12">
                <template #title>
                    顧客一覧
                </template>                
                <template #content>                    
                    <div class="flex justify-end mb-6">
                        <SelectButton v-model="tableSize" :options="tableSizeOptions" 
                        optionLabel="label" dataKey="label" />
                    </div>
                    <DataTable
                        v-model:filters="filters"
                        :value="clients"
                        dataKey="id"
                        filterDisplay="row"
                        :loading="clientsIsLoading"
                        :size="tableSize.value"
                        tableStyle="min-width: 50rem"
                        stripedRows 
                        paginator 
                        :rows="10"
                        :rowsPerPageOptions="[5, 10, 25, 50]"
                        removableSort 
                    >
                    <template #empty> 顧客見つかりません </template>
                    <template v-if="clientsIsLoading">                            
                        <Skeleton class="mb-3" width="100%" height="3rem" />                                
                        <div class="grid grid-cols-6 gap-3 mb-3" v-for="i in 10":key="i"> 
                            <Skeleton width="100%" height="1.5rem" v-for="j in 6":key="j" /> 
                        </div>                            
                    </template>
                    <template v-else>
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
                        <Column header="氏名・名称" filterField="name" sortable>
                            <template #body="{ data }">
                                {{ data.name }}
                            </template>
                            <template #filter="{ filterModel, filterCallback }">
                                <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="氏名・名称検索" />
                            </template>
                        </Column>
                        <Column header="氏名・名称（漢字）" filterField="name_kanji" sortable>
                            <template #body="{ data }">
                                {{ data.name_kanji }}
                            </template>
                            <template #filter="{ filterModel, filterCallback }">
                                <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="氏名・名称（漢字）検索" />
                            </template>
                        </Column>
                        <Column header="氏名・名称（カナ）" filterField="name_kana" sortable>
                            <template #body="{ data }">
                                {{ data.name_kana }}
                            </template>
                            <template #filter="{ filterModel, filterCallback }">
                                <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="氏名・名称（カナ）検索" />
                            </template>
                        </Column>
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
                        <Column header="電話番号" filterField="phone">
                            <template #body="{ data }">
                                {{ data.phone }}
                            </template>
                            <template #filter="{ filterModel, filterCallback }">
                                <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="電話番号検索" />
                            </template>
                        </Column>                        
                        <Column header="メールアドレス" filterField="email" sortable>
                            <template #body="{ data }">
                                {{ data.email }}
                            </template>
                            <template #filter="{ filterModel, filterCallback }">
                                <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="メールアドレス検索" />
                            </template>
                        </Column>
                    </template>                         
                        
                    </DataTable>                    
                </template>
            </Card>            
        </div>
    </div>
</template>
  
<script setup>
    import { ref, onMounted } from "vue";
    import { useRouter } from 'vue-router';
    import { useClientStore } from '@/composables/useClientStore';
    import { Card, Skeleton } from 'primevue';
    import { DataTable, Column } from 'primevue';
    import { SelectButton, Tag, Button, InputText, MultiSelect } from 'primevue';
    import { FilterMatchMode } from '@primevue/core/api';

    const router = useRouter();
    const { clients, clientsIsLoading } = useClientStore();

    // Data table            
    const tableSize = ref({ label: '中', value: 'null' });
    const tableSizeOptions = ref([
        { label: '小', value: 'small' },
        { label: '中', value: 'null' }
    ]);
    const person_type = ref([
        { name: 'legal', value: 'legal' },
        { name: 'natural', value: 'natural' },
    ]);
    const filters = ref({        
        name: { value: null, matchMode: FilterMatchMode.CONTAINS },
        name_kanji: { value: null, matchMode: FilterMatchMode.CONTAINS },
        name_kana: { value: null, matchMode: FilterMatchMode.CONTAINS },        
        phone: { value: null, matchMode: FilterMatchMode.CONTAINS },
        email: { value: null, matchMode: FilterMatchMode.CONTAINS }
    });

    const goToEditClientPage = (clientId) => {
        router.push({ name: 'ClientEdit', params: { clientId: clientId } });
    };

    onMounted( async () => {  
        // console.log(clients);
    });

</script>
<style scoped>
</style>