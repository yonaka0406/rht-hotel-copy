<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Button from 'primevue/button';

// Sub-components
import UtilityBillFilters from './components/UtilityBillFilters.vue';
import UtilityBillDataTable from './components/UtilityBillDataTable.vue';
import UtilityBillSuggestions from './components/UtilityBillSuggestions.vue';
import UtilityBillFormDialog from './components/UtilityBillFormDialog.vue';

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
            endMonth: formatDate(end),
            filterBy: 'transaction_date'
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

const handleSave = async (itemData) => {
    isSaving.value = true;
    try {
        const data = { ...itemData };

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

const accountingTotal = computed(() => {
    return rawSuggestions.value.reduce((sum, s) => sum + parseFloat(s.amount), 0);
});

const detailedTotal = computed(() => {
    return utilityDetails.value.reduce((sum, d) => sum + parseFloat(d.total_value), 0);
});

const comparisonProgress = computed(() => {
    if (accountingTotal.value === 0) return 0;
    return Math.min(100, (detailedTotal.value / accountingTotal.value) * 100);
});

const isMatched = computed(() => {
    return accountingTotal.value > 0 && Math.abs(accountingTotal.value - detailedTotal.value) < 1;
});

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
            <UtilityBillFilters
                v-model:hotelId="selectedHotelId"
                v-model:month="selectedMonth"
                :hotels="hotelStore.hotels.value"
                :loading="isLoading"
                @refresh="fetchUtilityData"
            />

            <!-- Summary Bar -->
            <div class="mb-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-xl overflow-hidden relative">
                <div v-if="isMatched" class="absolute top-0 right-0 p-4">
                    <div class="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1 shadow-lg animate-bounce">
                        <i class="pi pi-check-circle"></i> Matched
                    </div>
                </div>

                <div class="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wider" v-tooltip.top="'弥生会計の合計金額に対して、詳細がどこまで入力されたかを示します'">入力状況</h3>
                            <span v-if="accountingTotal > 0" class="text-xs font-bold" :class="isMatched ? 'text-emerald-500' : 'text-violet-500'">
                                {{ Math.round(comparisonProgress) }}% 完了
                            </span>
                        </div>
                        <div class="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                class="h-full transition-all duration-1000 ease-out rounded-full"
                                :class="isMatched ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'"
                                :style="{ width: `${comparisonProgress}%` }"
                            ></div>
                        </div>
                    </div>

                    <div class="flex items-center gap-12">
                        <div class="text-center">
                            <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">弥生会計合計</div>
                            <div class="text-xl font-black text-slate-900 dark:text-white font-mono">
                                ¥{{ new Intl.NumberFormat('ja-JP').format(accountingTotal) }}
                            </div>
                        </div>
                        <div class="text-center">
                            <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">詳細入力合計</div>
                            <div class="text-xl font-black font-mono" :class="isMatched ? 'text-emerald-500' : 'text-slate-900 dark:text-white'">
                                ¥{{ new Intl.NumberFormat('ja-JP').format(detailedTotal) }}
                            </div>
                        </div>
                        <div class="text-center" v-tooltip.top="'弥生会計合計と詳細入力合計の差分です。0になると完了です。'">
                            <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">差分</div>
                            <div class="text-xl font-black font-mono" :class="isMatched ? 'text-emerald-500' : 'text-rose-500'">
                                ¥{{ new Intl.NumberFormat('ja-JP').format(accountingTotal - detailedTotal) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Main List -->
                <div class="lg:col-span-2">
                    <UtilityBillDataTable
                        :utility-details="utilityDetails"
                        :loading="isLoading"
                        @edit="openEditDialog"
                        @delete="deleteItem"
                    />
                </div>

                <!-- Suggestions -->
                <div>
                    <UtilityBillSuggestions
                        :suggestions="processedSuggestions"
                        :loading="isLoading"
                        @select="openAddDialog"
                    />
                </div>
            </div>
        </div>

        <!-- Edit Dialog -->
        <UtilityBillFormDialog
            v-model:visible="showEditDialog"
            :item="editingItem"
            :loading="isSaving"
            @save="handleSave"
        />
    </div>
</template>
