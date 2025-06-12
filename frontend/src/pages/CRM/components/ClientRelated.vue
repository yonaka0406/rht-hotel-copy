<template>
  <div class="client-related-companies p-4">
    <div class="mb-4">
      <h3 class="text-xl font-semibold">関連企業: {{ clientName }}</h3>
    </div>

    <div class="mb-4">
      <Button label="関係を追加" icon="pi pi-plus" @click="openAddRelationshipModal" />
    </div>

    <div v-if="isLoadingRelatedCompanies" class="flex justify-center items-center h-64"> 
      <ProgressSpinner />
    </div>
    <div v-else>
      <DataTable :value="relatedCompanies" :paginator="true" :rows="10" 
                 responsiveLayout="scroll" emptyMessage="関連企業は見つかりませんでした。">
        <template #header>
          <div class="flex justify-between items-center">
            <h4 class="text-lg">関連企業一覧</h4>            
            <Button icon="pi pi-refresh" class="p-button-sm" @click="loadRelatedCompanies" :loading="isLoadingRelatedCompanies" />
          </div>
        </template>
        
        <Column field="related_company_name" header="関連会社名" sortable />
        <Column field="type_from_source_perspective" header="自社との関係" sortable />
        <Column field="type_from_target_perspective" header="相手との関係" sortable />
        <Column field="comment_from_source" header="コメント" /> 
        <Column header="操作">
          <template #body="slotProps">            
            <Button icon="pi pi-trash" class="p-button-rounded p-button-danger" @click="deleteRelationship(slotProps.data)" />
          </template>
        </Column>

        <template #empty>
          <div class="text-center p-4">
            関連企業は見つかりませんでした。
          </div>
        </template>
      </DataTable>
    </div>

    <Dialog header="新規関係追加" v-model:visible="displayAddModal" :modal="true" :style="{width: '50vw'}" @hide="closeAddModal">
      <div class="grid grid-col-12 gap-2">
        <div class="col-span-12 my-6">
            <FloatLabel>
                <label for="targetClient">対象クライアント</label>
                <Select 
                    id="targetClient" 
                    v-model="newRelationship.target_client_id"
                    :options="filteredLegalClientsForSelection"
                    optionLabel="name"
                    optionValue="id" 
                    placeholder="対象クライアントを選択 (法人のみ)" 
                    :filter="true"
                    showClear
                    v-tooltip.bottom="'法人顧客しか選択できません。'"
                    fluid
                />
             </FloatLabel>
        </div>

        <div class="col-span-12 mb-6">
            <FloatLabel>
                <label for="commonPair">共通関係ペア</label>
                <Select 
                    id="commonPair" 
                    v-model="selectedPair" 
                    :options="commonRelationshipPairs" 
                    optionLabel="pair_name" 
                    placeholder="共通ペアを選択" 
                    @change="onPairSelected"
                    showClear 
                    fluid
                />
            </FloatLabel>          
        </div>
        

        <div class="col-span-12 md:col-span-6 mb-6">
            <FloatLabel>
                <label for="sourceToTargetType">自社との関係</label>
                <InputText id="sourceToTargetType" v-model="newRelationship.source_relationship_type" fluid />
            </FloatLabel>
            <small>例：元請け</small>
        </div>
        <div class="col-span-12 md:col-span-6 mb-6">
            <FloatLabel>
                <label for="targetToSourceType">相手との関係</label>
                <InputText id="targetToSourceType" v-model="newRelationship.target_relationship_type"                     
                    fluid
                />                
            </FloatLabel>
            <small>例：下請け</small>
        </div>

        <div class="col-span-12 mb-6">
            <FloatLabel>
                <label for="comment">コメント</label>
                <InputText id="comment" v-model="newRelationship.comment" placeholder="コメント (任意)" fluid />
            </FloatLabel>
        </div>
      </div>
      <template #footer>
        <Button label="キャンセル" icon="pi pi-times" @click="closeAddModal" class="p-button-text p-button-danger"/>
        <Button label="保存" icon="pi pi-check" @click="saveNewRelationship" :loading="isSavingNewRelationship" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
    // Vue
    import { ref, onMounted, watch, computed } from 'vue';
    const props = defineProps({
        clientId: { 
            type: String, 
            required: true
        }
    });

    // Primevue
    import Button from 'primevue/button';
    import DataTable from 'primevue/datatable';
    import Column from 'primevue/column';
    import ProgressSpinner from 'primevue/progressspinner';
    import Dialog from 'primevue/dialog';
    import InputText from 'primevue/inputtext';
    import Select from 'primevue/select';
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { useClientStore } from '@/composables/useClientStore';
    import { FloatLabel } from 'primevue';

    // Store
    const clientStore = useClientStore();
    const { selectedClient, relatedCompanies, isLoadingRelatedCompanies, 
        commonRelationshipPairs, clients: allClients // Assuming 'clients' is the ref for all clients in the store
    } = clientStore;

    const filteredLegalClientsForSelection = computed(() => {
      if (!allClients.value || !Array.isArray(allClients.value)) {
        return [];
      }
      // Ensure relatedCompanies.value is also an array before trying to map over it
      const existingRelatedIds = new Set(
        Array.isArray(relatedCompanies.value) ? relatedCompanies.value.map(rc => rc.related_company_id) : []
      );

      return allClients.value.filter(client => {
        return client.legal_or_natural_person === 'legal' && // Must be a legal person
               client.id !== props.clientId &&                 // Must not be the current client
               !existingRelatedIds.has(client.id);             // Must not be already related
      });
    });

    const {
        fetchRelatedCompanies: storeFetchRelatedCompanies,
        addClientRelationship: storeAddClientRelationship,
        deleteClientRelationship: storeDeleteClientRelationship,
        fetchCommonRelationshipPairs: storeFetchCommonRelationshipPairs
    } = clientStore;

    const clientName = computed(() => {
        if (!selectedClient.value || !selectedClient.value.client) {
            return `Client ID: ${props.clientId}`; 
        }
        const clientData = selectedClient.value.client; 
        const name = clientData.name_kanji || clientData.name_kana || clientData.name;
        const name_kana = clientData.name_kana;
        return name_kana && name_kana !== name ? `${name} (${name_kana})` : name;
    });

    // Local refs for component-specific UI states
    const isSavingNewRelationship = ref(false); 
    const displayAddModal = ref(false);
    const selectedPair = ref(null);
    const newRelationship = ref({
    target_client_id: null, 
    source_relationship_type: '', 
    target_relationship_type: '', 
    comment: ''
    });

    // --- Methods using store actions ---
    const loadRelatedCompanies = async () => {
        if (!props.clientId) return;
        try {
            await storeFetchRelatedCompanies(props.clientId);
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error Fetching Relations', detail: error.message || 'Could not fetch related companies.', life: 3000 });
        }
    };

    const loadCommonRelationshipPairs = async () => {
        try {
            await storeFetchCommonRelationshipPairs();
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error Fetching Pairs', detail: error.message || 'Could not fetch common pairs.', life: 3000 });
        }
    };

    const openAddRelationshipModal = () => {
    selectedPair.value = null;
    newRelationship.value = {
        target_client_id: null, 
        source_relationship_type: '',
        target_relationship_type: '',
        comment: ''
    };
      // Ensure clientStore.clients (aliased as allClients) is loaded if necessary.
      // For now, assuming it's already loaded as per user feedback.
    displayAddModal.value = true;
    };

    const closeAddModal = () => {
    displayAddModal.value = false;
    };

    const onPairSelected = () => {
    if (selectedPair.value) {
        newRelationship.value.source_relationship_type = selectedPair.value.source_to_target_type;
        newRelationship.value.target_relationship_type = selectedPair.value.target_to_source_type;
    } else {
        newRelationship.value.source_relationship_type = '';
        newRelationship.value.target_relationship_type = '';
    }
    };

    const saveNewRelationship = async () => {
    if (!newRelationship.value.target_client_id) {
        toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Target Client must be selected.', life: 3000 });
        return;
    }
    if (props.clientId === newRelationship.value.target_client_id) {
        toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Cannot relate a client to itself.', life: 3000 });
        return;
    }
    // if (!selectedPair.value || !newRelationship.value.source_relationship_type || !newRelationship.value.target_relationship_type) {
    //     toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Common Relationship Pair must be selected.', life: 3000 });
    //     return;
    // }
    if (!newRelationship.value.source_relationship_type || !newRelationship.value.target_relationship_type) {
        toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Source and Target relationship types must be filled, either by selecting a common pair or by manual input.', life: 4000 });
        return;
    }

    isSavingNewRelationship.value = true;
    try {
        const payload = {
        target_client_id: newRelationship.value.target_client_id,
        source_relationship_type: newRelationship.value.source_relationship_type,
        target_relationship_type: newRelationship.value.target_relationship_type,
        comment: newRelationship.value.comment,
        };
        await storeAddClientRelationship(props.clientId, payload);
        toast.add({ severity: 'success', summary: 'Success', detail: 'Relationship saved successfully.', life: 3000 });
        closeAddModal();
        loadRelatedCompanies(); 
    } catch (error) {
        console.error('Error saving new relationship:', error);
        toast.add({ severity: 'error', summary: 'Error Saving Relationship', detail: error.message || 'Could not save relationship.', life: 4000 });
    } finally {
        isSavingNewRelationship.value = false;
    }
    };

    const deleteRelationship = async (relationshipData) => {
    const relationshipIdToDelete = relationshipData.relationship_id; 
    if (!relationshipIdToDelete) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Cannot delete: Relationship ID is missing.', life: 4000 });
        return;
    }

    if (window.confirm(`Are you sure you want to delete this relationship with ${relationshipData.related_company_name}?`)) {
        // If per-row deleting state is needed, it should be handled locally on `relationshipData` object.
        // For now, we rely on the global isLoadingRelatedCompanies for feedback during the data refresh.
        try {
        await storeDeleteClientRelationship(relationshipIdToDelete);
        toast.add({ severity: 'success', summary: 'Success', detail: 'Relationship deleted.', life: 3000 });
        loadRelatedCompanies(); 
        } catch (error) {
        console.error('Error deleting relationship:', error);
        toast.add({ severity: 'error', summary: 'Error Deleting Relationship', detail: error.message || 'Could not delete relationship.', life: 3000 });
        }
    }
    };

    onMounted(() => {
        loadCommonRelationshipPairs();    
    });

    watch(() => props.clientId, (newClientId) => {
        if (newClientId) {
            loadRelatedCompanies();
        }    
    }, { immediate: true });
</script>

<style scoped>
    /* Styles remain the same */
    .client-related-companies {

    }
    .p-fluid .field {
        margin-bottom: 1rem;
    }
</style>
