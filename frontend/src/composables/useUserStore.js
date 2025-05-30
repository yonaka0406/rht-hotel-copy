import { ref, watch } from 'vue';

const users = ref([]);
const logged_user = ref([]);
const calendarEmbedUrl = ref(null); // New state for embed URL

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
        updateUserCalendarPreferencesStore,
        calendarEmbedUrl, 
        fetchCalendarEmbedUrlStore,
        triggerCalendarSyncStore, // Added new sync trigger action
    };
}

// Function to update user calendar preferences
const updateUserCalendarPreferencesStore = async (settingsPayload) => {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('Authentication token not found.');
        }

        const response = await fetch('/api/users/calendar/settings', { // Endpoint from Part 2
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settingsPayload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        const updatedUser = responseData.data; // Assuming backend returns { message, data: userObject }

        // Update the logged_user state
        // Assuming logged_user.value is an array with the user object at the first index,
        // or it's the user object itself. Adjust if structure is different.
        // The provided UserProfile.vue component expects logged_user.value[0]
        if (logged_user.value && Array.isArray(logged_user.value) && logged_user.value.length > 0) {
            // Merge new settings into the existing user object to preserve other properties
             logged_user.value[0] = { ...logged_user.value[0], ...updatedUser };
        } else if (logged_user.value && typeof logged_user.value === 'object' && !Array.isArray(logged_user.value)) {
            // If logged_user.value is the user object directly
            logged_user.value = { ...logged_user.value, ...updatedUser };
        } else {
            // If store was empty or in unexpected format, just set it (though fetchUser should ideally run on load)
            logged_user.value = Array.isArray(updatedUser) ? updatedUser : [updatedUser];
        }
        
        return updatedUser; // Return the updated user data from response
    } catch (error) {
        console.error('Failed to update user calendar preferences:', error);
        throw error; // Re-throw to be caught by the component
    }
};

// New function to trigger manual calendar sync
const triggerCalendarSyncStore = async () => {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('Authentication token not found.');
        }

        const response = await fetch('/api/users/settings/calendar/sync-from-google', {
            method: 'POST', // As defined in backend routes
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json', // Though body might be empty, content-type can still be set
            },
            // No body is needed for this POST request as per typical trigger endpoints
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

// New function to fetch calendar embed URL
const fetchCalendarEmbedUrlStore = async () => {
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('Authentication token not found.');
        }

        const response = await fetch('/api/users/settings/calendar/embed-url', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        calendarEmbedUrl.value = responseData.embedUrl; // Update the shared state

        return responseData.embedUrl; // Return the URL
    } catch (error) {
        console.error('Failed to fetch calendar embed URL:', error);
        calendarEmbedUrl.value = null; // Reset on error
        throw error; // Re-throw to be caught by the component
    }
};