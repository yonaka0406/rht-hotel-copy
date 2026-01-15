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
const totals = ref({ sales: 0, payments: 0, advance: 0, settlement: 0 });

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
const typeFilter = ref('all');
const rowsPerPage = ref(10);
const rowsPerPageOptions = [10, 25, 50, 100];

const filteredHotelDetails = computed(() => {
    let list = hotelDetails.value;
    
    // Status Filter
    if (statusFilter.value === 'settled') {
        list = list.filter(d => Math.abs(d.cumulative_difference) <= 1);
    } else if (statusFilter.value === 'outstanding') {
        list = list.filter(d => d.cumulative_difference < -1);
    } else if (statusFilter.value === 'overpaid') {
        list = list.filter(d => d.cumulative_difference > 1);
    }

    // Reservation Type Filter
    if (typeFilter.value === 'ota_web') {
        list = list.filter(d => d.is_ota_web);
    } else if (typeFilter.value === 'other') {
        list = list.filter(d => !d.is_ota_web);
    }
    
    return list;
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
            acc.advance += Number(curr.advance_payments || 0);
            acc.settlement += Number(curr.settlement_payments || 0);
            acc.difference += Number(curr.difference || 0);
            return acc;
        }, { sales: 0, payments: 0, advance: 0, settlement: 0, difference: 0 });

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
    typeFilter.value = 'all';
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

/**
 * 事前払 (Prepayment) Definition:
 * 対象月末時点で、チェックイン日が翌月以降となっている予約に対して行われた入金です。
 * これらは今月の売上と対比させるべき「精算」とは区別され、当月の精算差異には含まれません。
 */
