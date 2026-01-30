import { ref } from 'vue';
import { useApi } from './useApi';

const ledgerPreviewData = ref([]);
const ledgerValidationData = ref(null);
const lastFilters = ref(null);

const stableStringify = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(stableStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(key => JSON.stringify(key) + ':' + stableStringify(obj[key])).join(',') + '}';
};

export function useAccountingStore() {
    const { isLoading: loading, error, get, post, del } = useApi();

    const getExportOptions = async () => {
        return await get('/accounting/export/options');
    };

    const fetchLedgerPreview = async (filters) => {
        // Only fetch if filters have changed or we have no data
        const filtersChanged = stableStringify(lastFilters.value) !== stableStringify(filters);

        if (ledgerPreviewData.value.length === 0 || filtersChanged) {
            const response = await post('/accounting/export/preview', filters);
            // Handle new response structure with data and validation
            if (response && typeof response === 'object' && 'data' in response) {
                ledgerPreviewData.value = response.data || [];
                ledgerValidationData.value = response.validation || null;
            } else {
                // Backward compatibility: if response is an array
                ledgerPreviewData.value = Array.isArray(response) ? response : [];
                ledgerValidationData.value = null;
            }
            lastFilters.value = JSON.parse(JSON.stringify(filters));
            return { data: ledgerPreviewData.value, validation: ledgerValidationData.value };
        }
        return { data: ledgerPreviewData.value, validation: ledgerValidationData.value };
    };

    const downloadLedger = async (filters) => {
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
    };

    const comparePmsVsYayoi = async (filters) => {
        return await post('/accounting/export/compare-pms-yayoi', filters);
    };

    const getMonthlySalesComparison = async (year, hotelIds = null) => {
        const params = new URLSearchParams({ year });
        if (hotelIds && hotelIds.length > 0) {
            params.append('hotelIds', hotelIds.join(','));
        }
        return await get(`/accounting/export/monthly-comparison?${params}`);
    };

    const getRawDataForIntegrityAnalysis = async (filters) => {
        return await post('/accounting/export/raw-data-integrity-analysis', filters);
    };

    const getPlanReservationDetails = async (filters) => {
        return await post('/accounting/export/plan-reservation-details', filters);
    };

    const getAvailableYayoiYears = async () => {
        return await get('/accounting/export/available-yayoi-years');
    };

    const getAvailableYayoiMonths = async () => {
        return await get('/accounting/export/available-yayoi-months');
    };

    const getAccountingSettings = async (hotelId = null) => {
        const params = hotelId ? { hotel_id: hotelId } : {};
        return await get('/accounting/settings', params);
    };

    const fetchDashboardMetrics = async (params) => {
        const query = new URLSearchParams(params).toString();
        return await get(`/accounting/dashboard/metrics?${query}`);
    };

    const fetchReconciliationOverview = async (params) => {
        const query = new URLSearchParams(params).toString();
        return await get(`/accounting/dashboard/reconciliation?${query}`);
    };

    const fetchReconciliationHotelDetails = async (hotelId, params) => {
        const query = new URLSearchParams(params).toString();
        return await get(`/accounting/dashboard/reconciliation/hotel/${hotelId}?${query}`);
    };

    const fetchReconciliationClientDetails = async (hotelId, clientId, params) => {
        const query = new URLSearchParams(params).toString();
        return await get(`/accounting/dashboard/reconciliation/hotel/${hotelId}/client/${clientId}?${query}`);
    };


    const upsertAccountCode = async (data) => {
        return await post('/accounting/settings/codes', data);
    };

    const deleteAccountCode = async (id) => {
        return await del(`/accounting/settings/codes/${id}`);
    };

    const upsertMapping = async (data) => {
        return await post('/accounting/settings/mappings', data);
    };

    const deleteMapping = async (id) => {
        return await del(`/accounting/settings/mappings/${id}`);
    };

    const upsertManagementGroup = async (data) => {
        return await post('/accounting/settings/groups', data);
    };

    const deleteManagementGroup = async (id) => {
        return await del(`/accounting/settings/groups/${id}`);
    };

    const upsertTaxClass = async (data) => {
        return await post('/accounting/settings/tax-classes', data);
    };

    const deleteTaxClass = async (id) => {
        return await del(`/accounting/settings/tax-classes/${id}`);
    };

    const upsertDepartment = async (data) => {
        return await post('/accounting/settings/departments', data);
    };

    const deleteDepartment = async (id) => {
        return await del(`/accounting/settings/departments/${id}`);
    };

    const upsertDepartmentGroup = async (data) => {
        return await post('/accounting/settings/department-groups', data);
    };

    const deleteDepartmentGroup = async (id) => {
        return await del(`/accounting/settings/department-groups/${id}`);
    };

    const upsertSubAccount = async (data) => {
        return await post('/accounting/settings/sub-accounts', data);
    };

    const deleteSubAccount = async (id) => {
        return await del(`/accounting/settings/sub-accounts/${id}`);
    };

    const previewYayoiImport = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return await post('/accounting/import/preview', formData);
    };

    const executeYayoiImport = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return await post('/accounting/import/execute', formData);
    };

    const fetchProfitLossMonths = async () => {
        return await get('/accounting/profit-loss/months');
    };

    const fetchProfitLossDepartments = async () => {
        return await get('/accounting/profit-loss/departments');
    };

    const fetchProfitLoss = async (params) => {
        return await post('/accounting/profit-loss', params);
    };

    const fetchProfitLossSummary = async (params) => {
        return await post('/accounting/profit-loss/summary', params);
    };

    const fetchProfitLossDetailed = async (params) => {
        return await post('/accounting/profit-loss/detailed', params);
    };

    const fetchCostBreakdown = async (params) => {
        const query = new URLSearchParams(params).toString();
        return await get(`/accounting/analytics/cost-breakdown?${query}`);
    };

    const clearPreviewData = () => {
        ledgerPreviewData.value = [];
        ledgerValidationData.value = null;
        lastFilters.value = null;
    };

    return {
        loading,
        error,
        ledgerPreviewData,
        ledgerValidationData,
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
        upsertDepartmentGroup,
        deleteDepartmentGroup,
        upsertSubAccount,
        deleteSubAccount,
        previewYayoiImport,
        executeYayoiImport,
        fetchProfitLossMonths,
        fetchProfitLossDepartments,
        fetchProfitLoss,
        fetchProfitLossSummary,
        fetchProfitLossDetailed,
        fetchCostBreakdown,
        clearPreviewData,
        fetchDashboardMetrics,
        fetchReconciliationOverview,
        fetchReconciliationHotelDetails,
        fetchReconciliationClientDetails,
        comparePmsVsYayoi,
        getMonthlySalesComparison,
        getRawDataForIntegrityAnalysis,
        getPlanReservationDetails,
        getAvailableYayoiYears,
        getAvailableYayoiMonths
    };
}