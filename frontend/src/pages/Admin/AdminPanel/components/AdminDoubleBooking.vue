<template>
    <div class="admin-double-booking">
        <h2 class="text-xl font-semibold mb-4">二重予約管理</h2>

        <div v-if="loading" class="text-center py-4">データを読み込み中...</div>
        <div v-else-if="error" class="text-center py-4 text-red-500">エラー: {{ error.message }}</div>
        <div v-else-if="doubleBookings.length === 0" class="text-center py-4">二重予約は見つかりませんでした。</div>
        <div v-else>
            <DataTable :value="doubleBookings" paginator :rows="10" :rowsPerPageOptions="[5, 10, 20, 50]"
                tableStyle="min-width: 50rem">
                <Column field="id" header="ID"></Column>
                <Column field="hotel_id" header="ホテルID"></Column>
                <Column field="room_id" header="部屋ID"></Column>
                <Column field="date" header="日付"></Column>
            </DataTable>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { useValidationStore } from '@/composables/useValidationStore';

const { doubleBookings, fetchDoubleBookings } = useValidationStore();

const loading = ref(true);
const error = ref(null);

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