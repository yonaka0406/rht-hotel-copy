<template>
  <Drawer
    :visible="visible"
    @update:visible="val => emit('update:visible', val)"
    position="right"
    :style="{ width: '340px', padding: '0' }"
    class="dark:bg-gray-800 dark:text-white p-0"
  >
    <template #header>
      <div class="flex items-center gap-2 w-full">
        <i class="pi pi-bell text-xl" :class="notificationSeverityIcon" />
        <span class="font-semibold text-lg">通知</span>
        <span v-if="holdReservations.length" class="ml-2 text-xs bg-red-500 text-white rounded-full px-2 py-0.5">{{ holdReservations.length }}</span>
      </div>
    </template>
    <div class="py-3 min-h-[120px] flex flex-col h-full" style="height: 100%;">
      <template v-if="holdReservations.length">
        <VirtualScroller
          :items="holdReservations"
          :itemSize="110"
          class="space-y-3 flex-1 min-h-0"
          style="flex: 1 1 auto; min-height: 0;"
        >
          <template #item="{ item: reservation, index }">
            <div
              :key="index"
              class="mx-2 mb-3 last:mb-0 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex flex-col gap-2 hover:shadow-md transition cursor-pointer"
              @click="handleGoToEditReservation(reservation.hotel_id, reservation.reservation_id)"
            >
              <div class="grid grid-cols-2 gap-x-4 mb-1">
                <div class="flex items-center gap-1">
                  <i class="pi pi-calendar text-blue-500" />
                  <span class="font-bold text-blue-600 dark:text-blue-400">IN:</span>
                </div>
                <div class="flex items-center">
                  <span class="font-medium">{{ formatDateJP(reservation.check_in) }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <i class="pi pi-calendar text-gray-400 dark:text-gray-500" />
                  <span class="font-bold text-gray-500 dark:text-gray-400">OUT:</span>
                </div>
                <div class="flex items-center">
                  <span class="font-medium">{{ formatDateJP(reservation.check_out) }}</span>
                </div>
              </div>
              <div class="flex items-center gap-2 mb-1">
                <i class="pi pi-user text-green-500" />
                <span class="font-semibold">{{ reservation.client_name }}</span>
                <span class="mx-2 h-4 border-l border-gray-300 dark:border-gray-600"></span>
                <i class="pi pi-users text-pink-500" />
                <span class="font-semibold">{{ reservation.number_of_people }}</span>
                <span class="text-sm text-gray-600 dark:text-gray-300">名</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="pi pi-building text-yellow-500" />
                <span>{{ reservation.hotel_name }}</span>
              </div>
              <div class="text-xs text-red-600 dark:text-red-400 mt-1">
                保留中予約を完成させてください
              </div>
            </div>
          </template>
        </VirtualScroller>
      </template>
      <template v-else>
        <div class="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
          <i class="pi pi-inbox text-3xl mb-2" />
          <span>通知はありません。</span>
        </div>
      </template>
    </div>
  </Drawer>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue';
import { Drawer, VirtualScroller } from 'primevue';

const props = defineProps({
  visible: Boolean,
  holdReservations: {
    type: Array,
    required: true
  },
  notificationSeverity: {
    type: [String, null],
    default: null
  }
});

const emit = defineEmits(['update:visible', 'go-to-edit-reservation']);

function handleGoToEditReservation(hotel_id, reservation_id) {
  emit('go-to-edit-reservation', hotel_id, reservation_id);
}

const notificationSeverityIcon = computed(() => {
  if (props.notificationSeverity === 'danger') return 'text-red-500';
  if (props.notificationSeverity === 'warn') return 'text-yellow-500';
  return 'text-gray-400';
});

function formatDateJP(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}年${mm}月${dd}日`;
}
</script>

<style scoped>
.min-h-\[120px\] {
  min-height: 120px;
}
.grid {
  display: grid;
}
.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.gap-x-4 {
  column-gap: 1rem;
}
.flex-1 {
  flex: 1 1 auto;
  min-height: 0;
}
</style> 