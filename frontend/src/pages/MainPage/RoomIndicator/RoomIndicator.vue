<template>
  <div class="p-0 space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6 items-center">

      <div class="lg:col-span-4">
        <SummaryMetricsPanel :roomGroups="roomGroups" :isLoading="isLoading" />
      </div>

      <div class="lg:col-span-3 flex lg:justify-center items-start">
        <div class="w-full lg:max-w-md p-1">          
          <DatePicker v-model="selectedDate" inline dateFormat="yy-mm-dd" :selectOtherMonths="true" class="w-full custom-datepicker-inline rounded-md dark:bg-gray-800" />
        </div>
      </div>

    </div>

    <div v-if="!hasLoadedRooms && !isLoading" class="text-center text-gray-500 dark:text-gray-400 py-4">
      読み込みは完了しましたが、利用可能なデータがありません。
    </div>

    <RoomGroupPanel
      v-if="selectedHotelId"
      :isLoading="isLoading"
      :roomGroups="roomGroups"
      :openNewReservation="openNewReservation"
      :openEditReservation="openEditReservation"
      :getClientName="getClientName"
      :translatePaymentTiming="translatePaymentTiming"
      :formatTime="formatTime"
      :formatDate="formatDate"
      :planSummary="planSummary"
      :getPlanDaysTooltip="getPlanDaysTooltip"
      :selectedDate="selectedDate"
      :selectedHotelId="selectedHotelId"
    />  </div>

    <ReservationDrawer
      v-if="selectedHotelId"
      ref="reservationDrawerRef"
      :selectedDate="selectedDate"
      :selectedHotelId="selectedHotelId"
      :formatDate="formatDate"
      @reservation-updated="handleReservationUpdated"
    />

</template>

<script setup>
  // Vue
  import { ref, computed, watch, onUnmounted, onErrorCaptured, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  const router = useRouter(); 
  import RoomGroupPanel from './components/RoomGroupPanel.vue';
  import SummaryMetricsPanel from './components/SummaryMetricsPanel.vue';
  import ReservationDrawer from './components/ReservationDrawer.vue';



  // Primevue
  import { useToast } from 'primevue/usetoast';
  const toast = useToast();  
  import DatePicker from 'primevue/datepicker';
  
  //Stores
  import { useHotelStore } from '@/composables/useHotelStore';
  const { selectedHotel, selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel } = useHotelStore();
  import { useClientStore } from '@/composables/useClientStore';
  const { clients, fetchClients } = useClientStore();
  import { useReservationStore } from '@/composables/useReservationStore';
  import { useClientDisplay } from './composables/useClientDisplay';
  const { getClientName } = useClientDisplay();
  const { reservedRoomsDayView, fetchReservationsToday } = useReservationStore();
  import { useSocket } from '@/composables/useSocket';
  import { getContrastColor } from '@/utils/colorUtils';
  import { formatDate, formatTime } from '@/utils/dateUtils';
  import { translatePaymentTiming } from '@/utils/reservationUtils';
  import { useRoomCategorization } from './composables/useRoomCategorization';
  import { usePlanSummary } from './composables/usePlanSummary';
  import { useReservationActions } from './composables/useReservationActions';
      
  const isUpdating = ref(false);
  const isLoading = ref(false);
  const hasLoadedRooms = ref(false); // New ref to track if rooms have been loaded

  onMounted(async () => {
    isLoading.value = true;
    try {
      await fetchHotels(); // Fetch all hotels and set selectedHotelId

      // Retry mechanism for fetchHotel if selectedHotelRooms is empty
      let retries = 3;
      while (retries > 0 && (!selectedHotelRooms.value || selectedHotelRooms.value.length === 0)) {
        if (selectedHotelId.value) {
          await fetchHotel(); // Fetch rooms for the selected hotel
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
        }
      }

    } catch (error) {
      console.error('Failed to load hotel data:', error);
      toast.add({
        severity: 'error',
        summary: 'エラー',
        detail: 'ホテルデータの読み込みに失敗しました。ページを更新してください。',
        life: 5000
      });
    } finally {
      isLoading.value = false;
      // Display warning toast only after loading has finished and if no rooms were loaded
      if (!hasLoadedRooms.value) {
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
    if (newValue && newValue.length > 0) {
      hasLoadedRooms.value = true;
    } else {
      hasLoadedRooms.value = false;
    }
  }, { immediate: true }); // Immediate to check initial value

  const { reservationDrawerRef, selectedDate, handleReservationUpdated, openNewReservation, openEditReservation } = useReservationActions();

  const { roomGroups } = useRoomCategorization(selectedDate);
  const { planSummary, getPlanDaysTooltip } = usePlanSummary(selectedDate);

  // Computed
  const summaryMetrics = computed(() => {
    // For summary metrics, we want to show the operational status
    // These represent the current allocation state, not historical verification
    
    const checkInCount = roomGroups.value.find(g => g.title === '本日チェックイン')?.rooms.length || 0;
    const checkOutCount = roomGroups.value.find(g => g.title === '本日チェックアウト')?.rooms.length || 0;
    const occupiedCount = roomGroups.value.find(g => g.title === '滞在')?.rooms.length || 0;
    const freeRoomsCount = roomGroups.value.find(g => g.title === '空室')?.rooms.length || 0;
    const blockedCount = roomGroups.value.find(g => g.title === '部屋ブロック')?.rooms.length || 0;

    // Note: For operational purposes, the summary shows expected activity
    // Check-in and check-out lists show ALL reservations for verification
    // But counts reflect actual room allocation status
    
    return [
      { 
        title: '本日チェックイン', 
        icon: 'pi pi-arrow-down-left', 
        iconColor: 'text-blue-500',
        count: checkInCount
      },
      { 
        title: '本日チェックアウト', 
        icon: 'pi pi-arrow-up-right', 
        iconColor: 'text-green-500',
        count: checkOutCount
      },
      { 
        title: '滞在者数', 
        icon: 'pi pi-users', 
        iconColor: 'text-yellow-500',
        count: occupiedCount
      },
      { 
        title: '空室数', 
        icon: 'pi pi-home', 
        iconColor: 'text-gray-500',
        count: freeRoomsCount
      },
    ];
  });

</script>

<style scoped> 
  
</style>