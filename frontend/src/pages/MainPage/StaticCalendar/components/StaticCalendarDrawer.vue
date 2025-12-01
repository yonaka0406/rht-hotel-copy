<template>
  <Drawer :visible="visible" @update:visible="$emit('update:visible', $event)" position="left" :modal="false" class="w-full md:w-1/2 lg:w-1/3">
    <div v-if="reservations.length > 0">
      <h3 class="text-lg font-bold mb-2">
        {{ reservations[0].client_name }}
      </h3>
      <p class="text-sm text-gray-500 mb-4">
        表示期間: {{ dateRange.length > 0 ? formatDateWithDay(dateRange[0]) : '' }} - {{ dateRange.length > 0 ? formatDateWithDay(dateRange[dateRange.length - 1]) : '' }}
      </p>

      <Card v-for="res in reservations" :key="res.reservation_id" class="mb-4 cursor-pointer" @click="selectReservationCard(res.reservation_id)" :class="{ 'selected-card-border': cardSelectedReservationId === res.reservation_id }">
        <template #title>
          <div class="flex justify-between items-center">
            <span class="text-base font-semibold">{{ res.check_in }} - {{ res.check_out }}</span>
            <Button @click="goToReservation(res.reservation_id)" severity="info" size="small" text rounded v-tooltip.top="'編集ページへ'">
              <i class="pi pi-arrow-up-right"></i>
            </Button>
          </div>
        </template>
        <template #content>
          <div v-if="res.type === 'ota' || res.type === 'web'" class="text-sm mb-2">
            <p><strong>OTA予約ID:</strong> {{ res.ota_reservation_id }}</p>
            <p><strong>エージェント:</strong> {{ res.agent }}</p>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm pt-2">
            <div class="col-span-2 flex items-center gap-4 text-sm">
              <div class="flex items-center gap-1">
                <i class="pi pi-user"></i>
                <span>{{ res.number_of_people }} 名</span>
              </div>
              <div class="flex items-center gap-2" v-tooltip.top="generateRoomTooltip(res)">
                <Tag v-if="res.smoking_count > 0" severity="danger" :value="`喫煙: ${res.smoking_count}`"></Tag>
                <Tag v-if="res.non_smoking_count > 0" severity="secondary" :value="`禁煙: ${res.non_smoking_count}`"></Tag>
              </div>
              <div class="flex items-center gap-1">
                <i class="pi pi-wallet"></i>
                <Tag :value="paymentTimingInfo[res.payment_timing]?.label" :severity="paymentTimingInfo[res.payment_timing]?.severity"></Tag>
              </div>

            </div>
          </div>
        </template>
      </Card>
    </div>
    <div v-else>
      <p>選択されたクライアントの予約情報が見つかりません。</p>
    </div>
  </Drawer>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Drawer from 'primevue/drawer';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { formatDateWithDay } from '@/utils/dateUtils';

defineProps({
  visible: Boolean,
  reservations: Array,
  dateRange: Array,
});

const emit = defineEmits(['update:visible', 'select-reservation']);

const router = useRouter();

const cardSelectedReservationId = ref(null);

const paymentTimingInfo = {
  not_set: { label: '未設定', severity: 'contrast' },
  prepaid: { label: '前払い', severity: 'info' },
  'on-site': { label: '現地払い', severity: 'success' },
  postpaid: { label: '後払い', severity: 'warn' },
};

const selectReservationCard = (reservationId) => {
  if (cardSelectedReservationId.value === reservationId) {
    cardSelectedReservationId.value = null;
  } else {
    cardSelectedReservationId.value = reservationId;
  }
  emit('select-reservation', cardSelectedReservationId.value);
};

const goToReservation = (reservationId) => {
  if (!reservationId) return;
  const routeData = router.resolve({ name: 'ReservationEdit', params: { reservation_id: reservationId } });
  window.open(routeData.href, '_blank');
};

const generateRoomTooltip = (reservation) => {
  const parts = [];
  if (reservation.smoking_rooms && reservation.smoking_rooms.length > 0) {
    parts.push(`喫煙: ${reservation.smoking_rooms.join(', ')}`);
  }
  if (reservation.non_smoking_rooms && reservation.non_smoking_rooms.length > 0) {
    parts.push(`禁煙: ${reservation.non_smoking_rooms.join(', ')}`);
  }
  return parts.join(' | ');
};
</script>

<style scoped>
.selected-card-border {
  border: 2px solid #00FFFF;
  border-radius: 6px;
}
</style>
