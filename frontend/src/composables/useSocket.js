import { ref, onMounted, onUnmounted, watch } from 'vue';
import io from 'socket.io-client';
import { useHotelStore } from '../composables/useHotelStore';

export function useSocket() {
  const socket = ref(null);
  const hotelStore = useHotelStore();
  
  const connectSocket = () => {
    const hotelId = hotelStore.selectedHotelId.value;

    // Check if already connected to this hotel
    if (socket.value && socket.value.connected && socket.value.io.opts.query.hotelId === hotelId) {
        // console.log(`Already connected to socket for hotelId: ${hotelId}`);
        return;
    }

    if (socket.value) {
      socket.value.disconnect();
    }

    if (!hotelId) {
      console.warn('No hotel selected, socket not connecting.');
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
    // The watch handler with immediate: true will handle the initial connection.
  });

  onUnmounted(() => {
    if (socket.value) {
      socket.value.disconnect();
      console.log('Socket disconnected');
    }
  });

  watch([hotelStore.selectedHotelId, hotelStore.isInitialized], ([newHotelId, isInitialized], [oldHotelId, oldIsInitialized]) => {
    if (!isInitialized) {
      return; // Do nothing if the store isn't ready
    }

    // Connect if the hotel ID changes or if the store just became initialized with a valid ID
    if (newHotelId && (newHotelId !== oldHotelId || isInitialized !== oldIsInitialized)) {
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