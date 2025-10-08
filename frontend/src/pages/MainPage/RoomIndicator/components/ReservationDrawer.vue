<template>
  <Drawer
    v-model:visible="drawerVisible"
    :modal="true"
    :position="'bottom'"
    :style="{height: '75vh'}"
    @hide="handleDrawerClose"
    :closable="true"
    class="dark:bg-gray-800"
  >
    <div class="flex justify-end" v-if="hasReservation">
      <Button @click="goToReservation" severity="info">
        <i class="pi pi-arrow-right"></i><span>編集ページへ</span>
      </Button>
    </div>

    <ReservationAddRoom v-if="!hasReservation"
      :room_id="selectedRoomID"
      :date="selectedDate"
      @temp-block-close="handleTempBlock"
    />
    <ReservationEdit
        v-if="hasReservation"
        :reservation_id="selectedReservationID"
        :room_id="selectedRoomID"
    />
  </Drawer>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Drawer from 'primevue/drawer';
import Button from 'primevue/button';
import ReservationAddRoom from '@/pages/MainPage/components/ReservationAddRoom.vue';
import ReservationEdit from '@/pages/MainPage/Reservation/ReservationEdit.vue';
import { useReservationStore } from '@/composables/useReservationStore';

const router = useRouter();
const toast = useToast();
const { fetchReservationsToday } = useReservationStore();

const props = defineProps({
  selectedDate: {
    type: Date,
    required: true,
  },
  selectedHotelId: {
    type: [String, Number],
    required: true,
  },
  formatDate: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['reservation-updated']);

const selectedRoomID = ref(null);
const selectedReservationID = ref(null);
const drawerVisible = ref(false);
const hasReservation = ref(false);

const openNewReservation = (room) => {
  selectedRoomID.value = room.room_id;
  hasReservation.value = false;
  drawerVisible.value = true;
};

const openEditReservation = (room) => {
  selectedReservationID.value = room.id;
  selectedRoomID.value = room.room_id;
  hasReservation.value = true;
  drawerVisible.value = true;
};

const goToReservation = () => {
  router.push({ name: 'ReservationEdit', params: { reservation_id: selectedReservationID.value } });
};

const handleTempBlock = (data) => {
  drawerVisible.value = false;
  emit('reservation-updated');
};

const handleDrawerClose = async () => {
  try {
    await fetchReservationsToday(props.selectedHotelId, props.formatDate(props.selectedDate));
    emit('reservation-updated');
  } catch (error) {
    console.error('Error refreshing reservations after drawer close:', error);
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: '予約情報の更新に失敗しました',
      life: 3000
    });
  }
};

// Expose functions to parent component
defineExpose({
  openNewReservation,
  openEditReservation,
});
</script>

<style scoped>
</style>
