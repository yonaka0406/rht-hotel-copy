<template>
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Card class="bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
            <template #title>
                顧客重複チェック
            </template>
            <template #subtitle>
                顧客を合流すると、予約データにも影響があります。
            </template>
            <template #content>
                <!-- Initial data loading indicator -->
                <div v-if="clientsIsLoading" class="flex justify-center items-center p-8">
                    <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
                    <p class="ml-2">顧客データを読み込み中...</p>
                </div>

                <!-- Duplicate calculation indicator -->
                <div v-else-if="isCalculating" class="flex justify-center items-center p-8">
                    <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
                    <p class="ml-2">重複を計算中...</p>
                </div>

                <!-- Content displayed after all loading and calculations are finished -->
                <div v-else>
                    <DataTable 
                        class="dark:bg-gray-800 dark:text-gray-200 p-datatable-sm" 
                        :value="duplicatePairs"
                        :paginator="true" 
                        :rows="5" 
                        :rowsPerPageOptions="[5, 10, 20]"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                        v-if="duplicatePairs.length > 0">
                        
                        <Column header="元顧客情報" style="width: 50%;">
                            <template #body="{ data }">
                                <ClientCard :client-id="data.earliest.id" />
                                <div class="mt-2">
                                    <Button 
                                        @click="goToEditClientPage(data.earliest.id)" 
                                        label="顧客編集" 
                                        icon="pi pi-pencil" 
                                        severity="info"
                                        class="p-button-sm w-full" />
                                </div>
                            </template>
                        </Column>
                        
                        <Column header="重複候補者" style="width: 50%;">
                            <template #body="{ data }">
                                <!-- Updated Accordion structure for PrimeVue v4 -->
                                <Accordion :multiple="true" :activeIndex="[0]">
                                    <AccordionPanel v-for="duplicate in data.duplicates" :key="duplicate.id">
                                        <AccordionHeader>
                                            <div class="flex items-center gap-2 text-sm">
                                                <span>{{ duplicate.name_kanji || duplicate.name }}</span>
                                                <span class="text-gray-400">|</span>
                                                <span class="text-gray-500">{{ duplicate.name_kana }}</span>
                                            </div>
                                        </AccordionHeader>
                                        <AccordionContent>
                                            <ClientCard :client-id="duplicate.id" />
                                            <div class="mt-2 grid grid-cols-2 gap-2">
                                                <Button 
                                                    @click="goToEditClientPage(duplicate.id)" 
                                                    label="編集" 
                                                    icon="pi pi-pencil" 
                                                    severity="secondary"
                                                    class="p-button-sm" />
                                                <Button 
                                                    @click="mergeClients(duplicate.id)" 
                                                    label="この顧客に合流" 
                                                    icon="pi pi-sync" 
                                                    severity="warning"
                                                    class="p-button-sm" />
                                            </div>
                                        </AccordionContent>
                                    </AccordionPanel>
                                </Accordion>
                            </template>
                        </Column>
                    </DataTable>
                    
                    <div v-else class="p-4 text-center">
                        <p>重複候補見つかりませんでした。</p>
                    </div>
                </div>
            </template>
        </Card>
    </div>

    <Drawer v-model:visible="showDrawer" class="dark:bg-gray-800 dark:text-gray-200" modal :position="'bottom'"
        :style="{ height: '75vh' }" closable>
        <ClientMerge :newID="drawerProps.newClientId" :oldID="drawerProps.oldClientId" />
    </Drawer>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { useRouter } from 'vue-router';
import { useClientStore } from '@/composables/useClientStore';

import ClientCard from './components/ClientCard.vue'; 
import ClientMerge from './components/ClientMerge.vue';

import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Divider from 'primevue/divider';
import Button from 'primevue/button';
import Drawer from 'primevue/drawer';
// Import Accordion components for v4
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';


console.log('[ClientDuplicates] Script setup started.');

const router = useRouter();
const { clients, clientsIsLoading } = useClientStore();

// --- State Refs ---
const duplicatePairs = ref([]);
const isCalculating = ref(false);
const showDrawer = ref(false);
const drawerProps = ref({});

onMounted(() => {
    console.log('[ClientDuplicates] Component mounted.');
});

// --- ENHANCED Asynchronous Duplicate Calculation ---

