<template>
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div class="grid grid-cols-12 gap-4">
            <Card class="flex col-span-12 bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
                <template #title>
                    顧客一覧
                </template>
                <template #content>
                    <div class="flex justify-end mb-6">
                        <Button label="新規顧客" icon="pi pi-plus" @click="dialogOpenClose(true)" class="mr-6" />
                        <Button label="ダウンロード設定" icon="pi pi-download" @click="openExportDialog" class="mr-6"
                            severity="help" />
                        <SelectButton v-model="tableSize" :options="tableSizeOptions" optionLabel="label"
                            dataKey="label" />
                    </div>
                    <DataTable class="dark:bg-gray-800 dark:text-gray-200" v-model:filters="filters" :value="clients"
                        lazy :totalRecords="totalClients" @page="onLazyLoad" @sort="onLazyLoad" @filter="onLazyLoad"
                        dataKey="id" filterDisplay="row" :loading="clientsIsLoading" :size="tableSize.value"
                        tableStyle="min-width: 50rem" stripedRows paginator :rows="10"
                        :rowsPerPageOptions="[10, 25, 50, 100]" removableSort>
                        <template #empty> 顧客見つかりません </template>
                        <template v-if="clientsIsLoading">
                            <Skeleton class="mb-3" width="100%" height="3rem" />
                            <div class="grid grid-cols-6 gap-3 mb-3" v-for="i in 10" :key="i">
                                <Skeleton width="100%" height="1.5rem" v-for="j in 6" :key="j" />
                            </div>
                        </template>
                        <template v-else>
                            <Column field="id" header="操作">
                                <template #body="slotProps">
                                    <Button @click="goToEditClientPage(slotProps.data.id)" severity="info"
                                        class="p-button-rounded p-button-text p-button-sm">
                                        <i class="pi pi-pencil"></i>
                                    </Button>
                                </template>
                            </Column>
                            <Column header="氏名・名称" filterField="name" sortable>
                                <template #body="{ data }">
                                    {{ data.name }}
                                </template>
                                <template #filter="{ filterModel, filterCallback }">
                                    <InputText v-model="filterModel.value" type="text" @input="filterCallback()"
                                        placeholder="氏名・名称検索" />
                                </template>
                            </Column>

                            <!-- Customer Code Column with Filter -->
                            <Column header="顧客コード" filterField="customer_id" sortable>
                                <template #body="{ data }">
                                    <span v-if="data.customer_id" class="text-sky-700 font-mono">
                                        {{ data.customer_id }}
                                    </span>
                                    <span v-else class="text-gray-400 italic">
                                        未設定
                                    </span>
                                </template>
                                <template #filter="{ filterModel, filterCallback }">
                                    <InputText v-model="filterModel.value" type="text" @input="filterCallback()"
                                        placeholder="顧客コード検索" />
                                </template>
                            </Column>

                            <!-- Loyalty Tier Column with Filter -->
                            <Column field="loyalty_tier" header="ロイヤルティ層" sortable :showFilterMenu="false">
                                <template #body="{ data }">
                                    <Tag :value="getTierDisplayName(data.loyalty_tier)"
                                        :severity="getTierSeverity(data.loyalty_tier)" />
                                </template>
                                <template #filter="{ filterModel, filterCallback }">
                                    <Select v-model="filterModel.value" @change="filterCallback()"
                                        :options="loyaltyTierFilterOptions" optionLabel="label" optionValue="value"
                                        placeholder="全て" class="p-column-filter" :showClear="true">
                                        <template #option="slotProps">
                                            <Tag :value="getTierDisplayName(slotProps.option.value)"
                                                :severity="getTierSeverity(slotProps.option.value)" />
                                        </template>
                                    </Select>
                                </template>
                            </Column>
                            <!-- Legal or Natural Person Column with Filter -->
                            <Column field="legal_or_natural_person" header="法人 / 個人" :showFilterMenu="false">
                                <template #body="slotProps">
                                    <span v-if="slotProps.data.legal_or_natural_person === 'legal'">
                                        <Tag icon="pi pi-building" severity="secondary" value="法人"></Tag>
                                    </span>
                                    <span v-else-if="slotProps.data.legal_or_natural_person === 'natural'">
                                        <Tag icon="pi pi-user" severity="info" value="個人"></Tag>
                                    </span>
                                </template>
                                <template #filter="{ filterModel, filterCallback }">
                                    <Select v-model="filterModel.value" @change="filterCallback()"
                                        :options="personTypeOptions" optionLabel="label" optionValue="value"
                                        placeholder="全て" class="p-column-filter" :showClear="true">
                                    </Select>
                                </template>
                            </Column>
                            <Column header="電話番号" filterField="phone">
                                <template #body="{ data }">
                                    {{ data.phone }}
                                </template>
                                <template #filter="{ filterModel, filterCallback }">
                                    <InputText v-model="filterModel.value" type="text" @input="filterCallback()"
                                        placeholder="電話番号検索" />
                                </template>
                            </Column>
                            <Column header="メールアドレス" filterField="email" sortable>
                                <template #body="{ data }">
                                    {{ data.email }}
                                </template>
                                <template #filter="{ filterModel, filterCallback }">
                                    <InputText v-model="filterModel.value" type="text" @input="filterCallback()"
                                        placeholder="メールアドレス検索" />
                                </template>
                            </Column>
                        </template>
                    </DataTable>
                </template>
            </Card>
        </div>
    </div>

    <NewClientDialog :visible="dialogVisible" @close="dialogOpenClose(false)" @client-created="handleClientCreated" />

    <ExportClientDialog :visible="exportDialogVisible" @close="closeExportDialog" :initialFilters="filters" />

