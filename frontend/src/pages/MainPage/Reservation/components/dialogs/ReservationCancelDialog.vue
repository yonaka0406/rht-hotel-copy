<template>
    <Dialog v-model:visible="showDateDialog" header="日付を選択" modal>
        <p>何日からキャンセル料が発生しますか？</p>
        <DatePicker v-model="cancelStartDate" showIcon fluid iconDisplay="input" showOnFocus
            :minDate="cancelMinDate || undefined" :maxDate="cancelMaxDate || undefined" dateFormat="yy-mm-dd" />
        <template #footer>
            <Button label="全日" severity="warn" icon="pi pi-calendar-times"
                @click="updateReservationStatus('cancelled', 'full-fee')" :loading="isSubmitting" :disabled="isSubmitting" />
            <Button label="キャンセル適用" icon="pi pi-check" @click="confirmPartialCancel" :loading="isSubmitting" :disabled="isSubmitting" />
        </template>
    </Dialog>
</template>

<script setup>
// Vue
import { ref, computed, watch } from 'vue';

const props = defineProps({
    reservation_id: {
        type: String,
        required: true,
    },
    reservation_details: {
        type: [Object],
        required: true,
    },
    showDateDialog: Boolean,
    isSubmitting: Boolean,
});
const emit = defineEmits(['update:showDateDialog', 'update:isSubmitting']);

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import { Dialog, DatePicker, Button } from 'primevue';

// Store
import { useReservationStore } from '@/composables/useReservationStore';
const { setReservationStatus, setReservationDetailStatus } = useReservationStore();

// Computed
const showDateDialog = computed({
    get: () => props.showDateDialog,
    set: (value) => emit('update:showDateDialog', value),
});
const isSubmitting = computed({
    get: () => props.isSubmitting,
    set: (value) => emit('update:isSubmitting', value),
});

const cancelStartDate = ref(null);
const cancelMinDate = ref(null);
const cancelMaxDate = ref(null);

const cancelledIds = computed(() => {
    return props.reservation_details
        .filter(detail => new Date(detail.date) >= cancelStartDate.value) // Filter by date >= cancelStartDate
        .map(detail => ({
            id: detail.id,
            hotel_id: detail.hotel_id,
            date: detail.date
        }));
});

const updateReservationStatus = async (status, type = null) => {
    isSubmitting.value = true;
    try {
        if (!type) {
            await setReservationStatus(status);
        } else {
            await setReservationStatus(type);
        }
        toast.add({ severity: 'success', summary: '成功', detail: '予約ステータスが更新されました。', life: 3000 });
    } catch (error) {
        console.error('Error updating and fetching reservation:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: '予約ステータスの更新に失敗しました。', life: 3000 });
    } finally {
        isSubmitting.value = false;
        showDateDialog.value = false;
    }
};

const confirmPartialCancel = async () => {
    isSubmitting.value = true;
    try {
        if (cancelStartDate.value) {
            await updateReservationStatus('cancelled');

            for (const cancelledDetail of cancelledIds.value) {
                await setReservationDetailStatus(cancelledDetail.id, cancelledDetail.hotel_id, 'cancelled');
            }
            toast.add({ severity: 'success', summary: '成功', detail: '予約ステータスが更新されました。', life: 3000 });
        }
    } catch (error) {
        console.error('Error confirming partial cancel:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: '部分キャンセル確認に失敗しました。', life: 3000 });
    } finally {
        isSubmitting.value = false;
        showDateDialog.value = false;
    }
};

// Initialize min/max dates for cancellation
// This should ideally be done when the dialog is opened or when reservation_details change
// For now, we'll set it up to react to reservation_details changes
watch(() => props.reservation_details, (newDetails) => {
    if (newDetails && newDetails.length > 0) {
        cancelStartDate.value = new Date(newDetails[0].check_in);
        cancelMinDate.value = new Date(newDetails[0].check_in);
        const checkOutDate = new Date(newDetails[0].check_out);
        checkOutDate.setDate(checkOutDate.getDate() - 1);
        cancelMaxDate.value = checkOutDate;
    }
}, { immediate: true });
</script>
