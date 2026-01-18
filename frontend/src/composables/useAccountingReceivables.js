import { ref } from 'vue';
import axios from 'axios';
import { useToast } from 'primevue/usetoast';

export function useAccountingReceivables() {
    const balances = ref([]);
    const searchResults = ref([]);
    const isLoading = ref(false);
    const toast = useToast();

    const fetchBalances = async (minBalance = 0) => {
        isLoading.value = true;
        try {
            const response = await axios.get('/accounting/receivables/balances', {
                params: { minBalance }
            });
            if (response.data.success) {
                balances.value = response.data.data;
            }
        } catch (error) {
            console.error('Error fetching receivable balances:', error);
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '売掛金残高の取得に失敗しました。',
                life: 3000
            });
        } finally {
            isLoading.value = false;
        }
    };

    const searchClients = async (query) => {
        if (!query || query.trim().length < 2) {
            searchResults.value = [];
            return;
        }
        
        isLoading.value = true;
        try {
            const response = await axios.get('/accounting/receivables/search-clients', {
                params: { query }
            });
            if (response.data.success) {
                searchResults.value = response.data.data;
            }
        } catch (error) {
            console.error('Error searching clients:', error);
            toast.add({
                severity: 'error',
                summary: '検索エラー',
                detail: 'クライアントの検索に失敗しました。',
                life: 3000
            });
        } finally {
            isLoading.value = false;
        }
    };

    return {
        balances,
        searchResults,
        isLoading,
        fetchBalances,
        searchClients
    };
}
