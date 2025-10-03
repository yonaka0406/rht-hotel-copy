<template>
    <div class="admin-empty-reservations">
        <div v-if="loading" class="flex justify-center items-center py-4">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" fill="var(--surface-ground)" animationDuration=".5s" aria-label="Custom ProgressSpinner" />
        </div>
        <div v-else-if="error" class="text-center py-4 text-red-500">エラー: {{ error.message }}</div>
        <div v-else-if="emptyReservations.length === 0" class="text-center py-4">空の予約は見つかりませんでした。</div>
        <div v-else>
            <DataTable :value="emptyReservations" paginator :rows="10" :rowsPerPageOptions="[5, 10, 20, 50]"
                tableStyle="min-width: 50rem">
                <Column header="予約ID">
                    <template #body="slotProps">
                        <Button
                            label="表示"
                            icon="pi pi-external-link"
                            class="p-button-sm p-button-text"
                            @click="openReservationEdit(slotProps.data.reservation_id)"
                        />
                    </template>
                </Column>
                <Column field="hotel_name" header="ホテル名"></Column>
                <Column field="client_name" header="顧客名"></Column>
                <Column header="チェックイン">
                    <template #body="slotProps">
                        {{ formatDate(new Date(slotProps.data.check_in)) }}
                    </template>
                </Column>
                <Column field="number_of_nights" header="泊数"></Column>
                <Column field="status" header="ステータス"></Column>
                <Column field="type" header="タイプ"></Column>
            </DataTable>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, defineExpose } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import { useValidationStore } from '@/composables/useValidationStore';
import { formatDate } from '@/utils/dateUtils';

const { emptyReservations, fetchEmptyReservations } = useValidationStore();

const loading = ref(true);
const error = ref(null);

const openReservationEdit = (id) => {
    const url = `/reservations/edit/${id}`;
    window.open(url, '_blank');
};

onMounted(async () => {
    try {
        await fetchEmptyReservations();
    } catch (err) {
        error.value = err;
        console.error('Error fetching empty reservations:', err);
    } finally {
        loading.value = false;
    }
});

defineExpose({
    emptyReservations,
});
</script>

<style scoped>
/* Scoped styles for AdminEmptyReservations.vue */
</style>