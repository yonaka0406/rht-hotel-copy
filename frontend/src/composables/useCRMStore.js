import { ref, watch } from 'vue';

const user_actions = ref([]);
const actions = ref([]);

export function useCRMStore() {
    
    const fetchUserActions = async (uid) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/actions/user/${uid}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
    
            user_actions.value = await response.json();
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };
    const fetchAllActions = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/actions/get', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
    
            actions.value = await response.json();
        } catch (error) {
            console.error('Failed to fetch user', error);
        }
    };

    const addAction = async (actionFields) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/action/new', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ actionFields }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add action');
            }

            const newAction = await response.json();
            return newAction;
            
        } catch (error) {
            console.error('Failed to add action:', error);
            throw error;
        }
    };

    const editAction = async (id, actionFields) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/action/edit/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ actionFields }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to edit action');
            }

            const updatedAction = await response.json();
            return updatedAction;
        } catch (error) {
            console.error('Failed to edit action:', error);
            throw error;
        }
    };

    const removeAction = async (id) => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/action/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to remove action');
            }

            return { success: true };
        } catch (error) {
            console.error('Failed to remove action:', error);
            throw error;
        }
    };




    return {
        user_actions,
        actions,        
        fetchUserActions,
        fetchAllActions,
        addAction,
        editAction,
        removeAction,
    };
}