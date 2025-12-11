<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    header="編集履歴"
    :modal="true"
    :dismissableMask="true"
    :style="{ width: '80vw', 'max-height': '80vh', 'overflow-y': 'auto' }"
  >
    <ReservationHistory v-if="reservation_id" :reservation_id="reservation_id" />
  </Dialog>
</template>

<script setup>
import Dialog from 'primevue/dialog';
import ReservationHistory from '@/pages/MainPage/Reservation/components/ReservationHistory.vue';

defineProps({
  reservation_id: {
    type: String,
    required: true,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['update:visible']);
</script>
