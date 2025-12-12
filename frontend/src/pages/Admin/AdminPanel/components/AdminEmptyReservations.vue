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
                <Column header="ステータス">
                    <template #body="slotProps">
                        {{ translateReservationStatus(slotProps.data.status) }}
                    </template>
                </Column>
                <Column header="タイプ">
                    <template #body="slotProps">
                        {{ translateReservationType(slotProps.data.type) }}
                    </template>
                </Column>
                <Column header="アクション">
                    <template #body="slotProps">
                        <div class="flex gap-2">
                            <ToggleButton
                                :modelValue="unlockedReservations.has(slotProps.data.reservation_id)"
                                :onIcon="'pi pi-lock-open'"
                                :offIcon="'pi pi-lock'"
                                onLabel=""
                                offLabel=""
                                :class="unlockedReservations.has(slotProps.data.reservation_id) ? 'p-button-success' : 'p-button-secondary'"
                                @change="toggleDeleteUnlock(slotProps.data.reservation_id)"
                                v-tooltip.top="'削除ボタンを有効にするには選択してください'"
                            />
                            <Button
                                icon="pi pi-trash"
                                severity="danger"
                                text
                                rounded
                                :disabled="!unlockedReservations.has(slotProps.data.reservation_id)"
                                @click="confirmDeleteReservation($event, slotProps.data.reservation_id)"
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
import ProgressSpinner from 'primevue/progressspinner';
import ToggleButton from 'primevue/togglebutton';
import { useValidationStore } from '@/composables/useValidationStore';
import { formatDate } from '@/utils/dateUtils';
import { translateReservationStatus, translateReservationType } from '@/utils/reservationUtils';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import axios from 'axios';

const { emptyReservations, fetchEmptyReservations } = useValidationStore();

const confirm = useConfirm();
const toast = useToast();

const loading = ref(true);
const error = ref(null);
const unlockedReservations = ref(new Set()); // Use a Set to store IDs of unlocked reservations

const openReservationEdit = (id) => {
    const url = `/reservations/edit/${id}`;
    window.open(url, '_blank');
};

const toggleDeleteUnlock = (reservationId) => {
    const newUnlockedReservations = new Set(unlockedReservations.value); // Clone the Set
    if (newUnlockedReservations.has(reservationId)) {
        newUnlockedReservations.delete(reservationId); // Mutate the clone
    } else {
        newUnlockedReservations.add(reservationId); // Mutate the clone
    }
    unlockedReservations.value = newUnlockedReservations; // Reassign the ref
};

const confirmDeleteReservation = (event, reservationId) => {
    confirm.require({
        target: event.currentTarget,
        message: 'この空の予約を削除してもよろしいですか？',
        icon: 'pi pi-info-circle',
        rejectClass: 'p-button-secondary p-button-outlined',
        acceptClass: 'p-button-danger',
        rejectLabel: 'キャンセル',
        acceptLabel: '削除',
        accept: async () => {
            await deleteReservation(reservationId);
        },
        reject: () => {
            toast.add({ severity: 'info', summary: 'キャンセル', detail: '削除はキャンセルされました', life: 3000 });
        }
    });
};

const deleteReservation = async (reservationId) => {
    try {
        const token = localStorage.getItem('authToken');
        await axios.delete(`/api/validation/empty-reservations/${reservationId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        toast.add({ severity: 'success', summary: '成功', detail: '予約が削除されました', life: 3000 });
        // Refresh the list after deletion
        await fetchEmptyReservations();
    } catch (err) {
        error.value = err;
        toast.add({ severity: 'error', summary: 'エラー', detail: '予約の削除に失敗しました', life: 3000 });
        console.error('Error deleting empty reservation:', err);
    }
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