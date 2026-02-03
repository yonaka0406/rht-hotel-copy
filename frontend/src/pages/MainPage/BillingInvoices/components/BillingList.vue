<template>
    <Panel class="m-2">
        <div>
            <div class="flex justify-end mr-4"><Button severity="help" @click="$emit('switchToBillingPage')">請求書作成画面へ</Button></div>
            <DataTable
                v-model:filters="filters"
                :selection="selectedReservations"
                @update:selection="$emit('update:selectedReservations', $event)"
                filterDisplay="row"
                :value="filteredReservations"
                :loading="tableLoading"
                size="small"
                :paginator="true"
                :rows="25"
                :rowsPerPageOptions="[5, 10, 25, 50, 100]"
                dataKey="id"                
                stripedRows
                @row-dblclick="openDrawer"
                removableSort
                v-model:expandedRows="expandedRows"
                :rowExpansion="true"
            >
                <template #header>
                    <div class="flex justify-between">
                        <span class="font-bold text-lg mb-4">{{ tableHeader }}</span>
                    </div>
                    <div class="mb-4 flex justify-end items-center">                        
                        <span class="font-bold mr-4">滞在期間選択：</span>
                        <label class="mr-2">開始日:</label>
                        <DatePicker v-model="startDateFilter" dateFormat="yy-mm-dd" placeholder="開始日を選択" :selectOtherMonths="true" />
                        <label class="ml-4 mr-2">終了日:</label>
                        <DatePicker v-model="endDateFilter" dateFormat="yy-mm-dd" placeholder="終了日を選択" :selectOtherMonths="true" />
                        <Button label="適用" class="ml-4" @click="applyDateFilters" :disabled="!startDateFilter || !endDateFilter" />
                    </div>
                </template>
                <template #empty> 指定されている期間中では予約ありません。 </template>                
                <Column expander header="詳細" style="width: 1%;"/>                
                <Column selectionMode="multiple" headerStyle="width: 1%"></Column>
                
                <Column field="status" filterField="status" header="ステータス" style="width:1%" :showFilterMenu="false">
                    <template #filter="{ filterModel: _filterModel, filterCallback }">                        
                        <Select 
                            v-model="_filterModel.value" 
                            :options="statusOptions" 
                            optionLabel="label"
                            optionValue="value" 
                            @change="filterCallback" 
                            placeholder="選択"
                            showClear 
                            fluid
                        />                        
                    </template>                    
                    <template #body="slotProps">
                        <div class="flex justify-center items-center">
                            <span v-if="slotProps.data.status === 'hold'" class="px-2 py-1 rounded-md bg-yellow-200 text-yellow-700"><i class="pi pi-pause" v-tooltip="'保留中'"></i></span>
                            <span v-if="slotProps.data.status === 'provisory'" class="px-2 py-1 rounded-md bg-cyan-200 text-cyan-700"><i class="pi pi-clock" v-tooltip="'仮予約'"></i></span>
                            <span v-if="slotProps.data.status === 'confirmed'" class="px-2 py-1 rounded-md bg-sky-200 text-sky-700"><i class="pi pi-check-circle" v-tooltip="'確定'"></i></span>
                            <span v-if="slotProps.data.status === 'checked_in'" class="px-2 py-1 rounded-md bg-green-200 text-green-700"><i class="pi pi-user" v-tooltip="'滞在中'"></i></span>
                            <span v-if="slotProps.data.status === 'checked_out'" class="px-2 py-1 rounded-md bg-purple-200 text-purple-700"><i class="pi pi-sign-out" v-tooltip="'アウト'"></i></span>
                            <span v-if="slotProps.data.status === 'cancelled'" class="px-2 py-1 rounded-md bg-gray-200 text-gray-700"><i class="pi pi-times" v-tooltip="'キャンセル'"></i></span>
                        </div>                        
                    </template>                    
                </Column>
                <Column field="booker_name" filterField="booker_name" header="予約者" style="width:1%" :showFilterMenu="false">
                    <template #filter="{}">
                        <InputText v-model="clientFilter" type="text" placeholder="氏名・名称検索" />
                    </template>
                </Column>
                <Column field="payment_timing" filterField="payment_timing" header="支払時期" sortable style="width:1%" :showFilterMenu="false">
                    <template #filter="{ filterModel: _filterModel, filterCallback }">                        
                        <Select 
                            v-model="_filterModel.value" 
                            :options="reservationPaymentTimingOptions" 
                            optionLabel="label"
                            optionValue="value" 
                            @change="filterCallback" 
                            placeholder="選択"
                            showClear 
                            fluid
                        />                        
                    </template>                    
                    <template #body="slotProps">
                        <span>{{ translateReservationPaymentTiming(slotProps.data.payment_timing) }}</span>
                    </template>
                </Column>                
                <Column field="period_payable" header="期間請求額" sortable style="width:1%">
                    <template #body="slotProps">
                        <div class="flex justify-end mr-2">
                            <span class="items-end">{{ formatCurrency(slotProps.data.period_payable) }}</span>
                        </div>                        
                    </template>                    
                </Column>
                <Column header="予約残高" sortable style="width:1%">
                    <template #body="slotProps">
                        <div class="grid gap-2">
                            <div class=" text-right">
                                {{ formatCurrency(slotProps.data.price - slotProps.data.payment) }}
                            </div>
                            <div class="text-xs text-right text-blue-500 flex items-center justify-end" title='予約合計'>
                                <i class="pi pi-receipt mr-1"></i>
                                {{ formatCurrency(slotProps.data.price) }}
                            </div>
                            <div class="text-xs text-right text-green-500 flex items-center justify-end" title='入金額'>
                                <i class="pi pi-money-bill mr-1"></i>
                                {{ formatCurrency(slotProps.data.payment) }}
                            </div>                            
                        </div>                        
                    </template>
                </Column>                
                <Column field="check_in" header="チェックイン" sortable style="width:1%">
                    <template #body="slotProps">                        
                        <span>{{ formatDateWithDay(slotProps.data.check_in) }}</span>
                    </template>                    
                </Column>
                <Column field="number_of_people" header="宿泊者数" sortable style="width:1%">
                    <template #body="slotProps">
                        <div class="flex justify-end mr-4">
                            <span>{{ slotProps.data.number_of_people }}</span>
                        </div>
                    </template> 
                </Column>
                <Column field="number_of_nights" header="宿泊日数" sortable style="width:1%">
                    <template #body="slotProps">
                        <div class="flex justify-end mr-4">
                            <span>{{ slotProps.data.number_of_nights }}</span>
                        </div>
                    </template> 
                </Column>

                <template #expansion="slotProps">
                    <div class="mx-20">
                        <div v-if="Array.isArray(slotProps.data.merged_clients)">
                            <DataTable :value="slotProps.data.merged_clients" size="small">
                                <Column header="氏名・名称" sortable>
                                    <template #body="clientSlotProps">
                                        {{ clientSlotProps.data.name_kanji || clientSlotProps.data.name_kana || clientSlotProps.data.name || '' }}
                                    </template>
                                </Column>
                                <Column header="カナ" sortable>
                                    <template #body="clientSlotProps">
                                        {{ clientSlotProps.data.name_kana || '' }}
                                    </template>
                                </Column>
                                <Column header="漢字" sortable>
                                    <template #body="clientSlotProps">
                                        {{ clientSlotProps.data.name_kanji || '' }}
                                    </template>
                                </Column>
                                <Column header="タグ" sortable>
                                    <template #body="clientSlotProps">
                                        <div v-if="clientSlotProps.data.role === 'guest'">
                                            <Badge value="宿泊者" severity="contrast"/>
                                        </div>
                                        <div v-else>
                                            <Badge value="支払者" severity="info"/>
                                        </div>
                                        
                                    </template>
                                </Column>
                            </DataTable>
                        </div>
                        <div v-else>
                            <p>宿泊者データがありません。</p>
                        </div>
                    </div>
                </template>
            </DataTable>            
        </div>
        <ReservationEditDrawer
            v-model:visible="drawerVisible"
            :reservationId="selectedReservation?.id"
        />
    </Panel>

    <!-- Floating Bulk Action Bar -->
    <Transition name="layout-sidebar">
        <div v-if="selectedReservations && selectedReservations.length > 0"
             class="fixed bottom-12 z-50 transition-all duration-500 ease-in-out cursor-pointer"
             :style="isBarExpanded ? { left: '50%', transform: 'translateX(-50%)' } : { left: 'calc(100% - 6rem)', transform: 'translateX(0)' }"
             @mouseenter="handleMouseEnter"
             @mouseleave="handleMouseLeave"
             @click="!isBarExpanded ? isBarExpanded = true : null"
        >
            <div class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-full shadow-xl flex items-center backdrop-blur-md bg-opacity-90 transition-all duration-500"
                 :class="isBarExpanded ? 'px-6 py-3 gap-6 max-w-xl' : 'px-3 py-3 gap-0 max-w-[4rem]'">

                <div class="flex items-center gap-3 shrink-0">
                    <OverlayBadge
                        :value="selectedReservations.length"
                        severity="danger"
                        size="small"
                    >
                        <div class="bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full w-10 h-10 flex items-center justify-center">
                            <i class="pi pi-shopping-cart text-xl"></i>
                        </div>
                    </OverlayBadge>
                    <div class="flex flex-col transition-all duration-500 whitespace-nowrap"
                         :class="isBarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'">
                        <span class="text-sm font-bold leading-none">{{ selectedReservations.length }}件の予約を選択中</span>
                        <span class="text-xs text-surface-500 mt-1 italic">まとめ請求書を作成できます</span>
                    </div>
                </div>

                <div class="h-8 w-px bg-surface-200 dark:bg-surface-700 transition-all duration-500"
                     :class="isBarExpanded ? 'opacity-100 mx-2' : 'opacity-0 w-0 mx-0 overflow-hidden'"></div>

                <Button
                    label="まとめ請求書を作成"
                    icon="pi pi-paperclip"
                    @click.stop="$emit('openBulkDrawer')"
                    severity="help"
                    rounded
                    class="font-bold shadow-sm px-6 whitespace-nowrap transition-all duration-500"
                    :class="isBarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 p-0 border-0 overflow-hidden'"
                />
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue';
import ReservationEditDrawer from './drawers/ReservationEditDrawer.vue';

