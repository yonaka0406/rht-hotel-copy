<template>
    <Panel class="m-2">
        <ReservationListFilters :searchType="searchType" @update:searchType="searchType = $event"
            :searchTypeOptions="searchTypeOptions" :startDateFilter="startDateFilter"
            @update:startDateFilter="startDateFilter = $event" :endDateFilter="endDateFilter"
            @update:endDateFilter="endDateFilter = $event" :dateRangeLabel="dateRangeLabel"
            :exportOptions="exportOptions" @apply="applyDateFilters" @clear="clearAllFilters" @export="handleExport" />

        <ReservationListTable :reservations="filteredReservations" :loading="tableLoading" :filters="filters"
            @update:filters="filters = $event" :selectedReservations="selectedReservations"
            @update:selectedReservations="selectedReservations = $event" :expandedRows="expandedRows"
            @update:expandedRows="expandedRows = $event" :tableHeader="tableHeader" :statusOptions="statusOptions"
            :clientFilterInput="clientFilterInput" @update:clientFilterInput="clientFilterInput = $event"
            :clientsJsonFilterInput="clientsJsonFilterInput"
            @update:clientsJsonFilterInput="clientsJsonFilterInput = $event" :priceFilter="priceFilter"
            @update:priceFilter="priceFilter = $event" :priceFilterCondition="priceFilterCondition"
            @update:priceFilterCondition="priceFilterCondition = $event" :paymentFilter="paymentFilter"
            @update:paymentFilter="paymentFilter = $event" :paymentFilterCondition="paymentFilterCondition"
            @update:paymentFilterCondition="paymentFilterCondition = $event" @row-dblclick="openDrawer" />

        <ReservationListSummary :visible="drawerSelectVisible" @update:visible="drawerSelectVisible = $event"
            :selectedReservations="selectedReservations" />

        <Drawer v-model:visible="drawerVisible" :modal="true" :position="'bottom'" :style="{ height: '75vh' }"
            :closable="true">
            <div class="flex justify-end" v-if="selectedReservation">
                <Button @click="goToReservation" severity="info">
                    <i class="pi pi-arrow-right"></i><span>編集ページへ</span>
                </Button>
            </div>
            <ReservationEdit v-if="selectedReservation" :reservation_id="selectedReservation.id" />
        </Drawer>
    </Panel>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from "primevue/usetoast";
import { Panel, Drawer, Button } from 'primevue';
import { FilterMatchMode } from '@primevue/core/api';

import ReservationListFilters from './components/ReservationListFilters.vue';
import ReservationListTable from './components/ReservationListTable.vue';
import ReservationListSummary from './components/ReservationListSummary.vue';
import ReservationEdit from '../Reservation/ReservationEdit.vue';

import { useReportStore } from '@/composables/useReportStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { formatDate, formatDateWithDay } from '@/utils/dateUtils';

const router = useRouter();
const toast = useToast();

const { reservationList, fetchReservationListView, exportReservationList, exportReservationDetails, exportMealCount, exportAccommodationTax } = useReportStore();
const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();

// State
const searchType = ref({ value: 'stay_period', label: '滞在期間' });
const startDateFilter = ref(new Date(new Date().setDate(new Date().getDate() - 6)));
const endDateFilter = ref(new Date());
const tableLoading = ref(true);
const selectedReservations = ref([]);
const expandedRows = ref({});
const filters = ref({
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
});
const clientFilterInput = ref(null);
const clientsJsonFilterInput = ref(null);
const priceFilter = ref(null);
const priceFilterCondition = ref("=");
const paymentFilter = ref(null);
const paymentFilterCondition = ref("=");
const clientFilter = ref(null);
const clientsJsonFilter = ref(null);

const drawerVisible = ref(false);
const selectedReservation = ref(null);
const drawerSelectVisible = ref(false);
const tableHeader = ref(`予約一覧 ${formatDateWithDay(startDateFilter.value)} ～ ${formatDateWithDay(endDateFilter.value)}`);

// Options
const searchTypeOptions = [
    { value: 'stay_period', label: '滞在期間' },
    { value: 'check_in', label: 'チェックイン日' },
    { value: 'created_at', label: '作成日' }
];

const statusOptions = [
    { label: '保留中', value: 'hold' },
    { label: '仮予約', value: 'provisory' },
    { label: '確定', value: 'confirmed' },
    { label: '滞在中', value: 'checked_in' },
    { label: 'アウト', value: 'checked_out' },
    { label: 'キャンセル', value: 'cancelled' }
];

