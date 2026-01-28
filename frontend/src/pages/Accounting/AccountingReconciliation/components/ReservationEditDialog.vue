<script setup>
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ReservationEdit from '@/pages/MainPage/Reservation/ReservationEdit.vue';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    reservationId: {
        type: String,
        default: null
    }
});

const emit = defineEmits(['update:visible', 'open-in-new-tab']);

const isVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
});

const openInNewTab = () => {
    if (props.reservationId) {
        emit('open-in-new-tab', props.reservationId);
    }
};
</script>

<template>
    <Dialog v-model:visible="isVisible" modal header="予約編集" :style="{ width: '90vw', maxWidth: '1200px' }" class="p-0">
        <div class="h-[80vh] overflow-y-auto">
            <ReservationEdit :reservation_id="reservationId" v-if="reservationId" />
        </div>
        <template #footer>
            <div class="flex justify-between items-center w-full">
                <Button label="別タブで開く" icon="pi pi-external-link" text @click="openInNewTab" />
                <Button label="閉じる" icon="pi pi-times" severity="secondary" @click="isVisible = false" />
            </div>
        </template>
    </Dialog>
</template>
