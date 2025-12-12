<template>
    <Dialog v-model="model" :header="'顧客変更'" :closable="true" :modal="true"
        :style="{ width: '60vw' }">
        <div v-if="!client_id" class="p-4 text-center text-gray-500">
            選択された顧客がいません。
        </div>
        <ReservationClientEdit v-else :client_id="client_id" />
        <template #footer>
            <Button label="閉じる" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text
                @click="model = false" />
        </template>
    </Dialog>
</template>

<script setup>
import { defineModel } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import ReservationClientEdit from '@/pages/MainPage/Reservation/components/ReservationClientEdit.vue';

// Use defineModel for two-way binding
const model = defineModel({
    type: Boolean,
    default: false
});

defineProps({
    client_id: {
        type: String,
        required: false,
    },
});
</script>