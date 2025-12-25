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
            <DataTable :value="relatedCompanies" :paginator="true" :rows="10" responsiveLayout="scroll"
                emptyMessage="関連企業は見つかりませんでした。">
                <template #header>
                    <div class="flex justify-between items-center">
                        <h4 class="text-lg">関連企業一覧</h4>
                        <Button icon="pi pi-refresh" class="p-button-sm" @click="loadRelatedCompanies"
                            :loading="isLoadingRelatedCompanies" />
                    </div>
                </template>

                <Column field="related_company_name" header="関連会社名" sortable>
                    <template #body="slotProps">
                        <router-link
                            :to="{ name: 'ClientEdit', params: { clientId: slotProps.data.related_company_id } }"
                            class="text-blue-600 hover:text-blue-300 hover:underline inline-flex items-center">
                            {{ slotProps.data.related_company_name }}
                            <i class="pi pi-external-link ml-2 text-xs"></i> </router-link>
                    </template>
                </Column>
                <Column field="type_from_source_perspective" header="自社との関係" sortable />
                <Column field="type_from_target_perspective" header="相手との関係" sortable />
                <Column field="comment_from_source" header="コメント" />
                <Column header="操作">
                    <template #body="slotProps">
                        <Button icon="pi pi-trash" class="p-button-rounded p-button-danger"
                            @click="deleteRelationship(slotProps.data)" />
                    </template>
                </Column>

                <template #empty>
                    <div class="text-center p-4">
                        関連企業は見つかりませんでした。
                    </div>
                </template>
            </DataTable>
        </div>

        <Dialog header="新規関係追加" v-model:visible="displayAddModal" :modal="true" :style="{ width: '50vw' }"
            @hide="closeAddModal">
            <div class="grid grid-col-12 gap-2">
                <div class="col-span-12 my-6">
                    <FloatLabel>
                        <label for="targetClientAutocomplete">対象クライアント</label>
                        <ClientAutoCompleteWithStore id="targetClientAutocomplete"
                            v-model="selectedClientForAutocomplete" @option-select="onClientSelect"
                            placeholder="対象クライアントを選択・検索 (法人のみ)" :hideLabel="true" :personTypeFilter="'legal'"
                            style="width: 100%;" v-tooltip.bottom="'法人顧客しか選択できません。'" />
                    </FloatLabel>
                </div>

                <div class="col-span-12 mb-6">
                    <FloatLabel>
                        <label for="commonPair">共通関係ペア</label>
                        <Select id="commonPair" v-model="selectedPair" :options="commonRelationshipPairs"
                            optionLabel="pair_name" placeholder="共通ペアを選択" @change="onPairSelected" showClear fluid />
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
                        <InputText id="targetToSourceType" v-model="newRelationship.target_relationship_type" fluid />
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
                <Button label="キャンセル" icon="pi pi-times" @click="closeAddModal" class="p-button-text p-button-danger" />
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
import ClientAutoCompleteWithStore from '@/components/ClientAutoCompleteWithStore.vue';
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import { useClientStore } from '@/composables/useClientStore';
import { FloatLabel } from 'primevue';

// Store
const clientStore = useClientStore();
const {
    selectedClient,
    relatedCompanies,
    isLoadingRelatedCompanies,
    commonRelationshipPairs,
    clients: allClients,
    clientsIsLoading // Add this
} = clientStore;



const {
    fetchRelatedCompanies: storeFetchRelatedCompanies,
    addClientRelationship: storeAddClientRelationship,
    deleteClientRelationship: storeDeleteClientRelationship,
    fetchCommonRelationshipPairs: storeFetchCommonRelationshipPairs
} = clientStore;

