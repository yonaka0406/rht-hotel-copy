<template>
    <div v-if="reservationType === '社員' && reservationStatus === '確定'" class="grid grid-cols-4 gap-x-6">
        <div class="field flex flex-col">
            <Button label="社員予約を削除" severity="danger" fluid @click="deleteReservation()" :loading="isSubmitting" :disabled="isSubmitting" />
        </div>
    </div>

    <div v-else-if="reservationType !== '社員'" class="grid grid-cols-4 gap-x-6">
        <div v-if="reservationStatus === '保留中' || reservationStatus === '確定'" class="field flex flex-col">
            <Button label="仮予約として保存" severity="info" :disabled="!allRoomsHavePlan || isSubmitting"
                @click="$emit('updateReservationStatus', 'provisory')" :loading="isSubmitting" />
        </div>
        <div v-if="reservationStatus === '保留中' || reservationStatus === '仮予約'" class="field flex flex-col">
            <Button label="確定予約として保存" severity="success" :disabled="!allRoomsHavePlan || isSubmitting"
                @click="$emit('updateReservationStatus', 'confirmed')" :loading="isSubmitting" />
        </div>
        <div v-if="reservationStatus === '確定'" class="field flex flex-col">
            <Button label="チェックイン" severity="success" icon="pi pi-sign-in" fluid
                @click="$emit('updateReservationStatus', 'checked_in')" :loading="isSubmitting" :disabled="isSubmitting" />
        </div>
        <div v-if="reservationStatus === 'チェックイン'" class="field flex flex-col">
            <Button label="確定に戻す" severity="info" icon="pi pi-undo" fluid
                @click="$emit('updateReservationStatus', 'confirmed')" :loading="isSubmitting" :disabled="isSubmitting" />
        </div>
        <div v-if="reservationStatus === 'チェックイン'" class="field flex flex-col">
            <Button label="チェックアウト" severity="warn" icon="pi pi-eject" fluid
                @click="$emit('updateReservationStatus', 'checked_out')" :loading="isSubmitting" :disabled="isSubmitting" />
        </div>
        <div v-if="reservationStatus === 'チェックアウト'" class="field flex flex-col">
            <Button label="チェックインに戻す" severity="danger" icon="pi pi-undo" fluid @click="$emit('revertCheckout')" :loading="isSubmitting" :disabled="isSubmitting" />
        </div>
        <div v-if="reservationStatus === '仮予約' || reservationStatus === '確定'" class="field flex flex-col">
            <Button label="キャンセル" severity="contrast" :disabled="!allRoomsHavePlan || isSubmitting" @click="$emit('handleCancel')" :loading="isSubmitting" />
        </div>
        <div v-if="reservationStatus === 'キャンセル'" class="field flex flex-col">
            <Button label="キャンセル復活" severity="secondary" raised @click="$emit('updateReservationStatus', 'confirmed')" :loading="isSubmitting" :disabled="isSubmitting" />
        </div>
        <div v-if="reservationStatus === '保留中'" class="field flex flex-col">
            <Button :label="'保留中予約を削除'" severity="danger" fluid @click="deleteReservation()" :loading="isSubmitting" :disabled="isSubmitting" />
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useReservationStore } from '@/composables/useReservationStore';
import { Button } from 'primevue';

const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const { deleteHoldReservation, setReservationId } = useReservationStore();

const props = defineProps({
    reservationType: {
        type: String,
        required: true,
    },
    reservationStatus: {
        type: String,
        required: true,
    },
    allRoomsHavePlan: {
        type: Boolean,
        required: true,
    },
    isSubmitting: {
        type: Boolean,
        required: true,
    },
    reservation_id: {
        type: String,
        required: true,
    },
    hotel_id: {
        type: String,
        required: true,
    },
});

const emit = defineEmits([
    'updateReservationStatus',
    'revertCheckout',
    'handleCancel',
]);

const goToNewReservation = async () => {
    await setReservationId(null);
    await router.push({ name: 'ReservationsNew' });
};

const deleteReservation = () => {
    confirm.require({
        group: 'delete',
        message: `保留中予約を削除してもよろしいですか?`,
        header: '削除確認',
        icon: 'pi pi-info-circle',
        acceptClass: 'p-button-danger',
        acceptProps: {
            label: '削除',
            loading: props.isSubmitting
        },
        rejectProps: {
            label: 'キャンセル',
            severity: 'secondary',
            outlined: true,
            icon: 'pi pi-times',
            disabled: props.isSubmitting
        },
        accept: async () => {
            // isSubmitting is a prop, cannot be directly modified
            try {
                await deleteHoldReservation(props.hotel_id, props.reservation_id);
                toast.add({
                    severity: 'success',
                    summary: '成功',
                    detail: `保留中予約が削除されました。`,
                    life: 3000
                });
            } catch (e) {
                toast.add({
                    severity: 'warn',
                    summary: '警告',
                    detail: '予約は既に削除されています。',
                    life: 3000
                });
            } finally {
                // isSubmitting is a prop, cannot be directly modified
            }
            await goToNewReservation();
        },
        reject: () => {
            // Do nothing on reject
        }
    });
};
</script>
