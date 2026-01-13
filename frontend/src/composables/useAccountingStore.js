import { ref } from 'vue';
import { useApi } from './useApi';

const ledgerPreviewData = ref([]);
const lastFilters = ref(null);

export function useAccountingStore() {
    const { isLoading: loading, error, get, post } = useApi();

    const getExportOptions = async () => {
        try {
            const data = await get('/accounting/export/options');
            return data;
        } catch (err) {
            throw err;
        }
    };

    const fetchLedgerPreview = async (filters) => {
        // Only fetch if filters have changed or we have no data
        const filtersChanged = JSON.stringify(lastFilters.value) !== JSON.stringify(filters);

        if (ledgerPreviewData.value.length === 0 || filtersChanged) {
            try {
                const data = await post('/accounting/export/preview', filters);
                ledgerPreviewData.value = data;
                lastFilters.value = JSON.parse(JSON.stringify(filters));
                return data;
            } catch (err) {
                throw err;
            }
        }
        return ledgerPreviewData.value;
    };

    const downloadLedger = async (filters) => {
        try {
            const data = await post('/accounting/export/download', filters, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;

            let fileName = `sales_ledger_${filters.selectedMonth || 'export'}`;
            fileName += filters.format === 'excel' ? '.xlsx' : '.csv';

            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } catch (err) {
            throw err;
        }
    };

    const clearPreviewData = () => {
        ledgerPreviewData.value = [];
        lastFilters.value = null;
    };

    return {
        loading,
        error,
        ledgerPreviewData,
        getExportOptions,
        fetchLedgerPreview,
        downloadLedger,
        clearPreviewData
    };
}
