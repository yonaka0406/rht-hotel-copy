import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useApi } from '@/composables/useApi';

export function useSystemLogs() {
  const logs = ref([]);
  const loading = ref(false);
  const toast = useToast();
  const { get } = useApi();

  const fetchLogs = async (date) => { // Removed limit
    loading.value = true;

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!date || !dateRegex.test(date) || isNaN(Date.parse(date))) {
      toast.add({ severity: 'error', summary: 'エラー', detail: '無効な日付形式です。YYYY-MM-DD形式で入力してください。', life: 3000 });
      loading.value = false;
      return { logs: [], totalRecords: 0 }; // Return empty data on validation failure
    }

    try {
      const encodedDate = encodeURIComponent(date);
      const response = await get(`/reservation-logs?date=${encodedDate}`); // Removed limit from API call
      logs.value = response.logs; // Assuming response is { logs: [], totalRecords: 0 }
      return response;
    } catch (error) {
      console.error('予約ログの取得中にエラーが発生しました:', error);
      toast.add({ severity: 'error', summary: 'エラー', detail: '予約ログの取得に失敗しました', life: 3000 });
      return { logs: [], totalRecords: 0 }; // Return empty data on error
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
