<template>
    <Dialog v-model:visible="showDateDialog" header="日付を選択" modal>
        <p>何日までキャンセル料が発生しますか？</p>
        <DatePicker v-model="cancelEndDate" showIcon fluid iconDisplay="input" showOnFocus
            :minDate="cancelMinDate || undefined" :maxDate="cancelMaxDate || undefined" dateFormat="yy-mm-dd" />
        <template #footer>
            <Button label="全日" severity="warn" icon="pi pi-calendar-times"
                @click="handleFullDayCancel()" :loading="isSubmitting" :disabled="isSubmitting" />
            <Button label="キャンセル適用" icon="pi pi-check" @click="confirmPartialCancel" :loading="isSubmitting" :disabled="isSubmitting" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import { useReservationStore } from '@/composables/useReservationStore';

const toast = useToast();
const { setReservationStatus, setReservationDetailStatus } = useReservationStore();

const props = defineProps({
    reservation_id: {
        type: String,
        required: true,
    },
    reservation_details: {
        type: Array,
        required: true,
    },
    showDateDialog: Boolean,
    isSubmitting: Boolean,
});

const emit = defineEmits(['update:showDateDialog', 'update:isSubmitting']);

const showDateDialog = computed({
    get: () => props.showDateDialog,
    set: (value) => emit('update:showDateDialog', value),
});

const isSubmitting = computed({
    get: () => props.isSubmitting,
    set: (value) => emit('update:isSubmitting', value),
});

const cancelEndDate = ref(null);
const cancelMinDate = ref(null);
const cancelMaxDate = ref(null);

const cancelledIds = computed(() => {
    if (!cancelEndDate.value) {
        return [];
    }
    // Filter details from check_in up to and including cancelEndDate
    const checkInDate = props.reservation_details[0] ? new Date(props.reservation_details[0].check_in) : null;
    if (!checkInDate) return [];

    return props.reservation_details
        .filter(detail => {
            const detailDate = new Date(detail.date);
            return detailDate >= checkInDate && detailDate <= cancelEndDate.value;
        })
        .map(detail => ({
            id: detail.id,
            hotel_id: detail.hotel_id,
            date: detail.date
        }));
});

const updateReservationStatus = async (status, skipSideEffects = false) => {

    if (!skipSideEffects) {
        isSubmitting.value = true;
    }
    try {
        await setReservationStatus(status);
        if (!skipSideEffects) {
            toast.add({ severity: 'success', summary: '成功', detail: '予約ステータスが更新されました。', life: 3000 });
        }
    } catch (error) {
        console.error('Error updating and fetching reservation:', error);
        if (!skipSideEffects) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '予約ステータスの更新に失敗しました。', life: 3000 });
        }
        throw error; // Re-throw to allow parent to catch
    } finally {
        if (!skipSideEffects) {
            isSubmitting.value = false;
            showDateDialog.value = false;
        }
    }
};

const handleFullDayCancel = async () => {
    isSubmitting.value = true;
    try {
        // Update main reservation status without side effects
        await updateReservationStatus('cancelled', true); // Always set main status to 'cancelled'

        // Update all reservation details in parallel
        const detailUpdatePromises = props.reservation_details.map(detail =>
            setReservationDetailStatus(detail.id, detail.hotel_id, 'cancelled', true) // Set billable to true for all details
        );

        const results = await Promise.allSettled(detailUpdatePromises);

        const failedUpdates = results.filter(result => result.status === 'rejected' || (result.value && result.value.status === 'rejected'));

        if (failedUpdates.length > 0) {
            console.error('Failed to update some reservation details for full day cancel:', failedUpdates);
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: `一部の予約詳細の更新に失敗しました。 (${failedUpdates.length}件)`,
                life: 5000
            });
        } else {
            toast.add({ severity: 'success', summary: '成功', detail: '予約ステータスが更新されました。', life: 3000 });
        }

    } catch (error) {
        console.error('Error during full day cancel:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: '全日キャンセル確認に失敗しました。', life: 3000 });
    } finally {
        isSubmitting.value = false;
        showDateDialog.value = false;
    }
};

const confirmPartialCancel = async () => {
    isSubmitting.value = true;
    try {
        if (!cancelEndDate.value) {
            toast.add({ severity: 'warn', summary: '警告', detail: 'キャンセル終了日を選択してください。', life: 3000 });
            isSubmitting.value = false;
            return;
        }

        // Update main reservation status without side effects
        await updateReservationStatus('cancelled', true); // Always set main status to 'cancelled'

        // Update individual reservation details in parallel
        const detailUpdatePromises = cancelledIds.value.map(detail =>
            setReservationDetailStatus(detail.id, detail.hotel_id, 'cancelled', true) // Set billable to true
        );

        const results = await Promise.allSettled(detailUpdatePromises);

        const failedUpdates = results.filter(result => result.status === 'rejected' || (result.value && result.value.status === 'rejected'));

        if (failedUpdates.length > 0) {
            console.error('Failed to update some reservation details:', failedUpdates);
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: `一部の予約詳細の更新に失敗しました。 (${failedUpdates.length}件)`,
                life: 5000
            });
        } else {
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
    if (newDetails && newDetails.length > 0 && newDetails[0]) {
        const checkInString = newDetails[0].check_in;
        const checkOutString = newDetails[0].check_out;

        let validCheckInDate = null;
        if (checkInString) {
            const date = new Date(checkInString);
            if (!isNaN(date.getTime())) {
                validCheckInDate = date;
            }
        }

        let validCheckOutDate = null;
        if (checkOutString) {
            const date = new Date(checkOutString);
            if (!isNaN(date.getTime())) {
                validCheckOutDate = date;
            }
        }

        if (validCheckInDate) {
            cancelEndDate.value = new Date(validCheckOutDate || validCheckInDate); // Default to checkOutDate, or checkInDate if no checkout
            cancelMinDate.value = new Date(validCheckInDate);
        } else {
            cancelEndDate.value = null;
            cancelMinDate.value = null;
        }

        if (validCheckOutDate) {
            cancelMaxDate.value = validCheckOutDate;
        } else {
            cancelMaxDate.value = null;
        }
    } else {
        cancelEndDate.value = null;
        cancelMinDate.value = null;
        cancelMaxDate.value = null;
    }
}, { immediate: true });


</script>