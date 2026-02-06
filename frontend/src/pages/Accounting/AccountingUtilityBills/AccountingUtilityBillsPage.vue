<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import Select from 'primevue/select';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import { getUtilityUnit } from '@/utils/accountingUtils';

const accountingStore = useAccountingStore();
const hotelStore = useHotelStore();
const toast = useToast();
const confirm = useConfirm();

const selectedMonth = ref(new Date());
const selectedHotelId = ref(hotelStore.selectedHotelId.value);
const utilityDetails = ref([]);
const rawSuggestions = ref([]);
const isLoading = ref(false);
const isSaving = ref(false);

const showEditDialog = ref(false);
const editingItem = ref({
    id: null,
    hotel_id: null,
    month: null,
    transaction_date: new Date(),
    account_name: '水道光熱費',
    sub_account_name: '',
    quantity: 0,
    total_value: 0,
    provider_name: ''
});


const fetchUtilityData = async () => {
    if (!selectedHotelId.value || !selectedMonth.value) return;

    isLoading.value = true;
    try {
        const d = selectedMonth.value;
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);

        const formatDate = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const params = {
            hotelId: selectedHotelId.value,
            startMonth: formatDate(start),
            endMonth: formatDate(end)
        };

        const [details, suggested] = await Promise.all([
            accountingStore.fetchUtilityDetails(params),
            accountingStore.fetchUtilitySuggestions({
                hotelId: selectedHotelId.value,
                month: formatDate(start)
            })
        ]);

        utilityDetails.value = details;
        rawSuggestions.value = suggested.map(s => ({
            ...s,
            transaction_date: new Date(s.transaction_date)
        }));
    } catch (e) {
        console.error('Failed to fetch utility data:', e);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'データの取得に失敗しました。', life: 5000 });
    } finally {
        isLoading.value = false;
    }
};

const openAddDialog = (suggestion = null) => {
    const d = selectedMonth.value;
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);

    editingItem.value = {
        id: null,
        hotel_id: selectedHotelId.value,
        month: startOfMonth,
        transaction_date: suggestion ? suggestion.transaction_date : new Date(),
        account_name: suggestion ? suggestion.account_name : '水道光熱費',
        sub_account_name: suggestion ? suggestion.sub_account_name : '',
        quantity: 0,
        total_value: suggestion ? Math.abs(suggestion.amount) : 0,
        provider_name: suggestion ? suggestion.summary : ''
    };
    showEditDialog.value = true;
};

const openEditDialog = (item) => {
    editingItem.value = {
        ...item,
        transaction_date: new Date(item.transaction_date),
        month: new Date(item.month)
    };
    showEditDialog.value = true;
};

const saveUtilityDetail = async () => {
    isSaving.value = true;
    try {
        const data = { ...editingItem.value };

        // Format dates for backend
        const formatDate = (date) => {
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        data.month = formatDate(data.month);
        data.transaction_date = formatDate(data.transaction_date);

        await accountingStore.upsertUtilityDetail(data);
        toast.add({ severity: 'success', summary: '成功', detail: '保存しました。', life: 3000 });
        showEditDialog.value = false;
        fetchUtilityData();
    } catch (e) {
        console.error('Failed to save utility detail:', e);
        toast.add({ severity: 'error', summary: 'エラー', detail: '保存に失敗しました。', life: 5000 });
    } finally {
        isSaving.value = false;
    }
};

const deleteItem = (id) => {
    confirm.require({
        message: 'このデータを削除してもよろしいですか？',
        header: '削除の確認',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: { label: '削除', severity: 'danger' },
        rejectProps: { label: 'キャンセル', severity: 'secondary', outlined: true },
        accept: async () => {
            try {
                await accountingStore.deleteUtilityDetail(id);
                toast.add({ severity: 'success', summary: '成功', detail: '削除しました。', life: 3000 });
                fetchUtilityData();
            } catch (_e) {
                toast.add({ severity: 'error', summary: 'エラー', detail: '削除に失敗しました。', life: 5000 });
            }
        }
    });
};

const formatCurrency = (val) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(val);
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP');
};