</template>

<script setup>
//Vue
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from 'vue-router';
import ExportClientDialog from './components/ExportClientDialog.vue';
import NewClientDialog from './components/NewClientDialog.vue';

//Store
import { useClientStore } from '@/composables/useClientStore';

//Primevue
import { useToast } from "primevue/usetoast";
import { Card, Skeleton, DataTable, Column, InputText, Button, Tag, Select, SelectButton } from 'primevue';
import { FilterMatchMode } from '@primevue/core/api';

//Setup
const router = useRouter();
const { clients, totalClients, clientsIsLoading, fetchClients } = useClientStore();
const toast = useToast();

const exportDialogVisible = ref(false);

const openExportDialog = () => {
    exportDialogVisible.value = true;
};

const closeExportDialog = () => {
    exportDialogVisible.value = false;
};

// Data table
const tableSize = ref({ label: '中', value: 'null' });
const tableSizeOptions = ref([
    { label: '小', value: 'small' },
    { label: '中', value: 'null' }
]);
const filters = ref({
    name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customer_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
    phone: { value: null, matchMode: FilterMatchMode.CONTAINS },
    email: { value: null, matchMode: FilterMatchMode.CONTAINS },
    loyalty_tier: { value: null, matchMode: FilterMatchMode.EQUALS },
    legal_or_natural_person: { value: null, matchMode: FilterMatchMode.EQUALS }
});

// Loyalty Tier Filter Options
const loyaltyTierFilterOptions = ref([
    { label: '潜在顧客', value: 'prospect' },
    { label: '新規顧客', value: 'newbie' },
    { label: 'リピーター', value: 'repeater' },
    { label: 'ホテルロイヤル', value: 'hotel_loyal' },
    { label: 'ブランドロイヤル', value: 'brand_loyal' }
]);

const personTypeOptions = [
    { label: '法人', value: 'legal' },
    { label: '個人', value: 'natural' },
];

const goToEditClientPage = (clientId) => {
    const route = router.resolve({ name: 'ClientEdit', params: { clientId: clientId } });
    window.open(route.href, '_blank');
};

// New Client Dialog
const dialogVisible = ref(false);
const dialogOpenClose = (bool) => {
    dialogVisible.value = bool;
};

const handleClientCreated = () => {
    loadLazyData(); // Refresh the client list
};

const lazyParams = ref({
    first: 0,
    rows: 10,
    page: 0,
    sortField: null,
    sortOrder: null,
    filters: filters.value
});

let loadLazyTimeout = null;
const lastFiltersString = ref('');

const onLazyLoad = (event) => {
    // Debounce if filters changed to avoid excessive API calls while typing
    // We use a separate ref to track last stringified filters because lazyParams.filters
    // might share the same object reference as the active filters.
    const currentFiltersString = JSON.stringify(event.filters);
    const isFilterChange = currentFiltersString !== lastFiltersString.value;
    lastFiltersString.value = currentFiltersString;

    lazyParams.value = event;
    loadLazyData(isFilterChange);
};

const loadLazyData = async (debounced = false) => {
    if (loadLazyTimeout) clearTimeout(loadLazyTimeout);

    const execute = async () => {
        const page = (lazyParams.value.page || 0) + 1;
        const limit = lazyParams.value.rows || 10;
        const sortField = lazyParams.value.sortField;
        const sortOrder = lazyParams.value.sortOrder;

                    // Map PrimeVue filters to backend search
                    const f = lazyParams.value.filters || {};
                    const filters = {
                        searchTerm: f.name?.value || null,
                        phone: f.phone?.value || null,
                        email: f.email?.value || null,
                        loyaltyTier: f.loyalty_tier?.value || null,
                        customerCode: f.customer_id?.value || null,
                        personType: f.legal_or_natural_person?.value || null
                    };
        
                    try {
                        await fetchClients(page, filters, limit, sortField, sortOrder);
                    } catch (error) {            console.error('Failed to fetch clients:', error);
            toast.add({ severity: 'error', summary: 'エラー', detail: '顧客データの読み込みに失敗しました。', life: 3000 });
        }
    };

    if (debounced) {
        loadLazyTimeout = setTimeout(execute, 800); // 800ms debounce
    } else {
        await execute();
    }
};

onMounted(async () => {
    loadLazyData();
});

onBeforeUnmount(() => {
    if (loadLazyTimeout) clearTimeout(loadLazyTimeout);
});

const getTierDisplayName = (tier) => {
    if (!tier) return 'N/A'; // Or perhaps '未分類' (Uncategorized) or '該当なし' (Not Applicable)
    switch (tier) { // tier is already lowercase
        case 'prospect': return '潜在顧客';
        case 'newbie': return '新規顧客'; // New Customer
        case 'repeater': return 'リピーター'; // Repeater
        case 'hotel_loyal': return 'ホテルロイヤル'; // Hotel Loyal
        case 'brand_loyal': return 'ブランドロイヤル'; // Brand Loyal
        default: return tier; // Fallback, should not happen with current tiers
    }
};

const getTierSeverity = (tier) => {
    if (!tier) return 'info';
    switch (tier) {
        case 'prospect': return 'secondary';
        case 'newbie': return 'info';
        case 'repeater': return 'success';
        case 'hotel_loyal': return 'warning';
        case 'brand_loyal': return 'danger';
        default: return 'secondary';
    }
};
</script>
<style scoped></style>