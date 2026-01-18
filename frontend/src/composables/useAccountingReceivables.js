import { ref } from 'vue';
import { useApi } from './useApi';

const balances = ref([]);
const searchResults = ref([]);

export function useAccountingReceivables() {
    const { isLoading: loading, error, get } = useApi();

    const fetchBalances = async (minBalance = 0) => {
        const response = await get('/accounting/receivables/balances', {
            params: { minBalance }
        });
        
        if (response && response.success) {
            balances.value = response.data;
        }
        
        return balances.value;
    };

    const searchClients = async (query) => {
        if (!query || query.trim().length < 2) {
            searchResults.value = [];
            return [];
        }
        
        const response = await get('/accounting/receivables/search-clients', {
            params: { query }
        });

        if (response && response.success) {
            searchResults.value = response.data;
        }
        
        return searchResults.value;
    };

    const fetchHistory = async (subAccount) => {
        const response = await get('/accounting/receivables/history', {
            params: { subAccount }
        });
        return response?.data || [];
    };

    const clearSearchResults = () => {
        searchResults.value = [];
    };

    return {
        balances,
        searchResults,
        loading,
        error,
        fetchBalances,
        searchClients,
        clearSearchResults,
        fetchHistory
    };
}