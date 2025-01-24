import { ref, watch } from 'vue';

const clients = ref([]);
const selectedClient = ref(null);

export function useClientStore() {
    // Fetch the list of clients
    const fetchClients = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/client-list', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            clients.value = await response.json();

        } catch (error) {
            console.error('Failed to fetch hotels', error);
        }
    };

    // Fetch data for the selected client
    const fetchClient = async (client_id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/client/${client_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            selectedClient.value = await response.json();
            
        } catch (error) {
            console.error('Failed to fetch hotel rooms', error);
        }
    };

    return {
        clients,
        selectedClient,
        fetchClients,
        fetchClient,
    };
}