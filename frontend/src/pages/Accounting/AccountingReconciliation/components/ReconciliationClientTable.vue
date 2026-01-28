<script setup>
import { ref, computed, watch } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

const props = defineProps({
    hotelDetails: {
        type: Array,
        required: true
    },
    isLoading: {
        type: Boolean,
        default: false
    },
    selectedHotel: {
        type: Object,
        required: true
    },
    selectedDate: {
        type: Date,
        required: true
    }
});

const emit = defineEmits(['close-hotel-view', 'select-client']);

const statusFilter = ref('all');
const typeFilter = ref('all');
const rowsPerPage = ref(10);
const rowsPerPageOptions = [10, 25, 50, 100];

const filteredHotelDetails = computed(() => {
    let list = props.hotelDetails;
    
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

// Reset filters when hotel changes
watch(() => props.selectedHotel, () => {
    statusFilter.value = 'all';
    typeFilter.value = 'all';
});

const formatCurrency = (val) => {
    return Number(val).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
};

const formatDiffValue = (val, cumulativeDiff = null) => {
    if (cumulativeDiff !== null && Math.abs(cumulativeDiff) <= 1) return '0';
    if (Math.abs(val) <= 1) return '0';
    return (val > 0 ? '+' : '') + Number(val).toLocaleString();
};

const getBalanceLabel = (cumulativeDifference, checkIn = null) => {
    if (Math.abs(cumulativeDifference) <= 1) return '精算済';
    if (cumulativeDifference < -1) return '未収あり';
    
    // Positive balance
    if (checkIn) {
        const monthEnd = new Date(props.selectedDate.getFullYear(), props.selectedDate.getMonth() + 1, 0);
        const checkInDate = new Date(checkIn);
        if (checkInDate > monthEnd) {
            return '事前払い';
        }
    }
    return '過入金';
};

const handleRowClick = (event) => {
    emit('select-client', event.data);
};
</script>

<template>
    <section class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 class="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <i class="pi pi-building text-violet-600"></i>
                {{ selectedHotel.hotel_name }} の差異状況
            </h2>
            <Button icon="pi pi-times" @click="$emit('close-hotel-view')" severity="secondary" text rounded size="small" />
        </div>

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
            :loading="isLoading"
            stripedRows
            :paginator="rowsPerPage > 0"
            :rows="rowsPerPage"
            class="p-datatable-sm"
            @row-click="handleRowClick"
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
    </section>
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
