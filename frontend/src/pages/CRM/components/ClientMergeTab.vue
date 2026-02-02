<template>
    <div class="p-4">
        <!-- Client Header consistent with other tabs -->
        <div class="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <p class="text-xl font-bold dark:text-gray-100">
                {{ selectedClient?.client?.name || 'クライアント' }}
            </p>
            <small class="text-gray-500 dark:text-gray-400">{{ selectedClient?.client?.name_kana }}</small>
        </div>

        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">顧客合流候補</h3>
            <Button label="候補を再検索" icon="pi pi-refresh" @click="searchCandidates" :loading="isCalculating" severity="secondary" class="p-button-sm" />
        </div>

        <div v-if="isCalculating" class="flex justify-center p-8">
            <i class="pi pi-spin pi-spinner text-2xl"></i>
        </div>

        <div v-else-if="candidates.length > 0">
            <div v-for="candidate in candidates" :key="candidate.id" class="mb-4 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <div class="flex flex-col md:flex-row justify-between items-start">
                    <div class="flex-grow w-full">
                        <ClientCard :client="candidate" />
                    </div>
                    <div class="mt-4 md:mt-0 md:ml-4 flex flex-col gap-2 w-full md:w-auto">
                        <Button label="この顧客に合流" icon="pi pi-sync" severity="warning" class="p-button-sm w-full" @click="confirmMerge(candidate.id)" />
                        <Button label="編集" icon="pi pi-pencil" severity="secondary" class="p-button-sm w-full" @click="goToEdit(candidate.id)" />
                    </div>
                </div>
            </div>
        </div>

        <Message v-else severity="info">合流候補は見つかりませんでした。</Message>

        <Divider class="my-8" />

        <h3 class="text-lg font-semibold mb-4">手動検索</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">候補以外の顧客と合流したい場合は、以下から検索してください。</p>

        <div class="flex gap-2 mb-4">
            <span class="p-input-icon-left flex-grow">
                <i class="pi pi-search" />
                <InputText v-model="manualSearchText" placeholder="氏名、カナ、IDで検索..." class="w-full" />
            </span>
        </div>

        <DataTable v-if="manualSearchText && filteredManualClients.length > 0" :value="filteredManualClients" :rows="5" paginator class="p-datatable-sm">
            <Column field="name" header="氏名"></Column>
            <Column field="name_kana" header="カナ"></Column>
            <Column field="id" header="ID">
                <template #body="{ data }">
                    <span class="text-xs text-gray-500">{{ data.id }}</span>
                </template>
            </Column>
            <Column header="操作">
                <template #body="{ data }">
                    <Button label="選択" icon="pi pi-check" severity="secondary" class="p-button-sm" @click="confirmMerge(data.id)" />
                </template>
            </Column>
        </DataTable>
        <div v-else-if="manualSearchText" class="text-center p-4 text-gray-500">
            一致する顧客が見つかりませんでした。
        </div>

        <Dialog v-model:visible="showMergeDialog" modal header="顧客合流" :style="{ width: '90vw', maxWidth: '800px' }">
            <ClientMerge :newID="clientId" :oldID="selectedOldId" @close="handleMergeClose" />
        </Dialog>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useClientStore } from '@/composables/useClientStore';
import ClientCard from './ClientCard.vue';
import ClientMerge from './ClientMerge.vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Divider from 'primevue/divider';
import Message from 'primevue/message';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';

const props = defineProps({
    clientId: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['update-badge']);

const router = useRouter();
const clientStore = useClientStore();
const { selectedClient } = clientStore;

const candidates = ref([]);
const isCalculating = ref(false);
const manualSearchText = ref('');
const filteredManualClients = ref([]);
const isSearchingManual = ref(false);
const showMergeDialog = ref(false);
const selectedOldId = ref(null);

const searchCandidates = async () => {
    if (!props.clientId) return;

    isCalculating.value = true;
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`/api/clients/${props.clientId}/candidates`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch candidates');
        const data = await response.json();
        candidates.value = data;
        emit('update-badge', data.length);
    } catch (error) {
        console.error('[ClientMergeTab] Error finding candidates:', error);
    } finally {
        isCalculating.value = false;
    }
};

let manualSearchTimeout = null;
watch(manualSearchText, (newVal) => {
    clearTimeout(manualSearchTimeout);
    if (!newVal || newVal.length < 2) {
        filteredManualClients.value = [];
        return;
    }
    manualSearchTimeout = setTimeout(async () => {
        isSearchingManual.value = true;
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/client-list/1?limit=20&search=${encodeURIComponent(newVal)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) throw new Error('Search failed');
            const data = await response.json();
            filteredManualClients.value = (data.clients || []).filter(c => c.id !== props.clientId);
        } catch (error) {
            console.error('[ClientMergeTab] Manual search failed:', error);
        } finally {
            isSearchingManual.value = false;
        }
    }, 400);
});

const confirmMerge = (oldId) => {
    selectedOldId.value = oldId;
    showMergeDialog.value = true;
};

const handleMergeClose = () => {
    showMergeDialog.value = false;
    searchCandidates();
};

const goToEdit = (id) => {
    const routeData = router.resolve({ name: 'ClientEdit', params: { clientId: id } });
    window.open(routeData.href, '_blank');
};

// BOLT PERFORMANCE: Consolidate watchers to prevent infinite request loops
watch(() => props.clientId, (newId) => {
    if (newId) {
        searchCandidates();
    }
}, { immediate: true });
</script>
