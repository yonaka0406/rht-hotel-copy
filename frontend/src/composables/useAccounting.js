import { ref } from 'vue';
import axios from 'axios';

export function useAccounting() {
    const loading = ref(false);
    const error = ref(null);

    const getExportOptions = async () => {
        loading.value = true;
        try {
            const response = await axios.get('/api/accounting/export/options');
            return response.data;
        } catch (err) {
            error.value = err.response?.data?.message || 'Options fetch failed';
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const getLedgerPreview = async (filters) => {
        loading.value = true;
        try {
            const response = await axios.post('/api/accounting/export/preview', filters);
            return response.data;
        } catch (err) {
            error.value = err.response?.data?.message || 'Preview fetch failed';
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const downloadLedger = async (filters) => {
        loading.value = true;
        try {
            const response = await axios.post('/api/accounting/export/download', filters, {
                responseType: 'blob'
            });
            
            // Create a link to download the file
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'ledger_export';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename=(.+)/);
                if (fileNameMatch.length === 2) fileName = fileNameMatch[1];
            } else {
                fileName += filters.format === 'excel' ? '.xlsx' : '.csv';
            }
            
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            error.value = err.response?.data?.message || 'Download failed';
            throw err;
        } finally {
            loading.value = false;
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
