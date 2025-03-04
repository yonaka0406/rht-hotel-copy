import { ref } from 'vue';

const paymentTypes = ref(null);

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
    
            paymentTypes.value = await response.json();
        } catch (error) {
            console.error('Failed to fetch payment types', error);
        }
    }

    return {        
        paymentTypes,
        fetchPaymentTypes,
        createPaymentType,
    };
}