<template>
    <Dialog v-model:visible="visible" :header="'顧客変更'" :closable="true" :modal="true"
        :style="{ width: '60vw' }" @update:visible="$emit('update:visible', $event)">
        <ReservationClientEdit v-if="client_id" :client_id="client_id" />
        <template #footer>
            <Button label="閉じる" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text
                @click="$emit('update:visible', false)" />
        </template>
    </Dialog>
</template>

<script setup>
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ReservationClientEdit from '@/pages/MainPage/Reservation/components/ReservationClientEdit.vue';

defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    client_id: {
        type: String,
        required: false, // client_id might be null initially
    },
});

defineEmits(['update:visible']);
</script>
