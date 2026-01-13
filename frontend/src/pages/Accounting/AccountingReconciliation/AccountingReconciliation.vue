<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { useHotelStore } from '@/composables/useHotelStore';
import DatePicker from 'primevue/datepicker';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import ReservationEdit from '@/pages/MainPage/Reservation/ReservationEdit.vue';
import { formatDateToYMD } from '@/utils/dateUtils';
import { translateReservationStatus } from '@/utils/reservationUtils';

const accountingStore = useAccountingStore();
const hotelStore = useHotelStore();

// State
const selectedDate = ref(new Date());
const isLoading = ref(false);
const overviewData = ref([]);
const totals = ref({ sales: 0, payments: 0 });

// Drill down state
const selectedHotel = ref(null);
const hotelDetails = ref([]);
const isHotelLoading = ref(false);

const selectedClient = ref(null);
const clientDetails = ref([]);
const isClientLoading = ref(false);

const selectedReservationId = ref(null);
const showReservationModal = ref(false);

const statusFilter = ref('all');
const filteredHotelDetails = computed(() => {
    if (statusFilter.value === 'all') return hotelDetails.value;
    if (statusFilter.value === 'settled') return hotelDetails.value.filter(d => Math.abs(d.cumulative_difference) <= 1);
    if (statusFilter.value === 'outstanding') return hotelDetails.value.filter(d => d.cumulative_difference < -1);
    if (statusFilter.value === 'overpaid') return hotelDetails.value.filter(d => d.cumulative_difference > 1);
    return hotelDetails.value;
});

// Helper: Format YYYY-MM
const formatMonth = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const getMonthRange = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const format = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    return { startDate: format(start), endDate: format(end) };
};

const fetchOverview = async () => {
    try {
        isLoading.value = true;
        const range = getMonthRange(selectedDate.value);
        const data = await accountingStore.fetchReconciliationOverview(range);
        overviewData.value = data;
        
        totals.value = data.reduce((acc, curr) => {
            acc.sales += Number(curr.total_sales);
            acc.payments += Number(curr.total_payments);
            return acc;
        }, { sales: 0, payments: 0 });

    } catch (e) {
        console.error('Failed to fetch reconciliation overview', e);
    } finally {
        isLoading.value = false;
    }
};

const handleHotelSelect = async (hotel) => {
    selectedHotel.value = hotel;
    selectedClient.value = null;
    hotelDetails.value = [];
    statusFilter.value = 'all';
    try {
        isHotelLoading.value = true;
        const range = getMonthRange(selectedDate.value);
        const data = await accountingStore.fetchReconciliationHotelDetails(hotel.hotel_id, range);
        hotelDetails.value = data;
    } catch (e) {
        console.error('Failed to fetch hotel details', e);
    } finally {
        isHotelLoading.value = false;
    }
};

const handleClientSelect = async (client) => {
    selectedClient.value = client;
    clientDetails.value = [];
    try {
        isClientLoading.value = true;
        const range = getMonthRange(selectedDate.value);
        const data = await accountingStore.fetchReconciliationClientDetails(selectedHotel.value.hotel_id, client.client_id, range);
        clientDetails.value = data;
    } catch (e) {
        console.error('Failed to fetch client details', e);
    } finally {
        isClientLoading.value = false;
    }
};

const openReservation = (resId) => {
    selectedReservationId.value = resId;
    showReservationModal.value = true;
};

const openInNewTab = (resId) => {
    const url = window.location.origin + `/reservations/edit/${resId}`;
    window.open(url, '_blank');
};

const closeHotelView = () => {
    selectedHotel.value = null;
    selectedClient.value = null;
};

const formatCurrency = (val) => {
    return Number(val).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
};

onMounted(() => {
    // Default to last month if day is 1-15, else current month
    const today = new Date();
    if (today.getDate() < 10) {
        selectedDate.value = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    }
    fetchOverview();
});

watch(selectedDate, () => {
    selectedHotel.value = null;
    selectedClient.value = null;
    fetchOverview();
});
</script>

