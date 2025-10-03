import { ref } from 'vue';

const doubleBookings = ref([]);
const emptyReservations = ref([]);

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

    const fetchEmptyReservations = async () => {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/validation/empty-reservations', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        emptyReservations.value = await response.json();
    };

    return {
        doubleBookings,
        emptyReservations,
        fetchDoubleBookings,
        fetchEmptyReservations,
    };
}