const processedSuggestions = computed(() => {
    return rawSuggestions.value.map(s => {
        const isRegistered = utilityDetails.value.some(d =>
            d.sub_account_name === s.sub_account_name &&
            Math.round(d.total_value) === Math.round(Math.abs(s.amount)) &&
            new Date(d.transaction_date).toDateString() === new Date(s.transaction_date).toDateString()
        );
        return { ...s, isRegistered };
    }).sort((a, b) => {
        if (a.isRegistered && !b.isRegistered) return 1;
        if (!a.isRegistered && b.isRegistered) return -1;
        return 0;
    });
});

watch([selectedHotelId, selectedMonth], () => {
    fetchUtilityData();
});

onMounted(async () => {
    if (hotelStore.hotels.value.length === 0) {
        await hotelStore.fetchHotels();
    }
    selectedHotelId.value = hotelStore.selectedHotelId.value;
    fetchUtilityData();
});
</script>

<template>
    <div class="bg-slate-50 dark:bg-slate-900 p-6 font-sans transition-colors duration-300 min-h-screen">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div class="flex items-center gap-4">
                    <div class="flex-shrink-0 inline-flex items-center justify-center p-3 bg-violet-100 dark:bg-violet-900/30 rounded-2xl">
                        <i class="pi pi-bolt text-2xl text-violet-600 dark:text-violet-400"></i>
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            光熱費詳細入力
                        </h1>
                        <p class="text-sm text-slate-600 dark:text-slate-400">
                            水道・電気・ガスの使用量と料金を記録します
                        </p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <Button label="戻る" icon="pi pi-arrow-left" severity="secondary" text @click="$router.back()" />
                    <Button label="新規追加" icon="pi pi-plus" @click="openAddDialog()" />
                </div>
            </div>

            <!-- Filters -->
            <div class="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">施設:</span>
                    <Select v-model="selectedHotelId" :options="hotelStore.hotels.value" optionLabel="name" optionValue="id" placeholder="施設を選択" fluid class="w-56" />
                </div>

                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">対象月:</span>
                    <DatePicker v-model="selectedMonth" view="month" dateFormat="yy/mm" fluid class="w-40" />
                </div>

                <Button icon="pi pi-refresh" @click="fetchUtilityData" :loading="isLoading" severity="secondary" rounded text />
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Main List -->
                <div class="lg:col-span-2">
                    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div class="p-6 border-b border-slate-100 dark:border-slate-700">
                            <h2 class="text-lg font-bold text-slate-900 dark:text-white">登録済みデータ</h2>
                        </div>
                        <DataTable :value="utilityDetails" :loading="isLoading" size="small" class="p-datatable-sm">
                            <template #empty>データがありません。</template>
                            <Column field="transaction_date" header="取引日">
                                <template #body="slotProps">{{ formatDate(slotProps.data.transaction_date) }}</template>
                            </Column>
                            <Column field="sub_account_name" header="科目/補助科目">
                                <template #body="slotProps">
                                    <div class="flex flex-col">
                                        <span class="font-bold">{{ slotProps.data.sub_account_name }}</span>
                                        <span class="text-[10px] text-slate-400">{{ slotProps.data.account_name }}</span>
                                    </div>
                                </template>
                            </Column>
                            <Column field="quantity" header="数量" text-right>
                                <template #body="slotProps">
                                    {{ slotProps.data.quantity }} <small class="text-slate-400">{{ getUtilityUnit(slotProps.data.sub_account_name) }}</small>
                                </template>
                            </Column>
                            <Column field="total_value" header="合計金額" text-right>
                                <template #body="slotProps">{{ formatCurrency(slotProps.data.total_value) }}</template>
                            </Column>
                            <Column field="average_price" header="平均単価" text-right>
                                <template #body="slotProps">{{ formatCurrency(slotProps.data.average_price) }}</template>
                            </Column>
                            <Column header="操作" class="w-24">
                                <template #body="slotProps">
                                    <div class="flex gap-1">
                                        <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" @click="openEditDialog(slotProps.data)" />
                                        <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="deleteItem(slotProps.data.id)" />
                                    </div>
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </div>

                <!-- Suggestions -->
                <div>
                    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div class="p-6 border-b border-slate-100 dark:border-slate-700">
                            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <i class="pi pi-lightbulb text-amber-500"></i>
                                弥生データからの提案
                            </h2>
                            <p class="text-xs text-slate-500 mt-1">未入力の取引と思われる項目を表示しています</p>
                        </div>
                        <div class="max-h-[600px] overflow-y-auto">
                            <div v-if="isLoading" class="p-6 space-y-4">
                                <div v-for="i in 3" :key="i" class="animate-pulse flex flex-col gap-2">
                                    <div class="h-4 bg-slate-100 rounded w-1/3"></div>
                                    <div class="h-8 bg-slate-100 rounded"></div>
                                </div>
                            </div>
                            <div v-else-if="suggestions.length === 0" class="p-8 text-center text-slate-400">
                                <i class="pi pi-check-circle text-3xl mb-2"></i>
                                <p>提案はありません</p>
                            </div>
                            <div v-else class="divide-y divide-slate-50 dark:divide-slate-700/50">
                                <div v-for="(s, idx) in processedSuggestions" :key="idx"
                                    class="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group"
                                    :class="{ 'opacity-60 bg-slate-50/50': s.isRegistered }"
                                    @click="openAddDialog(s)">
                                    <div class="flex justify-between items-start mb-1">
                                        <div class="flex gap-1">
                                            <Tag :value="formatDate(s.transaction_date)" severity="secondary" class="text-[10px]" />
                                            <Tag v-if="s.isRegistered" value="登録済み" severity="success" class="text-[10px]" />
                                        </div>
                                        <span class="font-mono font-bold text-slate-900 dark:text-white">{{ formatCurrency(Math.abs(s.amount)) }}</span>
                                    </div>
                                    <div class="font-bold text-sm text-slate-700 dark:text-slate-300">{{ s.sub_account_name }}</div>
                                    <div class="text-xs text-slate-400 truncate">{{ s.summary }}</div>
                                    <div class="mt-2 text-[10px] text-violet-600 dark:text-violet-400 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <i class="pi pi-plus"></i> 詳細を入力する
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Edit Dialog -->
        <Dialog v-model:visible="showEditDialog" :header="editingItem.id ? 'データを編集' : '新規データ入力'" modal class="w-full max-w-md">
            <div class="flex flex-col gap-4 py-4">
                <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-slate-400 uppercase">対象月</label>
                    <DatePicker v-model="editingItem.month" view="month" dateFormat="yy/mm" fluid />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-slate-400 uppercase">取引日</label>
                    <DatePicker v-model="editingItem.transaction_date" dateFormat="yy/mm/dd" fluid />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-slate-400 uppercase">補助科目</label>
                    <InputText v-model="editingItem.sub_account_name" placeholder="例: 電気代" fluid />
                </div>
                <div class="flex flex-col gap-1">
                    <label class="text-xs font-bold text-slate-400 uppercase">請求元 / プロバイダー</label>
                    <InputText v-model="editingItem.provider_name" placeholder="例: 東京電力" fluid />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-slate-400 uppercase">数量 ({{ getUtilityUnit(editingItem.sub_account_name) }})</label>
                        <InputNumber v-model="editingItem.quantity" :minFractionDigits="2" fluid />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-xs font-bold text-slate-400 uppercase">合計金額 (税込)</label>
                        <InputNumber v-model="editingItem.total_value" mode="currency" currency="JPY" locale="ja-JP" fluid />
                    </div>
                </div>
                <div v-if="editingItem.quantity > 0" class="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 mt-2">
                    <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">計算された平均単価</div>
                    <div class="text-lg font-bold text-violet-600 dark:text-violet-400 font-mono">
                        {{ formatCurrency(editingItem.total_value / editingItem.quantity) }} / {{ getUtilityUnit(editingItem.sub_account_name) }}
                    </div>
                </div>
            </div>
            <template #footer>
                <Button label="キャンセル" icon="pi pi-times" severity="secondary" text @click="showEditDialog = false" />
                <Button label="保存" icon="pi pi-check" :loading="isSaving" @click="saveUtilityDetail" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
:deep(.p-datatable-sm .p-datatable-thead > tr > th) {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}
:deep(.p-datatable-sm .p-datatable-tbody > tr > td) {
    padding: 0.75rem 1rem;
}
</style>
