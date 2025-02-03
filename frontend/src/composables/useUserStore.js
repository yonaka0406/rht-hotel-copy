import { ref, watch } from 'vue';

const logged_user = ref([]);

export function useUserStore() {
    
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
            console.error('Failed to fetch users', error);
        }
    };

    return {
        logged_user,
        fetchUser,
    };
}