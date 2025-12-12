<template>
  <div class="p-0 space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6 items-center">

      <div class="lg:col-span-4">
        <SummaryMetricsPanel :roomGroups="roomGroups" :isLoading="isLoading" />
      </div>

      <div class="lg:col-span-3 flex lg:justify-center items-start">
        <div class="w-full lg:max-w-md p-1">
          <DatePicker v-model="selectedDate" inline dateFormat="yy-mm-dd" :selectOtherMonths="true"
            class="w-full custom-datepicker-inline rounded-md dark:bg-gray-800" />
        </div>
      </div>

    </div>

    <div v-if="!hasLoadedRooms && !isLoading" class="text-center text-gray-500 dark:text-gray-400 py-4">
      読み込みは完了しましたが、利用可能なデータがありません。
    </div>

    <RoomGroupPanel v-if="selectedHotelId" :isLoading="isLoading" :roomGroups="roomGroups"
      :openNewReservation="openNewReservation" :openEditReservation="openEditReservation" :getClientName="getClientName"
      :translateReservationPaymentTiming="translateReservationPaymentTiming" :formatTime="formatTime"
      :formatDate="formatDate" :planSummary="planSummary" :getPlanDaysTooltip="getPlanDaysTooltip"
      :selectedDate="selectedDate" :selectedHotelId="selectedHotelId" />
  </div>

  <ReservationDrawer v-if="selectedHotelId" ref="reservationDrawerRef" :selectedDate="selectedDate"
    :selectedHotelId="selectedHotelId" :formatDate="formatDate" @reservation-updated="handleReservationUpdated" />

</template>

<script setup>
// Vue
import { ref, watch, onMounted } from 'vue';

import RoomGroupPanel from './components/RoomGroupPanel.vue';
import SummaryMetricsPanel from './components/SummaryMetricsPanel.vue';
import ReservationDrawer from './components/ReservationDrawer.vue';

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import DatePicker from 'primevue/datepicker';

//Stores
import { useHotelStore } from '@/composables/useHotelStore';
const { selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel } = useHotelStore();

import { useClientDisplay } from './composables/useClientDisplay';
const { getClientName } = useClientDisplay();

import { formatDate, formatTime } from '@/utils/dateUtils';
import { translateReservationPaymentTiming } from '@/utils/reservationUtils';
import { useRoomCategorization } from './composables/useRoomCategorization';
import { usePlanSummary } from './composables/usePlanSummary';
import { useReservationActions } from './composables/useReservationActions';


const isLoading = ref(false);
const hasLoadedRooms = ref(false); // New ref to track if rooms have been loaded
const loadError = ref(false); // New ref to track if an error occurred during loading

onMounted(async () => {
  isLoading.value = true;
  try {
    await fetchHotels(); // Fetch all hotels and set selectedHotelId

    // Retry mechanism for fetchHotel if selectedHotelRooms is empty
    let retries = 3;
    let lastError = null;
    while (retries > 0 && !selectedHotelRooms.value?.length) {
      if (selectedHotelId.value) {
        try {
          await fetchHotel(); // Fetch rooms for the selected hotel
        } catch (error) {
          console.error(`Attempt ${4 - retries} failed to fetch hotel rooms:`, error);
          lastError = error;
        }
      }
      retries--;
      if (retries > 0 && (!selectedHotelRooms.value || selectedHotelRooms.value.length === 0)) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
      }
    }

    if (!selectedHotelRooms.value || selectedHotelRooms.value.length === 0) {
      if (lastError) {
        throw lastError; // Re-throw the last error if rooms are still empty after retries
      } else {
        // If no specific error but rooms are empty, throw a generic error
        throw new Error('Failed to load hotel rooms after multiple attempts.');
      }
    }

  } catch (error) {
    console.error('Failed to load hotel data:', error);
    loadError.value = true; // Set error flag
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: 'ホテルデータの読み込みに失敗しました。ページを更新してください。',
      life: 5000
    });
  } finally {
    isLoading.value = false;
    // Display warning toast only after loading has finished and if no rooms were loaded AND no error occurred
    if (!hasLoadedRooms.value && !loadError.value) {
      toast.add({
        severity: 'warn',
        summary: '警告',
        detail: '空室データの読み込みに時間がかかっています。',
        life: 5000
      });
    }
  }
});

// Watch for selectedHotelRooms to update hasLoadedRooms
watch(selectedHotelRooms, (newValue) => {
  hasLoadedRooms.value = Boolean(newValue?.length);
}, { immediate: true }); // Immediate to check initial value

const { reservationDrawerRef, selectedDate, handleReservationUpdated, openNewReservation, openEditReservation } = useReservationActions();

const { roomGroups } = useRoomCategorization(selectedDate);
const { planSummary, getPlanDaysTooltip } = usePlanSummary(selectedDate);

// Computed


</script>

<style scoped></style>