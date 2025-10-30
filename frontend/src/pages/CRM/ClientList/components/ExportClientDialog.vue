<template>
    <Dialog
        class="dark:bg-gray-800 dark:text-gray-200"
        :visible="visible"
        @update:visible="closeDialog"
        header="顧客データのエクスポート"
        :closable="true"
        :modal="true"
        :style="{ width: '30vw' }"
    >
        <div class="grid grid-cols-1 gap-4 pt-4">
            <div class="col-span-1 mt-6">
                <FloatLabel>
                    <DatePicker v-model="createdAfter" showIcon fluid @date-select="updateClientCount" @hide="updateClientCount" />
                    <label>以降に作成された顧客</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 mt-6">
                <FloatLabel>
                    <InputText v-model="exportFilters.name" @input="updateClientCount" fluid />
                    <label>氏名・名称</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 mt-6">
                <FloatLabel>
                    <InputText v-model="exportFilters.phone" @input="updateClientCount" fluid />
                    <label>電話番号</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 mt-6">
                <FloatLabel>
                    <InputText v-model="exportFilters.email" @input="updateClientCount" fluid />
                    <label>メールアドレス</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 mt-6">
                <FloatLabel>
                    <Select v-model="exportFilters.loyalty_tier" :options="loyaltyTierFilterOptions" optionLabel="label" optionValue="value" placeholder="ロイヤルティ層" @change="updateClientCount" class="w-full" :showClear="true" />
                    <label>ロイヤルティ層</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 mt-6">
                <FloatLabel>
                    <Select v-model="exportFilters.legal_or_natural_person" :options="personTypeOptions" optionLabel="label" optionValue="value" placeholder="法人 / 個人" @change="updateClientCount" class="w-full" :showClear="true" />
                    <label>法人 / 個人</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 text-right">
                <span class="text-sm text-gray-500 dark:text-gray-400">エクスポートされる顧客数: {{ formattedClientCount }}</span>
            </div>
        </div>
        <template #footer>
            <Button label="閉じる" icon="pi pi-times" @click="closeDialog" class="p-button-danger p-button-text p-button-sm" :disabled="loading" />
            <Button label="ダウンロード" icon="pi pi-download" @click="downloadClients" class="p-button-success p-button-text p-button-sm" :disabled="loading" :loading="loading" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, defineProps, defineEmits, watch, computed } from 'vue';
import { Dialog, Button, DatePicker, FloatLabel, InputText, Select } from 'primevue';
import { useClientStore } from '@/composables/useClientStore';
import { useToast } from 'primevue/usetoast'; // Import useToast

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    // New prop to receive filters from parent
    initialFilters: {
        type: Object,
        default: () => ({})
    }
});

const emit = defineEmits(['close']);

const { fetchExportClientsCount, downloadClients: downloadClientsFromStore } = useClientStore(); // Renamed to avoid conflict
const toast = useToast(); // Initialize toast

const createdAfter = ref(null);
const clientCount = ref(0);
const loading = ref(false);

const formattedClientCount = computed(() => {
    return new Intl.NumberFormat('ja-JP').format(clientCount.value);
});

// Local ref for filters, initialized from initialFilters prop
const exportFilters = ref({
    name: null,
    phone: null,
    email: null,
    loyalty_tier: null,
    legal_or_natural_person: null,
});

// Options for select dropdowns (copied from ClientList.vue)
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

const updateClientCount = async () => {
    const filtersToSend = {
        created_after: createdAfter.value ? createdAfter.value.toISOString() : null,
        ...exportFilters.value
    };
    clientCount.value = await fetchExportClientsCount(filtersToSend);
};

watch(() => props.visible, async (newValue) => {
    if (newValue) {
        // Reset createdAfter and initialize exportFilters from initialFilters prop when dialog opens
        createdAfter.value = null;
        // Correctly extract the 'value' from each filter object
        exportFilters.value = {
            name: props.initialFilters.name?.value || null,
            phone: props.initialFilters.phone?.value || null,
            email: props.initialFilters.email?.value || null,
            loyalty_tier: props.initialFilters.loyalty_tier?.value || null,
            legal_or_natural_person: props.initialFilters.legal_or_natural_person?.value || null,
        };
        await updateClientCount(); // Fetch initial count
    }
});

const closeDialog = () => {
    emit('close');
};

const downloadClients = async () => {
  loading.value = true; // Set loading to true when download starts
  try {
    const filtersToSend = {
        created_after: createdAfter.value ? createdAfter.value.toISOString() : null,
        ...exportFilters.value
    };
    const filename = await downloadClientsFromStore(filtersToSend); // Call store function
    toast.add({
        severity: 'success',
        summary: '成功',
        detail: `${filename} がエクスポートされました`,
        life: 3000,
    });
    closeDialog();
  } catch (error) {
    console.error('Failed to download clients:', error);
    toast.add({
        severity: 'error',
        summary: 'エラー',
        detail: `クライアントのエクスポートに失敗しました: ${error.message || '不明なエラー'}`,
        life: 3000,
    });
  } finally {
    loading.value = false; // Set loading to false when download finishes (success or failure)
  }
};
</script>

<style scoped>
</style>