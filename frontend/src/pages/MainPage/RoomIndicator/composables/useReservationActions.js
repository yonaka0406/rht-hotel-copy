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
  const selectedDate = ref(new Date());
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
    console.log('[useReservationActions] onMounted: Initializing selectedDate');
    // Initialize selectedDate from URL parameter or default to today
    const routeDate = router.currentRoute.value.params.date;
    if (routeDate) {
      selectedDate.value = new Date(routeDate);
      console.log('[useReservationActions] onMounted: selectedDate from URL', selectedDate.value);
    } else {
      selectedDate.value = new Date();
      console.log('[useReservationActions] onMounted: selectedDate defaulted to today', selectedDate.value);
      // If no date in URL, update URL to today's date
      router.replace({ params: { date: formatDate(selectedDate.value) } });
    }
    // Initial fetch after selectedDate is set
    console.log('[useReservationActions] onMounted: Initial fetchReservationsToday for', formatDate(selectedDate.value));
    await fetchReservationsToday(selectedHotelId.value, formatDate(selectedDate.value));
  });

  watch(selectedHotelId, async (newValue, oldValue) => {            
    console.log('[useReservationActions] watch: selectedHotelId changed from', oldValue, 'to', newValue);
    try {
      if (newValue !== oldValue) {
        selectedDate.value = today;
        console.log('[useReservationActions] watch: Resetting selectedDate to today', selectedDate.value);
        await fetchHotel();
        console.log('[useReservationActions] watch: Fetching hotel and reservations for', formatDate(today));
        await fetchReservationsToday(selectedHotelId.value, formatDate(today));
      }
    } catch (error) {
      console.error('[useReservationActions] Error in selectedHotelId watcher:', error);
    }
  });
  
  watch(selectedDate, async (newValue, oldValue) => {
    console.log('[useReservationActions] watch: selectedDate changed from', oldValue, 'to', newValue);
    if (newValue && oldValue && formatDate(newValue) !== formatDate(oldValue)) { // Compare formatted dates to avoid unnecessary fetches for same date object but different instances
      console.log('[useReservationActions] watch: Fetching reservations for new selectedDate', formatDate(selectedDate.value));
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