// Primevue
import { Panel, DatePicker, Select, InputText, Button, DataTable, Column, Badge, OverlayBadge } from 'primevue';
import { FilterMatchMode } from '@primevue/core/api';

// Stores
import { useBillingStore } from '@/composables/useBillingStore';
const { billableList, fetchBillableListView } = useBillingStore();
import { useHotelStore } from '@/composables/useHotelStore';
const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();

import { translateReservationPaymentTiming, reservationPaymentTimingOptions } from '@/utils/reservationUtils';

const props = defineProps({
    selectedReservations: {
        type: Array,
        default: () => []
    },
    startDate: {
        type: Date,
        default: () => new Date(new Date().setDate(new Date().getDate() - 6))
    },
    endDate: {
        type: Date,
        default: () => new Date()
    }
});

const emit = defineEmits(['update:selectedReservations', 'openBulkDrawer', 'switchToBillingPage', 'update:startDate', 'update:endDate']);

// Helper function
const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.error("Invalid Date object:", date);
        throw new Error("The provided input is not a valid Date object:");
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const formatDateWithDay = (date) => {
    const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
    const parsedDate = new Date(date);
    return `${parsedDate.toLocaleDateString('ja-JP', options)}`;
};
const formatCurrency = (value) => {
    if (value == null) return '';
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
};

