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

    return {
        user_actions,
        actions,        
        fetchUserActions,
        fetchAllActions,
    };
}