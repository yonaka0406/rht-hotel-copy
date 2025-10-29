import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useReservationStore } from '@/composables/useReservationStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { formatDate } from '@/utils/dateUtils';

export function useReservationActions() {
  const router = useRouter();
  const { fetchReservationsToday } = useReservationStore();
  const { selectedHotelId, fetchHotel } = useHotelStore();

  const reservationDrawerRef = ref(null);
  const routeDate = router.currentRoute.value.params.date;
  const selectedDate = ref(routeDate ? new Date(routeDate) : new Date());
  const today = new Date();

  const handleReservationUpdated = async () => {
    await fetchReservationsToday(selectedHotelId.value, formatDate(selectedDate.value));
  };

  const openNewReservation = (room) => {
    reservationDrawerRef.value?.openNewReservation(room);
  };
  
  const openEditReservation = (room) => {        
    reservationDrawerRef.value?.openEditReservation(room);
  };

  onMounted(async () => {
    const routeDate = router.currentRoute.value.params.date;
    if (!routeDate) {
      router.replace({ params: { date: formatDate(selectedDate.value) } });
    }
    // Initial fetch after selectedDate is set
    await fetchReservationsToday(selectedHotelId.value, formatDate(selectedDate.value));
  });

  watch(selectedHotelId, async (newValue, oldValue) => {            
    try {
      if (newValue !== oldValue) {
        selectedDate.value = today;
        await fetchHotel();
        await fetchReservationsToday(selectedHotelId.value, formatDate(today));
      }
    } catch (error) {
      console.error('Error in selectedHotelId watcher:', error);
    }
  });
  
  watch(selectedDate, async (newValue, oldValue) => {
    if (newValue && oldValue && formatDate(newValue) !== formatDate(oldValue)) { // Compare formatted dates to avoid unnecessary fetches for same date object but different instances
      await fetchReservationsToday(selectedHotelId.value, formatDate(selectedDate.value));
      
      // Update URL parameter
      router.push({ params: { date: formatDate(selectedDate.value) } });
    }
  }, { deep: true });

  return {
    reservationDrawerRef,
    selectedDate,
    handleReservationUpdated,
    openNewReservation,
    openEditReservation
  };
}
