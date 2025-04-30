import { ref, watch } from 'vue';

const clients = ref([]);
const clientsIsLoading = ref(false);
const selectedClient = ref(null);
const selectedClientAddress = ref(null);

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
            
            const result = await response.json();
            selectedClient.value = result.client;
            selectedClientAddress.value = result.client.addresses;
            console.log('Client Store => selectedClient:', selectedClient.value, 'selectedClientAddress:', selectedClientAddress.value);
            return {
                client: selectedClient.value,
                addresses: selectedClientAddress.value,
            };            
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
    
    const createBasicClient = async (name, name_kana, legal_or_natural_person, gender, email, phone) => {        
        try {
          const authToken = localStorage.getItem('authToken');
          const response = await fetch('/api/client/basic', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, name_kana, legal_or_natural_person, gender, email, phone }),
          });
      
          if (!response.ok) {
            throw new Error('Failed to create client');
          }
      
          const newClient = await response.json();                  
          return newClient;
        } catch (error) {
          console.error('Failed to create client', error);
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
          appendClients(newClient);          
          return newClient;
        } catch (error) {
          console.error('Failed to create client', error);
          throw error;
        }
    };
    const createAddress = async (addressFields) => {        
        try {
          const authToken = localStorage.getItem('authToken');
          const response = await fetch('/api/client/address/new', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(addressFields),
          });
      
          if (!response.ok) {
            throw new Error('Failed to create client');
          }
      
          const newClient = await response.json();          
          return newClient;
        } catch (error) {
          console.error('Failed to create client', error);
          throw error;
        }
    };
    const removeAddress = async (id) => {        
        try {
          const authToken = localStorage.getItem('authToken');
          const response = await fetch(`/api/client/address/del/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },            
          });
      
          if (!response.ok) {
            throw new Error('Failed to delete address');
          }
      
          const deleteAddress = await response.json();          
          return deleteAddress;
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
            // console.log('From Client Store => updateClientInfoCRM updatedClient:', updatedClient);
            selectedClient.value = updatedClient;
        } catch (error) {
            console.error('Failed to update client', error);
        }
    };
    const updateAddress = async (address_id, updatedFields) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/client/address/update/${address_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedFields),
            });
        
            if (!response.ok) {
            throw new Error('Failed to update address');
            }
        
            const editedData = await response.json();   
            return editedData;         
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
            res.status(200).json({ message: 'Client merged successfully' });
            
        } catch (error) {
            console.error('Failed to update client', error);
        }
    };

    return {
        clients,
        clientsIsLoading,
        selectedClient,
        selectedClientAddress,
        setClientsIsLoading,
        fetchClients,
        fetchClient,
        fetchClientNameConversion,
        fetchClientReservations,
        createClient,
        createBasicClient,
        createAddress,
        removeAddress,
        updateClientInfo,
        updateClientInfoCRM,
        updateAddress,
        mergeClientsCRM,
    };
}