const calculateDuplicates = async () => {
    const allClients = clients.value;
    if (!allClients || allClients.length === 0) {
        duplicatePairs.value = [];
        return;
    }

    isCalculating.value = true;
    console.log('[ClientDuplicates] START: Enhanced async duplicate calculation.');
    console.time('[ClientDuplicates] PERF: Full duplicate calculation');

    await new Promise(resolve => setTimeout(resolve, 0));

    try {
        const clientsById = new Map(allClients.map(c => [c.id, c]));
        const potentialGroups = new Map();

        // --- Step 1: Group clients by potential duplicate keys (no change here) ---
        for (const client of allClients) {
            const keys = [];
            if (client.email) keys.push(`email:${client.email.toLowerCase()}`);
            if (client.phone) keys.push(`phone:${client.phone.replace(/\D/g, '')}`);
            const normalizedName = normalizeString(client.name);
            if (normalizedName) keys.push(`name:${normalizedName}`);
            const normalizedKana = normalizeString(client.name_kana);
            if (normalizedKana) keys.push(`name_kana:${normalizedKana}`);
            if (client.date_of_birth) keys.push(`dob:${new Date(client.date_of_birth).toDateString()}`);

            for (const key of keys) {
                if (!potentialGroups.has(key)) potentialGroups.set(key, new Set());
                potentialGroups.get(key).add(client.id);
            }
        }

        // --- Step 2: Use a Union-Find algorithm to merge overlapping groups ---
        const parent = new Map();
        const find = (i) => {
            if (parent.get(i) === i) return i;
            parent.set(i, find(parent.get(i))); // Path compression
            return parent.get(i);
        };
        const union = (i, j) => {
            const rootI = find(i);
            const rootJ = find(j);
            if (rootI !== rootJ) parent.set(rootI, rootJ);
        };

        allClients.forEach(c => parent.set(c.id, c.id)); // Initialize each client in its own set

        for (const ids of potentialGroups.values()) {
            if (ids.size > 1) {
                const idArray = [...ids];
                for (let i = 1; i < idArray.length; i++) {
                    union(idArray[0], idArray[i]);
                }
            }
        }

        // --- Step 3: Consolidate clients into final groups based on their root parent ---
        const consolidatedGroups = new Map();
        for (const client of allClients) {
            const root = find(client.id);
            if (!consolidatedGroups.has(root)) consolidatedGroups.set(root, []);
            consolidatedGroups.get(root).push(client);
        }

        // --- Step 4: Create the final pairs for the UI from the consolidated groups ---
        const finalPairs = [];
        for (const group of consolidatedGroups.values()) {
            if (group.length > 1) {
                const earliest = group.reduce((e, c) => new Date(c.created_at) < new Date(e.created_at) ? c : e);
                const duplicates = group.filter(c => c.id !== earliest.id);
                
                if (duplicates.length > 0) {
                    finalPairs.push({ earliest, duplicates });
                }
            }
        }
        
        duplicatePairs.value = finalPairs;

    } catch (error) {
        console.error('[ClientDuplicates] Error during duplicate calculation:', error);
        duplicatePairs.value = [];
    } finally {
        console.timeEnd('[ClientDuplicates] PERF: Full duplicate calculation');
        console.log(`[ClientDuplicates] END: Calculation finished. Found ${duplicatePairs.value.length} pairs.`);
        isCalculating.value = false;
    }
};

// --- Helper Function ---
const normalizeString = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\s+/g, '');
};

// --- Watcher ---
watch(clients, (newClients, oldClients) => {
    console.log(`[ClientDuplicates] Watcher triggered. Client count changed from ${oldClients?.length ?? 'N/A'} to ${newClients?.length ?? 'N/A'}.`);
    
    if (Array.isArray(newClients) && newClients.length > 0) {
        calculateDuplicates();
    } else {
        duplicatePairs.value = [];
    }
}, { immediate: true });


// --- Component Actions ---
const goToEditClientPage = (clientId) => {
    router.push({ name: 'ClientEdit', params: { clientId: clientId } });
};

const mergeClients = (oldId) => {
    const pair = duplicatePairs.value.find(p => p.duplicates.some(dup => dup.id === oldId));
    if (!pair) {
        console.warn('[ClientDuplicates] No matching earliest client found for merge:', oldId);
        return;
    }
    const newClientId = pair.earliest.id;
    showDrawer.value = true;
    drawerProps.value = { oldClientId: oldId, newClientId };
};

</script>
