import { ref } from 'vue';

const doubleBookings = ref([]);

export function useValidationStore() {
    const fetchDoubleBookings = async () => {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/validation/double-booking', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        doubleBookings.value = await response.json();
    };

    return {
        doubleBookings,
        fetchDoubleBookings,
    };
}