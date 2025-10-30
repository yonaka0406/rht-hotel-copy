<template>
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div class="grid grid-cols-12 gap-4">
            <Card class="flex col-span-12 bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
                <template #title>
                    顧客一覧
                </template>
                <template #content>
                    <div class="flex justify-end mb-6">
                        <Button
                            label="新規顧客"
                            icon="pi pi-plus"
                            @click="dialogOpenClose(true)"
                            class="mr-6"
                        />
                        <Button
                            label="ダウンロード設定"
                            icon="pi pi-download"
                            @click="openExportDialog"
                            class="mr-6"
                            severity="help"
                        />
                        <SelectButton v-model="tableSize" :options="tableSizeOptions"
                        optionLabel="label" dataKey="label" />
                    </div>
                    <DataTable
                        class="dark:bg-gray-800 dark:text-gray-200"
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
                        <div class="grid grid-cols-6 gap-3 mb-3" v-for="i in 10" :key="i">
                            <Skeleton width="100%" height="1.5rem" v-for="j in 6" :key="j" />
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

                        <!-- Loyalty Tier Column with Filter -->
                        <Column field="loyalty_tier" header="ロイヤルティ層" sortable :showFilterMenu="false">
                            <template #body="{ data }">
                                <Tag :value="getTierDisplayName(data.loyalty_tier)" :severity="getTierSeverity(data.loyalty_tier)" />
                            </template>
                            <template #filter="{ filterModel, filterCallback }">
                                <Select v-model="filterModel.value" 
                                    @change="filterCallback()"
                                    :options="loyaltyTierFilterOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="全て" 
                                    class="p-column-filter" 
                                    :showClear="true"
                                >
                                    <template #option="slotProps">
                                        <Tag :value="getTierDisplayName(slotProps.option.value)" :severity="getTierSeverity(slotProps.option.value)" />
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
                                <span v-else>
                                    <Tag icon="pi pi-user" severity="info" value="個人"></Tag>
                                </span>
                            </template>
                            <template #filter="{ filterModel, filterCallback }">
                                <Select v-model="filterModel.value" @change="filterCallback()" :options="personTypeOptions"
                                    optionLabel="label" optionValue="value" placeholder="全て" class="p-column-filter" :showClear="true">
                                </Select>
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

    <Dialog
        class="dark:bg-gray-800 dark:text-gray-200"
        v-model:visible="dialogVisible"
        :header="'新規顧客登録'"
        :closable="true"
        :modal="true"
        :style="{ width: '50vw' }"
    >
        <div class="grid grid-cols-2 gap-2 gap-y-6 pt-6">
            <!-- Name of the person -->
            <div class="col-span-2 mb-6">
            <FloatLabel>
                <InputText
                v-model="newClient.name"
                fluid
                />
                <label>個人氏名 || 法人名称 【漢字又はローマ字】</label>
            </FloatLabel>
            </div>
            <div class="col-span-2 mb-6">
            <FloatLabel>
                <InputText
                v-model="newClient.name_kana"
                fluid
                />
                <label>カナ</label>
            </FloatLabel>
            </div>
            <!-- Type of person (Legal or Natural) -->
            <div class="col-span-1">
            <SelectButton
                v-model="newClient.legal_or_natural_person"
                :options="personTypeOptions"
                option-label="label"
                option-value="value"
                fluid
            />
            </div>
            <!-- Gender input if person is natural -->
            <div class="col-span-1">
            <div v-if="newClient.legal_or_natural_person === 'natural'" class="flex gap-3">
                <div v-for="option in genderOptions" :key="option.value" class="flex items-center gap-2">
                <RadioButton
                    v-model="newClient.gender"
                    :inputId="option.value"
                    :value="option.value"
                />
                <label :for="option.value">{{ option.label }}</label>
                </div>
            </div>
            </div>
            <!-- Email input -->
            <div class="col-span-1">
            <FloatLabel>
                <InputText
                v-model="newClient.email"
                :pattern="emailPattern"
                :class="{'p-invalid': !isValidEmail}"
                @input="validateEmail(newClient.email)"
                fluid
                />
                <label>メールアドレス</label>
            <small v-if="!isValidEmail" class="p-error">有効なメールアドレスを入力してください。</small>
            </FloatLabel>
            </div>
            <!-- Phone number input -->
            <div class="col-span-1">
            <FloatLabel>
                <InputText
                v-model="newClient.phone"
                :pattern="phonePattern"
                :class="{'p-invalid': !isValidPhone}"
                @input="validatePhone(newClient.phone)"
                fluid
                />
                <label>電話番号</label>
                <small v-if="!isValidPhone" class="p-error">有効な電話番号を入力してください。</small>
            </FloatLabel>
            </div>
        </div>
        <template #footer>
            <Button label="閉じる" icon="pi pi-times" @click="dialogOpenClose(false)" class="p-button-danger p-button-text p-button-sm" />
            <Button label="保存" icon="pi pi-check" @click="submitClient" class="p-button-success p-button-text p-button-sm" />
        </template>
    </Dialog>

    <ExportClientDialog :visible="exportDialogVisible" @close="closeExportDialog" :initialFilters="filters" />
    
