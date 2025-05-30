import { ref, watch } from 'vue';

const users = ref([]);
const logged_user = ref([]);

export function useUserStore() {
    
    const fetchUsers = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/users', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
    
            users.value = await response.json();
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };
    const fetchUser = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/user/get', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });
    
            logged_user.value = await response.json();
        } catch (error) {
            console.error('Failed to fetch user', error);
        }
    };

    const createUserCalendar = async () => {        
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                throw new Error('Authentication token not found.');
            }

            const response = await fetch('/api/user/calendar/create-google', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                }                
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            
            return responseData; 
        } catch (error) {
            console.error('Failed to create user calendar:', error);
            throw error; // Re-throw to be caught by the component
        }
    }
    
    // New function to trigger manual calendar sync
    const triggerCalendarSyncStore = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                throw new Error('Authentication token not found.');
            }

            const response = await fetch('/api/user/calendar/sync-from-google', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                }                
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            // responseData should contain { message: '...', details: { actionsCreated, actionsUpdated, actionsFailed } }
            return responseData; 
        } catch (error) {
            console.error('Failed to trigger calendar sync:', error);
            throw error; // Re-throw to be caught by the component
        }
    };    

    return {
        users,
        logged_user,         
        fetchUsers,
        fetchUser,
        createUserCalendar,        
        triggerCalendarSyncStore,
    };
}