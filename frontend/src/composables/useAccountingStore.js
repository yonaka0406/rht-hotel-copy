import { ref } from 'vue';
import { useApi } from './useApi';

const ledgerPreviewData = ref([]);
const lastFilters = ref(null);

export function useAccountingStore() {
    const { isLoading: loading, error, get, post, del } = useApi();

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

    const getAccountingSettings = async (hotelId = null) => {
        try {
            const params = hotelId ? { hotel_id: hotelId } : {};
            const data = await get('/accounting/settings', params);
            return data;
        } catch (err) {
            throw err;
        }
    };

    const fetchDashboardMetrics = async (params) => {
        try {
            const query = new URLSearchParams(params).toString();
            const data = await get(`/accounting/dashboard/metrics?${query}`);
            return data;
        } catch (err) {
            throw err;
        }
    };


    const upsertAccountCode = async (data) => {
        try {
            return await post('/accounting/settings/codes', data);
        } catch (err) {
            throw err;
        }
    };

    const deleteAccountCode = async (id) => {
        try {
            return await del(`/accounting/settings/codes/${id}`);
        } catch (err) {
            throw err;
        }
    };

    const upsertMapping = async (data) => {
        try {
            return await post('/accounting/settings/mappings', data);
        } catch (err) {
            throw err;
        }
    };

    const deleteMapping = async (id) => {
        try {
            return await del(`/accounting/settings/mappings/${id}`);
        } catch (err) {
            throw err;
        }
    };

    const upsertManagementGroup = async (data) => {
        try {
            return await post('/accounting/settings/groups', data);
        } catch (err) {
            throw err;
        }
    };

    const deleteManagementGroup = async (id) => {
        try {
            return await del(`/accounting/settings/groups/${id}`);
        } catch (err) {
            throw err;
        }
    };

    const upsertTaxClass = async (data) => {
        try {
            return await post('/accounting/settings/tax-classes', data);
        } catch (err) {
            throw err;
        }
    };

    const deleteTaxClass = async (id) => {
        try {
            return await del(`/accounting/settings/tax-classes/${id}`);
        } catch (err) {
            throw err;
        }
    };

    const upsertDepartment = async (data) => {
        try {
            return await post('/accounting/settings/departments', data);
        } catch (err) {
            throw err;
        }
    };

    const deleteDepartment = async (id) => {
        try {
            return await del(`/accounting/settings/departments/${id}`);
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
        getAccountingSettings,
        upsertAccountCode,
        deleteAccountCode,
        upsertMapping,
        deleteMapping,
        upsertManagementGroup,
        deleteManagementGroup,
        upsertTaxClass,
        deleteTaxClass,
        upsertDepartment,
        deleteDepartment,
        clearPreviewData,
        fetchDashboardMetrics
    };
}
