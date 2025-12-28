import { ref } from 'vue';
import { useApi } from './useApi';

const user_actions = ref([]);
const client_actions = ref([]);
const actions = ref([]);
const clientImpediments = ref([]);
const loadingImpediments = ref(false);
const errorImpediments = ref(null);

export function useCRMStore() {
    const { get, post, put, del } = useApi();
    
    const fetchUserActions = async (uid) => {
        try {
            user_actions.value = await get(`/actions/user/${uid}`);
        } catch (error) {
            console.error('Failed to fetch actions', error);
        }
    };
    const fetchClientActions = async (cid) => {
        try {
            client_actions.value = await get(`/actions/client/${cid}`);
        } catch (error) {
            console.error('Failed to fetch actions', error);
        }
    };
    const fetchAllActions = async () => {
        try {
            actions.value = await get('/actions/get');
        } catch (error) {
            console.error('Failed to fetch actions', error);
        }
    };

    const addAction = async (actionFields) => {
        try {
            const newAction = await post('/action/new', { actionFields });
            return newAction;
        } catch (error) {
            console.error('Failed to add action:', error);
            throw error;
        }
    };

    const editAction = async (id, actionFields) => {
        try {
            const updatedAction = await put(`/action/edit/${id}`, { actionFields });
            return updatedAction;
        } catch (error) {
            console.error('Failed to edit action:', error);
            throw error;
        }
    };

    const removeAction = async (id) => {
        try {
            await del(`/action/${id}`);
            return { success: true };
        } catch (error) {
            console.error('Failed to remove action:', error);
            throw error;
        }
    };

    // --- Client Impediment Functions ---

    const fetchImpedimentsByClientId = async (clientId) => {
        loadingImpediments.value = true;
        errorImpediments.value = null;
        try {
            clientImpediments.value = await get(`/clients/${clientId}/impediments`);
        } catch (error) {
            errorImpediments.value = error;
            console.error(`Failed to fetch impediments for client ${clientId}:`, error);
        } finally {
            loadingImpediments.value = false;
        }
    };

    const createImpediment = async (impedimentData) => {
        try {
            const newImpediment = await post('/clients/impediments', impedimentData);
            clientImpediments.value.push(newImpediment);
            return newImpediment;
        } catch (error) {
            console.error('Failed to create impediment:', error);
            throw error;
        }
    };

    const updateImpediment = async (impedimentId, impedimentData) => {
        try {
            const updatedImpediment = await put(`/clients/impediments/${impedimentId}`, impedimentData);
            const index = clientImpediments.value.findIndex(i => i.id === impedimentId);
            if (index !== -1) {
                clientImpediments.value[index] = updatedImpediment;
            }
            return updatedImpediment;
        } catch (error) {
            console.error('Failed to update impediment:', error);
            throw error;
        }
    };

    const deleteImpediment = async (impedimentId) => {
        try {
            await del(`/clients/impediments/${impedimentId}`);
            clientImpediments.value = clientImpediments.value.filter(i => i.id !== impedimentId);
            return { success: true };
        } catch (error) {
            console.error('Failed to delete impediment:', error);
            throw error;
        }
    };

    const fetchTopBookers = async (startDate, endDate, includeTemp = false) => {
        try {
            const data = await get(`/report/crm/top-bookers/${startDate}/${endDate}?include_temp=${includeTemp}`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Failed to fetch top bookers:', error);
            return [];
        }
    };

    const fetchSalesByClientMonthly = async (startDate, endDate, includeTemp = false) => {
        try {
            const data = await get(`/report/crm/sales-by-client-monthly/${startDate}/${endDate}?include_temp=${includeTemp}`);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Failed to fetch sales by client monthly:', error);
            return [];
        }
    };

    return {
        user_actions,
        client_actions,
        actions,        
        clientImpediments,
        loadingImpediments,
        errorImpediments,
        fetchUserActions,
        fetchClientActions,
        fetchAllActions,
        addAction,
        editAction,
        removeAction,
        fetchImpedimentsByClientId,
        createImpediment,
        updateImpediment,
        deleteImpediment,
        fetchTopBookers,
        fetchSalesByClientMonthly,
    };
}