// Load
const loadTableData = async () => {
    tableLoading.value = true;
    await fetchBillableListView(selectedHotelId.value, formatDate(props.startDate), formatDate(props.endDate));
    tableHeader.value = `請求可能予約一覧 ${formatDateWithDay(props.startDate)} ～ ${formatDateWithDay(props.endDate)}`;
    tableLoading.value = false;
}

// Filters     
const startDateFilter = computed({
    get: () => props.startDate,
    set: (val) => emit('update:startDate', val)
});
const endDateFilter = computed({
    get: () => props.endDate,
    set: (val) => emit('update:endDate', val)
}); 
const statusOptions = [
    { label: '保留中', value: 'hold' },
    { label: '仮予約', value: 'provisory' },
    { label: '確定', value: 'confirmed' },
    { label: '滞在中', value: 'checked_in' },
    { label: 'アウト', value: 'checked_out' },
    { label: 'キャンセル', value: 'cancelled' }
];
const clientFilter = ref(null);
const applyDateFilters = async () => {
    if (startDateFilter.value && endDateFilter.value) {            
        await loadTableData();
    }
};

const filteredReservations = computed(() => {
    let filteredList = billableList.value;
    // merged_clients
    if(filteredList){
        filteredList = filteredList.map(reservation => {
            const guests = Array.isArray(reservation.clients_json) ? reservation.clients_json.map(client => ({
                ...client,
                role: "guest"
            })) : [];
            const payers = Array.isArray(reservation.payers_json) ? reservation.payers_json.map(payer => ({
                ...payer,
                role: "payer"
            })) : [];

            // Merge guests and payers while keeping unique client_id
            const uniqueClients = new Map();
            [...guests, ...payers].forEach(client => {
                if (!uniqueClients.has(client.client_id)) {
                    uniqueClients.set(client.client_id, client);
                }
            });               

            return {
                ...reservation,
                merged_clients: Array.from(uniqueClients.values())
            };
        });
    }               

    if (clientFilter.value !== null && clientFilter.value !== ''){
        filteredList = filteredList.filter(reservation => {
            const clientName = reservation.booker_name.toLowerCase();
            const clientNameKana = reservation.booker_name_kana ? reservation.booker_name_kana.toLowerCase() : '';
            const clientNameKanji = reservation.booker_name_kanji ? reservation.booker_name_kanji.toLowerCase() : '';
            const filterClients = clientFilter.value.toLowerCase();
            
            return (clientName && clientName.includes(filterClients)) ||
                (clientNameKana && clientNameKana.includes(filterClients)) ||
                (clientNameKanji && clientNameKanji.includes(filterClients))                     
        });
    }
    
    return filteredList
});

