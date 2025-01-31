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

    // Fetch client by name conversion
    const fetchClientNameConversion = async (nameString) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/client/name/${nameString}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },                
            });

            if (!response.ok) {
                throw new Error('Failed to fetch client by name');
            }

            const clientName = await response.json();            
            return clientName;
        } catch (error) {
            console.error('Failed to fetch client by name', error);
            throw error;
        }
    };

    const createClient = async (clientFields) => {        
        try {
          const authToken = localStorage.getItem('authToken');
          const response = await fetch('/api/client/new', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(clientFields),
          });
      
          if (!response.ok) {
            throw new Error('Failed to create client');
          }
      
          const newClient = await response.json();
          clients.value.push(newClient);
          return newClient;
        } catch (error) {
          console.error('Failed to create client', error);
          throw error;
        }
      };

    const updateClientInfo = async (client_id, updatedFields) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/client/update/${client_id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedFields),
            });
        
            if (!response.ok) {
            throw new Error('Failed to update client');
            }
        
            const updatedClient = await response.json();
            selectedClient.value = updatedClient;
        } catch (error) {
            console.error('Failed to update client', error);
        }
    };

    return {
        clients,
        selectedClient,
        fetchClients,
        fetchClient,
        fetchClientNameConversion,
        createClient,
        updateClientInfo,
    };
}