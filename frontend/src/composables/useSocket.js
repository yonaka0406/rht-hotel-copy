import { ref, onMounted, onUnmounted, watch } from 'vue';
import io from 'socket.io-client';
import { useHotelStore } from '../composables/useHotelStore';

export function useSocket() {
  const socket = ref(null);
  const hotelStore = useHotelStore();
  
  const connectSocket = () => {
    if (socket.value) {
      socket.value.disconnect();
    }

    const hotelId = hotelStore.selectedHotelId.value;
    if (!hotelId) {
      console.log('No hotel selected, socket not connecting.');
      return;
    }

    console.log(`Connecting socket for hotelId: ${hotelId}`);
    socket.value = io(import.meta.env.VITE_BACKEND_URL, {
      query: { hotelId }
    });

    socket.value.on('connect', () => {
      console.log('Socket connected');
    });
    socket.value.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });
    socket.value.on('connect_timeout', () => {
      console.warn('Socket connection timeout');
    });
  };

  onMounted(() => {
    // Attempt to connect immediately if a hotel is already selected
    if (hotelStore.selectedHotelId.value) {
      connectSocket();
    }
    // The watch handler with immediate: true will handle subsequent connections/disconnections
  });

  onUnmounted(() => {
    if (socket.value) {
      socket.value.disconnect();
      console.log('Socket disconnected');
    }
  });

  watch(hotelStore.selectedHotelId, (newHotelId, oldHotelId) => {
    if (newHotelId && newHotelId !== oldHotelId) {
      connectSocket();
    } else if (!newHotelId && socket.value) {
      socket.value.disconnect();
      socket.value = null;
      console.log('No hotel selected, socket disconnected.');
    }
  }, { immediate: true });

  return {
    socket,
  };
}