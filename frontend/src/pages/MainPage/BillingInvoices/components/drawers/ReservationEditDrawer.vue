<template>
    <Drawer v-model:visible="visible" :modal="true" :position="'bottom'" :style="{height: '75vh'}" :closable="true" @hide="$emit('update:visible', false)">
        <ReservationEdit
            v-if="reservationId"
            :reservation_id="reservationId"                       
        />
    </Drawer>
</template>

<script setup>
import { computed } from 'vue';
import { Drawer } from 'primevue';
import ReservationEdit from '@/pages/MainPage/Reservation/ReservationEdit.vue';

const props = defineProps({
    visible: Boolean,
    reservationId: [String, Number]
});

const emit = defineEmits(['update:visible']);

const visible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
});
</script>