const dateRangeLabel = computed(() => {
    switch (searchType.value.value) {
        case 'check_in':
            return { start: 'チェックイン開始日', end: 'チェックイン終了日' };
        case 'created_at':
            return { start: '作成開始日', end: '作成終了日' };
        default: // stay_period
            return { start: '開始日', end: '終了日' };
    }
});

// Actions
const loadTableData = async () => {
    tableLoading.value = true;
    try {
        await fetchReservationListView(
            selectedHotelId.value,
            formatDate(startDateFilter.value),
            formatDate(endDateFilter.value),
            searchType.value.value
        );
        tableHeader.value = `予約一覧 ${formatDateWithDay(startDateFilter.value)} ～ ${formatDateWithDay(endDateFilter.value)}`;
    } catch (_error) {
        toast.add({ severity: 'error', summary: 'エラー', detail: 'データの読み込み中にエラーが発生しました', life: 3000 });
    } finally {
        tableLoading.value = false;
    }
};

const applyDateFilters = async () => {
    if (startDateFilter.value && endDateFilter.value) {
        await loadTableData();
    }
};

const clearAllFilters = async () => {
    startDateFilter.value = new Date(new Date().setDate(new Date().getDate() - 6));
    endDateFilter.value = new Date();

    if (filters.value.status) {
        filters.value.status.value = null;
    }

    clientFilterInput.value = '';
    clientsJsonFilterInput.value = '';
    priceFilter.value = null;
    priceFilterCondition.value = "=";
    paymentFilter.value = null;
    paymentFilterCondition.value = "=";

    await loadTableData();
    toast.add({ severity: 'info', summary: 'フィルタークリア', detail: '全てのフィルターをクリアしました。', life: 3000 });
};

const openDrawer = (event) => {
    selectedReservation.value = event.data;
    drawerVisible.value = true;
};

const goToReservation = () => {
    const routeData = router.resolve({ name: 'ReservationEdit', params: { reservation_id: selectedReservation.value.id } });
    window.open(routeData.href, '_blank');
};

// Export Logic
const exportOptions = ref([
    { label: "予約の詳細をエクスポート", icon: "pi pi-file", command: () => splitButtonExportReservationDetails() },
    { label: "食事件数をエクスポート", icon: "pi pi-file-excel", command: () => splitButtonExportMealCount() },
    { label: "宿泊税レポート", icon: "pi pi-file-excel", command: () => splitButtonExportAccommodationTax() },
]);



const splitButtonExportReservations = async () => {
    try {
        await exportReservationList(selectedHotelId.value, formatDate(startDateFilter.value), formatDate(endDateFilter.value));
        toast.add({ severity: "success", summary: "成功", detail: "予約データをエクスポートしました", life: 3000 });
    } catch (error) {
        console.error("エクスポートエラー:", error);
        toast.add({ severity: "error", summary: "エラー", detail: "エクスポートに失敗しました", life: 3000 });
    }
};

// Note: The SplitButton in ReservationListFilters uses :model="exportOptions".
// The main click action of SplitButton triggers @click="$emit('export')".
// In ReservationListFilters, the main button click emits 'export'.
// Here we need to bind that to splitButtonExportReservations.
// Wait, the SplitButton in filters has @click="$emit('export')".
// So in the template above: @export="handleExport".
// But handleExport is empty. We should call splitButtonExportReservations.
// Let's fix that function binding.

const splitButtonExportReservationDetails = async () => {
    try {
        await exportReservationDetails(selectedHotelId.value, formatDate(startDateFilter.value), formatDate(endDateFilter.value));
        toast.add({ severity: "success", summary: "成功", detail: "予約の詳細をエクスポートしました", life: 3000 });
    } catch (error) {
        console.error("エクスポートエラー:", error);
        toast.add({ severity: "error", summary: "エラー", detail: "エクスポートに失敗しました", life: 3000 });
    }
};

const splitButtonExportMealCount = async () => {
    try {
        const result = await exportMealCount(selectedHotelId.value, formatDate(startDateFilter.value), formatDate(endDateFilter.value));
        if (result === 'no_data') {
            toast.add({ severity: 'info', summary: '情報', detail: 'エクスポート可能な食事データがありません。', life: 3000 });
            return;
        }
        toast.add({ severity: "success", summary: "成功", detail: "食事件数をエクスポートしました", life: 3000 });
    } catch (error) {
        console.error("エクスポートエラー:", error);
        toast.add({ severity: "error", summary: "エラー", detail: "エクスポートに失敗しました", life: 3000 });
    }
};

