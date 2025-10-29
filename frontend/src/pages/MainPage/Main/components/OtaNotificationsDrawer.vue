<template>
  <Drawer
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    position="right"
    :style="{ width: '450px' }"
    header="OTA通知"
    class="dark:bg-gray-800 dark:text-white flex flex-col"
  >
    <template v-if="failedOtaReservations && failedOtaReservations.length > 0">
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
                  <span class="font-medium">{{ getOtaTransactionLabel(reservation.transaction_type) }}</span>
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
    <div v-else class="flex-1 flex items-center justify-center">
      <p>新しいOTA通知はありません。</p>
    </div>
  </Drawer>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import { Drawer, Button, VirtualScroller } from 'primevue';

const props = defineProps({
  visible: Boolean,
  failedOtaReservations: Array,
});

const emit = defineEmits(['update:visible', 'goToEditReservation']);

const formatDateJP = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return dateString;
  }
};

const getOtaTransactionLabel = (transactionType) => {
  const labels = {
    'new': '新規予約',
    'modify': '予約変更',
    'cancel': 'キャンセル',
  };
  return labels[transactionType] || transactionType;
};
</script>