const formatDiffValue = (val, cumulativeDiff = null) => {
    // If settled (cumulative balance is near 0), force the monthly difference display to 0
    if (cumulativeDiff !== null && Math.abs(cumulativeDiff) <= 1) return '0';
    // Force 0 for negligible rounding errors
    if (Math.abs(val) <= 1) return '0';
    return (val > 0 ? '+' : '') + Number(val).toLocaleString();
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

const getBalanceLabel = (cumulativeDifference, checkIn = null) => {
    if (Math.abs(cumulativeDifference) <= 1) return '精算済';
    if (cumulativeDifference < -1) return '未収あり';
    
    // Positive balance
    if (checkIn) {
        const monthEnd = new Date(selectedDate.value.getFullYear(), selectedDate.value.getMonth() + 1, 0);
        const checkInDate = new Date(checkIn);
        if (checkInDate > monthEnd) {
            return '事前払い';
        }
    }
    return '過入金';
};

onMounted(() => {
    // Default to previous month
    const today = new Date();
    selectedDate.value = new Date(today.getFullYear(), today.getMonth() - 1, 1);
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
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">合計売上 (税込)</p>
                    <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ formatCurrency(totals.sales) }}</p>
                    <p class="text-[10px] text-slate-400 mt-2">※ 対象月内に滞在（売上計上）があった予約の合計額</p>
                </div>
                <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">合計入金</p>
                            <p class="text-2xl font-bold text-slate-900 dark:text-white">{{ formatCurrency(totals.payments) }}</p>
                        </div>
                        <div class="text-right flex flex-col gap-1 pr-1">
                            <div class="flex items-center justify-end gap-3 text-[11px]">
                                <span class="text-slate-400">精算等:</span>
                                <span class="font-bold text-slate-700 dark:text-slate-300">{{ formatCurrency(totals.settlement) }}</span>
                            </div>
                            <div class="flex items-center justify-end gap-3 text-[11px]">
                                <span class="text-violet-400">事前払:</span>
                                <span class="font-bold text-violet-600 dark:text-violet-400">{{ formatCurrency(totals.advance) }}</span>
                            </div>
                            <div class="flex items-center justify-end gap-3 text-[11px] mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                                <span class="text-slate-400">精算差異 (売上 - 精算等):</span>
                                <span :class="[
                                    Math.abs(totals.difference) > 10 ? 'text-rose-500 font-bold' : 'text-slate-500'
                                ]">{{ formatCurrency(totals.difference) }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <p class="text-[9px] text-slate-400 leading-relaxed">
                            ※ <strong>事前払:</strong> 対象月末時点で、チェックイン日が翌月以降となっている予約に対して行われた入金です。<br/>
                            ※ <strong>精算等:</strong> 対象月末までにチェックイン済みの予約（滞在中の清算や過去分の回収等）に関連する入金です。<br/>
                            ※ <strong>精算差異:</strong> 売上と精算等入金の差額です。事前払は含まれません。
                        </p>
                    </div>
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
                                <template #body="{ data }">
                                    <div class="flex flex-col">
                                        <span>{{ formatCurrency(data.total_payments) }}</span>
                                        <span v-if="Number(data.advance_payments) > 0" class="text-[9px] text-violet-500 font-bold">
                                            (事前払: {{ Number(data.advance_payments).toLocaleString() }})
                                        </span>
                                    </div>
                                </template>
                            </Column>
                            <Column field="difference" header="精算差異 (売上 - 精算等)" sortable>
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
                            <div class="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800">
                                <div class="flex flex-wrap gap-4 items-center">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase w-12">入金状況:</span>
                                    <div class="flex gap-1">
                                        <Button label="全て" :severity="statusFilter === 'all' ? 'primary' : 'secondary'" size="small" text @click="statusFilter = 'all'" class="!py-1 !px-3 text-xs" />
                                        <Button label="未収あり" :severity="statusFilter === 'outstanding' ? 'danger' : 'secondary'" size="small" text @click="statusFilter = 'outstanding'" class="!py-1 !px-3 text-xs" />
                                        <Button label="過入金あり" :severity="statusFilter === 'overpaid' ? 'warn' : 'secondary'" size="small" text @click="statusFilter = 'overpaid'" class="!py-1 !px-3 text-xs" />
                                        <Button label="精算済" :severity="statusFilter === 'settled' ? 'success' : 'secondary'" size="small" text @click="statusFilter = 'settled'" class="!py-1 !px-3 text-xs" />
                                    </div>
                                </div>
                                <div class="flex flex-wrap gap-4 items-center">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase w-12">予約種別:</span>
                                    <div class="flex gap-1">
                                        <Button label="全て" :severity="typeFilter === 'all' ? 'primary' : 'secondary'" size="small" text @click="typeFilter = 'all'" class="!py-1 !px-3 text-xs" />
                                        <Button label="OTA/WEB" :severity="typeFilter === 'ota_web' ? 'primary' : 'secondary'" size="small" text @click="typeFilter = 'ota_web'" class="!py-1 !px-3 text-xs" />
                                        <Button label="その他" :severity="typeFilter === 'other' ? 'primary' : 'secondary'" size="small" text @click="typeFilter = 'other'" class="!py-1 !px-3 text-xs" />
                                    </div>
                                </div>
                                <div class="flex flex-wrap gap-4 items-center">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase w-12">表示件数:</span>
                                    <div class="flex gap-1">
                                        <Button 
                                            v-for="option in rowsPerPageOptions" 
                                            :key="option"
                                            :label="`${option}件`" 
                                            :severity="rowsPerPage === option ? 'primary' : 'secondary'" 
                                            size="small" 
                                            text 
                                            @click="rowsPerPage = option" 
                                            class="!py-1 !px-3 text-xs" 
                                        />
                                        <Button 
                                            label="全て表示" 
                                            :severity="rowsPerPage === 0 ? 'primary' : 'secondary'" 
                                            size="small" 
                                            text 
                                            @click="rowsPerPage = 0" 
                                            class="!py-1 !px-3 text-xs" 
                                        />
                                    </div>
                                </div>
                            </div>
                            <DataTable 
                                :value="filteredHotelDetails" 
                                :loading="isHotelLoading"
                                stripedRows
                                :paginator="rowsPerPage > 0"
                                :rows="rowsPerPage"
                                class="p-datatable-sm"
                                @row-click="(e) => handleClientSelect(e.data)"
                                rowHover
                            >
                                <Column field="client_name" header="顧客名" sortable></Column>
                                <Column field="total_sales" header="今月売上" sortable>
                                    <template #body="{ data }">{{ formatCurrency(data.total_sales) }}</template>
                                </Column>
                                <Column field="total_payments" header="今月入金" sortable>
                                    <template #body="{ data }">
                                        <div class="flex flex-col">
                                            <span>{{ formatCurrency(data.total_payments) }}</span>
                                            <span v-if="Number(data.advance_payments) > 0" class="text-[9px] text-violet-500 font-bold">
                                                (事前払: {{ Number(data.advance_payments).toLocaleString() }})
                                            </span>
                                        </div>
                                    </template>
                                </Column>
                                <Column field="difference" header="当月精算差異 (売上 - 精算等)" sortable>
                                    <template #body="{ data }">
                                        <span :class="[
                                            data.difference > 1 ? 'text-emerald-500 font-bold' : '',
                                            data.difference < -1 ? 'text-rose-500 font-bold' : '',
                                            Math.abs(data.difference) <= 1 ? 'text-slate-500' : ''
                                        ]">
                                            {{ formatDiffValue(data.difference, data.cumulative_difference) }}
                                        </span>
                                    </template>
                                </Column>
                                <Column header="累計ステータス">
                                    <template #body="{ data }">
                                        <Tag 
                                            :value="getBalanceLabel(data.cumulative_difference, data.check_in)" 
                                            :severity="Math.abs(data.cumulative_difference) <= 1 ? 'success' : (data.cumulative_difference > 1 ? 'warn' : 'danger')" 
                                            class="text-[10px]" 
                                        />
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
                                            <Tag 
                                                :value="'当月末' + getBalanceLabel(res.cumulative_difference, res.check_in)" 
                                                :severity="Math.abs(res.cumulative_difference) <= 1 ? 'success' : (res.cumulative_difference > 0 ? 'warn' : 'danger')" 
                                                class="text-[9px]" 
                                            />
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