const splitButtonExportAccommodationTax = async () => {
    try {
        await exportAccommodationTax(selectedHotelId.value, formatDate(startDateFilter.value), formatDate(endDateFilter.value));
        toast.add({ severity: "success", summary: "成功", detail: "宿泊税レポートをエクスポートしました", life: 3000 });
    } catch (error) {
        console.error("エクスポートエラー:", error);
        toast.add({ severity: "error", summary: "エラー", detail: "エクスポートに失敗しました", life: 3000 });
    }
};

// Helper
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
};

// Computed Data
const filteredReservations = computed(() => {
    let filteredList = reservationList.value;

    if (!filteredList || filteredList.length === 0) {
        return [];
    }

    filteredList = filteredList.map(reservation => {
        const guests = Array.isArray(reservation.clients_json) ? reservation.clients_json.map(client => ({
            ...client,
            role: "guest"
        })) : [];
        const payers = Array.isArray(reservation.payers_json) ? reservation.payers_json.map(payer => ({
            ...payer,
            role: "payer"
        })) : [];

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

    if (clientFilter.value !== null && clientFilter.value !== '') {
        const filterClients = clientFilter.value.toLowerCase();
        filteredList = filteredList.filter(reservation => {
            const bookerFields = [
                reservation.booker_name,
                reservation.booker_name_kana,
                reservation.booker_name_kanji
            ].filter(Boolean).map(x => x.toLowerCase());

            const allClients = [];
            if (Array.isArray(reservation.clients_json)) {
                allClients.push(...reservation.clients_json);
            }
            if (Array.isArray(reservation.payers_json)) {
                allClients.push(...reservation.payers_json);
            }
            const clientFields = allClients.flatMap(client => [
                client.name,
                client.name_kana,
                client.name_kanji
            ].filter(Boolean).map(x => x.toLowerCase()));

            const match = [...bookerFields, ...clientFields].some(field => field.includes(filterClients));
            return match;
        });
    }

    if (clientsJsonFilter.value !== null && clientsJsonFilter.value !== '') {
        filteredList = filteredList.filter(reservation => {
            const clients = reservation.clients_json;
            const filterClients = clientsJsonFilter.value.toLowerCase();
            return Array.isArray(clients) && clients.some(client =>
                (client.name && client.name.toLowerCase().includes(filterClients)) ||
                (client.name_kana && client.name_kana.toLowerCase().includes(filterClients)) ||
                (client.name_kanji && client.name_kanji.toLowerCase().includes(filterClients))
            );
        });
    }

    if (priceFilter.value !== null) {
        filteredList = filteredList.filter(reservation => {
            const price = parseFloat(reservation.price);
            const filterPrice = parseFloat(priceFilter.value);

            if (priceFilterCondition.value === ">") {
                return price > filterPrice;
            } else if (priceFilterCondition.value === "<") {
                return price < filterPrice;
            } else {
                return price === filterPrice;
            }
        });
    }

    if (paymentFilter.value !== null) {
        filteredList = filteredList.filter(reservation => {
            const payment = parseFloat(reservation.payment);
            const filterPayment = parseFloat(paymentFilter.value);
            if (paymentFilterCondition.value === ">") {
                return payment > filterPayment;
            } else if (paymentFilterCondition.value === "<") {
                return payment < filterPayment;
            } else {
                return payment === filterPayment;
            }
        });
    }

    return filteredList;
});

// Watchers
onMounted(async () => {
    await fetchHotels();
    await fetchHotel();
});

watch(() => [selectedHotelId.value],
    async () => {
        await fetchHotels();
        await fetchHotel();
        await loadTableData();
    },
    { immediate: true }
);

watch(startDateFilter, (newStart) => {
    if (newStart && endDateFilter.value && newStart > endDateFilter.value) {
        endDateFilter.value = newStart;
        toast.add({
            severity: 'info',
            summary: '日付調整',
            detail: '終了日を開始日に合わせて調整しました。',
            life: 3000
        });
    }
});

watch(endDateFilter, (newEnd) => {
    if (newEnd && startDateFilter.value && newEnd < startDateFilter.value) {
        startDateFilter.value = newEnd;
        toast.add({
            severity: 'info',
            summary: '日付調整',
            detail: '開始日を終了日に合わせて調整しました。',
            life: 3000
        });
    }
});

watch(clientFilterInput, debounce((newValue) => {
    clientFilter.value = newValue;
}, 400));

watch(clientsJsonFilterInput, debounce((newValue) => {
    clientsJsonFilter.value = newValue;
}, 400));

watch(selectedReservations, (newValue) => {
    if (drawerVisible.value === false) {
        drawerSelectVisible.value = newValue.length > 0;
    }
});

// Correct the export handler
const handleExport = () => {
    splitButtonExportReservations();
};

</script>
