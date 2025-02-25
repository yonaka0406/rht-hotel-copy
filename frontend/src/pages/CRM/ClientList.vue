<template>
    <div class="min-h-screen">
        <div class="grid grid-cols-12 gap-4">            
            <Card class="flex col-span-12">
                <template #title>
                    顧客一覧
                </template>                
                <template #content>                    
                    <div class="flex justify-end mb-6">
                        <SelectButton v-model="tableSize" :options="tableSizeOptions" optionLabel="label" dataKey="label" />
                    </div>
                    <DataTable 
                        :value="clients"
                        :size="tableSize.value"
                        tableStyle="min-width: 50rem"
                        stripedRows 
                        paginator 
                        :rows="10"
                        :rowsPerPageOptions="[5, 10, 25, 50]"
                        removableSort 
                    >   
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
                        <Column field="name" sortable header="氏名"></Column>
                        <Column field="name_kanji" sortable header="氏名（漢字）"></Column>
                        <Column field="name_kana" sortable header="氏名（カナ）"></Column>
                        <Column field="is_legal_person" header="法人 / 個人">
                            <template #body="slotProps">
                                <span v-if="slotProps.data.is_legal_person">                                    
                                    <Tag icon="pi pi-building" severity="secondary" value="法人"></Tag>
                                </span>
                                <span v-else>
                                    <Tag icon="pi pi-user" severity="info" value="個人"></Tag>
                                </span>
                            </template>
                        </Column>
                        <Column field="phone" sortable header="電話番号"></Column>
                        <Column field="email" sortable header="メールアドレス"></Column>
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
    import { SelectButton, Tag, Button } from 'primevue';

    const router = useRouter();
    const { clients, clientsIsLoading } = useClientStore();

    // Data table            
    const tableSize = ref({ label: '中', value: 'null' });
    const tableSizeOptions = ref([
        { label: '小', value: 'small' },
        { label: '中', value: 'null' },
        { label: '大', value: 'large' }
    ]);

    const goToEditClientPage = (clientId) => {
        router.push({ name: 'ClientEdit', params: { clientId: clientId } });
    };

    onMounted( async () => {  
        
    });

</script>
<style scoped>
</style>