</template>

<script setup>
    import { ref, onMounted } from "vue";
    import { useRouter } from 'vue-router';
    import { useClientStore } from '@/composables/useClientStore';    
    import { Card, Skeleton, DataTable, Column, Dialog, FloatLabel, SelectButton, RadioButton, InputText, Button, Tag, Select } from 'primevue';
    import { FilterMatchMode } from '@primevue/core/api';
    import { useToast } from 'primevue/usetoast'; // Import useToast
    import ExportClientDialog from './components/ExportClientDialog.vue';

    const exportDialogVisible = ref(false);

    const openExportDialog = () => {
      exportDialogVisible.value = true;
    };

    const closeExportDialog = () => {
      exportDialogVisible.value = false;
    };

    const router = useRouter();
    const { clients, clientsIsLoading, createBasicClient } = useClientStore();
    const toast = useToast(); // Initialize toast



    // Data table
    const tableSize = ref({ label: '中', value: 'null' });
    const tableSizeOptions = ref([
        { label: '小', value: 'small' },
        { label: '中', value: 'null' }
    ]);    
    const filters = ref({
        name: { value: null, matchMode: FilterMatchMode.CONTAINS },
        name_kanji: { value: null, matchMode: FilterMatchMode.CONTAINS },
        name_kana: { value: null, matchMode: FilterMatchMode.CONTAINS },
        phone: { value: null, matchMode: FilterMatchMode.CONTAINS },
        email: { value: null, matchMode: FilterMatchMode.CONTAINS },
        loyalty_tier: { value: null, matchMode: FilterMatchMode.EQUALS },
        // Added filter for legal_or_natural_person
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

    const goToEditClientPage = (clientId) => {
        const route = router.resolve({ name: 'ClientEdit', params: { clientId: clientId } });
        window.open(route.href, '_blank');
    };

    // Dialog
    const personTypeOptions = [
        { label: '法人', value: 'legal' },
        { label: '個人', value: 'natural' },
    ];
    const genderOptions = [
        { label: '男性', value: 'male' },
        { label: '女性', value: 'female' },
        { label: 'その他', value: 'other' },
    ];
    const dialogVisible = ref(false);
    const dialogOpenClose = (bool) => {
        dialogVisible.value = bool;
    };
    const newClient = ref({});
    const newClientReset = () => {
        newClient.value = {
            name: null,
            name_kana: null,
            legal_or_natural_person: null,
            gender: 'other',
            phone: null,
            email: null,
        }
    };    
    const emailPattern = /^[^\s@]+@[^\s@]+\\.[^\s@]+$/;
    const isValidEmail = ref(true);    
    const phonePattern = /^\\+(?:[0-9] ?){6,14}[0-9]$/;
    const isValidPhone = ref(true);
    const validateEmail = (email) => {
        isValidEmail.value = emailPattern.test(email);
    };
    const validatePhone = (phone) => {
        isValidPhone.value = phonePattern.test(phone);
    };
    const submitClient = async () => {
        // Check if either name or name_kana is filled
        if (!newClient.value.name && !newClient.value.name_kana) {
            toast.add({
                severity: 'warn',
                summary: '注意',
                detail: '氏名・名称またはカナの少なくとも 1 つを入力する必要があります。',
                life: 3000,
            });
            return;
        }
        // Check if either email or phone is filled
        if (!newClient.value.email && !newClient.value.phone) {
            toast.add({
                severity: 'warn',
                summary: '注意',
                detail: 'メールアドレスまたは電話番号の少なくとも 1 つを入力する必要があります。',
                life: 3000,
            });
            return;
        }
        // Check for valid email format
        if (newClient.value.email && !isValidEmail.value) {
            toast.add({
                severity: 'warn',
                summary: '注意',
                detail: '有効なメールアドレスを入力してください。',
                life: 3000,
            });
            return;
        }
        // Check for valid phone format
        if (newClient.value.phone && !isValidPhone.value) {
            toast.add({
                severity: 'warn',
                summary: '注意',
                detail: '有効な電話番号を入力してください。',
                life: 3000,
            });
            return;
        }

        try {
            const newBasicClient = await createBasicClient(newClient.value.name, newClient.value.name_kana, newClient.value.legal_or_natural_person, newClient.value.gender, newClient.value.email, newClient.value.phone);
            toast.add({
                severity: 'success',
                summary: '成功',
                detail: '新しいクライアントが作成されました',
                life: 3000,
            });
            goToEditClientPage(newBasicClient.id);
        } catch (error) {
            console.error('Failed to create basic client:', error);
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: `クライアントの作成に失敗しました: ${error.message || '不明なエラー'}`,
                life: 3000,
            });
            // Optionally reset form or loading state here if applicable
        }
    };

    onMounted( async () => {
        // console.log(clients);
        newClientReset();
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
<style scoped>
</style>