<template>
    <div class="bg-slate-50 dark:bg-slate-900 min-h-screen p-6 font-sans transition-colors duration-300">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div class="flex items-center gap-4">
                    <button @click="$router.push({ name: 'AccountingDashboard' })" class="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <i class="pi pi-arrow-left text-slate-600 dark:text-slate-400"></i>
                    </button>
                    <div>
                        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">入金照合・差異分析</h1>
                        <p class="text-sm text-slate-500 dark:text-slate-400">売上計上額と実際の入金額の突合を行います</p>
                    </div>
                </div>

                <div class="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-w-[240px]">
                    <span class="text-sm font-medium text-slate-600 dark:text-slate-400 ml-2 whitespace-nowrap">対象月:</span>
                    <DatePicker 
                        v-model="selectedDate" 
                        view="month" 
                        dateFormat="yy/mm" 
                        showIcon 
                        iconDisplay="input"
                        fluid
                        class="flex-1"
                    />
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">合計売上 (税込)</p>
                    <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ formatCurrency(totals.sales) }}</p>
                </div>
                <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">合計入金</p>
                    <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ formatCurrency(totals.payments) }}</p>
                </div>
                <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700" :class="Math.abs(totals.payments - totals.sales) > 10 ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-emerald-500'">
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">不一致額合計</p>
                    <p class="text-2xl font-bold" :class="Math.abs(totals.payments - totals.sales) > 10 ? 'text-rose-600' : 'text-emerald-600'">
                        {{ formatCurrency(totals.payments - totals.sales) }}
                    </p>
                </div>
            </div>

            <!-- Content Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                <!-- Main Comparison Table (Overview or Hotel Details) -->
                <div class="lg:col-span-8">
                    <section class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h2 class="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <i :class="selectedHotel ? 'pi pi-building' : 'pi pi-list'" class="text-violet-600"></i>
                                {{ selectedHotel ? `${selectedHotel.hotel_name} の差異状況` : '施設別 差異一覧' }}
                            </h2>
                            <Button v-if="selectedHotel" icon="pi pi-times" @click="closeHotelView" severity="secondary" text rounded size="small" />
                        </div>

                        <DataTable 
                            v-if="!selectedHotel"
                            :value="overviewData" 
                            :loading="isLoading"
                            stripedRows
                            class="p-datatable-sm"
                            @row-click="(e) => handleHotelSelect(e.data)"
                            rowHover
                        >
                            <Column field="hotel_name" header="施設名" sortable></Column>
                            <Column field="total_sales" header="売上計上" sortable>
                                <template #body="{ data }">{{ formatCurrency(data.total_sales) }}</template>
                            </Column>
                            <Column field="total_payments" header="入金額" sortable>
                                <template #body="{ data }">{{ formatCurrency(data.total_payments) }}</template>
                            </Column>
                            <Column field="difference" header="差異" sortable>
                                <template #body="{ data }">
                                    <span :class="[
                                        data.difference > 1 ? 'text-emerald-500 font-bold' : '',
                                        data.difference < -1 ? 'text-rose-500 font-bold' : '',
                                        Math.abs(data.difference) <= 1 ? 'text-slate-500' : ''
                                    ]">
                                        {{ (data.difference > 0 ? '+' : '') + Number(data.difference).toLocaleString() }}
                                    </span>
                                </template>
                            </Column>
                            <Column class="w-12">
                                <template #body>
                                    <i class="pi pi-chevron-right text-slate-300"></i>
                                </template>
                            </Column>
                        </DataTable>

                        <div v-else>
                            <div class="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap gap-4 items-center">
                                <span class="text-xs font-bold text-slate-500 uppercase">絞り込み:</span>
                                <div class="flex gap-2">
                                    <Button 
                                        label="全て" 
                                        :severity="statusFilter === 'all' ? 'primary' : 'secondary'" 
                                        size="small" 
                                        text 
                                        @click="statusFilter = 'all'" 
                                        class="!py-1"
                                    />
                                    <Button 
                                        label="未収あり" 
                                        :severity="statusFilter === 'outstanding' ? 'danger' : 'secondary'" 
                                        size="small" 
                                        text 
                                        @click="statusFilter = 'outstanding'"
                                        class="!py-1"
                                    />
                                    <Button 
                                        label="過入金あり" 
                                        :severity="statusFilter === 'overpaid' ? 'warn' : 'secondary'" 
                                        size="small" 
                                        text 
                                        @click="statusFilter = 'overpaid'"
                                        class="!py-1"
                                    />
                                    <Button 
                                        label="精算済" 
                                        :severity="statusFilter === 'settled' ? 'success' : 'secondary'" 
                                        size="small" 
                                        text 
                                        @click="statusFilter = 'settled'"
                                        class="!py-1"
                                    />
                                </div>
                            </div>
                            <DataTable 
                                :value="filteredHotelDetails" 
                                :loading="isHotelLoading"
                                stripedRows
                                paginator :rows="10"
                                class="p-datatable-sm"
                                @row-click="(e) => handleClientSelect(e.data)"
                                rowHover
                            >
                                <Column field="client_name" header="顧客名" sortable></Column>
                                <Column field="total_sales" header="今月売上" sortable>
                                    <template #body="{ data }">{{ formatCurrency(data.total_sales) }}</template>
                                </Column>
                                <Column field="total_payments" header="今月入金" sortable>
                                    <template #body="{ data }">{{ formatCurrency(data.total_payments) }}</template>
                                </Column>
                                <Column field="difference" header="当月差異" sortable>
                                    <template #body="{ data }">
                                        <span :class="[
                                            data.difference > 1 ? 'text-emerald-500 font-bold' : '',
                                            data.difference < -1 ? 'text-rose-500 font-bold' : '',
                                            Math.abs(data.difference) <= 1 ? 'text-slate-500' : ''
                                        ]">
                                            {{ (data.difference > 0 ? '+' : '') + Number(data.difference).toLocaleString() }}
                                        </span>
                                    </template>
                                </Column>
                                <Column header="累計ステータス">
                                    <template #body="{ data }">
                                        <Tag v-if="Math.abs(data.cumulative_difference) <= 1" value="精算済" severity="success" class="text-[10px]" />
                                        <Tag v-else :value="data.cumulative_difference > 1 ? '過入金' : '未収あり'" :severity="data.cumulative_difference > 1 ? 'warn' : 'danger'" class="text-[10px]" />
                                    </template>
                                </Column>
                            </DataTable>
                        </div>
                    </section>
                </div>

                <!-- Right Side: Drill-down to Reservations -->
                <div class="lg:col-span-4">
                    <div v-if="selectedClient" class="sticky top-6">
                        <section class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div class="p-4 bg-violet-50 dark:bg-violet-900/10 border-b border-violet-100 dark:border-violet-900/30">
                                <h3 class="font-bold text-violet-900 dark:text-violet-200">予約別内訳: {{ selectedClient.client_name }}</h3>
                                <p class="text-[10px] text-violet-600 dark:text-violet-400 uppercase font-bold mt-1">
                                    差異: {{ (selectedClient.difference > 0 ? '+' : '') + formatCurrency(selectedClient.difference) }}
                                </p>
                            </div>
                            
                            <div v-if="isClientLoading" class="p-12 flex justify-center">
                                <ProgressSpinner style="width: 40px; height: 40px" />
                            </div>
                            
                            <div v-else-if="clientDetails.length" class="divide-y divide-slate-100 dark:divide-slate-700">
                                <div v-for="res in clientDetails" :key="res.reservation_id" class="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                    <div class="flex justify-between items-start mb-2">
                                        <div>
                                            <span class="text-xs font-bold text-slate-400">#{{ res.reservation_id.substring(0,8) }}</span>
                                            <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                {{ formatDateToYMD(res.check_in) }} ～ {{ formatDateToYMD(res.check_out) }}
                                            </p>
                                        </div>
                                        <div class="flex flex-col items-end gap-1">
                                            <Tag :value="translateReservationStatus(res.status)" severity="info" class="text-[10px]" />
                                            <!-- Balance Status as of Month End -->
                                            <Tag v-if="Math.abs(res.cumulative_difference) <= 1" value="当月末精算済" severity="success" class="text-[9px]" />
                                            <Tag v-else :value="res.cumulative_difference > 0 ? '当月末過入金' : '当月末未収'" :severity="res.cumulative_difference > 0 ? 'warn' : 'danger'" class="text-[9px]" />
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-2 gap-2 text-xs mb-1">
                                        <div class="text-slate-500">今月売上: <span class="text-slate-700 dark:text-slate-300">{{ formatCurrency(res.month_sales) }}</span></div>
                                        <div class="text-slate-500">今月入金: <span class="text-slate-700 dark:text-slate-300">{{ formatCurrency(res.month_payments) }}</span></div>
                                    </div>
                                    <div class="text-[10px] text-slate-400 mb-3 flex flex-col gap-0.5">
                                        <div class="flex justify-between">
                                            <span>前月繰越: {{ formatCurrency(res.brought_forward_balance) }}</span>
                                            <span class="font-bold" :class="res.cumulative_difference < 0 ? 'text-rose-500' : 'text-emerald-600'">当月末残高: {{ formatCurrency(res.cumulative_difference) }}</span>
                                        </div>
                                        <div class="border-t border-slate-100 dark:border-slate-800 pt-1 mt-1 opacity-60">
                                            全体合計: 売上 {{ formatCurrency(res.total_sales) }} / 入金 {{ formatCurrency(res.total_payments) }}
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <Button icon="pi pi-pencil" label="修正" class="p-button-xs flex-1" severity="secondary" @click="openReservation(res.reservation_id)" />
                                        <Button icon="pi pi-external-link" text class="p-button-xs" severity="secondary" @click="openInNewTab(res.reservation_id)" title="別タブで開く" />
                                    </div>
                                </div>
                            </div>
                            
                            <div v-else class="p-8 text-center text-slate-400 italic">
                                データがありません
                            </div>
                        </section>
                    </div>
                    
                    <div v-else class="bg-slate-100 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                        <i class="pi pi-search text-3xl text-slate-300 mb-4"></i>
                        <p class="text-slate-400 text-sm">左の表から施設・顧客を選択して<br>差異のある予約を特定してください</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Reservation Edit Modal -->
        <Dialog v-model:visible="showReservationModal" modal header="予約編集" :style="{ width: '90vw', maxWidth: '1200px' }" class="p-0">
            <div class="h-[80vh] overflow-y-auto">
                <ReservationEdit :reservation_id="selectedReservationId" v-if="selectedReservationId" />
            </div>
            <template #footer>
                <div class="flex justify-between items-center w-full">
                    <Button label="別タブで開く" icon="pi pi-external-link" text @click="openInNewTab(selectedReservationId)" />
                    <Button label="閉じる" icon="pi pi-times" severity="secondary" @click="showReservationModal = false" />
                </div>
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
:deep(.p-datatable-sm .p-datatable-tbody > tr > td) {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
}
:deep(.p-button-xs) {
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
}
</style>
