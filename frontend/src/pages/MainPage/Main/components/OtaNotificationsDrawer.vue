<template>
  <Drawer
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    position="right"
    :style="{ width: '450px' }"
    header="OTA通知"
    class="dark:bg-gray-800 dark:text-white flex flex-col"
  >
    <div v-if="otaFailedXmlQueueLoading" class="flex-1 flex items-center justify-center">
      <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" fill="var(--surface-ground)"
        animationDuration=".5s" aria-label="Custom Progress Spinner" />
    </div>
    <template v-else-if="combinedNotifications && combinedNotifications.length > 0">
        <h3 class="font-bold text-lg my-2 px-2">OTA通知一覧</h3>
        <VirtualScroller :items="combinedNotifications" :itemSize="110" class="space-y-3 flex-1 min-h-0"
          style="flex: 1 1 auto; min-height: 0;">
          <template #item="{ item: reservation, index }">
            
            <!-- XML Queue Failure (Stock Adjustment) -->
            <div v-if="reservation.type === 'xml'" :key="reservation.uniqueId"
              class="mx-2 mb-3 last:mb-0 rounded-lg shadow-sm border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950 p-4 flex flex-col gap-2">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <i class="pi pi-exclamation-triangle text-yellow-500" />
                  <span class="font-semibold text-yellow-800 dark:text-yellow-300">在庫調整失敗</span>
                </div>
                <span class="text-sm text-yellow-600 dark:text-yellow-400">{{ reservation.ota_reservation_id }}</span>
              </div>
              <div class="flex items-center gap-x-4 text-gray-700 dark:text-gray-300 mb-2 text-sm">
                <div class="flex items-center gap-1">
                  <i class="pi pi-building text-yellow-500 text-xs" />
                  <span>施設:</span>
                  <span class="font-medium">{{ reservation.hotel_name }}</span>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-x-4 text-sm">
                <div class="flex items-center gap-1 text-gray-700 dark:text-gray-300 col-span-2">
                  <i class="pi pi-calendar text-blue-500 text-xs" />
                  <span>受信日:</span>
                  <span class="font-medium">{{ formatDateTimeJP(reservation.created_at) }}</span>
                </div>
                <div class="flex items-center gap-1 text-gray-700 dark:text-gray-300 col-span-2">
                  <i class="pi pi-calendar-plus text-green-500 text-xs" />
                  <span>対象期間:</span>
                  <span class="font-medium">{{ getAdjustmentDateRange(reservation.xml_body) }}</span>
                </div>
              </div>
            </div>

            <!-- Reservation Failure (OTA Sync) -->
            <div v-else :key="reservation.uniqueId"
              class="mx-2 mb-3 last:mb-0 rounded-lg shadow-sm border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-4 flex flex-col gap-2">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <i class="pi pi-exclamation-triangle text-red-500" />
                  <span class="font-semibold text-red-800 dark:text-red-300">OTA同期失敗</span>
                </div>
                <span class="text-sm text-red-600 dark:text-red-400">{{ reservation.ota_reservation_id }}</span>
              </div>
              <div class="flex items-center gap-x-4 text-gray-700 dark:text-gray-300 mb-2 text-sm">
                <div class="flex items-center gap-1">
                  <i class="pi pi-building text-yellow-500 text-xs" />
                  <span>施設:</span>
                  <span class="font-medium">{{ reservation.hotel_name }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <i class="pi pi-tag text-purple-500 text-xs" />
                  <span>種別:</span>
                  <span class="font-medium">{{ getOtaTransactionLabel(reservation.transaction_type) }}</span>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-x-4 text-sm">
                <div class="flex items-center gap-1 text-gray-700 dark:text-gray-300 col-span-2">
                  <i class="pi pi-calendar text-blue-500 text-xs" />
                  <span>受信日:</span>
                  <span class="font-medium">{{ formatDateTimeJP(reservation.created_at) }}</span>
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
import { computed } from 'vue';
import { Drawer, VirtualScroller, ProgressSpinner } from 'primevue';
import { formatDateTimeJP, formatDateJP } from '@/utils/dateUtils';
import { useXMLStore } from '@/composables/useXMLStore';

const { otaFailedXmlQueueLoading } = useXMLStore();

const props = defineProps({
  visible: Boolean,
  failedOtaReservations: {
    type: Array,
    default: () => []
  },
  otaFailedXmlQueueData: {
    type: Array,
    default: () => []
  }
});

defineEmits(['update:visible']);

const combinedNotifications = computed(() => {
  const xmlItems = (props.otaFailedXmlQueueData || []).map(item => ({ ...item, type: 'xml', uniqueId: `xml-${item.id}` }));
  const resItems = (props.failedOtaReservations || []).map(item => ({ ...item, type: 'reservation', uniqueId: `res-${item.id}` }));
  return [...xmlItems, ...resItems].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
});

// OTA Transaction Type Mapping
const getOtaTransactionLabel = (transactionType) => {
  const typeMap = {
    'NewBookReport': '新規予約',
    'ModificationReport': '予約変更',
    'CancellationReport': '予約キャンセル',
    'default': 'その他'
  };
  return typeMap[transactionType] || typeMap.default;
};

const getAdjustmentDateRange = (xmlBody) => {
  if (!xmlBody) return 'N/A';
  
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlBody, "text/xml");
    
    // Try to find common date tags in stock adjustment XMLs
    const dateTags = ['adjustmentDate', 'date', 'saleDate', 'Date'];
    let dates = [];

    for (const tag of dateTags) {
      const elements = xmlDoc.getElementsByTagName(tag);
      for (let i = 0; i < elements.length; i++) {
        const dateStr = elements[i].textContent;
        // Simple validation for YYYY-MM-DD or YYYYMMDD
        if (dateStr && (dateStr.match(/^\d{4}-\d{2}-\d{2}$/) || dateStr.match(/^\d{8}$/))) {
           dates.push(dateStr.replace(/-/g, ''));
        }
      }
      if (dates.length > 0) break; // If we found dates with one tag, assume that's the correct one
    }

    if (dates.length === 0) return '日付不明';

    dates.sort();
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    const format = (d) => {
      if (d.length === 8) {
        return `${d.substring(0, 4)}/${d.substring(4, 6)}/${d.substring(6, 8)}`;
      }
      return d;
    };

    if (minDate === maxDate) {
      return format(minDate);
    }
    return `${format(minDate)} ～ ${format(maxDate)}`;

  } catch (e) {
    console.error('Error parsing XML dates:', e);
    return '解析エラー';
  }
};

</script>