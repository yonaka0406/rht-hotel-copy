import { ref } from 'vue';

const paymentTypes = ref(null);
const taxTypes = ref(null);

export function useSettingsStore() {
    
    const fetchPaymentTypes = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/settings/payments/get', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
    
            paymentTypes.value = await response.json();
        } catch (error) {
            console.error('Failed to fetch payment types', error);
        }
    };
    const createPaymentType = async (newData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/settings/payments/add', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newData })
            });    
        } catch (error) {
            console.error('Failed to create payment type', error);
        }
    };
    const alterPaymentTypeVisibility = async (id, visible) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/settings/payments/visibility/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ visible })
            });
    
            const data = await response.json();
            return data
        } catch (error) {
            console.error('Failed to alter payment types', error);
        }
    };
    const alterPaymentTypeDescription = async (id, description) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/settings/payments/description/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ description })
            });
    
            const data = await response.json();
            return data
        } catch (error) {
            console.error('Failed to alter payment types', error);
        }
    };

    const fetchTaxTypes = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/settings/tax/get', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
    
            taxTypes.value = await response.json();
        } catch (error) {
            console.error('Failed to fetch tax types', error);
        }
    };
    const createTaxType = async (newData) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/settings/tax/add', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newData })
            });
        } catch (error) {
            console.error('Failed to create tax type', error);
        }
    };
    const alterTaxTypeVisibility = async (id, visible) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/settings/tax/visibility/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ visible })
            });
    
            const data = await response.json();
            return data
        } catch (error) {
            console.error('Failed to alter tax types', error);
        }
    };
    const alterTaxTypeDescription = async (id, description) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/settings/tax/description/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ description })
            });
    
            const data = await response.json();
            return data
        } catch (error) {
            console.error('Failed to alter tax types', error);
        }
    };

    return {        
        paymentTypes,
        taxTypes,
        fetchPaymentTypes,
        createPaymentType,
        alterPaymentTypeVisibility,
        alterPaymentTypeDescription,
        fetchTaxTypes,
        createTaxType,
        alterTaxTypeVisibility,
        alterTaxTypeDescription,
    };
}