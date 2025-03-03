import { ref, watch } from 'vue';

const clients = ref([]);
const clientsIsLoading = ref(false);
const selectedClient = ref(null);

export function useClientStore() {
    
    const setClients = (newClients) => {
        clients.value = newClients;
    };
    const appendClients = (newClients) => {
        clients.value = [...clients.value, ...newClients]; // Append new clients
    };
    const setClientsIsLoading = (bool) => {
        clientsIsLoading.value = bool;
    };

    // Fetch the list of clients
    const fetchClients = async (page) => {
        // console.log('From Client Store => fetchClients page:', page);
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/client-list/${page}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            // Check if the response is okay
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // Log the response before parsing
            const data = await response.json();
            // console.log('From Client Store => fetchClients data:', data);

            if (data && data.clients) {                
                if (page === 1) {
                    setClients(data.clients);                
                    return data.totalPages;
                } else {
                    appendClients(data.clients);                
                    return data.totalPages;
                }

                // Log the updated clients
                // console.log('From Client Store => Current clients:', clients.value);
            } else {
                console.warn('No clients data received');
            }

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
            return selectedClient.value;
            
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

    const fetchClientReservations = async (clientId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/client/reservation/history/${clientId}`, {
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

    const updateClientInfoCRM = async (client_id, updatedFields) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/crm/client/update/${client_id}`, {
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
            console.log('From Client Store => updateClientInfoCRM updatedClient:', updatedClient);
            selectedClient.value = updatedClient;
        } catch (error) {
            console.error('Failed to update client', error);
        }
    };

    const mergeClientsCRM = async (newClientId, oldClientId, updatedFields) => {        
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/crm/client/${newClientId}/merge/${oldClientId}`, {
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
            
        } catch (error) {
            console.error('Failed to update client', error);
        }
    }

    return {
        clients,
        clientsIsLoading,
        selectedClient,
        setClientsIsLoading,
        fetchClients,
        fetchClient,
        fetchClientNameConversion,
        fetchClientReservations,
        createClient,
        updateClientInfo,
        updateClientInfoCRM,
        mergeClientsCRM,
    };
}