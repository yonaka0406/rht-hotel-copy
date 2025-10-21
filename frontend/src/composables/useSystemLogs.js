import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useApi } from '@/composables/useApi';

export function useSystemLogs() {
  const logs = ref([]);
  const loading = ref(false);
  const toast = useToast();
  const { get } = useApi();

  const fetchLogs = async (date) => {
    loading.value = true;
    try {
      const response = await get(`/reservation-logs?date=${date}`);
      logs.value = response;
    } catch (error) {
      console.error('予約ログの取得中にエラーが発生しました:', error);
      toast.add({ severity: 'error', summary: 'エラー', detail: '予約ログの取得に失敗しました', life: 3000 });
    } finally {
      loading.value = false;
    }
  };

  return {
    logs,
    loading,
    fetchLogs,
  };
}
