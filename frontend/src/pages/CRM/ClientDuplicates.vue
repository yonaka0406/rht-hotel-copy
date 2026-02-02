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

                <!-- Error message display -->
                <div v-else-if="errorMessage" class="p-8">
                    <Message severity="error" :closable="false">{{ errorMessage }}</Message>
                </div>

                <!-- Content displayed after all loading and calculations are finished -->
                <div v-else>
                    <!-- Filter Input -->
                    <div class="mb-4">
                        <span class="p-input-icon-left w-full">
                            <i class="pi pi-search" />
                            <InputText v-model="filterText" placeholder="元顧客情報をフィルター (氏名、カナ、漢字、メール、電話番号、ファックス)"
                                class="w-full p-inputtext-sm" />
                        </span>
                    </div>

                    <DataTable class="dark:bg-gray-800 dark:text-gray-200 p-datatable-sm"
                        :value="filteredDuplicatePairs" :paginator="true" :rows="5" :rowsPerPageOptions="[5, 10, 20]"
                        dataKey="earliest.id"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                        v-if="filteredDuplicatePairs.length > 0">

                        <Column header="元顧客情報" style="width: 50%;">
                            <template #body="{ data }">
                                <ClientCard :client="data.earliest" />
                                <div class="mt-2">
                                    <Button @click="goToEditClientPage(data.earliest.id)" label="顧客編集"
                                        icon="pi pi-pencil" severity="info" class="p-button-sm w-full" />
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
                                            <ClientCard :client="duplicate" />
                                            <div class="mt-2 grid grid-cols-2 gap-2">
                                                <Button @click="goToEditClientPage(duplicate.id)" label="編集"
                                                    icon="pi pi-pencil" severity="secondary" class="p-button-sm" />
                                                <Button @click="mergeClients(duplicate.id, data.earliest.id)"
                                                    label="この顧客に合流" icon="pi pi-sync" severity="warning"
                                                    class="p-button-sm" />
                                            </div>
                                        </AccordionContent>
                                    </AccordionPanel>
                                </Accordion>
                            </template>
                        </Column>
                    </DataTable>

                    <div v-else class="p-4 text-center">
                        <p>フィルターに一致する重複候補見つかりませんでした。</p>
                    </div>
                </div>
            </template>
        </Card>
    </div>

    <Drawer v-model:visible="showDrawer" class="dark:bg-gray-800 dark:text-gray-200" modal :position="'bottom'"
        :style="{ height: '75vh' }" closable>
        <ClientMerge :newID="drawerProps.newClientId" :oldID="drawerProps.oldClientId" @close="handleMergeClose" />
    </Drawer>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from 'vue-router';
import { useClientStore } from '@/composables/useClientStore';
import ClientCard from './components/ClientCard.vue';
import ClientMerge from './components/ClientMerge.vue';

// Primevue
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Drawer from 'primevue/drawer';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message'; // Import Message component
// Import Accordion components for v4
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';


const router = useRouter();
const { clientsIsLoading, fetchDuplicates } = useClientStore();

// --- State Refs ---
const duplicatePairs = ref([]);
const isCalculating = ref(false);
const showDrawer = ref(false);
const drawerProps = ref({});
const filterText = ref('');
const errorMessage = ref(null); // Add errorMessage ref

onMounted(async () => {
    // Move duplication detection to backend to avoid loading all clients (5000+) into memory.
    try {
        const results = await fetchDuplicates();
        duplicatePairs.value = results;
    } catch (error) {
        console.error('Failed to fetch duplicates:', error);
        errorMessage.value = error.message || '重複データの取得に失敗しました。再度お試しください。';
        duplicatePairs.value = []; // Ensure it'N set on error
    }
});

// --- Filter Logic ---
const filteredDuplicatePairs = computed(() => {
    if (!filterText.value) {
        return duplicatePairs.value;
    }
    const lowerCaseFilter = filterText.value.toLowerCase();
    return duplicatePairs.value.filter(pair => {
        const client = pair.earliest;
        return (
            (client.name && client.name.toLowerCase().includes(lowerCaseFilter)) ||
            (client.name_kana && client.name_kana.toLowerCase().includes(lowerCaseFilter)) ||
            (client.name_kanji && client.name_kanji.toLowerCase().includes(lowerCaseFilter)) ||
            (client.email && client.email.toLowerCase().includes(lowerCaseFilter)) ||
            (client.phone && client.phone.includes(lowerCaseFilter)) ||
            (client.fax && client.fax.includes(lowerCaseFilter))
        );
    });
});


// --- Component Actions ---
const goToEditClientPage = (clientId) => {
    const routeData = router.resolve({ name: 'ClientEdit', params: { clientId: clientId } });
    window.open(routeData.href, '_blank');
};

const mergeClients = (oldId, newClientId) => {
    showDrawer.value = true;
    drawerProps.value = { oldClientId: oldId, newClientId };
};

const handleMergeClose = async () => {
    showDrawer.value = false;
    // Re-fetch duplicates after a merge operation to update the list
    try {
        errorMessage.value = null; // Clear any previous error message
        const results = await fetchDuplicates();
        duplicatePairs.value = results;
    } catch (error) {
        console.error('Failed to re-fetch duplicates after merge:', error);
        errorMessage.value = error.message || '合流後の重複データの更新に失敗しました。';
        duplicatePairs.value = [];
    }
};

</script>
<style scoped></style>
