<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import ReconciliationHeader from './components/ReconciliationHeader.vue';
import ReconciliationSummary from './components/ReconciliationSummary.vue';
import ReconciliationHotelTable from './components/ReconciliationHotelTable.vue';
import ReconciliationClientTable from './components/ReconciliationClientTable.vue';
import ReconciliationReservationList from './components/ReconciliationReservationList.vue';
import ReservationEditDialog from './components/ReservationEditDialog.vue';

const accountingStore = useAccountingStore();

// State
const selectedDate = ref(new Date());
const isLoading = ref(false);
const overviewData = ref([]);
const totals = ref({ sales: 0, payments: 0, advance: 0, settlement: 0, difference: 0 });

// Drill down state
const selectedHotel = ref(null);
const hotelDetails = ref([]);
const isHotelLoading = ref(false);

const selectedClient = ref(null);
const clientDetails = ref([]);
const isClientLoading = ref(false);

const selectedReservationId = ref(null);
const showReservationModal = ref(false);

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
            <ReconciliationHeader 
                v-model:selectedDate="selectedDate" 
            />

            <!-- Summary Cards -->
            <ReconciliationSummary :totals="totals" />

            <!-- Content Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                <!-- Main Comparison Table (Overview or Hotel Details) -->
                <div class="lg:col-span-8">
                    
                    <ReconciliationHotelTable 
                        v-if="!selectedHotel"
                        :overviewData="overviewData" 
                        :isLoading="isLoading"
                        @select-hotel="handleHotelSelect"
                    />

                    <ReconciliationClientTable 
                        v-else
                        :hotelDetails="hotelDetails"
                        :isLoading="isHotelLoading"
                        :selectedHotel="selectedHotel"
                        :selectedDate="selectedDate"
                        @close-hotel-view="closeHotelView"
                        @select-client="handleClientSelect"
                    />
                </div>

                <!-- Right Side: Drill-down to Reservations -->
                <ReconciliationReservationList 
                    :selectedClient="selectedClient"
                    :clientDetails="clientDetails"
                    :isLoading="isClientLoading"
                    :selectedDate="selectedDate"
                    @open-reservation="openReservation"
                    @open-in-new-tab="openInNewTab"
                />
            </div>
        </div>

        <!-- Reservation Edit Modal -->
        <ReservationEditDialog 
            v-model:visible="showReservationModal"
            :reservationId="selectedReservationId"
            @open-in-new-tab="openInNewTab"
        />
    </div>
</template>