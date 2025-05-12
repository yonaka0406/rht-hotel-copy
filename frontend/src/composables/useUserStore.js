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

    return {
        users,
        logged_user,
        fetchUsers,
        fetchUser,
    };
}