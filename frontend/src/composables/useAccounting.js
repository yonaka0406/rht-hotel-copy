import { useApi } from './useApi';

export function useAccounting() {
    const { isLoading: loading, error, get, post } = useApi();

    const getExportOptions = async () => {
        try {
            const data = await get('/accounting/export/options');
            return data;
        } catch (err) {
            throw err;
        }
    };

    const getLedgerPreview = async (filters) => {
        try {
            const data = await post('/accounting/export/preview', filters);
            return data;
        } catch (err) {
            throw err;
        }
    };

    const downloadLedger = async (filters) => {
        try {
            const data = await post('/accounting/export/download', filters, {
                responseType: 'blob'
            });

            // Create a link to download the file
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;

            // Using a generic filename for now, which is improved if the backend sets it correctly.
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

    return {
        loading,
        error,
        getExportOptions,
        getLedgerPreview,
        downloadLedger
    };
}
