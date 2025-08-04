<template>
  <Drawer :visible="visible" @update:visible="val => emit('update:visible', val)" position="right"
    :style="{ width: '340px', padding: '0' }" class="dark:bg-gray-800 dark:text-white p-0">
    <template #header>
      <div class="flex items-center gap-2 w-full">
        <i class="pi pi-bell text-xl" :class="notificationSeverityIcon" />
        <span class="font-semibold text-lg">通知</span>
        <span v-if="totalNotifications" class="ml-2 text-xs bg-red-500 text-white rounded-full px-2 py-0.5">{{
          totalNotifications }}</span>
      </div>
    </template>
    <div class="py-3 min-h-[120px] flex flex-col h-full" style="height: 100%;">
      <template v-if="holdReservations.length">
        <h3 class="font-bold text-lg mb-2 px-2">保留中の予約</h3>
        <VirtualScroller :items="holdReservations" :itemSize="110" class="space-y-3 flex-1 min-h-0"
          style="flex: 1 1 auto; min-height: 0;">
          <template #item="{ item: reservation, index }">
            <div :key="index"
              class="mx-2 mb-3 last:mb-0 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex flex-col gap-2 hover:shadow-md transition cursor-pointer"
              @click="handleGoToEditReservation(reservation.hotel_id, reservation.reservation_id)">
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
      <template v-if="tempBlockedReservations.length">
        <h3 class="font-bold text-lg my-2 px-2">仮ブロック</h3>
        <VirtualScroller :items="tempBlockedReservations" :itemSize="80" class="space-y-3 flex-1 min-h-0"
          style="flex: 1 1 auto; min-height: 0;">
          <template #item="{ item: block, index }">
            <div :key="index"
              class="mx-2 mb-3 last:mb-0 rounded-lg shadow-sm border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950 p-4 flex flex-col gap-1">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <i class="pi pi-lock text-orange-500" />
                  <span class="font-semibold text-orange-800 dark:text-orange-300">仮ブロック</span>
                </div>
                <span class="text-sm text-orange-600 dark:text-orange-400">{{ block.room_number }}号室</span>
              </div>
              <div class="grid grid-cols-2 gap-x-2 text-sm">
                <div class="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i class="pi pi-calendar text-blue-500 text-xs" />
                  <span>開始:</span>
                  <span class="font-medium">{{ formatDateJP(block.start_date) }}</span>
                </div>
                <div class="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i class="pi pi-calendar text-blue-500 text-xs" />
                  <span>終了:</span>
                  <span class="font-medium">{{ formatDateJP(block.end_date) }}</span>
                </div>
              </div>
            </div>
          </template>
        </VirtualScroller>
      </template>
      <template v-if="failedOtaReservations.length">
        <h3 class="font-bold text-lg my-2 px-2">OTA同期失敗</h3>
        <VirtualScroller :items="failedOtaReservations" :itemSize="110" class="space-y-3 flex-1 min-h-0"
          style="flex: 1 1 auto; min-height: 0;">
          <template #item="{ item: reservation, index }">
            <div :key="index"
              class="mx-2 mb-3 last:mb-0 rounded-lg shadow-sm border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-4 flex flex-col gap-2">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <i class="pi pi-exclamation-triangle text-red-500" />
                  <span class="font-semibold text-red-800 dark:text-red-300">OTA同期失敗</span>
                </div>
                <span class="text-sm text-red-600 dark:text-red-400">{{ reservation.ota_reservation_id }}</span>
              </div>
              <div class="grid grid-cols-2 gap-x-4 text-sm">
                <div class="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i class="pi pi-calendar text-blue-500 text-xs" />
                  <span>受信日:</span>
                  <span class="font-medium">{{ formatDateJP(reservation.date_received) }}</span>
                </div>
                <div class="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i class="pi pi-tag text-purple-500 text-xs" />
                  <span>種別:</span>
                  <span class="font-medium">{{ reservation.transaction_type }}</span>
                </div>
                <div class="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i class="pi pi-calendar-plus text-green-500 text-xs" />
                  <span>IN:</span>
                  <span class="font-medium">{{ formatDateJP(reservation.check_in_date) }}</span>
                </div>
                <div class="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i class="pi pi-calendar-minus text-red-500 text-xs" />
                  <span>OUT:</span>
                  <span class="font-medium">{{ formatDateJP(reservation.check_out_date) }}</span>
                </div>
              </div>
            </div>
          </template>
        </VirtualScroller>
      </template>
      <template v-if="!holdReservations.length && !tempBlockedReservations.length && !failedOtaReservations.length">
        <div class="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
          <i class="pi pi-inbox text-3xl mb-2" />
          <span>通知はありません。</span>
        </div>
      </template>
    </div>
  </Drawer>
</template>

<script setup>
// Vue
import { defineProps, defineEmits, computed, onMounted, watch } from 'vue';

const props = defineProps({
  visible: Boolean,
  holdReservations: {
    type: Array,
    required: true
  },
  failedOtaReservations: {
    type: Array,
    required: true
  },
  tempBlockedReservations: {
    type: Array,
    required: true
  },
  notificationSeverity: {
    type: [String, null],
    default: null
  }
});

const emit = defineEmits(['update:visible', 'go-to-edit-reservation']);

// Primevue
import { Drawer, VirtualScroller } from 'primevue';

function handleGoToEditReservation(hotel_id, reservation_id) {
  emit('go-to-edit-reservation', hotel_id, reservation_id);
}

const totalNotifications = computed(() => {
  const holdCount = Array.isArray(props.holdReservations) ? props.holdReservations.length : 0;
  const tempBlockedCount = Array.isArray(props.tempBlockedReservations) ? props.tempBlockedReservations.length : 0;
  const failedOtaCount = Array.isArray(props.failedOtaReservations) ? props.failedOtaReservations.length : 0;
  return holdCount + tempBlockedCount + failedOtaCount;
});

const notificationSeverityIcon = computed(() => {
  if (props.notificationSeverity === 'danger') return 'text-red-500';
  if (props.notificationSeverity === 'warn') return 'text-yellow-500';
  return 'text-gray-400';
});

// Helper
function formatDateJP(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}年${mm}月${dd}日`;
}

onMounted(() => {
  // console.log('[NotificationsDrawer] tempBlockedReservations:', props.tempBlockedReservations);
});

watch(() => props.tempBlockedReservations, (newVal) => {
  // console.log('[NotificationsDrawer] Updated tempBlockedReservations:', newVal);
}, { immediate: true, deep: true });

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