const clientName = computed(() => {
    if (!selectedClient.value || !selectedClient.value.client) {
        return `クライアントID: ${props.clientId}`;
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
const selectedClientForAutocomplete = ref(null); // For v-model of AutoComplete
const newRelationship = ref({
    target_client_id: null,
    source_relationship_type: '',
    target_relationship_type: '',
    comment: ''
});

// Validation function for client selection
const isValidClientSelection = (client) => {
    if (!client || !client.id) return false;

    // Must be a legal person
    if (client.legal_or_natural_person !== 'legal') return false;

    // Cannot be the same as current client
    if (client.id === props.clientId) return false;

    // Cannot be already related
    const existingRelatedIds = new Set(
        Array.isArray(relatedCompanies.value) ? relatedCompanies.value.map(rc => rc.related_company_id) : []
    );
    if (existingRelatedIds.has(client.id)) return false;

    return true;
};

// Handle client selection from ClientAutoCompleteWithStore
const onClientSelect = (event) => {
    const selectedClient = event.value;

    if (!isValidClientSelection(selectedClient)) {
        // Show error and clear selection
        if (selectedClient.legal_or_natural_person !== 'legal') {
            toast.add({
                severity: 'warn',
                summary: '選択エラー',
                detail: '法人顧客のみ選択できます。',
                life: 3000
            });
        } else if (selectedClient.id === props.clientId) {
            toast.add({
                severity: 'warn',
                summary: '選択エラー',
                detail: '同じクライアントは選択できません。',
                life: 3000
            });
        } else {
            toast.add({
                severity: 'warn',
                summary: '選択エラー',
                detail: 'このクライアントは既に関連付けられています。',
                life: 3000
            });
        }

        selectedClientForAutocomplete.value = null;
        newRelationship.value.target_client_id = null;
        return;
    }

    // Valid selection
    selectedClientForAutocomplete.value = selectedClient;
    newRelationship.value.target_client_id = selectedClient.id;
};

// --- Methods using store actions ---
const loadRelatedCompanies = async () => {
    if (!props.clientId) return;
    try {
        await storeFetchRelatedCompanies(props.clientId);
    } catch (error) {
        toast.add({ severity: 'error', summary: '関連取得エラー', detail: error.message || '関連企業の取得に失敗しました。', life: 3000 });
    }
};

const loadCommonRelationshipPairs = async () => {
    try {
        await storeFetchCommonRelationshipPairs();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'ペア取得エラー', detail: error.message || '共通関係ペアの取得に失敗しました。', life: 3000 });
    }
};

const openAddRelationshipModal = () => {
    selectedPair.value = null;
    selectedClientForAutocomplete.value = null; // Reset this
    newRelationship.value = {
        target_client_id: null,
        source_relationship_type: '',
        target_relationship_type: '',
        comment: ''
    };
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
        toast.add({ severity: 'warn', summary: '入力エラー', detail: '対象クライアントを選択してください。', life: 3000 });
        return;
    }
    if (props.clientId === newRelationship.value.target_client_id) {
        toast.add({ severity: 'warn', summary: '入力エラー', detail: '自己参照はできません。', life: 3000 });
        return;
    }
    // if (!selectedPair.value || !newRelationship.value.source_relationship_type || !newRelationship.value.target_relationship_type) {
    //     toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Common Relationship Pair must be selected.', life: 3000 });
    //     return;
    // }
    if (!newRelationship.value.source_relationship_type || !newRelationship.value.target_relationship_type) {
        toast.add({ severity: 'warn', summary: '入力エラー', detail: '自社との関係および相手との関係を入力してください（共通ペア選択または手入力）。', life: 4000 });
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
        toast.add({ severity: 'success', summary: '成功', detail: '関係を保存しました。', life: 3000 });
        closeAddModal();
        loadRelatedCompanies();
    } catch (error) {
        console.error('Error saving new relationship:', error);
        toast.add({ severity: 'error', summary: '関係保存エラー', detail: error.message || '関係の保存に失敗しました。', life: 4000 });
    } finally {
        isSavingNewRelationship.value = false;
    }
};

const deleteRelationship = async (relationshipData) => {
    const relationshipIdToDelete = relationshipData.relationship_id;
    if (!relationshipIdToDelete) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '削除不可: 関係IDがありません。', life: 4000 });
        return;
    }

    if (window.confirm(`「${relationshipData.related_company_name}」との関連を削除してもよろしいですか？`)) {
        // If per-row deleting state is needed, it should be handled locally on `relationshipData` object.
        // For now, we rely on the global isLoadingRelatedCompanies for feedback during the data refresh.
        try {
            await storeDeleteClientRelationship(relationshipIdToDelete);
            toast.add({ severity: 'success', summary: '成功', detail: '関係を削除しました。', life: 3000 });
            loadRelatedCompanies();
        } catch (error) {
            console.error('Error deleting relationship:', error);
            toast.add({ severity: 'error', summary: '関係削除エラー', detail: error.message || '関係の削除に失敗しました。', life: 3000 });
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



watch(selectedClientForAutocomplete, (newValue) => {
    if (newValue && typeof newValue === 'object' && newValue.id) {
        newRelationship.value.target_client_id = newValue.id;
    } else if (!newValue) { // Cleared or not an object
        newRelationship.value.target_client_id = null;
    }
    // If newValue is a string (e.g. user typed something but didn't select an object),
    // target_client_id should ideally be null unless forceSelection works perfectly to clear it.
    // The `forceSelection` prop should handle this; if user types and blurs, v-model should reset if no match.
});
</script>

<style scoped>
/* Styles remain the same */


.p-fluid .field {
    margin-bottom: 1rem;
}
</style>