// Data Table
const tableHeader = ref(`請求可能予約一覧 ${formatDateWithDay(startDateFilter.value)} ～ ${formatDateWithDay(endDateFilter.value)}`)
const tableLoading = ref(true);
const drawerVisible = ref(false); // Local drawer for ReservationEdit
const selectedReservation = ref(null);
const expandedRows = ref({});    
const filters = ref({        
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },        
    payment_timing: { value: null, matchMode: FilterMatchMode.CONTAINS },
});    
const openDrawer = (event) => {    
    selectedReservation.value = event.data;    
    drawerVisible.value = true;
};

// Floating Bar Logic
const isBarExpanded = ref(false);
let collapseTimeout = null;

const startCollapseTimer = () => {
    clearTimeout(collapseTimeout);
    collapseTimeout = setTimeout(() => {
        isBarExpanded.value = false;
    }, 4000);
};

const handleMouseEnter = () => {
    clearTimeout(collapseTimeout);
    isBarExpanded.value = true;
};

const handleMouseLeave = () => {
    startCollapseTimer();
};

watch(() => props.selectedReservations.length, (newLength) => {
    if (newLength > 0) {
        isBarExpanded.value = true;
        startCollapseTimer();
    } else {
        isBarExpanded.value = false;
    }
});

onBeforeUnmount(() => {
    clearTimeout(collapseTimeout);
});

// Expose reload function to parent if needed, or just rely on watch
defineExpose({ loadTableData, applyDateFilters });

onMounted(async () => {
    await fetchHotels();
    await fetchHotel();
});

watch(() => [selectedHotelId.value], // Watch multiple values
    async () => {                                          
        await fetchHotels();            
        await fetchHotel();            
        await loadTableData();
    },
    { immediate: true }
); 
</script>

<style scoped>
.layout-sidebar-enter-active,
.layout-sidebar-leave-active {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.layout-sidebar-enter-from,
.layout-sidebar-leave-to {
    transform: translate(-50%, 2rem);
    opacity: 0;
}

.layout-sidebar-enter-to,
.layout-sidebar-leave-from {
    transform: translate(-50%, 0);
    opacity: 1;
}
</style>