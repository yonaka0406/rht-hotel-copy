import { ref, onMounted, onUnmounted } from 'vue';
import io from 'socket.io-client';

export function useSocket() {
  const socket = ref(null);

  onMounted(() => {
    socket.value = io(import.meta.env.VITE_BACKEND_URL);

    socket.value.on('connect', () => {
      console.log('Socket connected');
    });
    socket.value.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });
    socket.value.on('connect_timeout', () => {
      console.warn('Socket connection timeout');
    });
  });

  onUnmounted(() => {
    if (socket.value) {
      socket.value.disconnect();
      console.log('Socket disconnected');
    }
  });

  return {
    socket,
  };
}