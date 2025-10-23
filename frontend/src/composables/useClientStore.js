import { ref } from 'vue';

const groups = ref([]);
const selectedGroup = ref(null);
const clients = ref([]);
const clientsIsLoading = ref(false);
const selectedClient = ref(null);
const selectedClientAddress = ref(null);
const selectedClientGroup = ref(null);

const relatedCompanies = ref([]);
const isLoadingRelatedCompanies = ref(false);
const commonRelationshipPairs = ref([]);
const isLoadingCommonRelationshipPairs = ref(false);

export function useClientStore() {
    
    const setClients = (newClients) => {
        clients.value = newClients.map(client => ({
            ...client,
            display_name: client.name_kanji || client.name_kana || client.name || ''
        }));
    };
    const appendClients = (newClients) => {
        clients.value = [...clients.value, ...newClients.map(client => ({
            ...client,
            display_name: client.name_kanji || client.name_kana || client.name || ''
        }))]; // Append new clients
    };
    const setClientsIsLoading = (bool) => {
        clientsIsLoading.value = bool;
    };

    // Fetch the list of clients
    const fetchClients = async (page) => {
        clientsIsLoading.value = true;
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
                throw new Error(`HTTPエラーが発生しました。ステータス: ${response.status}`);
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
            console.error('Failed to fetch clients.', error);
            setClients([]);            
            throw error;
        } finally {
            clientsIsLoading.value = false;
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
            selectedClientGroup.value = result.client.group;
            //console.log('Client Store => selectedClient:', selectedClient.value, 'selectedClientAddress:', selectedClientAddress.value);
            return {
                client: selectedClient.value,
                addresses: selectedClientAddress.value,
                group: selectedClientGroup.value,
            };            
        } catch (error) {
            console.error('Failed to fetch client information.', error);
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
                throw new Error('Failed to fetch client by name.');
            }

            const clientName = await response.json();            
            return clientName;
        } catch (error) {
            console.error('Failed to fetch client by name.', error);
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
            
            const clientReservations = await response.json();
            return clientReservations;
            
        } catch (error) {
            console.error('Failed to fetch client reservations.', error);
        }
    };
    const fetchCustomerID = async (clientId, customerId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/client/customer-id/${clientId}/${customerId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            const client = await response.json();            
            return client;
            
        } catch (error) {
            console.error('Failed to fetch customer id.', error);
        }
    };
    const fetchClientGroups = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/client/groups/all`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            groups.value = await response.json();
            
        } catch (error) {
            console.error('Failed to fetch client groups.', error);
        }
    };
    // Fetch data for the selected client
    const fetchGroup = async (group_id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/client/group/${group_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            
            selectedGroup.value = await response.json();

            return selectedGroup.value;
        } catch (error) {
            console.error('Failed to fetch group.', error);
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
            throw new Error('Failed to create client.');
          }
      
          const newClient = await response.json();                  
          return newClient;
        } catch (error) {
          console.error('Failed to create client.', error);
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
            throw new Error('Failed to create client.');
          }
      
          const newClient = await response.json();
          appendClients([newClient]);          
          return newClient;
        } catch (error) {
          console.error('Failed to create client.', error);
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
      
          const result = await response.json();          
          return result;
        } catch (error) {
          console.error('Failed to create client', error);
          throw error;
        }
    };
    const createClientGroup = async (groupFields) => {        
        try {
          const authToken = localStorage.getItem('authToken');
          const response = await fetch('/api/client/group/new', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(groupFields),
          });
      
          if (!response.ok) {
            throw new Error('Failed to create group');
          }
      
          const result = await response.json();          
          return result;
        } catch (error) {
          console.error('Failed to create group', error);
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
    const updateClientGroup = async (groupId, clientId) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/client/group/${groupId}/update/${clientId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },                
            });
        
            if (!response.ok) {
                throw new Error('Failed to update group');
            }
        
            const editedData = await response.json();   
            return editedData;         
        } catch (error) {
            console.error('Failed to update client', error);
        }
    };
    const updateGroup = async (groupId, data) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/client/group/update/${groupId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },    
                body: JSON.stringify(data),           
            });
        
            if (!response.ok) {
                throw new Error('Failed to update group');
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
            
            // Return the updated client data so you can use it
            return updatedClient;
            
        } catch (error) {
            console.error('Failed to update client', error);
            throw error; // Re-throw so the caller can handle it
        }
    };

    // --- Client Relationship Store Methods (defined inside useClientStore) ---

    const fetchAllClientsForFiltering = async () => {
        clientsIsLoading.value = true;
        try {
            // Fetch the first page to get totalPages and initial client set
            const totalPages = await fetchClients(1); // fetchClients already sets clients.value for page 1

            if (totalPages && totalPages > 1) {
                const pagePromises = [];
                for (let page = 2; page <= totalPages; page++) {
                    // N.B.: fetchClients appends for page > 1
                    pagePromises.push(fetchClients(page));
                }
                await Promise.all(pagePromises);
                // All clients are now appended to clients.value
            }
            // clients.value now contains all clients
        } catch (error) {
            console.error('Failed to fetch all clients for filtering.', error);
            // clients.value might be partially populated or just page 1;
            // fetchClients itself handles setting clients to [] on error for its own scope.
            // Depending on desired behavior, could clear clients.value here if any part fails.
            // For now, rely on fetchClients' error handling per page.
            throw error; // Re-throw to allow caller to handle
        } finally {
            clientsIsLoading.value = false;
        }
    };

    async function fetchRelatedCompanies(clientId) {
        isLoadingRelatedCompanies.value = true;
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/clients/${clientId}/related`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }
            relatedCompanies.value = await response.json();
        } catch (error) {
            console.error(`Error fetching related companies for ${clientId}:`, error);
            relatedCompanies.value = [];
            throw error;
        } finally {
            isLoadingRelatedCompanies.value = false;
        }
    }

    async function addClientRelationship(clientId, payload) {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/clients/${clientId}/related`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error adding client relationship:', error);
            throw error;
        }
    }

    async function deleteClientRelationship(relationshipId) {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/crm/client-relationships/${relationshipId}`, { // MODIFIED PATH
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error deleting client relationship:', error);
            throw error;
        }
    }
    
    async function updateClientRelationship(relationshipId, payload) {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/crm/client-relationships/${relationshipId}`, { // MODIFIED PATH
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error updating client relationship:', error);
            throw error;
        }
    }

    async function fetchCommonRelationshipPairs() {
        isLoadingCommonRelationshipPairs.value = true;
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/crm/common-relationship-pairs`, { // MODIFIED PATH
                method: 'GET',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }
            commonRelationshipPairs.value = await response.json();
        } catch (error) {
            console.error('Error fetching common relationship pairs.', error);
            commonRelationshipPairs.value = [];
            throw error;
        } finally {
            isLoadingCommonRelationshipPairs.value = false;
        }
    }
    
    return {
        groups,
        selectedGroup,
        clients,
        clientsIsLoading,
        selectedClient,
        selectedClientAddress,
        selectedClientGroup,
        relatedCompanies,
        isLoadingRelatedCompanies,
        commonRelationshipPairs,
        isLoadingCommonRelationshipPairs,
        fetchAllClientsForFiltering, // add new function
        setClientsIsLoading,
        fetchClients,
        fetchClient,
        fetchClientNameConversion,
        fetchClientReservations,
        fetchCustomerID,
        fetchClientGroups,
        createClient,
        fetchGroup,
        createBasicClient,
        createAddress,
        createClientGroup,
        removeAddress,
        updateClientInfo,
        updateClientInfoCRM,
        updateAddress,
        updateClientGroup,
        updateGroup,
        mergeClientsCRM,
        fetchRelatedCompanies,
        addClientRelationship,
        deleteClientRelationship,
        updateClientRelationship,
        fetchCommonRelationshipPairs,        
    };
}