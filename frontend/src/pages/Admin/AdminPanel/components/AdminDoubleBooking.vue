<template>
    <div class="admin-double-booking">
        <h2 class="text-xl font-semibold mb-4">二重予約管理</h2>

        <div v-if="loading" class="text-center py-4">データを読み込み中...</div>
        <div v-else-if="error" class="text-center py-4 text-red-500">エラー: {{ error.message }}</div>
        <div v-else-if="doubleBookings.length === 0" class="text-center py-4">二重予約は見つかりませんでした。</div>
        <div v-else>
            <DataTable :value="doubleBookings" paginator :rows="10" :rowsPerPageOptions="[5, 10, 20, 50]"
                tableStyle="min-width: 50rem">
                <Column field="hotel_name" header="ホテル名"></Column>
                <Column field="room_number" header="部屋番号"></Column>
                <Column header="日付">
                    <template #body="slotProps">
                        {{ formatDate(new Date(slotProps.data.date)) }}
                    </template>
                </Column>
                <Column header="重複予約">
                    <template #body="slotProps">
                        <div v-for="res in slotProps.data.conflicting_reservations" :key="res.reservation_detail_id" class="mb-1">
                            <Button
                                :label="`予約ID: ${res.reservation_id.substring(0, 8)}... (${formatDate(new Date(res.check_in))}, ${res.number_of_nights}泊, ${res.client_name})`"
                                icon="pi pi-external-link"
                                class="p-button-sm p-button-text"
                                @click="openReservationEdit(res.reservation_id)"
                            />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { useValidationStore } from '@/composables/useValidationStore';
import { formatDate } from '@/utils/dateUtils';

const { doubleBookings, fetchDoubleBookings } = useValidationStore();

const loading = ref(true);
const error = ref(null);

const openReservationEdit = (id) => {
    const url = `/reservations/edit/${id}`;
    window.open(url, '_blank');
};

onMounted(async () => {
    try {
        await fetchDoubleBookings();
    } catch (err) {
        error.value = err;
        console.error('Error fetching double bookings:', err);
    } finally {
        loading.value = false;
    }
});
</script>

<style scoped>
/* Scoped styles for AdminDoubleBooking.vue */
</style>